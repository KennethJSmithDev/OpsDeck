import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkflow,createWorkflowRunner} from '../public/workflow-engine.js';
import {createOperationPlan,OPERATION_POLICIES,setObserveOnly} from '../public/operation-engine.js?v=opsdeck-0.8.0-ipm';
import {DEFAULT_TARGET} from '../public/target-context.js?v=target-1';
const target={domain:'applications',kind:'web-app',provider:'iris-admin-api',key:'/fixture',scope:'USER',label:'/fixture',targetRef:DEFAULT_TARGET,observedAt:'2026-10-04T08:00:00Z'};
function setup(outcome='ACCEPTED'){
  let writes=0;const records=[];
  const workflow=createWorkflow({id:`fixture:${outcome}`,operationId:'webapp.disable',target});
  const provider={identity:'fixture:workflow',targetProvider:'iris-admin-api',targetRef:DEFAULT_TARGET,readPreState:async()=>({enabled:true}),checkAuthority:async()=>({state:'SUPPORTED',evidence:'fixture:authority'}),dispatch:async()=>{writes++;return {state:outcome};},readBack:async()=>({enabled:false}),verifyReadback:()=>({supported:true,matched:true})};
  const runner=createWorkflowRunner({observe:async()=>({state:'OBSERVED',targetRef:DEFAULT_TARGET,value:{enabled:true}}),rehearse:async()=>({state:'REVIEW_REQUIRED',provider,plan:createOperationPlan({id:`plan:${outcome}`,intent:'Fixture disable',target,capability:{id:'webapp.disable',state:'SUPPORTED',...OPERATION_POLICIES['webapp.disable']},parameters:{enabled:false},preState:{enabled:true},authorityValidation:{state:'SUPPORTED',evidence:'fixture:authority'},expectedReadback:'Enabled=false',expiresAt:Date.now()+60000})}),onEvidence:record=>records.push(record)});
  return {workflow,runner,records,writes:()=>writes};
}
const confirmation=plan=>({confirmed:true,planId:plan.id,preStateFingerprint:plan.preStateFingerprint});

test('workflow composes observe/rehearse/exact confirmation/executor read-back without dispatching during start',async()=>{
  const fixture=setup();const review=await fixture.runner.start(fixture.workflow);
  assert.equal(review.state,'AWAITING_CONFIRMATION');assert.equal(fixture.writes(),0);
  assert.deepEqual(fixture.workflow.steps.map(s=>s.kind),['observe','rehearse','confirm','execute','verify']);
  await assert.rejects(fixture.runner.confirm({...confirmation(review.plan),planId:'other'}),/Exact/u);
  const completed=await fixture.runner.confirm(confirmation(review.plan));
  assert.equal(completed.state,'VERIFIED');assert.equal(completed.receipt.verification,'VERIFIED');assert.equal(fixture.writes(),1);
  assert.deepEqual(fixture.records.map(r=>r.kind),['read-observation','operation-plan','confirmation','operation-receipt']);
  await assert.rejects(fixture.runner.confirm(confirmation(review.plan)),/reviewed/u);assert.equal(fixture.writes(),1);
});

test('Observe Only permits workflow rehearsal but the executor prevents dispatch and records refusal',async()=>{
  setObserveOnly(true);
  try{const fixture=setup(),review=await fixture.runner.start(fixture.workflow);assert.equal(review.state,'AWAITING_CONFIRMATION');
    const result=await fixture.runner.confirm(confirmation(review.plan));assert.equal(result.state,'BLOCKED');assert.equal(result.reason,'observe-only-policy');assert.equal(fixture.writes(),0);
    assert.deepEqual(fixture.records.map(r=>r.kind),['read-observation','operation-plan','refusal']);
  }finally{setObserveOnly(false);}
});

test('workflow input cannot introduce arbitrary code, cloned workflows or unqualified operations',async()=>{
  assert.throws(()=>createWorkflow({id:'bad',operationId:'arbitrary.fetch',target}));
  assert.throws(()=>createWorkflow({id:'bad',operationId:'webapp.disable',target,steps:[{code:'arbitrary'}]}));
  const fixture=setup();await assert.rejects(fixture.runner.start({...fixture.workflow}),/Canonical/u);
  assert.equal(fixture.writes(),0);
});

test('workflow preserves ambiguous outcomes without retry or fabricated receipt and cancellation prevents late rehearsal',async()=>{
  const fixture=setup('AMBIGUOUS'),review=await fixture.runner.start(fixture.workflow),result=await fixture.runner.confirm(confirmation(review.plan));
  assert.equal(result.state,'AMBIGUOUS');assert.equal(result.receipt,null);assert.equal(fixture.writes(),1);
  await assert.rejects(fixture.runner.confirm(confirmation(review.plan)));assert.equal(fixture.writes(),1);
  let finish,plans=0;const runner=createWorkflowRunner({observe:()=>new Promise(resolve=>{finish=resolve;}),rehearse:()=>plans++});
  const pending=runner.start(fixture.workflow);runner.cancel();finish({state:'OBSERVED',targetRef:DEFAULT_TARGET});await pending;
  assert.equal(runner.snapshot().state,'CANCELLED');assert.equal(plans,0);
});
