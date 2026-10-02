import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as provider from '../src/iris-provider.js';
import * as evidence from '../public/evidence-center.js';
import * as packages from '../public/packages-workspace.js';
const source=(await readFile(new URL('../public/app.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'');
function fixture(fetch,pathname='/opsdeck/index.html'){
 const rows=[]; const el={innerHTML:'',querySelector:()=>null,querySelectorAll:sel=>sel==='[data-item]'?rows.filter(r=>'item' in r.dataset):sel==='[data-app]'?rows.filter(r=>'app' in r.dataset):[]};
 const c=vm.createContext({...provider,...evidence,...packages,AbortSignal,TextEncoder,URL,URLSearchParams,btoa,setTimeout,fetch,
 document:{querySelector:()=>el,documentElement:{dataset:{}}},location:{pathname,hash:'',origin:'http://fixture.test',href:'http://fixture.test/opsdeck/index.html'},localStorage:{getItem:()=> 'dark',setItem(){}},history:{replaceState(){}},matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){}});
 vm.runInContext(source.replace(/\nrestoreSession\(\);\s*$/, ''),c); vm.runInContext('state.connected=true;state.info={username:"Old"}',c);
 return {c,el,rows,run:s=>vm.runInContext(s,c)};
}
const response=(result,status=200)=>({ok:status===200,status,json:async()=>({status:{errors:[]},result})});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
test('old source success cannot repopulate after logout',async()=>{
 const d=deferred(),f=fixture(()=>d.promise); const p=f.run('loadSource("users",true)'); await f.run('disconnect()');d.resolve(response([{Name:'OldUser'}]));await p;
 assert.equal(f.run('Object.keys(state.sourceData).length'),0);
});
test('old source failure cannot alter new session errors or loading',async()=>{
 const d=deferred(),f=fixture(()=>d.promise);const p=f.run('loadSource("users",true)');await f.run('disconnect()');f.run('state.connected=true;state.info={username:"New"};state.sourceLoading="roles"');d.resolve(response({},403));await p;
 assert.equal(f.run('Object.keys(state.sourceErrors).length'),0);assert.equal(f.run('state.sourceLoading'),'roles');
});
test('401 clears identity caches and audit state',async()=>{
 const f=fixture(async()=>response({},401));f.run('state.userDetails={old:{}};state.sourceVerification={old:{}};state.auditQuery={state:"finished"}');await f.run('loadSource("users",true)');
 assert.equal(f.run('Object.keys(state.userDetails).length'),0);assert.equal(f.run('Object.keys(state.sourceVerification).length'),0);assert.equal(f.run('state.auditQuery'),null);
});
test('logout clears audit and outstanding submission cannot publish',async()=>{
 const d=deferred(),f=fixture(()=>d.promise);const p=f.run('runAuditQuery()');await f.run('disconnect()');assert.equal(f.run('state.auditQuery'),null);d.resolve({status:403});await p;assert.equal(f.run('state.auditQuery'),null);
});
for(const [kind,records] of [['taskHistory',[{TaskId:7,Name:'First run',LastStart:'one'},{TaskId:7,Name:'Second run',LastStart:'two'}]],['taskHistory',[{TaskId:7,Name:'First run',Namespace:'FIRST'},{TaskId:7,Name:'Second run',Namespace:'SECOND'}]]]){
 test(`selection opens each supported ${kind} row`,()=>{
  const f=fixture(async()=>{throw Error('Unexpected fetch')});f.c.payload={status:{errors:[]},result:records};f.run(`state.sourceData.${kind}=mapReadOnlySource("${kind}",payload)`);
  const html=f.run(`sourcePanel("${kind}")`),handles=[...html.matchAll(/data-item="([^"]+)"/g)].map(x=>x[1]);assert.equal(handles.length,2);
  for(let i=0;i<2;i++){const row={dataset:{item:handles[i]},addEventListener(type,callback){if(type==='click')this.click=callback}};f.rows.splice(0,f.rows.length,row);f.run('render()');row.click();const selected=f.run(`sourcePanel("${kind}")`);assert.match(selected,new RegExp(`inspector-title">${i===0?(kind==='taskHistory'?'First run':'Same'):(kind==='taskHistory'?'Second run':'Same')}`));if(kind==='restServices')assert.match(selected,new RegExp(`inspector-sub[^]*? · ${i===0?'FIRST':'SECOND'}</p>`));}
 });
}

const calls = [
 ['refreshLive(true)', ''],
 ['loadSource("users",true)', ''],
 ['loadWebAppDetail("/fixture",true)', 'state.apps=[{name:"/fixture"}]'],
 ['loadUserDetail("fixture")', 'state.sourceData.users={items:[{ref:{key:"fixture"}}]}'],
 ['loadRoleDetail("fixture")', 'state.sourceData.roles={items:[{ref:{key:"fixture"}}]}'],
 ['loadRoleOwners("fixture")', 'state.sourceData.roles={items:[{ref:{key:"fixture"}}]}'],
 ['loadResourceDetail("fixture")', 'state.sourceData.resources={items:[{ref:{key:"fixture"}}]}'],
 ['loadTaskDetail("7")', 'state.sourceData.tasks={items:[{ref:{key:"7"}}]}'],
 ['loadRestSpec(JSON.stringify(["restServices","fixture","USER"]),true)', 'state.sourceData.restServices={items:[{ref:{key:"fixture",scope:"USER"},values:{swaggerSpec:"/api/mgmnt/fixture"}}]}'],
];
for (const [call,setup] of calls) for(const status of [200,401,403]) {
 test(`previous-session ${call} response ${status} cannot publish any state`,async()=>{
  const d=deferred(),f=fixture(()=>d.promise);f.run(setup);const p=f.run(call);await f.run('disconnect()');f.run('state.connected=true;state.info={username:"New"};state.sourceLoading="new-owner";state.busy=true;state.auditQueryBusy=true');const before=f.run('JSON.stringify(state)');d.resolve(response({},status));await p;assert.equal(f.run('JSON.stringify(state)'),before);
 });
}
test('old request cannot publish into a genuinely reauthenticated session',async()=>{
 const d=deferred();const f=fixture(path=>path.includes('security/users')?d.promise:Promise.resolve(response(path.includes('/info')?{username:'New',serverVersion:'Fixture',apiVersion:2,namespaces:[]}:[])));
 const old=f.run('loadSource("users",true)');f.c.event={preventDefault(){},currentTarget:{elements:{username:{value:'New'},password:{value:'synthetic-only'}}}};await f.run('connect(event)');assert.equal(f.run('state.info.username'),'New');const before=f.run('JSON.stringify(state)');d.resolve(response([{Name:'Old'}]));await old;assert.equal(f.run('JSON.stringify(state)'),before);
});
test('outstanding audit poll cannot replace new audit work after logout',async()=>{
 const d=deferred();let count=0;const f=fixture(()=>++count===1?Promise.resolve({status:202,headers:{get:()=>'/api/admin/v2/async-result?id=fixture'}}):d.promise);const p=f.run('runAuditQuery()');await new Promise(r=>setTimeout(r,0));assert.equal(count,2);await f.run('disconnect()');f.run('state.connected=true;state.info={username:"New"};state.auditQuery={state:"new"};state.auditQueryBusy=true');const before=f.run('JSON.stringify(state)');d.resolve(response({GUID:'fixture',State:'Finished',Result:[]}));await p;assert.equal(f.run('JSON.stringify(state)'),before);
});
test('web-app scoped duplicate names select exact snapshot and refuse ambiguous detail',async()=>{
 const f=fixture(async()=>{throw Error('No provider request permitted')});f.c.payload={status:{errors:[]},result:['FIRST','SECOND'].map(Namespace=>({Name:'/same',Namespace,Enabled:true,AuthenticationMethods:[]}))};f.run('state.apps=mapWebApps(payload)');const html=f.run('applicationsView()');const handles=[...html.matchAll(/data-app="([^"]+)"/g)].map(m=>m[1]);assert.equal(handles.length,2);
 for(let i=0;i<2;i++){const row={dataset:{app:handles[i]},addEventListener(type,cb){if(type==='click')this.click=cb}};f.rows.splice(0,f.rows.length,row);f.run('render()');row.click();const view=f.run('applicationsView()');assert.match(view,new RegExp(`<dt>Namespace</dt><dd><code>${i?'SECOND':'FIRST'}</code>`));assert.match(view,/Detail requires an unambiguous provider name/)}
 await f.run('loadWebAppDetail("/same",true)');
});
test('REST duplicate names retain each namespace in actual specification request',async()=>{
 const paths=[];const f=fixture(async path=>{paths.push(path);return {ok:true,status:200,json:async()=>({swagger:'2.0',paths:{}})}});f.c.payload={status:{errors:[]},result:['FIRST','SECOND'].map(namespace=>({name:'same::service',namespace,swaggerSpec:'/api/mgmnt/'+namespace}))};f.run('state.sourceData.restServices=mapReadOnlySource("restServices",payload.result)');
 for(const scope of ['FIRST','SECOND']){f.c.scope=scope;await f.run('loadRestSpec(JSON.stringify(["restServices","same::service",scope]),true)');assert.equal(f.run('state.restSpecs[JSON.stringify(["restServices","same::service",scope])].ref.scope'),scope)}assert.deepEqual(paths,['/api/mgmnt/FIRST','/api/mgmnt/SECOND']);
});

test('delayed independent read-back cannot publish verification after logout',async()=>{
 const d=deferred();let lists=0;const f=fixture(path=>path.includes('/info')?Promise.resolve(response({username:'Old',serverVersion:'Fixture',apiVersion:2,namespaces:[]})):++lists===1?Promise.resolve(response([])):d.promise);const p=f.run('refreshLive(true)');await new Promise(r=>setTimeout(r,0));assert.equal(lists,2);await f.run('disconnect()');f.run('state.connected=true;state.info={username:"New"};state.verification={newOwner:true};state.busy=true');const before=f.run('JSON.stringify(state)');d.resolve(response([]));await p;assert.equal(f.run('JSON.stringify(state)'),before);
});
test('proxy logout clears local audit and caches before its response, ignoring stale 401',async()=>{
 const d=deferred();const f=fixture(()=>d.promise,'/');f.run('state.auditQuery={state:"finished"};state.userDetails={old:{}};state.packagePlan={plan:{id:"old"}};state.applicationsTab="packages";state.evidenceFilter="old"');const p=f.run('disconnect()');assert.equal(f.run('state.auditQuery'),null);assert.equal(f.run('Object.keys(state.userDetails).length'),0);assert.equal(f.run('state.packagePlan'),null);assert.equal(f.run('state.applicationsTab'),"web-apps");assert.equal(f.run('state.evidenceFilter'),"");f.run('clearSession();state.connected=true;state.info={username:"New"}');const before=f.run('JSON.stringify(state)');d.resolve(response({},401));await p;assert.equal(f.run('JSON.stringify(state)'),before);
});
test('old restored proxy session cannot publish into newer session',async()=>{
 const d=deferred(),f=fixture(()=>d.promise,'/');const p=f.run('restoreSession()');f.run('clearSession();state.connected=true;state.info={username:"New"}');const before=f.run('JSON.stringify(state)');d.resolve(response({}));await p;assert.equal(f.run('JSON.stringify(state)'),before);
});
test('a replaced source snapshot cannot reuse an old row handle',()=>{
 const f=fixture(async()=>{throw Error('Unexpected request')});f.c.payload={status:{errors:[]},result:[{TaskId:7,Name:'First'},{TaskId:7,Name:'Second'}]};f.run('state.sourceData.taskHistory=mapReadOnlySource("taskHistory",payload)');const html=f.run('sourcePanel("taskHistory")'),handle=[...html.matchAll(/data-item="([^"]+)"/g)][1][1].split('::')[1];f.c.handle=handle;f.run('state.selectedItems.taskHistory=handle;state.sourceData.taskHistory=mapReadOnlySource("taskHistory",payload)');assert.match(f.run('sourcePanel("taskHistory")'),/inspector-title">First/);
});
