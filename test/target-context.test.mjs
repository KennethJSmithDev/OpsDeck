import test from 'node:test';
import assert from 'node:assert/strict';
import {createTargetRef,DEFAULT_TARGET,configureCurrentTarget,getTargetRef,readAcrossTargets,compareTargetObservations,targetChoices} from '../public/target-context.js?v=target-1';
import {mapReadOnlySource,sameReadOnlySource} from '../src/iris-provider.js';
import {createEvidenceCollection,operationReceiptEvidence} from '../public/evidence-center.js';
import {createOperationPlan,executeOperationPlan,OPERATION_POLICIES} from '../public/operation-engine.js';
const ref={domain:'applications',kind:'web-app',provider:'iris-admin-api',key:'/app/foo',scope:'USER'};
const qa=createTargetRef({id:'qa',label:'QA',origin:'http://qa.invalid',environment:'QA'});
test('target references are bounded, credential-free and retain default single-target behavior',()=>{
  assert.deepEqual(getTargetRef(),DEFAULT_TARGET);
  assert.throws(()=>createTargetRef({...qa,origin:'http://name:private@qa.invalid'}));
  assert.throws(()=>createTargetRef({...qa,origin:'http://qa.invalid/path'}));
  assert.equal(targetChoices().filter(t=>t.origin!==null).length,1);
  assert.equal(Object.isFrozen(qa),true);
  const first=mapReadOnlySource('users',{status:{errors:[]},result:[{Name:'observed'}]});
  assert.equal(first.targetRef.id,'local');assert.equal(first.items[0].ref.targetRef.id,'local');
  try{
    configureCurrentTarget(qa);
    const second=mapReadOnlySource('users',{status:{errors:[]},result:[{Name:'observed'}]});
    assert.equal(second.targetRef.id,'qa');assert.equal(sameReadOnlySource(first,second),false);
  }finally{configureCurrentTarget(DEFAULT_TARGET);}
});
test('multi-target reads keep denial, empty and values separate; comparison uses the same SemanticRef',async()=>{
  const prod=createTargetRef({id:'prod',label:'PROD',origin:'http://prod.invalid',environment:'PROD'});
  const dev=createTargetRef({id:'dev',label:'DEV',origin:'http://dev.invalid',environment:'DEV'});
  const targets=[prod,qa,dev,DEFAULT_TARGET];
  const observed=await readAcrossTargets(targets,ref,{
    prod:async()=>({state:'VERIFIED',value:{enabled:true}}),
    qa:async()=>{throw Object.assign(new Error('denied'),{status:403});},
    dev:async()=>({state:'EMPTY'}),
    local:async()=>({state:'OBSERVED',value:{enabled:false}}),
  });
  assert.deepEqual(observed.map(o=>o.state),['VERIFIED','DENIED','EMPTY','OBSERVED']);
  assert.deepEqual(compareTargetObservations(observed,ref).differences,['enabled']);
  assert.throws(()=>compareTargetObservations(observed,{...ref,key:'/other'}));
  const unconfigured=await readAcrossTargets(targetChoices(),ref,{});
  assert.ok(unconfigured.every(o=>o.state==='UNAVAILABLE'));
});
test('cross-target plans refuse before provider access and receipts/Evidence retain the original target',async()=>{
  const target={...ref,label:ref.key,observedAt:new Date().toISOString(),targetRef:qa};
  const plan=createOperationPlan({id:'test:target',intent:'Rehearse disable',target,capability:{id:'webapp.disable',state:'SUPPORTED',...OPERATION_POLICIES['webapp.disable']},parameters:{enabled:false},preState:{enabled:true},authorityValidation:{state:'SUPPORTED',evidence:'test:authority'},expectedReadback:'Enabled false',expiresAt:Date.now()+60000});
  let calls=0;const result=await executeOperationPlan(plan,{identity:'test',targetRef:DEFAULT_TARGET,readPreState:()=>calls++},{providerIdentity:'test'});
  assert.equal(result.reason,'target-binding-mismatch');assert.equal(calls,0);
  const receipt={id:'test:receipt',operationId:plan.id,intent:plan.intent,target:plan.target,targetRef:plan.targetRef,verification:'VERIFIED',provider:'test',timestamps:{completedAt:new Date().toISOString()}};
  const record=operationReceiptEvidence(receipt);
  assert.deepEqual(record.targetRef,qa);
  assert.deepEqual(createEvidenceCollection([record]).records[0].targetRef,qa);
});

test('changing the selected target during authority validation prevents dispatch of an exactly confirmed plan',async()=>{
  const plan=createOperationPlan({id:'test:target-race',intent:'Rehearse disable',target:{...ref,label:ref.key,observedAt:new Date().toISOString()},capability:{id:'webapp.disable',state:'SUPPORTED',...OPERATION_POLICIES['webapp.disable']},parameters:{enabled:false},preState:{enabled:true},authorityValidation:{state:'SUPPORTED',evidence:'test:authority'},expectedReadback:'Enabled false',expiresAt:Date.now()+60000});
  let dispatches=0;
  const provider={identity:'test:target-race',targetProvider:'iris-admin-api',targetRef:DEFAULT_TARGET,
    readPreState:async()=>({enabled:true}),checkAuthority:async()=>{configureCurrentTarget(qa);return {state:'SUPPORTED',evidence:'test:authority'};},
    dispatch:async()=>{dispatches++;return {state:'ACCEPTED'};},readBack:async()=>({enabled:false}),verifyReadback:()=>({verified:true})};
  try{
    const result=await executeOperationPlan(plan,provider,{providerIdentity:provider.identity,confirmation:{confirmed:true,planId:plan.id,preStateFingerprint:plan.preStateFingerprint}});
    assert.equal(result.reason,'target-binding-mismatch');assert.equal(dispatches,0);
  }finally{configureCurrentTarget(DEFAULT_TARGET);}
});
