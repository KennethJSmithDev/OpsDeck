import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileRequest,requestPreview,observeRequest,rehearseRequest} from '../public/sysadmin-explorer.js';
import {executeOperationPlan,setObserveOnly} from '../public/operation-engine.js?v=opsdeck-0.8.0-ipm';
import {configureCurrentTarget,DEFAULT_TARGET} from '../public/target-context.js?v=target-1';
const catalog=JSON.parse(await readFile(new URL('../public/api-catalog.json',import.meta.url),'utf8'));

test('canonical schema requests reject transport escape and bound query collections',()=>{
  const request=compileRequest(catalog,'GET /api/admin/v2/devices');
  assert.equal(request.path,'/api/admin/v2/devices?maxRows=20');
  assert.throws(()=>compileRequest(catalog,'GET https://elsewhere.invalid'),/Unknown/u);
  assert.throws(()=>compileRequest(catalog,'GET /api/admin/v2/device'),/Required parameter/u);
  assert.throws(()=>compileRequest(catalog,'GET /api/admin/v2/devices',{parameters:{maxRows:1000}}),/1–100/u);
  assert.throws(()=>compileRequest(catalog,'GET /api/admin/v2/devices',{parameters:{url:'https://elsewhere.invalid'}}),/Unknown request parameter/u);
  assert.throws(()=>compileRequest(catalog,'PUT /api/admin/v2/web-app',{parameters:{name:'/app'},body:{Password:'not-a-credential'}}),/Sensitive/u);
  const escaped=compileRequest(catalog,'GET /api/admin/v2/device',{parameters:{name:'TERM&name=other'}});
  assert.equal(new URL(escaped.path,'http://local').searchParams.get('name'),'TERM&name=other');
  assert.throws(()=>{request.path='/unbounded';},TypeError);
});
test('generic reads preserve empty/denied/unqualified outcomes and withhold undeclared content',async()=>{
  const request=compileRequest(catalog,'GET /api/admin/v2/devices');
  const observed=await observeRequest(request,async(path,options)=>{
    assert.equal(options.method,'GET');assert.equal(path,request.path);
    return {status:{errors:[]},result:[{Name:'TERM',UnknownSecret:'withheld',Description:'x'.repeat(700)}]};
  });
  assert.equal(observed.state,'OBSERVED');assert.equal(observed.stats.withheld,1);
  assert.equal(observed.stats.truncated,true);assert.equal(observed.value[0].Description.length,512);
  assert.ok(!JSON.stringify(observed).includes('UnknownSecret'));
  assert.equal((await observeRequest(request,async()=>({status:{errors:[]},result:[]}))).state,'EMPTY');
  assert.equal((await observeRequest(request,async()=>{throw Object.assign(new Error('private provider detail'),{status:403});})).state,'DENIED');
  assert.equal((await observeRequest(request,async()=>({result:[]}))).state,'UNVERIFIED');
  const secrets=compileRequest(catalog,'GET /api/admin/v2/wallet/secrets',{parameters:{collection:'test'}});
  assert.equal((await observeRequest(secrets,()=>{throw new Error('must not call');})).state,'BLOCKED');
  assert.equal((await observeRequest({...request},()=>{throw new Error('must not call');})).state,'BLOCKED');
});
test('long-tail mutations build unresolved canonical plans and cannot dispatch',async()=>{
  let calls=0;
  const request=compileRequest(catalog,'DELETE /api/admin/v2/device',{parameters:{name:'TERM'}});
  const result=await rehearseRequest(request,{requestJson:()=>calls++});
  assert.equal(result.state,'BLOCKED');assert.equal(result.plan.capability.state,'UNRESOLVED');assert.equal(calls,0);
  assert.deepEqual(result.preview,requestPreview(request));
  const executed=await executeOperationPlan(result.plan,result.provider,{providerIdentity:result.provider.identity,confirmation:{confirmed:true,planId:result.plan.id,preStateFingerprint:result.plan.preStateFingerprint}});
  assert.equal(executed.state,'UNAVAILABLE');assert.equal(executed.reason,'capability-unresolved');assert.equal(calls,0);
});
test('schema Enabled override reconstructs a real canonical plan and Observe Only refuses it',async()=>{
  const calls=[];
  const request=compileRequest(catalog,'PUT /api/admin/v2/web-app',{parameters:{name:'/app'},body:{Enabled:false}});
  const operation=await rehearseRequest(request,{username:'operator',resolveTarget:()=>({domain:'applications',kind:'web-app',provider:'iris-admin-api',key:'/app',scope:'USER',label:'/app',observedAt:new Date().toISOString()}),requestJson:async(path,options={})=>{
    calls.push({path,method:options.method||'GET'});
    return path==='/api/admin/info'?{status:{errors:[]},result:{username:'operator',privileges:{Secure:{use:true}}}}:{status:{errors:[]},result:{Name:'/app',NameSpace:'USER',Enabled:true}};
  }});
  assert.equal(operation.state,'REVIEW_REQUIRED');assert.equal(operation.plan.capability.id,'webapp.disable');
  assert.deepEqual(operation.plan.parameters,{enabled:false});assert.ok(calls.every(c=>c.method==='GET'));
  setObserveOnly(true);
  try{
    const result=await executeOperationPlan(operation.plan,operation.provider,{providerIdentity:operation.provider.identity,confirmation:{confirmed:true,planId:operation.plan.id,preStateFingerprint:operation.plan.preStateFingerprint}});
    assert.equal(result.state,'BLOCKED');assert.equal(calls.length,2);
  }finally{setObserveOnly(false);}
});

test('an awaited rehearsal with a legacy entity reference retains the provider target that supplied its evidence',async()=>{
  const request=compileRequest(catalog,'PUT /api/admin/v2/web-app',{parameters:{name:'/app'},body:{Enabled:false}});
  try{
    const operation=await rehearseRequest(request,{username:'operator',resolveTarget:()=>({domain:'applications',kind:'web-app',provider:'iris-admin-api',key:'/app',scope:'USER',label:'/app',observedAt:new Date().toISOString()}),requestJson:async path=>{
      if(path==='/api/admin/info'){
        configureCurrentTarget({id:'qa',label:'QA',origin:'http://qa.invalid',environment:'QA'});
        return {status:{errors:[]},result:{username:'operator',privileges:{Secure:{use:true}}}};
      }
      return {status:{errors:[]},result:{Name:'/app',NameSpace:'USER',Enabled:true}};
    }});
    assert.equal(operation.state,'REVIEW_REQUIRED');
    assert.deepEqual(operation.plan.targetRef,operation.provider.targetRef);
    assert.deepEqual(operation.plan.targetRef,DEFAULT_TARGET);
    const result=await executeOperationPlan(operation.plan,operation.provider,{providerIdentity:operation.provider.identity,confirmation:{confirmed:true,planId:operation.plan.id,preStateFingerprint:operation.plan.preStateFingerprint}});
    assert.equal(result.reason,'target-binding-mismatch');
  }finally{configureCurrentTarget(DEFAULT_TARGET);}
});

test('an observed entity from a different target refuses rehearsal before any provider read',async()=>{
  const request=compileRequest(catalog,'PUT /api/admin/v2/web-app',{parameters:{name:'/app'},body:{Enabled:false}});
  let reads=0;
  const operation=await rehearseRequest(request,{username:'operator',resolveTarget:()=>({domain:'applications',kind:'web-app',provider:'iris-admin-api',key:'/app',scope:'USER',label:'/app',targetRef:{id:'qa',label:'QA',origin:'http://qa.invalid',environment:'QA'},observedAt:new Date().toISOString()}),requestJson:()=>reads++});
  assert.equal(operation.state,'BLOCKED');assert.equal(operation.reason,'target-binding-mismatch');assert.equal(reads,0);
  assert.equal(Object.hasOwn(operation,'plan'),false);
});
