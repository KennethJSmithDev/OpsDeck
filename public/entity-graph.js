import {createTargetRef,getTargetRef,sameTarget,semanticIdentity} from './target-context.js?v=target-1';

const relationships=new Set(['has-role','escalates-to-role','grants-role','grants','dispatches-to','runs-in','owns']);
const detailKinds={user:'users',role:'roles',task:'tasks',application:'web-app'};

// A projection of existing observations, never a relationship database or authority source.
export function relationshipObservations(model){
  const observations=[];let truncated=false;
  const add=(kind,detail,links)=>{
    if(!detail?.ref?.observedAt||!links.length)return;
    if(observations.length>=100){truncated=true;return;}
    if(links.length>100)truncated=true;
    const ref=detailKinds[kind]?{...detail.ref,kind:detailKinds[kind]}:detail.ref;
    const targetRef=createTargetRef(detail.targetRef||ref.targetRef||model.targetRef||getTargetRef());
    observations.push(Object.freeze({id:`session:relationships:${kind}:${observations.length}`,ref,targetRef,observedAt:ref.observedAt,links:Object.freeze(links.slice(0,100))}));
  };
  for(const detail of Object.values(model.userDetails||{}))add('user',detail,[
    ...(detail.relationships?.directRoles||[]).map(toRef=>({relationship:'has-role',toRef})),
    ...(detail.relationships?.escalationRoles||[]).map(toRef=>({relationship:'escalates-to-role',toRef})),
  ]);
  for(const detail of Object.values(model.roleDetails||{}))add('role',detail,[
    ...(detail.grantedRoles||[]).map(toRef=>({relationship:'grants-role',toRef})),
    ...(detail.resources||[]).filter(item=>typeof item.permissions==='string'&&item.permissions.length>0).map(item=>({relationship:'grants',toRef:item.ref})),
  ]);
  for(const item of model.apps||[]){
    if(!item.ref)continue;
    const detail=model.webAppDetails?.[item.name];
    if(detail&&(!detail.ref?.observedAt||detail.ref.key!==item.ref.key||detail.ref.scope!==item.ref.scope||!sameTarget(detail.ref.targetRef,item.ref.targetRef)))continue;
    const observation=detail||{ref:item.ref,targetRef:item.targetRef},dispatch=detail?detail.values?.DispatchClass:item.dispatchClass;
    if(typeof dispatch!=='string'||!dispatch.trim())continue;
    add('application',observation,[{relationship:'dispatches-to',toRef:{domain:'system',kind:'class',provider:'iris-admin-api',key:dispatch,scope:observation.ref.scope,label:dispatch,targetRef:observation.ref.targetRef}}]);
  }
  for(const detail of Object.values(model.taskDetails||{})){
    const namespace=detail.ref?.scope;
    if(typeof namespace!=='string'||!namespace)continue;
    add('task',detail,[{relationship:'runs-in',toRef:{domain:'system',kind:'namespaces',provider:'sysadmin-api-v2',key:namespace,scope:null,label:namespace,targetRef:detail.targetRef||detail.ref.targetRef}}]);
  }
  Object.defineProperty(observations,'truncated',{value:truncated});return Object.freeze(observations);
}

export function projectEntityGraph(observations,evidenceCollection){
  if(!Array.isArray(observations)||!Array.isArray(evidenceCollection?.records))throw new Error('Observed relationships and current-session Evidence required.');
  const evidence=new Map(evidenceCollection.records.map(record=>[record.id,record]));
  const nodes=new Map(),edges=[],edgeKeys=new Set();let withheld=0,truncated=observations.length>100||observations.truncated===true;
  const node=(ref,targetRef)=>{
    semanticIdentity(ref);
    if(ref.targetRef&&!sameTarget(ref.targetRef,targetRef))throw new Error('Cross-target relationship refused.');
    const key=JSON.stringify([targetRef.id,targetRef.origin,targetRef.environment,semanticIdentity(ref)]);
    if(!nodes.has(key)){
      if(nodes.size>=256)throw new Error('Graph node bound reached.');
      nodes.set(key,Object.freeze({ref,targetRef,state:'REFERENCED'}));
    }
    return key;
  };
  for(const observation of observations.slice(0,100)){
    const record=evidence.get(observation.id);
    if(!record||record.kind!=='read-observation'||!['PARTIAL','VERIFIED'].includes(record.state)||!sameTarget(record.targetRef,observation.targetRef)){withheld++;continue;}
    for(const link of (observation.links||[]).slice(0,100)){
      if(edges.length>=512){truncated=true;break;}
      try{
        if(!relationships.has(link.relationship))throw new Error('Unknown relationship.');
        const from=node(observation.ref,observation.targetRef),to=node(link.toRef,observation.targetRef);
        const key=JSON.stringify([link.relationship,from,to,record.id]);
        if(edgeKeys.has(key))continue;
        edgeKeys.add(key);edges.push(Object.freeze({relationship:link.relationship,fromRef:nodes.get(from).ref,toRef:nodes.get(to).ref,targetRef:observation.targetRef,evidenceRef:record.id,evidenceState:record.state}));
      }catch{withheld++;}
    }
  }
  return Object.freeze({nodes:Object.freeze([...nodes.values()]),edges:Object.freeze(edges),withheld,truncated,basis:'Relationships project existing observations and Evidence. Referenced entities are not independently resolved; graph edges grant no authority.'});
}
