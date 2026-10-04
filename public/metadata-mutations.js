import {METADATA_MUTATION_FAMILIES,OPERATION_POLICIES,createOperationPlan,createWebAppOperationProvider,verifyMetadataMutationReadback} from './operation-engine.js?v=opsdeck-0.8.0-ipm';
import {requestPreview} from './sysadmin-explorer.js?v=sysadmin-1';
import {createTargetRef,getTargetRef,sameTarget} from './target-context.js?v=target-1';

const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const cleanText=(value,max=256)=>typeof value==='string'&&value.length<=max&&!/[\u0000-\u001f\u007f]/u.test(value);
const stable=value=>Array.isArray(value)?`[${value.map(stable).join(',')}]`:record(value)?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`:JSON.stringify(value);
export function metadataMutationFamily(request){
  requestPreview(request); // Admit only the existing schema compiler's branded request.
  if(request.method==='PUT'&&request.operation.id==='PUT /api/admin/v2/security/audit/event'&&record(request.body)&&Object.keys(request.body).length===1&&typeof request.body.Enabled==='boolean'&&/^OpsDeckFixture[A-Za-z0-9_.-]*$/u.test(new URL(request.path,'http://opsdeck.invalid').searchParams.get('source')||''))return 'auditEvent';
  if(request.method!=='PUT'||!record(request.body)||Object.keys(request.body).length!==1||!Object.hasOwn(request.body,'Description')||!cleanText(request.body.Description))return null;
  return Object.entries(METADATA_MUTATION_FAMILIES).find(([,family])=>request.operation.id===`PUT ${family.path}`)?.[0]||null;
}
export const isMetadataMutationRequest=request=>metadataMutationFamily(request)!==null;
function identityFor(plan,family){
  const identity=plan.parameters?.identity;
  if(!record(identity)||Object.keys(identity).length!==family.identityKeys.length||family.identityKeys.some(key=>typeof identity[key]!=='string'||!/^[A-Za-z%_][A-Za-z0-9_.%-]{0,63}$/u.test(identity[key]))||plan.target.key!==new URLSearchParams(identity).toString())throw new Error('Metadata identity binding invalid.');
  return identity;
}
function invariantProjection(value,familyId,field){
  if(familyId==='auditEvent'){if(typeof value.Enabled!=='boolean'||!cleanText(value.Description))throw new Error('Complete custom event detail required.');return field==='enabled'?{Description:value.Description}:{Enabled:value.Enabled};}
  if(familyId==='sslConfig'){if(typeof value.Enabled!=='boolean'||!Number.isInteger(value.Type)||!Number.isInteger(value.VerifyPeer))throw new Error('Complete observed SSL mode/verification invariants required.');return {Enabled:value.Enabled,Type:value.Type,VerifyPeer:value.VerifyPeer};}
  if(familyId==='resource'){
    if(!cleanText(value.PublicPermission,32))throw new Error('Complete observed public permission required.');
    return {PublicPermission:value.PublicPermission};
  }
  if(typeof value.EscalationOnly!=='boolean'||!Array.isArray(value.GrantedRoles)||value.GrantedRoles.length>32||!Array.isArray(value.Resources)||value.Resources.length>32)throw new Error('Complete observed role invariants required.');
  const GrantedRoles=value.GrantedRoles.map(name=>{if(!cleanText(name,128)||!name)throw new Error('Role grant identity invalid.');return name;}).sort();
  const Resources=value.Resources.map(item=>{if(!record(item)||!cleanText(item.Name,128)||!item.Name||!cleanText(item.Permissions,32))throw new Error('Resource grant invalid.');return {Name:item.Name,Permissions:item.Permissions};}).sort((a,b)=>a.Name.localeCompare(b.Name)||a.Permissions.localeCompare(b.Permissions));
  if(new Set(GrantedRoles).size!==GrantedRoles.length||new Set(Resources.map(item=>item.Name)).size!==Resources.length)throw new Error('Ambiguous observed grants.');
  return {EscalationOnly:value.EscalationOnly,GrantedRoles,Resources};
}
async function projectDetail(payload,identity,familyId,field){
  if(!record(payload)||!record(payload.status)||payload.status.errors!=null&&(!Array.isArray(payload.status.errors)||payload.status.errors.length)||!record(payload.result)||payload.result.Name!==undefined&&payload.result.Name!==identity.name||!cleanText(payload.result.Description))throw new Error('Complete same-identity metadata detail required.');
  const invariant=invariantProjection(payload.result,familyId,field),bytes=new TextEncoder().encode(stable(invariant));
  if(bytes.length>16384)throw new Error('Invariant projection exceeds bound.');
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return {[field]:field==='enabled'?payload.result.Enabled:payload.result.Description,guard:Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')};
}
export function createMetadataMutationProvider({familyId,requestJson,username,targetRef=getTargetRef(),action='description'}){
  const family=METADATA_MUTATION_FAMILIES[familyId],capabilityId=action==='description'?`sysadmin.metadata.${familyId}.description`:`sysadmin.auditEvent.${action}`,field=action==='description'?'description':'enabled';
  if(!family||typeof requestJson!=='function'||!['description','enable','disable'].includes(action)||action!=='description'&&familyId!=='auditEvent')throw new Error('Registered metadata provider required.');
  const authorityProvider=createWebAppOperationProvider({requestJson,username,targetRef});
  const path=plan=>{
    if(plan.capability.id!==capabilityId||plan.target.provider!=='iris-sysadmin-metadata-v1'||plan.target.kind!==family.kind||!sameTarget(plan.targetRef,targetRef))throw new Error('Metadata provider plan mismatch.');
    const identity=identityFor(plan,family);if(action!=='description'&&(!/^OpsDeckFixture[A-Za-z0-9_.-]*$/u.test(identity.source)||typeof plan.parameters.enabled!=='boolean'||plan.parameters.enabled!==(action==='enable')))throw new Error('Only reviewed fixture event flags supported.');
    if(action==='description'&&!cleanText(plan.parameters.description))throw new Error('Reviewed bounded description required.');
    return family.path+'?'+new URLSearchParams(identity);
  };
  const read=async plan=>projectDetail(await requestJson(path(plan)),identityFor(plan,family),familyId,field);
  return Object.freeze({identity:`iris-sysadmin-metadata-${familyId}-${action}-v1`,targetProvider:'iris-sysadmin-metadata-v1',targetRef:createTargetRef(targetRef),
    readPreState:read,readBack:read,checkAuthority:()=>authorityProvider.checkAuthority(),verifyReadback:verifyMetadataMutationReadback,
    dispatch:async plan=>{
      try{
        const payload=await requestJson(path(plan),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({[field==='enabled'?'Enabled':'Description']:plan.parameters[field]})});
        if(!record(payload)||!record(payload.status)||payload.status.errors!=null&&(!Array.isArray(payload.status.errors)||payload.status.errors.length))return {state:'FAILED',reason:'iris-rejected-metadata-update'};
        return {state:'ACCEPTED',status:'put-description-accepted'};
      }catch(error){
        if(error?.status===401||error?.status===403)return {state:'DENIED',reason:'iris-denied-metadata-update'};
        if(Number.isInteger(error?.status)&&error.status>=400&&error.status<500)return {state:'FAILED',reason:'iris-rejected-metadata-update'};
        return {state:'AMBIGUOUS',reason:'metadata-dispatch-result-ambiguous'};
      }
    },
  });
}
export async function rehearseMetadataMutation(request,{requestJson,username,targetRef=getTargetRef()}){
  const familyId=metadataMutationFamily(request);if(!familyId)throw new Error('Description-only compiled mutation required.');
  const action=typeof request.body.Enabled==='boolean'?(request.body.Enabled?'enable':'disable'):'description',field=action==='description'?'description':'enabled';
  const family=METADATA_MUTATION_FAMILIES[familyId],id=action==='description'?`sysadmin.metadata.${familyId}.description`:`sysadmin.auditEvent.${action}`,policy=OPERATION_POLICIES[id];
  const query=new URL(request.path,'http://opsdeck.invalid').searchParams;
  if(query.size!==family.identityKeys.length||family.identityKeys.some(key=>query.getAll(key).length!==1))throw new Error('Exact declared metadata identity required.');
  const identity=Object.fromEntries(family.identityKeys.map(key=>[key,query.get(key)]));
  const target={domain:policy.targetDomain,kind:policy.targetKind,provider:policy.targetProvider,key:new URLSearchParams(identity).toString(),label:`${family.kind} ${family.identityKeys.map(key=>identity[key]).join(' / ')}`,observedAt:new Date().toISOString()};
  const provider=createMetadataMutationProvider({familyId,requestJson,username,targetRef,action}),parameters={[field]:request.body[field==='enabled'?'Enabled':'Description'],identity};
  const provisional={target,parameters,targetRef:provider.targetRef,capability:{id}};
  let preState;
  try{preState=await provider.readPreState(provisional);}catch(error){return {state:error?.status===401||error?.status===403?'DENIED':error?.status===404?'ABSENT':'UNAVAILABLE',reason:'complete-existing-metadata-prestate-required',provider,preview:requestPreview(request)};}
  const authority=await provider.checkAuthority();
  if(authority.state!=='SUPPORTED')return {state:authority.state,reason:'existing-secure-use-authority-required',provider,preview:requestPreview(request)};
  const plan=createOperationPlan({id:`metadata:${familyId}:${Date.now()}`,intent:`Update ${target.label} ${field}`,target,targetRef:provider.targetRef,
    capability:{id,state:'SUPPORTED',...policy},parameters,preState,authorityValidation:authority,preStateEvidence:`iris-admin-api:${familyId}:description-and-invariants`,
    preconditions:[{claim:'Existing entity and complete observed authority invariants',observed:true,evidence:`iris-admin-api:${familyId}:description-and-invariants`}],
    expectedReadback:`${field} equals the reviewed value; observed invariant guard remains unchanged`,expiresAt:Date.now()+120000});
  return {state:'REVIEW_REQUIRED',plan,provider,preview:requestPreview(request)};
}
