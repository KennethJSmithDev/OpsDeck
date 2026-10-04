import {executeOperationPlan,isObserveOnly} from './operation-engine.js?v=opsdeck-0.8.0-ipm';
import {createTargetRef,getTargetRef,sameTarget,semanticIdentity} from './target-context.js?v=target-1';

const canonicalWorkflows=new WeakSet();
const workflowOperations=new Set(['webapp.enable','webapp.disable']);

export function createWorkflow(input){
  if(!input||Object.keys(input).some(key=>!['id','operationId','target'].includes(key))||typeof input.id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9:._-]{0,100}$/u.test(input.id)||!workflowOperations.has(input.operationId))throw new Error('Known workflow operation and bounded identity required.');
  const target=input.target;
  semanticIdentity(target);
  if(target.domain!=='applications'||target.kind!=='web-app'||target.provider!=='iris-admin-api'||target.key.length>512)throw new Error('Qualified web-application identity required.');
  const targetRef=createTargetRef(target.targetRef||getTargetRef());
  const workflow=Object.freeze({id:input.id,target:Object.freeze({domain:target.domain,kind:target.kind,provider:target.provider,key:target.key,scope:target.scope??null,label:typeof target.label==='string'?target.label:target.key,observedAt:target.observedAt,targetRef}),targetRef,operationId:input.operationId,
    steps:Object.freeze(['observe','rehearse','confirm','execute','verify'].map(kind=>Object.freeze({kind,operation:kind==='observe'?'GET /api/admin/v2/web-app':input.operationId}))) });
  canonicalWorkflows.add(workflow);return workflow;
}

// Adapters are compiled OpsDeck composition supplied by the application owner.
// Workflow data contains operation references, never executable code or transport URLs.
export function createWorkflowRunner({observe,rehearse,onEvidence=()=>{},isCurrent=()=>true}){
  if(typeof observe!=='function'||typeof rehearse!=='function'||typeof onEvidence!=='function'||typeof isCurrent!=='function')throw new Error('Trusted workflow adapters required.');
  let generation=0,active=null;
  const snapshot=()=>active?Object.freeze({workflow:active.workflow,state:active.state,step:active.step,reason:active.reason||'',plan:active.plan||null,receipt:active.result?.receipt||null}):null;
  const current=(run,token)=>active===run&&generation===token&&isCurrent();
  const record=(run,kind,result)=>onEvidence({workflow:run.workflow,kind,plan:run.plan||null,result});
  return Object.freeze({snapshot,
    async start(workflow){
      if(!canonicalWorkflows.has(workflow))throw new Error('Canonical workflow required.');
      if(active&&['OBSERVING','REHEARSING','EXECUTING'].includes(active.state))throw new Error('Workflow already in flight.');
      const token=++generation,run=active={workflow,state:'OBSERVING',step:'observe'};
      try{
        if(!sameTarget(getTargetRef(),workflow.targetRef))throw new Error('target-binding-mismatch');
        const observation=await observe(workflow);
        if(!current(run,token))return snapshot();
        if(!['OBSERVED','VERIFIED'].includes(observation?.state)||!sameTarget(observation.targetRef,workflow.targetRef)){
          run.state=['DENIED','EMPTY','ABSENT','UNAVAILABLE'].includes(observation?.state)?observation.state:'UNAVAILABLE';run.reason='workflow-observation-unresolved';record(run,'refusal',observation);return snapshot();
        }
        record(run,'read-observation',observation);
        if(!sameTarget(getTargetRef(),workflow.targetRef))throw new Error('target-binding-mismatch');
        run.state='REHEARSING';run.step='rehearse';
        const operation=await rehearse(workflow,observation);
        if(!current(run,token))return snapshot();
        if(operation?.state!=='REVIEW_REQUIRED'||!operation.plan||!operation.provider||typeof operation.provider.identity!=='string'||operation.plan.capability.id!==workflow.operationId||semanticIdentity(operation.plan.target)!==semanticIdentity(workflow.target)||!sameTarget(operation.plan.targetRef,workflow.targetRef)||!sameTarget(operation.provider.targetRef,workflow.targetRef)){
          run.state=['DENIED','BLOCKED','UNAVAILABLE','UNRESOLVED'].includes(operation?.state)?operation.state:'BLOCKED';run.reason=operation?.reason||'workflow-plan-unresolved';record(run,'refusal',operation);return snapshot();
        }
        run.plan=operation.plan;run.provider=operation.provider;run.state='AWAITING_CONFIRMATION';run.step='confirm';record(run,'operation-plan',operation);return snapshot();
      }catch(error){if(current(run,token)){run.state=error?.status===401||error?.status===403?'DENIED':'BLOCKED';run.reason=error?.message==='target-binding-mismatch'?'target-binding-mismatch':'workflow-adapter-unavailable';record(run,'refusal',{state:run.state,reason:run.reason});}return snapshot();}
    },
    async confirm(confirmation){
      const run=active,token=generation;
      if(!run||run.state!=='AWAITING_CONFIRMATION'||!isCurrent())throw new Error('Current reviewed workflow required.');
      if(confirmation?.confirmed!==true||confirmation.planId!==run.plan.id||confirmation.preStateFingerprint!==run.plan.preStateFingerprint)throw new Error('Exact human confirmation required.');
      if(!isObserveOnly())record(run,'confirmation',{state:'UNVERIFIED'});
      run.state='EXECUTING';run.step='execute';
      const result=await executeOperationPlan(run.plan,run.provider,{providerIdentity:run.provider.identity,isCurrent:()=>current(run,token),confirmation});
      if(!current(run,token))return snapshot();
      run.result=result;run.state=result.state;run.reason=result.reason||'';run.step=result.receipt?'verify':'execute';
      record(run,result.receipt?'operation-receipt':'refusal',result);return snapshot();
    },
    cancel(){
      generation++;
      if(active){active.reason=active.state==='EXECUTING'?'dispatch-outcome-unresolved-no-retry':'workflow-cancelled';active.state=active.state==='EXECUTING'?'AMBIGUOUS':'CANCELLED';}
      return snapshot();
    },
  });
}
