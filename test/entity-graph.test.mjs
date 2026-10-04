import test from 'node:test';
import assert from 'node:assert/strict';
import {relationshipObservations,projectEntityGraph} from '../public/entity-graph.js';
import {createEvidenceCollection} from '../public/evidence-center.js';
import {DEFAULT_TARGET} from '../public/target-context.js?v=target-1';
const at='2026-10-04T08:00:00Z';
const ref=(kind,key)=>({domain:'access',kind,provider:'sysadmin-api-v2',key,scope:null,label:key,observedAt:at,targetRef:DEFAULT_TARGET});
function evidence(observations){return createEvidenceCollection(observations.map(o=>({id:o.id,targetRef:o.targetRef,kind:'read-observation',state:'PARTIAL',title:'Observed relationship',observedAt:o.observedAt,source:{identity:o.ref.provider},resource:o.ref,summary:'Observed relationships; no independent verification inferred.'})));}

test('graph projects observed user/role edges with admitted Evidence, retaining semantic identity and no ownership inference',()=>{
  const user={ref:ref('user-detail','operator'),relationships:{directRoles:[ref('roles','reader')],escalationRoles:null}};
  const role={ref:ref('role-detail','reader'),grantedRoles:null,resources:[{ref:ref('resources','%Admin_Operate'),permissions:'U'},{ref:ref('resources','empty'),permissions:''}]};
  const model={userDetails:{operator:user},roleDetails:{reader:role},packageInventory:{name:'unproven-owner'}};
  const before=JSON.stringify(model),observations=relationshipObservations(model),graph=projectEntityGraph(observations,evidence(observations));
  assert.deepEqual(graph.edges.map(e=>e.relationship),['has-role','grants']);
  assert.equal(graph.edges[0].fromRef.kind,'users');assert.equal(graph.edges[1].fromRef.kind,'roles');
  assert.ok(graph.edges.every(e=>e.evidenceState==='PARTIAL'&&e.evidenceRef));assert.equal(graph.nodes.length,3);
  assert.equal(JSON.stringify(model),before);assert.ok(!graph.edges.some(e=>e.relationship==='owns'));
});

test('graph withholds unsupported, missing-evidence and cross-target links rather than asserting them',()=>{
  const observations=relationshipObservations({userDetails:{u:{ref:ref('user-detail','u'),relationships:{directRoles:[ref('roles','r')]}}}});
  assert.equal(projectEntityGraph(observations,createEvidenceCollection([])).edges.length,0);
  const crossed={...observations[0],links:[{relationship:'has-role',toRef:{...ref('roles','r'),targetRef:{id:'qa',origin:'http://qa.invalid',label:'QA',environment:'QA'}}}]};
  const graph=projectEntityGraph([crossed],evidence(observations));assert.equal(graph.edges.length,0);assert.equal(graph.withheld,1);
  assert.equal(projectEntityGraph(observations,{records:evidence(observations).records.map(r=>({...r,state:'DENIED'}))}).edges.length,0);
});

test('graph distinguishes configured dispatch references from class existence and bounds large relationship projections',()=>{
  const observations=relationshipObservations({apps:[{ref:{...ref('web-app','/app'),domain:'applications',scope:'USER'},namespace:'USER',dispatchClass:'Sample.Dispatch'}]});
  const graph=projectEntityGraph(observations,evidence(observations));assert.equal(graph.edges[0].relationship,'dispatches-to');
  assert.equal(graph.edges[0].toRef.scope,'USER');assert.ok(graph.nodes.every(node=>node.state==='REFERENCED'));
  const bounded=relationshipObservations({userDetails:{u:{ref:ref('user-detail','u'),relationships:{directRoles:Array.from({length:1000},(_,i)=>ref('roles',`r${i}`))}}}});
  assert.equal(bounded[0].links.length,100);
  assert.equal(projectEntityGraph(bounded,evidence(bounded)).truncated,true);
});

test('typed application detail supplies dispatch evidence and supersedes an earlier list relationship',()=>{
  const application={ref:{...ref('web-app','/app'),domain:'applications',scope:'USER'},name:'/app',namespace:'USER',dispatchClass:'Earlier.Dispatch'};
  const detail={ref:{...application.ref,kind:'web-app-detail'},values:{DispatchClass:'Current.Dispatch'}};
  const model={apps:[application],webAppDetails:{'/app':detail}},before=JSON.stringify(model);
  const observations=relationshipObservations(model),graph=projectEntityGraph(observations,evidence(observations));
  assert.equal(graph.edges.length,1);assert.equal(graph.edges[0].toRef.key,'Current.Dispatch');assert.equal(graph.edges[0].fromRef.kind,'web-app');
  assert.equal(JSON.stringify(model),before);
  detail.values.DispatchClass='';
  assert.equal(relationshipObservations(model).length,0,'observed cleared dispatch does not resurrect the earlier list value');
  delete detail.values.DispatchClass;
  assert.equal(relationshipObservations(model).length,0,'an unobserved detail field does not establish a current dispatch');
  detail.values.DispatchClass='Foreign.Dispatch';detail.ref={...detail.ref,targetRef:{id:'qa',origin:'http://qa.invalid',label:'QA',environment:'QA'}};
  assert.equal(relationshipObservations(model).length,0,'foreign target detail is not merged into the current application observation');
  detail.ref={...application.ref,kind:'web-app-detail',key:'/other'};
  assert.equal(relationshipObservations(model).length,0,'different application identity is not merged');
});
