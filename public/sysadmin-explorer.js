import {createOperationPlan,createWebAppOperationProvider,OPERATION_POLICIES} from './operation-engine.js?v=opsdeck-0.8.0-ipm';
import {getTargetRef,sameTarget} from './target-context.js?v=target-1';

export const SYSADMIN_READER_CONTRACT='sysadmin-v2-bounded-reader-v1';
const secret=/password|secret|token|authorization|private.?key|credential|cookie|certificate|keymaterial/iu;
const withheld=/\/wallet\/secrets$|\/encryption\/(?:keys|data-element-keys|file\/keys)$|\/x509-credential\/certificate$/u;
const requests=new WeakSet();
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;}
export function isGenericReadable(operation){
  return operation.method==='GET'&&!withheld.test(operation.path)&&(operation.parameters||[]).every(p=>p.in==='query'&&['string','number','integer'].includes(p.schema?.type));
}
function schemaAt(schema,schemas,depth=0){
  if(depth>8)throw new Error('Schema reference depth exceeds the bound.');
  if(schema?.$ref){const name=schema.$ref.split('/').at(-1);if(!schemas[name])throw new Error('Schema reference is unavailable.');return schemaAt(schemas[name],schemas,depth+1);}
  if(schema?.allOf){const parts=schema.allOf.map(p=>schemaAt(p,schemas,depth+1));return {type:'object',properties:Object.assign({},...parts.map(p=>p.properties||{})),required:parts.flatMap(p=>p.required||[])};}
  return schema||{};
}
function validate(value,schema,schemas,depth=0){
  if(depth>5)throw new Error('Request body exceeds nesting bound.');
  schema=schemaAt(schema,schemas);
  if(schema.type==='object'){
    if(!plain(value))throw new Error('Request body must match an object schema.');
    if(Object.keys(value).length>64)throw new Error('Too many request fields.');
    for(const key of schema.required||[])if(!Object.hasOwn(value,key))throw new Error(`Required field: ${key}`);
    return Object.fromEntries(Object.entries(value).map(([key,item])=>{
      if(secret.test(key)||['__proto__','constructor','prototype'].includes(key))throw new Error('Sensitive request fields require a separately qualified provider.');
      const field=schema.properties?.[key];if(!field||field.readOnly)throw new Error(`Unsupported request field: ${key}`);
      return [key,validate(item,field,schemas,depth+1)];
    }));
  }
  if(schema.type==='array'){
    if(!Array.isArray(value)||value.length>32)throw new Error('Request array exceeds its bound.');
    return value.map(item=>validate(item,schema.items,schemas,depth+1));
  }
  if(schema.type==='string'){
    if(typeof value!=='string'||value.length>512||/[\u0000-\u001f\u007f]/u.test(value))throw new Error('Invalid bounded string.');
  }else if(schema.type==='boolean'){
    if(typeof value!=='boolean')throw new Error('Expected boolean.');
  }else if(['integer','number'].includes(schema.type)){
    if(typeof value!=='number'||!Number.isFinite(value)||(schema.type==='integer'&&!Number.isInteger(value)))throw new Error('Expected finite number.');
  }else throw new Error('Request schema type is not qualified.');
  if(schema.enum&&!schema.enum.includes(value))throw new Error('Value is outside the declared enumeration.');
  if(schema.minimum!==undefined&&value<schema.minimum||schema.maximum!==undefined&&value>schema.maximum)throw new Error('Value is outside declared bounds.');
  return value;
}
export function compileRequest(catalog,id,input={}){
  if(catalog?.schema!=='opsdeck-declared-api-catalog-v2')throw new Error('Provider metadata contract unavailable.');
  const operation=catalog.operations.find(op=>op.id===id);
  if(!operation||operation.id!==`${operation.method} ${operation.path}`||!/^\/api\/admin\/v2\/[a-zA-Z0-9/_-]+$/u.test(operation.path))throw new Error('Unknown canonical operation.');
  if(!['GET','POST','PUT','DELETE'].includes(operation.method))throw new Error('Method is not supported.');
  const parameters=input.parameters||{};if(!plain(parameters))throw new Error('Parameters must be plain JSON.');
  for(const key of Object.keys(parameters))if(!(operation.parameters||[]).some(p=>p.name===key))throw new Error('Unknown request parameter.');
  const query=new URLSearchParams();
  for(const p of operation.parameters||[]){
    if(p.in!=='query'||secret.test(p.name))throw new Error('Parameter transport requires a qualified provider.');
    let value=parameters[p.name];
    if(p.name==='maxRows'&&(value===undefined||value===''))value=20;
    if(value===undefined||value===''){if(p.required)throw new Error(`Required parameter: ${p.name}`);continue;}
    if(['number','integer'].includes(p.schema.type))value=Number(value);
    value=validate(value,p.schema,catalog.schemas);
    if(p.name==='maxRows'&&(!Number.isInteger(value)||value<1||value>100))throw new Error('maxRows must be 1–100.');
    query.set(p.name,String(value));
  }
  let body;
  if(input.body!==undefined){
    if(operation.method==='GET'||!operation.body)throw new Error('This operation has no declared JSON body.');
    body=validate(input.body,operation.body,catalog.schemas);
  }else if(operation.bodyRequired)throw new Error('Required JSON body is missing.');
  const request=freeze({operation,path:operation.path+(query.size?`?${query}`:''),method:operation.method,...(body!==undefined?{body}:{}),schemas:catalog.schemas});
  requests.add(request);return request;
}
export function requestPreview(request){
  if(!requests.has(request))throw new Error('Canonical provider request required.');
  return {operation:request.operation.id,method:request.method,path:request.path,...(request.body!==undefined?{body:request.body}:{}),requiredPrivileges:request.operation.requiredPrivileges};
}
function project(value,schema,schemas,stats,depth=0){
  if(depth>6){stats.truncated=true;return '[nesting bound]';}
  schema=schemaAt(schema,schemas);
  if(schema.type==='array'){
    if(!Array.isArray(value))throw new Error('Response does not match its declared array schema.');
    if(value.length>100)stats.truncated=true;
    return value.slice(0,100).map(item=>project(item,schema.items,schemas,stats,depth+1));
  }
  if(schema.type==='object'||schema.properties){
    if(!plain(value))throw new Error('Response does not match its declared object schema.');
    const output={};
    for(const [key,field]of Object.entries(schema.properties||{}))if(Object.hasOwn(value,key)){
      if(secret.test(key)||field.writeOnly){stats.redacted++;continue;}
      output[key]=project(value[key],field,schemas,stats,depth+1);
    }
    stats.withheld+=Object.keys(value).filter(key=>!Object.hasOwn(schema.properties||{},key)).length;
    return output;
  }
  if(value===null)return null;
  if(schema.type==='string'&&typeof value==='string'){if(value.length>512)stats.truncated=true;return value.replace(/[\u0000-\u001f\u007f]/gu,' ').slice(0,512);}
  if(schema.type==='boolean'&&typeof value==='boolean')return value;
  if(['number','integer'].includes(schema.type)&&typeof value==='number'&&Number.isFinite(value))return value;
  stats.withheld++;return '[undeclared value withheld]';
}
export async function observeRequest(request,requestJson){
  const targetRef=getTargetRef();
  if(!requests.has(request)||!isGenericReadable(request.operation))return {targetRef,state:'BLOCKED',reason:'read-contract-withheld'};
  try{
    const raw=await requestJson(request.path,{method:'GET'});
    if(!plain(raw)||!plain(raw.status)||!Object.hasOwn(raw,'result'))return {targetRef,state:'UNVERIFIED',reason:'response-envelope-unqualified'};
    if(raw.status.errors?.length)return {targetRef,state:'FAILED',reason:'iris-reported-errors'};
    const stats={redacted:0,withheld:0,truncated:false};
    const resultSchema=schemaAt(request.operation.response,request.schemas).properties?.result;
    if(!resultSchema)return {targetRef,state:'UNVERIFIED',reason:'response-result-contract-unqualified'};
    const value=project(raw.result,resultSchema,request.schemas,stats);
    if(new TextEncoder().encode(JSON.stringify(value)).length>65536)return {targetRef,state:'UNVERIFIED',reason:'response-projection-exceeds-64-kib'};
    return {targetRef,state:Array.isArray(value)&&value.length===0?'EMPTY':'OBSERVED',value,stats,observedAt:new Date().toISOString(),verification:'No independent verification inferred.'};
  }catch(error){return {targetRef,state:error?.status===401||error?.status===403?'DENIED':error?.status===404?'ABSENT':'UNAVAILABLE',reason:Number.isInteger(error?.status)?`http-${error.status}`:'response-or-provider-unavailable'};}
}
export async function rehearseRequest(request,{requestJson,username,resolveTarget}){
  if(!requests.has(request)||request.method==='GET')throw new Error('Canonical mutation request required.');
  // A schema establishes representation. Runtime policy/effects/read-back establish dispatch.
  if(request.operation.id!=='PUT /api/admin/v2/web-app'||!plain(request.body)||Object.keys(request.body).length!==1||typeof request.body.Enabled!=='boolean')
  {
    const policy=OPERATION_POLICIES['sysadmin.rehearse'];
    const plan=createOperationPlan({id:`sysadmin:${Date.now()}`,intent:`Rehearse ${request.operation.id}`,
      target:{domain:policy.targetDomain,kind:policy.targetKind,provider:policy.targetProvider,key:request.operation.path,label:request.operation.id,observedAt:new Date().toISOString()},
      capability:{id:'sysadmin.rehearse',state:'UNRESOLVED',...policy},
      parameters:{method:request.method,path:request.operation.path,query:Object.fromEntries(new URL(request.path,'http://opsdeck.invalid').searchParams),body:request.body??null},
      preState:{observed:false},authorityValidation:{state:'UNVERIFIED'},
      preconditions:[{claim:'Operation-specific authority, effect and read-back must be qualified',observed:'unknown'}],
      expectedReadback:'UNVERIFIED: operation-specific read-back contract required',expiresAt:Date.now()+120000});
    const refuse=()=>({state:'UNAVAILABLE',reason:'unqualified-mutation-policy-and-readback'});
    const provider=Object.freeze({identity:'iris-sysadmin-rehearsal-only-v1',targetProvider:policy.targetProvider,targetRef:plan.targetRef,readPreState:refuse,checkAuthority:refuse,dispatch:refuse,readBack:refuse,verifyReadback:()=>false});
    return {state:'BLOCKED',reason:'unqualified-mutation-policy-and-readback',plan,provider,preview:requestPreview(request)};
  }
  const name=new URL(request.path,'http://opsdeck.invalid').searchParams.get('name');
  const target=resolveTarget(name);
  if(!target)return {state:'BLOCKED',reason:'unique-observed-target-required'};
  const provider=createWebAppOperationProvider({requestJson,username});
  if(target.targetRef&&!sameTarget(target.targetRef,provider.targetRef))return {state:'BLOCKED',reason:'target-binding-mismatch'};
  const id=request.body.Enabled?'webapp.enable':'webapp.disable';
  const preState=await provider.readPreState({target,capability:{id}});
  const authority=await provider.checkAuthority();
  if(authority.state!=='SUPPORTED')return {state:authority.state,reason:'existing-authority-required'};
  const plan=createOperationPlan({id:`sysadmin:${Date.now()}`,intent:`${id} ${name}`,target,targetRef:provider.targetRef,
    capability:{id,state:'SUPPORTED',...OPERATION_POLICIES[id]},parameters:{enabled:request.body.Enabled},preState,
    preStateEvidence:'iris-admin-api:generic-webapp-detail',authorityValidation:authority,
    expectedReadback:`Enabled is ${request.body.Enabled}`,expiresAt:Date.now()+120000});
  return {state:'REVIEW_REQUIRED',plan,provider,preview:requestPreview(request)};
}
