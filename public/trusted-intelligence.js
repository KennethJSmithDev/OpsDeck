import {createOperationPlan,createWebAppOperationProvider,fingerprintPreState} from './operation-engine.js?v=opsdeck-0.8.0-ipm';
import {createTargetRef,getTargetRef,sameTarget} from './target-context.js?v=target-1';

export const INTENT_PROVIDERS=Object.freeze([
  {id:'deterministic',label:'Deterministic built-in',state:'AVAILABLE'},
  {id:'openai',label:'OpenAI',state:'UNCONFIGURED'},{id:'claude',label:'Claude',state:'UNCONFIGURED'},
  {id:'gemini',label:'Gemini',state:'UNCONFIGURED'},{id:'local',label:'Local / OpenAI-compatible',state:'UNCONFIGURED'},
].map(Object.freeze));
export const AI_PROFILES=Object.freeze(['USER','SUPPORT','ADMIN','DBA','SECURITY','PACKAGE_OPERATOR','AUDITOR'].map(name=>`AI_PROFILE_${name}`));
const candidateOperations=new Set(['webapp.observe','webapp.enable','webapp.disable']);
const intentCandidates=new WeakSet();

// Provider output stays data. Profile choice is a separate human input, never model authority.
export function candidateIntent(output){
  if(!output||Object.keys(output).length!==2||!candidateOperations.has(output.operationId)||typeof output.targetKey!=='string'||!/^\/[A-Za-z0-9_.%/-]{1,255}$/u.test(output.targetKey))throw new Error('Candidate intent requires an exact known operation and application identity.');
  const candidate=Object.freeze({operationId:output.operationId,targetKey:output.targetKey});intentCandidates.add(candidate);return candidate;
}
export function createIntentProvider({id,generateCandidate}){
  if(!INTENT_PROVIDERS.some(provider=>provider.id===id)||typeof generateCandidate!=='function')throw new Error('Known provider adapter required.');
  return Object.freeze({id,async propose(text){if(typeof text!=='string'||text.length>512)throw new Error('Intent text exceeds its bound.');return candidateIntent(await generateCandidate(text));}});
}
export const deterministicIntentProvider=createIntentProvider({id:'deterministic',generateCandidate:text=>{
  const match=/^\s*(inspect|observe|enable|disable)\s+(\/[A-Za-z0-9_.%/-]{1,255})\s*$/iu.exec(text);
  if(!match)throw new Error('Use an exact intent such as inspect /app, enable /app or disable /app.');
  return {operationId:['inspect','observe'].includes(match[1].toLowerCase())?'webapp.observe':`webapp.${match[1].toLowerCase()}`,targetKey:match[2]};
}});

export async function reconstructIntentOperation(candidate,{profileId,username,requestJson,targetRef=getTargetRef()}){
  if(!intentCandidates.has(candidate)||!AI_PROFILES.includes(profileId)||typeof requestJson!=='function')throw new Error('Admitted candidate and selected AI profile required.');
  const binding=createTargetRef(targetRef),payload=JSON.stringify({candidate:{...candidate},profileId});
  const readServer=()=>requestJson('/opsdeck-api/intent-rehearsal',{method:'POST',headers:{'Content-Type':'application/json'},body:payload});
  const response=await readServer();
  const valid=result=>result?.provider==='opsdeck-intent-rehearsal-v1'&&result.username===username&&result.namespace==='%SYS'&&result.profileId===profileId&&result.dispatchAllowed===0&&result.trust==='server-reconstructed-current-iris-state';
  if(!valid(response))throw new Error('Native intent reconstruction identity unavailable.');
  if(response.state==='OBSERVED'&&candidate.operationId==='webapp.observe'){
    if(response.target?.key!==candidate.targetKey||typeof response.value?.enabled!=='boolean')throw new Error('Native observation identity invalid.');
    return Object.freeze({state:'OBSERVED',targetRef:binding,target:response.target,observedAt:response.observedAt,value:Object.freeze({enabled:response.value.enabled}),profileId});
  }
  if(response.state!=='REVIEW_REQUIRED')return Object.freeze({state:response.state||'UNAVAILABLE',reason:response.reason||'native-intent-unresolved',targetRef:binding});
  const input=response.planInput;
  if(!input||input.target?.key!==candidate.targetKey||input.capability?.id!==candidate.operationId||input.targetRef?.id!==binding.id||input.ttlSeconds!==120)throw new Error('Native plan does not match the admitted intent.');
  const expiresAt=Date.parse(input.createdAt)+input.ttlSeconds*1000;
  const plan=createOperationPlan({id:input.id,intent:input.intent,target:input.target,targetRef:binding,capability:input.capability,parameters:input.parameters,
    preState:input.preState,preStateEvidence:input.preStateEvidence,authorityValidation:input.authorityValidation,preconditions:input.preconditions,expectedReadback:input.expectedReadback,expiresAt});
  const base=createWebAppOperationProvider({requestJson,username,targetRef:binding});
  let profileConfirmed=false;
  const provider=Object.freeze({...base,identity:'iris-native-intent-webapp-provider-v1',checkAuthority:async()=>{
    profileConfirmed=false;
    if(!sameTarget(getTargetRef(),binding))return {state:'UNVERIFIED'};
    try{
      const current=await readServer();
      if(!valid(current)||current.state!=='REVIEW_REQUIRED')return {state:current?.state==='DENIED'?'DENIED':'UNVERIFIED'};
      if(current.planInput?.target?.key!==plan.target.key||current.planInput?.capability?.id!==plan.capability.id||fingerprintPreState(current.planInput.preState)!==plan.preStateFingerprint)return {state:'UNVERIFIED'};
      profileConfirmed=current.planInput.authorityValidation?.state==='SUPPORTED';return current.planInput.authorityValidation;
    }catch(error){return {state:error?.status===401||error?.status===403?'DENIED':'UNVERIFIED'};}
  },dispatch:async proposedPlan=>{
    if(!profileConfirmed||proposedPlan!==plan||Date.now()>=Date.parse(plan.expiresAt))return {state:'UNAVAILABLE',reason:'server-profile-revalidation-required'};
    profileConfirmed=false;
    const outcome=await base.dispatch(plan);
    return outcome.state==='ACCEPTED'?{...outcome,warnings:[`Server-owned ${profileId} intersected current human authority and operation policy before dispatch.`]}:outcome;
  }});
  return Object.freeze({state:'REVIEW_REQUIRED',plan,provider,profileId});
}
