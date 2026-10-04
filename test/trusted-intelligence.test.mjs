import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateIntent,deterministicIntentProvider,createIntentProvider,reconstructIntentOperation,AI_PROFILES} from '../public/trusted-intelligence.js';
import {executeOperationPlan,OPERATION_POLICIES,setObserveOnly} from '../public/operation-engine.js?v=opsdeck-0.8.0-ipm';
import {DEFAULT_TARGET} from '../public/target-context.js?v=target-1';
const profileId='AI_PROFILE_ADMIN';
function envelope(){
  const at=new Date().toISOString();
  return {provider:'opsdeck-intent-rehearsal-v1',username:'operator',namespace:'%SYS',profileId,dispatchAllowed:0,trust:'server-reconstructed-current-iris-state',state:'REVIEW_REQUIRED',planInput:{
    id:'intent:fixture',intent:'AI rehearsal disable /app',target:{domain:'applications',kind:'web-app',provider:'iris-admin-api',key:'/app',scope:'USER',label:'/app',observedAt:at},targetRef:DEFAULT_TARGET,
    capability:{id:'webapp.disable',state:'SUPPORTED',...OPERATION_POLICIES['webapp.disable']},parameters:{enabled:false},preState:{enabled:true},createdAt:at,ttlSeconds:120,
    preStateEvidence:'native:observed',authorityValidation:{state:'SUPPORTED',evidence:'native:profile-human-policy'},expectedReadback:'Enabled is false',preconditions:[{claim:'Profile intersection',observed:true,evidence:'native:profile-human-policy'}],
  }};
}

test('provider output remains bounded data and cannot inject authority, profile choice or executable payload',async()=>{
  const candidate=await deterministicIntentProvider.propose('disable /app');assert.deepEqual(candidate,{operationId:'webapp.disable',targetKey:'/app'});
  assert.throws(()=>candidateIntent({...candidate,profileId}));assert.throws(()=>candidateIntent({operationId:'arbitrary.fetch',targetKey:'/app'}));
  await assert.rejects(deterministicIntentProvider.propose('do whatever is necessary'),/exact intent/u);
  const provider=createIntentProvider({id:'local',generateCandidate:async()=>({operationId:'webapp.disable',targetKey:'/app',authority:{state:'SUPPORTED'}})});
  await assert.rejects(provider.propose('anything'));assert.equal(AI_PROFILES.length,7);
});

test('server reconstruction creates a canonical rehearsal without dispatch and executor rechecks profile authority',async()=>{
  let nativeReads=0,writes=0;
  const candidate=candidateIntent({operationId:'webapp.disable',targetKey:'/app'});
  const requestJson=async(path,options={})=>{
    if(path==='/opsdeck-api/intent-rehearsal'){
      nativeReads++;assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{candidate:{operationId:'webapp.disable',targetKey:'/app'},profileId});
      return nativeReads===1?envelope():{...envelope(),state:'DENIED',reason:'ai-profile-operation-denied'};
    }
    if(options.method==='PUT')writes++;
    return {status:{errors:[]},result:{Enabled:true,NameSpace:'USER'}};
  };
  const operation=await reconstructIntentOperation(candidate,{profileId,username:'operator',requestJson});
  assert.equal(operation.state,'REVIEW_REQUIRED');assert.equal(writes,0);
  const result=await executeOperationPlan(operation.plan,operation.provider,{providerIdentity:operation.provider.identity,confirmation:{confirmed:true,planId:operation.plan.id,preStateFingerprint:operation.plan.preStateFingerprint}});
  assert.equal(result.state,'DENIED');assert.equal(nativeReads,2);assert.equal(writes,0);
});

test('forged response identity and policy risk refuse; Observe Only prevents dispatch even with exact confirmation',async()=>{
  const candidate=candidateIntent({operationId:'webapp.disable',targetKey:'/app'});
  await assert.rejects(reconstructIntentOperation({...candidate},{profileId,username:'operator',requestJson:()=>envelope()}),/Admitted/u);
  await assert.rejects(reconstructIntentOperation(candidate,{profileId,username:'operator',requestJson:()=>({...envelope(),username:'other'})}),/identity/u);
  await assert.rejects(reconstructIntentOperation(candidate,{profileId,username:'operator',requestJson:()=>{const response=envelope();response.planInput.capability.risk='READ';return response;}}),/policy/u);
  let calls=0;const operation=await reconstructIntentOperation(candidate,{profileId,username:'operator',requestJson:async()=>{calls++;return envelope();}});
  setObserveOnly(true);
  try{const result=await executeOperationPlan(operation.plan,operation.provider,{providerIdentity:operation.provider.identity,confirmation:{confirmed:true,planId:operation.plan.id,preStateFingerprint:operation.plan.preStateFingerprint}});
    assert.equal(result.reason,'observe-only-policy');assert.equal(calls,1);
  }finally{setObserveOnly(false);}
});

test('observation intents retain the selected transport target and do not mint a mutation plan',async()=>{
  const candidate=await deterministicIntentProvider.propose('inspect /app');
  const observation=await reconstructIntentOperation(candidate,{profileId,username:'operator',requestJson:async()=>({...envelope(),state:'OBSERVED',target:{key:'/app'},value:{enabled:true},observedAt:new Date().toISOString()})});
  assert.equal(observation.state,'OBSERVED');assert.equal(observation.value.enabled,true);assert.deepEqual(observation.targetRef,DEFAULT_TARGET);assert.equal(Object.hasOwn(observation,'plan'),false);
});

test('intent provider refuses direct dispatch, cloned plans and reuse without fresh server profile validation',async()=>{
  let writes=0;
  const operation=await reconstructIntentOperation(candidateIntent({operationId:'webapp.disable',targetKey:'/app'}),{
    profileId,username:'operator',requestJson:async(path,options={})=>{
      if(path==='/opsdeck-api/intent-rehearsal')return envelope();
      if(options.method==='PUT'){writes++;return {status:{errors:[]},result:{}};}
      return {status:{errors:[]},result:{Enabled:true,NameSpace:'USER'}};
    },
  });
  assert.equal((await operation.provider.dispatch(operation.plan)).state,'UNAVAILABLE');assert.equal(writes,0);
  assert.equal((await operation.provider.checkAuthority()).state,'SUPPORTED');
  assert.equal((await operation.provider.dispatch({...operation.plan})).state,'UNAVAILABLE');assert.equal(writes,0);
  assert.equal((await operation.provider.dispatch(operation.plan)).state,'ACCEPTED');assert.equal(writes,1);
  assert.equal((await operation.provider.dispatch(operation.plan)).state,'UNAVAILABLE');assert.equal(writes,1);
});
