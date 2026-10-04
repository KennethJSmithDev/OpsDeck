import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileRequest} from '../public/sysadmin-explorer.js?v=sysadmin-1';
import {rehearseMetadataMutation,isMetadataMutationRequest} from '../public/metadata-mutations.js';
import {executeOperationPlan,setObserveOnly,createOperationPlan} from '../public/operation-engine.js?v=opsdeck-0.8.0-ipm';
import {configureCurrentTarget} from '../public/target-context.js?v=target-1';
const catalog=JSON.parse(await readFile(new URL('../public/api-catalog.json',import.meta.url)));
const targetRef=()=>configureCurrentTarget({id:'local',label:'LOCAL',origin:'http://127.0.0.1:52774',environment:'LOCAL'});
const envelope=result=>({status:{errors:[]},result});
function fixture(family='role'){
  targetRef();setObserveOnly(false);
  const data={Name:'OpsDeckMutationFixture',Description:'before',...(family==='role'?{GrantedRoles:[],Resources:[],EscalationOnly:false}:family==='sslConfig'?{Enabled:false,Type:0,VerifyPeer:0}:{PublicPermission:''})},calls=[];
  let secure=true,mode='normal';
  const requestJson=async(path,options={})=>{
    const method=options.method||'GET';calls.push({path,method,body:options.body});
    if(path==='/api/admin/info')return envelope({username:'fixture',privileges:{Secure:{use:secure}}});
    const url=new URL(path,'http://fixture.test');assert.equal(url.pathname,family==='sslConfig'?'/api/admin/v2/security/ssl-configuration':`/api/admin/v2/security/${family}`);assert.equal(url.searchParams.get('name'),data.Name);
    if(mode==='absent')throw Object.assign(new Error('Absent'),{status:404});
    if(method==='PUT'){
      if(mode==='ambiguous')throw Object.assign(new Error('Failure'),{status:500});
      if(mode==='rejected')return {status:{errors:['rejected']},result:{}};
      assert.deepEqual(Object.keys(JSON.parse(options.body)),['Description']);data.Description=JSON.parse(options.body).Description;
      if(mode==='changed-invariant'){if(family==='role')data.GrantedRoles=['unexpected'];else if(family==='sslConfig')data.VerifyPeer=1;else data.PublicPermission='U';}
      if(mode==='malformed-readback')delete data.Description;
    }
    return envelope(structuredClone(data));
  };
  const request=description=>compileRequest(catalog,family==='sslConfig'?'PUT /api/admin/v2/security/ssl-configuration':`PUT /api/admin/v2/security/${family}`,{parameters:{name:data.Name},body:{Description:description}});
  const rehearse=description=>rehearseMetadataMutation(request(description),{requestJson,username:'fixture'});
  const execute=operation=>executeOperationPlan(operation.plan,operation.provider,{providerIdentity:operation.provider.identity,confirmation:{confirmed:true,planId:operation.plan.id,preStateFingerprint:operation.plan.preStateFingerprint}});
  return {data,calls,request,rehearse,execute,setSecure:value=>{secure=value;},setMode:value=>{mode=value;},puts:()=>calls.filter(call=>call.method==='PUT').length};
}
for(const family of ['role','resource','sslConfig'])test(`${family} description family rehearses without dispatch, verifies effect and restores without authority edits`,async()=>{
  const f=fixture(family),before=structuredClone(f.data),operation=await f.rehearse('after');
  assert.equal(operation.state,'REVIEW_REQUIRED');assert.equal(f.puts(),0);assert.match(operation.plan.preStateFingerprint,/[a-f0-9]{64}/u);
  const result=await f.execute(operation);assert.equal(result.state,'VERIFIED');assert.equal(f.puts(),1);assert.equal(result.receipt.verification,'VERIFIED');
  assert.equal((await f.execute(operation)).receipt.id,result.receipt.id);assert.equal(f.puts(),1,'same canonical plan cannot dispatch twice');
  const restored=await f.execute(await f.rehearse('before'));assert.equal(restored.state,'VERIFIED');assert.equal(f.puts(),2);assert.deepEqual(f.data,before);
});
test('Observe Only and exact confirmation refuse dispatch at the canonical executor',async()=>{
  const f=fixture(),operation=await f.rehearse('after'),count=f.calls.length;
  setObserveOnly(true);assert.equal((await f.execute(operation)).state,'BLOCKED');assert.equal(f.calls.length,count);setObserveOnly(false);
  const refused=await executeOperationPlan(operation.plan,operation.provider,{providerIdentity:operation.provider.identity,confirmation:{confirmed:true,planId:'wrong',preStateFingerprint:operation.plan.preStateFingerprint}});
  assert.equal(refused.state,'BLOCKED');assert.equal(f.puts(),0);
});
test('fresh pre-state and current authority are required again before metadata dispatch',async()=>{
  const f=fixture(),operation=await f.rehearse('after');f.data.Description='concurrent';assert.equal((await f.execute(operation)).state,'STALE');assert.equal(f.puts(),0);
  f.data.Description='before';const second=await f.rehearse('after');f.setSecure(false);assert.equal((await f.execute(second)).state,'DENIED');assert.equal(f.puts(),0);
});
test('metadata target and edited context cannot reuse a reviewed operation',async()=>{
  const f=fixture(),operation=await f.rehearse('after');
  configureCurrentTarget({id:'dev',label:'DEV',origin:'http://127.0.0.1:52775',environment:'DEV'});
  assert.equal((await f.execute(operation)).state,'BLOCKED');assert.equal(f.puts(),0);targetRef();
  assert.equal((await executeOperationPlan(operation.plan,operation.provider,{providerIdentity:operation.provider.identity,isCurrent:()=>false})).state,'CANCELLED');assert.equal(f.puts(),0);
});
for(const family of ['role','resource','sslConfig'])test(`${family} receipt fails when a successful PUT changes observed authority invariants`,async()=>{
  const f=fixture(family),operation=await f.rehearse('after');f.setMode('changed-invariant');const result=await f.execute(operation);
  assert.equal(result.state,'MISMATCH');assert.equal(result.receipt.verification,'FAILED');assert.equal(f.puts(),1);
});
test('absent, incomplete and denied existing metadata never becomes a create request',async()=>{
  const f=fixture();f.setMode('absent');assert.equal((await f.rehearse('after')).state,'ABSENT');assert.equal(f.puts(),0);
  f.setMode('normal');delete f.data.Resources;assert.equal((await f.rehearse('after')).state,'UNAVAILABLE');assert.equal(f.puts(),0);
  f.data.Resources=[];f.setSecure(false);assert.equal((await f.rehearse('after')).state,'DENIED');assert.equal(f.puts(),0);
});
test('ambiguous dispatch is terminal without retry; malformed read-back cannot verify',async()=>{
  let f=fixture(),operation=await f.rehearse('after');f.setMode('ambiguous');assert.equal((await f.execute(operation)).state,'AMBIGUOUS');assert.equal((await f.execute(operation)).state,'AMBIGUOUS');assert.equal(f.puts(),1);
  f=fixture();operation=await f.rehearse('after');f.setMode('malformed-readback');assert.equal((await f.execute(operation)).state,'AMBIGUOUS');assert.equal(f.puts(),1);
});
test('HTTP-success error envelopes do not verify a metadata update',async()=>{
  const f=fixture(),operation=await f.rehearse('after');f.setMode('rejected');assert.equal((await f.execute(operation)).state,'FAILED');assert.equal(f.data.Description,'before');
});
test('only branded description-only requests enter this family; grants and permission edits remain unresolved',async()=>{
  const f=fixture();assert.throws(()=>isMetadataMutationRequest({...f.request('after')}),/Canonical/u);
  for(const body of [{Description:'after',GrantedRoles:['new']},{Resources:[]},{EscalationOnly:true}])assert.equal(isMetadataMutationRequest(compileRequest(catalog,'PUT /api/admin/v2/security/role',{parameters:{name:f.data.Name},body})),false);
  assert.equal(isMetadataMutationRequest(compileRequest(catalog,'PUT /api/admin/v2/security/resource',{parameters:{name:f.data.Name},body:{PublicPermission:'U'}})),false);
});
test('canonical policy rejects identity substitution and incomplete invariant guards',async()=>{
  const f=fixture(),operation=await f.rehearse('after'),plan=operation.plan;
  const input={...plan,capability:{...plan.capability},parameters:structuredClone(plan.parameters),preState:JSON.parse(plan.preStateFingerprint),expiresAt:Date.now()+60000};
  assert.throws(()=>createOperationPlan({...input,target:{...plan.target,key:'name=other'}}),/exact canonical identity/u);
  assert.throws(()=>createOperationPlan({...input,preState:{description:'before',guard:'unverified'}}),/invariant guard/u);
});

function auditFixture(){
  targetRef();setObserveOnly(false);const identity={source:'OpsDeckFixtureMutation',type:'Qualification',name:'Fixture'},data={Description:'before',Enabled:false},calls=[];
  let changeDescription=false;
  const requestJson=async(path,options={})=>{
    calls.push({path,method:options.method||'GET'});if(path==='/api/admin/info')return envelope({username:'fixture',privileges:{Secure:{use:true}}});
    const url=new URL(path,'http://fixture.test');assert.equal(url.pathname,'/api/admin/v2/security/audit/event');assert.deepEqual(Object.fromEntries(url.searchParams),identity);
    if(options.method==='PUT'){Object.assign(data,JSON.parse(options.body));if(changeDescription)data.Description='concurrent';}
    return envelope(structuredClone(data));
  };
  const build=body=>compileRequest(catalog,'PUT /api/admin/v2/security/audit/event',{parameters:identity,body});
  const rehearse=body=>rehearseMetadataMutation(build(body),{requestJson,username:'fixture'});
  const execute=op=>executeOperationPlan(op.plan,op.provider,{providerIdentity:op.provider.identity,confirmation:{confirmed:true,planId:op.plan.id,preStateFingerprint:op.plan.preStateFingerprint}});
  return {identity,data,calls,build,rehearse,execute,changeDescription:()=>{changeDescription=true;}};
}
test('custom audit-event description and flag families share canonical identity, fresh guards and restore paths',async()=>{
  const f=auditFixture();let op=await f.rehearse({Description:'after'});assert.equal(op.state,'REVIEW_REQUIRED');assert.equal(f.calls.some(c=>c.method==='PUT'),false);assert.equal((await f.execute(op)).state,'VERIFIED');assert.equal(f.data.Enabled,false);
  assert.equal((await f.execute(await f.rehearse({Description:'before'}))).state,'VERIFIED');
  op=await f.rehearse({Enabled:true});assert.equal(op.plan.capability.id,'sysadmin.auditEvent.enable');assert.equal((await f.execute(op)).state,'VERIFIED');assert.equal(f.data.Description,'before');
  assert.equal((await f.execute(await f.rehearse({Enabled:false}))).state,'VERIFIED');assert.deepEqual(f.data,{Description:'before',Enabled:false});
});
test('custom event flag updates require unchanged description and Observe Only still refuses them',async()=>{
  const f=auditFixture(),op=await f.rehearse({Enabled:true}),count=f.calls.length;setObserveOnly(true);assert.equal((await f.execute(op)).state,'BLOCKED');assert.equal(f.calls.length,count);setObserveOnly(false);f.changeDescription();const result=await f.execute(op);assert.equal(result.state,'MISMATCH');assert.equal(result.receipt.verification,'FAILED');
});
test('audit flag adapters refuse system/global events, mixed fields and identity substitution',async()=>{
  const f=auditFixture();assert.equal(isMetadataMutationRequest(compileRequest(catalog,'PUT /api/admin/v2/security/audit/event',{parameters:{...f.identity,source:'%System'},body:{Enabled:false}})),false);
  assert.equal(isMetadataMutationRequest(f.build({Enabled:true,Description:'after'})),false);
  const op=await f.rehearse({Enabled:true}),input={...op.plan,capability:{...op.plan.capability},preState:JSON.parse(op.plan.preStateFingerprint),parameters:{...op.plan.parameters,identity:{...f.identity,source:'%System'}},expiresAt:Date.now()+60000};assert.throws(()=>createOperationPlan(input),/OpsDeck fixture/u);
});
