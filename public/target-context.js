const environments=new Set(['LOCAL','DEV','QA','PROD','DEMO']);
export function createTargetRef(input){
  if(!input||typeof input!=='object'||!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/u.test(input.id))throw new Error('Target identity invalid.');
  if(typeof input.label!=='string'||!input.label.trim()||input.label.length>80||/[\u0000-\u001f\u007f]/u.test(input.label))throw new Error('Target label invalid.');
  if(!environments.has(input.environment))throw new Error('Target environment invalid.');
  let origin=input.origin;
  if(origin!==null&&origin!=='same-origin'){
    const url=new URL(origin);
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/'||url.origin!==origin)throw new Error('Target requires a canonical credential-free origin.');
    origin=url.origin;
  }
  return Object.freeze({id:input.id,label:input.label.trim(),origin,environment:input.environment});
}
export const DEFAULT_TARGET=createTargetRef({id:'local',label:'LOCAL',origin:'same-origin',environment:'LOCAL'});
let current=DEFAULT_TARGET;
export function getTargetRef(){return current;}
export function configureCurrentTarget(input){current=createTargetRef(input);return current;}
export function sameTarget(a,b){a=a||DEFAULT_TARGET;b=b||DEFAULT_TARGET;return a.id===b.id&&a.origin===b.origin&&a.environment===b.environment;}
export function targetChoices(local=current){
  return Object.freeze([createTargetRef(local),...['DEV','QA','PROD'].map(environment=>createTargetRef({id:environment.toLowerCase(),label:environment,origin:null,environment}))]);
}
export function semanticIdentity(ref){
  if(!ref||!['domain','kind','provider','key'].every(key=>typeof ref[key]==='string'&&ref[key]))throw new Error('Semantic identity required.');
  return JSON.stringify([ref.domain,ref.kind,ref.provider,ref.key,ref.scope??null]);
}
export async function readAcrossTargets(targets,semanticRef,readers){
  if(!Array.isArray(targets)||targets.length>8||new Set(targets.map(t=>t.id)).size!==targets.length)throw new Error('Target set exceeds its distinct bound.');
  const identity=semanticIdentity(semanticRef);
  return Object.freeze(await Promise.all(targets.map(async input=>{
    const targetRef=createTargetRef(input),reader=readers[targetRef.id];
    if(!targetRef.origin||typeof reader!=='function')return Object.freeze({targetRef,semanticIdentity:identity,state:'UNAVAILABLE',reason:'target-not-configured',observedAt:null});
    try{
      const observation=await reader(semanticRef,targetRef);
      if(!['OBSERVED','VERIFIED','EMPTY','DENIED','ABSENT','UNAVAILABLE','UNVERIFIED'].includes(observation?.state)||observation.targetRef&&!sameTarget(observation.targetRef,targetRef)||observation.semanticRef&&semanticIdentity(observation.semanticRef)!==identity)throw new Error('Independent target observation invalid.');
      return Object.freeze({...observation,targetRef,semanticIdentity:identity});
    }catch(error){return Object.freeze({targetRef,semanticIdentity:identity,state:error?.status===401||error?.status===403?'DENIED':'UNAVAILABLE',reason:'target-read-unavailable',observedAt:new Date().toISOString()});}
  })));
}
export function compareTargetObservations(observations,semanticRef){
  const identity=semanticIdentity(semanticRef);
  if(!Array.isArray(observations)||observations.length>8||observations.some(o=>o.semanticIdentity!==identity)||new Set(observations.map(o=>o.targetRef.id)).size!==observations.length)throw new Error('Same semantic identity and distinct target observations required.');
  const comparable=observations.filter(o=>['OBSERVED','VERIFIED'].includes(o.state)&&o.value&&typeof o.value==='object'&&!Array.isArray(o.value));
  const fields=[...new Set(comparable.flatMap(o=>Object.keys(o.value)))];
  const differences=fields.filter(key=>comparable.length>1&&new Set(comparable.map(o=>Object.hasOwn(o.value,key)?JSON.stringify(o.value[key]):'unobserved')).size>1);
  return Object.freeze({semanticRef,observations:Object.freeze([...observations]),differences:Object.freeze(differences),basis:'Separate target observations; no mirrored global truth or transaction.'});
}
