import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import * as provider from "../src/iris-provider.js";
import * as evidence from "../public/evidence-center.js";
import * as packages from "../public/packages-workspace.js";
import * as jobs from "../public/job-center.js";
import { ProductIdentity } from "../public/product-identity.js";
import * as targetContext from '../public/target-context.js?v=target-1';
import * as graph from '../public/entity-graph.js';

const source = (await readFile(new URL("../public/app.js", import.meta.url), "utf8")).replace(/^import[^\n]+\n/gm, "");
const operationSource = (await readFile(new URL("../public/operation-engine.js", import.meta.url), "utf8")).replace(/^import[^\n]+\n/gm,'').replace(/^export /gm, "");
const workflowSource = (await readFile(new URL('../public/workflow-engine.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'').replace(/^export /gm,'');
const intelligenceSource = (await readFile(new URL('../public/trusted-intelligence.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'').replace(/^export /gm,'');
const explorerSource = (await readFile(new URL('../public/sysadmin-explorer.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'').replace(/^export /gm,'');
function contextFor(pathname = "/opsdeck/index.html", fetch = async () => { throw new Error("Unexpected request"); }) {
  let keyDown;
  const element = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  const context = vm.createContext({
    ...provider, ...evidence, ...packages, ...jobs, ...targetContext, ...graph, ProductIdentity, AbortSignal, TextEncoder, URL, URLSearchParams, btoa,
    document: { querySelector: () => element, documentElement: { dataset: {} } },
    location: { pathname, hash: "", origin: "http://fixture.test" },
    localStorage: { getItem: () => "dark", setItem() {} },
    history: { replaceState() {} }, matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener(type,handler) {if(type==='keydown')keyDown=handler;}, fetch,
  });
  vm.runInContext(operationSource, context);
  vm.runInContext(workflowSource, context);
  vm.runInContext(intelligenceSource, context);
  vm.runInContext(source, context);
  vm.runInContext('state.observeOnly=false; setObserveOnly(false);', context);
  return { context, element, keyDown:event=>keyDown(event) };
}

test('integrated dialogs are exclusive, make background inert, and keep textareas in the keyboard scope',()=>{
  const {context,element,keyDown}=contextFor();
  const outside={inert:false},alreadyInert={inert:true};context.document.querySelectorAll=()=>[element,outside,alreadyInert];
  vm.runInContext('state.connected=true;state.info={username:"fixture",systemMode:"DEMO"};activateDialog("targets");activateDialog("command");render()',context);
  assert.equal(vm.runInContext('state.targetCompareOpen||state.fxOpen',context),false);
  assert.match(element.innerHTML,/<main class="workspace" inert>/u);assert.equal(outside.inert,true);
  const controls=['close','input','textarea','back'].map(id=>({id,dataset:{},getClientRects:()=>[{}],focus(){context.document.activeElement=this;}}));
  let selector;const dialog={querySelectorAll:value=>{selector=value;return controls;}};
  element.querySelector=value=>value==='[role="dialog"]'?dialog:null;
  context.document.activeElement=controls[3];let prevented=0;
  keyDown({key:'Tab',preventDefault(){prevented++;}});assert.equal(context.document.activeElement,controls[0]);assert.equal(prevented,1);
  assert.match(selector,/textarea:not\(\[disabled\]\)/u);
  context.document.activeElement=controls[2];keyDown({key:'Tab',preventDefault(){prevented++;}});assert.equal(prevented,1,'native textarea tab order remains usable');
  keyDown({key:'Escape',preventDefault(){prevented++;}});assert.equal(outside.inert,false);assert.equal(alreadyInert.inert,true);
  assert.doesNotMatch(element.innerHTML,/<main class="workspace" inert>/u);
});

test('delayed command metadata cannot replace a different active dialog or steal focus',async()=>{
  let finish;const {context,element}=contextFor('/opsdeck/index.html',()=>new Promise(resolve=>{finish=resolve;}));
  vm.runInContext('state.connected=true;state.info={username:"fixture",systemMode:"DEMO"};commandModule={searchCommands:()=>[],commandIndex:()=>[]}',context);
  const opening=vm.runInContext('openCommands()',context);
  vm.runInContext('activateDialog("fx");render()',context);let focus=0;
  element.querySelector=()=>({focus(){focus++;}});
  finish({ok:true,json:async()=>({schema:'opsdeck-declared-api-catalog-v2',operations:[]})});await opening;
  assert.equal(vm.runInContext('state.fxOpen&&!state.commandOpen',context),true);assert.equal(focus,0);
});

test('generated capability accounting stays separate from session authority and rejects invalid counts',async()=>{
  const summary=JSON.parse(await readFile(new URL('../public/capability-summary.json',import.meta.url)));
  let malformed=false;
  const {context,element}=contextFor('/opsdeck/index.html',async path=>{
    assert.equal(path,'/opsdeck/capability-summary.json');
    return {ok:true,status:200,json:async()=>malformed?{...summary,counts:{...summary.counts,exposed:-1}}:summary};
  });
  vm.runInContext('state.connected=true;state.route="evidence";state.info={username:"ReadOnly",privileges:{}};state.observeOnly=true;setObserveOnly(true)',context);
  await vm.runInContext('loadCapabilitySummary()',context);
  assert.match(element.innerHTML,/PRODUCT QUALIFICATION · SOURCE-GENERATED/u);
  assert.match(element.innerHTML,new RegExp(`<strong>${summary.counts.exposed}</strong><span>IRIS operations exposed</span>`,'u'));
  assert.match(element.innerHTML,/Current-session access still depends/u);
  assert.equal(vm.runInContext('state.observeOnly&&Object.keys(state.info.privileges).length===0&&state.operationEvidence.length===0',context),true);
  vm.runInContext('state.capabilitySummary=null',context);malformed=true;
  await vm.runInContext('loadCapabilitySummary()',context);
  assert.equal(vm.runInContext('state.capabilitySummary',context),null);
  assert.match(element.innerHTML,/Qualification snapshot unavailable/u);
  assert.match(element.innerHTML,/Session Ledger/u);
});

test('a structured HTTP 403 stays denied without relying on provider message wording',async()=>{
  const {context,element}=contextFor('/opsdeck/index.html',async path=>{
    assert.equal(path,'/api/admin/v2/security/audit/enabled');
    return {ok:false,status:403,json:async()=>({error:'The requested view is outside the current policy.'})};
  });
  vm.runInContext('state.connected=true;state.info={username:"Observer"};state.route="logs";state.observeOnly=true;setObserveOnly(true)',context);
  await vm.runInContext('loadSource("auditEnabled")',context);
  assert.equal(vm.runInContext('providerUiEvidence(state,"auditEnabled").status',context),'DENIED');
  assert.match(element.innerHTML,/Access denied by IRIS/u);
  assert.equal(vm.runInContext('state.connected&&state.observeOnly&&!state.sourceData.auditEnabled',context),true);
});

test('a denied first application inventory never claims a valid empty collection or a zero count',async()=>{
  const {context,element}=contextFor('/opsdeck/index.html',async path=>path==='/api/admin/info'
    ?{ok:true,status:200,json:async()=>vm.runInContext('({status:{errors:[]},result:{username:"Observer",serverVersion:"Fixture IRIS",apiVersion:2}})',context)}
    :{ok:false,status:403,json:async()=>({error:'Outside the current policy.'})});
  vm.runInContext('state.connected=true;state.observeOnly=true;setObserveOnly(true)',context);
  await vm.runInContext('refreshLive(true)',context);
  assert.equal(vm.runInContext('state.connected&&state.info.username==="Observer"',context),true);
  assert.equal(vm.runInContext('providerUiEvidence(state,"webApps").status',context),'DENIED');
  assert.match(element.innerHTML,/Inventory count not established/u);
  assert.doesNotMatch(element.innerHTML,/The live API returned an empty collection|<strong>0<\/strong><span>applications returned/u);
  const applications=vm.runInContext('applicationsView()',context);
  assert.match(applications,/Current inventory count not established/u);
  assert.doesNotMatch(applications,/No web applications were returned by IRIS|data-export-projection="webApps/u);
});

test('an actually mapped empty application inventory retains its zero count and separate read-back',async()=>{
  const {context,element}=contextFor('/opsdeck/index.html',async path=>({ok:true,status:200,json:async()=>vm.runInContext(path==='/api/admin/info'
    ?'({status:{errors:[]},result:{username:"Observer",serverVersion:"Fixture IRIS",apiVersion:2}})'
    :'({status:{errors:[]},result:[]})',context)}));
  vm.runInContext('state.connected=true;state.observeOnly=true;setObserveOnly(true)',context);
  await vm.runInContext('refreshLive(true)',context);
  assert.equal(vm.runInContext('Boolean(state.appsReadAt)&&state.verification.matched&&state.apps.length===0',context),true);
  assert.match(element.innerHTML,/<strong>0<\/strong><span>applications returned/u);
  assert.match(element.innerHTML,/The live API returned an empty collection/u);
  assert.doesNotMatch(element.innerHTML,/Inventory count not established/u);
  vm.runInContext('clearSession()',context);
  assert.equal(vm.runInContext('state.appsReadAt',context),'');
});

test('a schema-only rehearsal stays renderable in commands and existing Evidence without provider access',async()=>{
  let requests=0;const {context,element}=contextFor('/opsdeck/index.html',()=>{requests++;throw Error('No provider call expected');});
  // Load the same module into this browser-like realm, preserving its branded requests/plans.
  vm.runInContext(`explorerModule=(()=>{${explorerSource};return {compileRequest,requestPreview,rehearseRequest};})()`,context);
  const catalog=JSON.parse(await readFile(new URL('../public/api-catalog.json',import.meta.url)));
  context.fixtureCatalog=vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(catalog))})`,context);
  vm.runInContext('apiCatalogDocument=fixtureCatalog;apiCatalog=fixtureCatalog.operations;commandModule={searchCommands:()=>[],commandIndex:()=>[]};state.connected=true;state.info={username:"Observer"};state.commandOpen=true;state.commandApi="POST /api/admin/v2/namespace/enable-interop";state.apiExplorer={parameters:{name:"%SYS"},body:"{}",revision:0}',context);
  await vm.runInContext('runApiAction()',context);
  assert.equal(requests,0);
  assert.equal(vm.runInContext('state.apiExplorer.operation.state',context),'BLOCKED');
  assert.match(element.innerHTML,/unqualified-mutation-policy-and-readback/u);
  assert.match(element.innerHTML,/Impact Forecast/u);
  assert.doesNotMatch(element.innerHTML,/data-webapp-confirm=/u);
  assert.equal(vm.runInContext('currentEvidenceCollection().records.filter(r=>r.kind==="operation-plan").length',context),1);
  assert.equal(vm.runInContext('currentEvidenceCollection().records.filter(r=>r.kind==="refusal"&&r.state==="BLOCKED").length',context),1);
  vm.runInContext('state.apiExplorer.result={state:"OBSERVED",value:{priorDraft:true}};state.apiExplorer.parameters.name="USER";invalidateApiDraft();render()',context);
  assert.equal(vm.runInContext('state.webAppOperation',context),null);
  assert.match(element.innerHTML,/Draft changed\. Preview or rehearse the current request again/u);
  assert.doesNotMatch(vm.runInContext('apiExplorerPanel(apiCatalog.find(api=>api.id===state.commandApi))',context),/priorDraft|Impact Forecast|data-webapp-confirm=/u);
  assert.equal(vm.runInContext('currentEvidenceCollection().records.filter(r=>r.kind==="operation-plan"||r.kind==="refusal").length',context),2,'historical evidence is retained');
});

test('an obsolete API rehearsal cannot resume authority reads, attribute a late failure or steal editor focus',async()=>{
  const catalog=JSON.parse(await readFile(new URL('../public/api-catalog.json',import.meta.url)));
  for(const enabled of [true,'invalid']){
    let release;const calls=[];
    const {context,element}=contextFor('/opsdeck/index.html',async path=>{
      calls.push(path);
      const response=value=>({ok:true,status:200,json:async()=>vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify({status:{errors:[]},result:value}))})`,context)});
      if(path.startsWith('/api/admin/v2/web-app?'))return new Promise(resolve=>{release=()=>resolve(response({Enabled:enabled,NameSpace:'%SYS'}));});
      return response({username:'Qualification',privileges:{Secure:{use:true}}});
    });
    vm.runInContext(`explorerModule=(()=>{${explorerSource};return {compileRequest,requestPreview,rehearseRequest};})()`,context);
    context.fixtureCatalog=vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(catalog))})`,context);
    vm.runInContext('apiCatalogDocument=fixtureCatalog;apiCatalog=fixtureCatalog.operations;state.connected=true;state.info={username:"Qualification"};state.apps=mapWebApps({status:{errors:[]},result:[{Name:"/app",Namespace:"%SYS",Enabled:true,AuthenticationMethods:[]}]});state.commandOpen=true;state.commandApi="PUT /api/admin/v2/web-app";state.apiExplorer={parameters:{name:"/app"},body:"{\\"Enabled\\":false}",preview:null,result:null,operation:null,busy:false,revision:0};',context);
    const output={innerHTML:''},editor={id:'api-body'},action={disabled:true,addEventListener(){},focus(){context.document.activeElement=this;}};
    element.querySelector=selector=>selector==='#api-output'?output:selector==='#api-action'?action:null;
    const pending=vm.runInContext('runApiAction()',context);
    for(let attempt=0;attempt<20&&!release;attempt++)await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(typeof release,'function');
    context.document.activeElement=editor;
    vm.runInContext('state.apiExplorer.body="{\\"Enabled\\":true}";invalidateApiDraft()',context);
    release();await pending;
    assert.equal(calls.length,1,'changed draft cannot continue the old rehearsal authority read');
    assert.equal(vm.runInContext('state.apiExplorer.result',context),null,'late failure cannot describe the current draft');
    assert.equal(vm.runInContext('state.apiExplorer.operation===null&&!state.apiExplorer.busy&&state.operationEvidence.length===0',context),true);
    assert.equal(context.document.activeElement,editor);assert.equal(action.disabled,false);
    assert.match(output.innerHTML,/Draft changed/u);
  }
});

test("integrated native shell and Evidence view report only qualified lifecycle scope", () => {
  const { context } = contextFor();
  const native = vm.runInContext('state.connected=true; state.info={username:"Fixture",serverVersion:"Fixture IRIS"}; shell("")', context);
  assert.match(native, /Sign out/);
  assert.match(native, /Same-origin session/);
  assert.doesNotMatch(native, /Observed IRIS system mode/u, "missing system mode stays neutral");
  const observedMode = vm.runInContext('state.info.systemMode="TEST"; shell("")', context);
  assert.match(observedMode, /Observed IRIS system mode[\s\S]*?>TEST</u);
  const demo = vm.runInContext('state.info.systemMode="DEMO"; shell("")', context);
  assert.match(demo, /Observed IRIS system mode[\s\S]*?>DEMO</u);
  assert.match(demo, /Safe demo provider active/);
  assert.doesNotMatch(demo, /Sign out|Live session|IRIS connection active/);

  const evidence = vm.runInContext('evidenceView()', context);
  assert.match(evidence, /OpsDeck · Release Candidate 1\.0\.0/u);
  assert.match(evidence, /IPM \/ ZPM lifecycle[\s\S]*?QUALIFIED/u);
  assert.match(evidence, /Local-source load, uninstall, and clean same-source reload were reproduced for OpsDeck 0\.2\.0/u);
  assert.match(evidence, /Scope: tested local-source lifecycle only[\s\S]*?Exact core IPM version and public-registry installation remain unverified/u);
  assert.doesNotMatch(evidence, /No package load, install, uninstall, or clean-reinstall claim is admitted yet/u);
  assert.match(evidence, /Session Ledger · synthetic preview/u);
  assert.match(evidence, /SYNTHETIC FIXTURE/u);
  assert.match(evidence, /Download JSON/u);

  const packages = vm.runInContext('state.applicationsTab="packages"; applicationsView()', context);
  assert.match(packages, /APPLICATIONS → PACKAGES/u);
  assert.match(packages, /SYNTHETIC FIXTURE/u);
  vm.runInContext('state.packagePlan=preparePackagePlan(fixturePackageInventory(),"sample-reporting-kit","install")', context);
  const packageReview = vm.runInContext('applicationsView()', context);
  assert.match(packageReview, /Executor unavailable/u);
  assert.match(packageReview, /Confirm package operation · unavailable/u);
  assert.match(packageReview, /disabled aria-disabled="true"/u);
  const evidenceWithPlan = vm.runInContext('evidenceView()', context);
  assert.match(evidenceWithPlan, /Synthetic package plan preview/u);
  assert.match(evidenceWithPlan, /UNVERIFIED/u);
});

test("System About uses canonical product identity and leaves provider view intact", () => {
  const { context } = contextFor();
  const identity = vm.runInContext(`
    state.connected = true;
    state.info = { serverVersion: "IRIS Fixture 2026.2" };
    state.route = "system";
    state.systemSection = "about";
    providerDomainView("system")
  `, context);
  assert.match(identity, /Release Candidate[\s\S]*OpsDeck[\s\S]*Version 1\.0\.0/u);
  assert.match(identity, /Internal version[\s\S]*1\.0\.0/u);
  assert.match(identity, /Package version[\s\S]*1\.0\.0/u);
  assert.match(identity, /IRIS Fixture 2026\.2/u);
  assert.match(identity, /Namespace[\s\S]*%SYS/u);
  assert.match(identity, /Native IRIS CSP application/u);
  assert.match(identity, /<details class="about-details">/u);
  const providers = vm.runInContext('state.systemSection="providers"; providerDomainView("system")', context);
  assert.match(providers, /LIVE PROVIDER DATA/u);
  assert.match(providers, /System usage/u);
  vm.runInContext("ProductIdentity = undefined", context);
  const withoutAboutIdentity = vm.runInContext('providerDomainView("system")', context);
  assert.match(withoutAboutIdentity, /LIVE PROVIDER DATA/u, "removing the optional About identity dependency leaves System providers operational");
});

test("contextual IRIS help is collapsed, route-scoped, and read-only learning content", () => {
  const { context } = contextFor();
  const header = (route, tab = "web-apps") => vm.runInContext(`state.route=${JSON.stringify(route)}; state.applicationsTab=${JSON.stringify(tab)}; pageHeader("Title", "Description")`, context);

  const overview = header("overview");
  assert.match(overview, /<div class="page-title-row"><h1>Title<\/h1><details class="concept-help concept-help-primary"><summary>IRIS concepts · 2<\/summary>[\s\S]*<details class="concept-help snippet-library concept-help-primary"\s*><summary>ObjectScript examples · 3<\/summary>/u);
  assert.match(overview, /Namespace/u);
  assert.match(overview, /%SYS/u);
  assert.doesNotMatch(overview, /<details[^>]*open/u);

  const packages = header("applications", "packages");
  assert.match(packages, /IPM package state/u);
  assert.doesNotMatch(packages, /OperationReceipt|arbitrary files/u);

  const logs = header("logs");
  assert.match(logs, /Fixed log observation/u);
  assert.match(logs, /does not browse arbitrary files/u);
  assert.doesNotMatch(logs, /<script|%Execute|terminal/iu);

  const unknown = header("not-a-route");
  assert.doesNotMatch(unknown, /IRIS concepts in this view/u);
});

test("ObjectScript learning snippets load on selection as inert text and have a text-only export", () => {
  const { context } = contextFor();
  const header = vm.runInContext('state.route="overview"; pageHeader("Title", "Description")', context);
  assert.match(header, /ObjectScript examples · 3/u);
  assert.match(header, /<div class="page-title-row"><h1>Title<\/h1>[\s\S]*ObjectScript examples · 3/u);
  assert.doesNotMatch(header, /ObjectScript snippet library/u);
  assert.match(header, /Inspect the current namespace/u);
  assert.doesNotMatch(header, /\$NAMESPACE|ex\.DisplayString|%Net\.HttpRequest/u);
  assert.doesNotMatch(header, /<script|eval\(|%Execute/iu);
  const native = source;
  assert.match(native, /nativeMode \? "\/opsdeck\/" : "\.\/"/u);
  assert.match(native, /Download \.txt/u);
  assert.match(native, /never executes snippets/u);
});

test("snippet body is fetched from its product asset only after a selection", async () => {
  const requests = [];
  const { context, element } = contextFor("/opsdeck/index.html", async (path, options) => {
    requests.push({ path, options });
    return { ok: true, status: 200, text: async () => 'write "Selected",!' };
  });
  const button = { dataset: { snippet: "namespace" }, addEventListener(type, handler) { context.snippetHandler = handler; } };
  element.querySelectorAll = (selector) => selector === "[data-snippet]" ? [button] : [];
  vm.runInContext('state.connected=true; state.info={systemMode:"DEMO"}; render()', context);
  assert.equal(requests.length, 0);
  assert.doesNotMatch(element.innerHTML, /write &quot;Selected/u);
  await vm.runInContext("snippetHandler()", context);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, "/opsdeck/snippet-namespace.txt");
  assert.equal(requests[0].options.headers.Accept, "text/plain");
  assert.match(element.innerHTML, /write &quot;Selected&quot;,!/u);
  assert.match(element.innerHTML, /<details class="concept-help snippet-library concept-help-primary" open>/u);
  assert.match(element.innerHTML, /Text for learning and review only\. OpsDeck never executes snippets/u);
});

test("live Packages stays empty before an installed IPM read and never substitutes fixtures", () => {
  const { context } = contextFor();
  const live = vm.runInContext('state.connected=true; state.info={username:"OpsDeckTest",serverVersion:"Fixture IRIS"}; state.applicationsTab="packages"; applicationsView()', context);
  assert.match(live, /Installed package inventory/u);
  assert.match(live, /NOT READ/u);
  assert.match(live, /iris-ipm-installed-v1/u);
  assert.match(live, /No package rows are available/u);
  assert.doesNotMatch(live, /SYNTHETIC FIXTURE|sample-observer|sample-reporting-kit|data-package-plan/u);
  assert.doesNotMatch(live, /configured registry|Open Exchange/u);
});

test("native Packages loads installed IPM rows through its fixed same-origin route", async () => {
  const payload = {
    provider: "iris-ipm-installed-v1", namespace: "%SYS", status: "available", truncated: false,
    packages: [{ name: "opsdeck", installedVersion: "0.3.0" }],
  };
  let requestedPath = "";
  const { context } = contextFor("/opsdeck/index.html", async (path) => {
    requestedPath = path;
    return { ok: true, status: 200, json: async () => payload };
  });
  vm.runInContext(`state.connected=true; state.info={username:"hello",systemMode:"NATIVE"}; state.applicationsTab="packages"`, context);
  await vm.runInContext("loadPackageInventory()", context);
  assert.equal(requestedPath, "/opsdeck-api/packages");
  assert.equal(vm.runInContext("state.packageInventory.state", context), "AVAILABLE");
  assert.equal(vm.runInContext("state.packageInventory.packages[0].name", context), "opsdeck");
  const live = vm.runInContext("applicationsView()", context);
  assert.match(live, /opsdeck/u);
  assert.match(live, /0\.3\.0/u);
  assert.match(live, /Not queried for this package/u);
  assert.doesNotMatch(live, /sample-observer|sample-reporting-kit|SYNTHETIC FIXTURE/u);
});

test("live Packages presents IPM authority denial distinctly without fixture substitution", () => {
  const { context } = contextFor();
  vm.runInContext(`
    state.connected = true;
    state.info = { username: "OpsDeckTest", systemMode: "NATIVE" };
    state.applicationsTab = "packages";
    state.packageInventory = mapInstalledPackageInventory({
      provider: "iris-ipm-installed-v1", namespace: "%SYS", status: "denied", packages: [],
    });
  `, context);
  const live = vm.runInContext("applicationsView()", context);
  assert.match(live, /DENIED/u);
  assert.match(live, /not authorized to read installed IPM registrations/u);
  assert.doesNotMatch(live, /sample-observer|sample-reporting-kit|SYNTHETIC FIXTURE/u);
});

test("live Packages renders catalog version relationships without recommending a downgrade", () => {
  const { context } = contextFor();
  vm.runInContext(`
    state.connected = true;
    state.info = { username: "OpsDeckTest", systemMode: "NATIVE" };
    state.applicationsTab = "packages";
    state.availablePackageName = "opsdeck";
    state.packageInventory = mapInstalledPackageInventory({
      provider: "iris-ipm-installed-v1", namespace: "%SYS", status: "available",
      packages: [{ name: "opsdeck", installedVersion: "0.2.1" }],
    });
    state.availablePackageCatalog = mapAvailablePackageCatalog({
      provider: "iris-ipm-available-v1", namespace: "%SYS", name: "opsdeck", status: "available",
      packages: [{ name: "opsdeck", availableVersion: "0.2.0", repository: "registry" }],
      truncated: false, repositoryCount: 1, availableRepositoryCount: 1, coverage: "complete",
    });
  `, context);
  let live = vm.runInContext("applicationsView()", context);
  assert.match(live, /INSTALLED NEWER/u);
  assert.doesNotMatch(live, /UPDATE AVAILABLE/u);

  vm.runInContext(`state.availablePackageCatalog = mapAvailablePackageCatalog({
    provider: "iris-ipm-available-v1", namespace: "%SYS", name: "opsdeck", status: "available",
    packages: [{ name: "opsdeck", availableVersion: "0.2.1", repository: "registry" }],
    truncated: false, repositoryCount: 1, availableRepositoryCount: 1, coverage: "complete",
  })`, context);
  live = vm.runInContext("applicationsView()", context);
  assert.match(live, /INSTALLED CURRENT/u);

  vm.runInContext(`state.availablePackageCatalog = mapAvailablePackageCatalog({
    provider: "iris-ipm-available-v1", namespace: "%SYS", name: "opsdeck", status: "available",
    packages: [{ name: "opsdeck", availableVersion: "0.2.2", repository: "registry" }],
    truncated: false, repositoryCount: 1, availableRepositoryCount: 1, coverage: "complete",
  })`, context);
  live = vm.runInContext("applicationsView()", context);
  assert.match(live, /INSTALLED OLDER/u);
  assert.match(live, /Available<\/dt><dd>0\.2\.2<\/dd><dt>Installed<\/dt><dd>0\.2\.1/u);
});

test("live Packages preserves an upstream catalog HTTP 403 as DENIED", async () => {
  let requestedPath = "";
  const { context } = contextFor("/opsdeck/index.html", async path => {
    requestedPath = path;
    return { ok: false, status: 403, json: async () => ({ error: "Forbidden" }) };
  });
  vm.runInContext(`
    state.connected = true;
    state.info = { username: "OpsDeckTest", systemMode: "NATIVE" };
    state.applicationsTab = "packages";
    state.packageInventory = mapInstalledPackageInventory({
      provider: "iris-ipm-installed-v1", namespace: "%SYS", status: "empty", packages: [],
    });
  `, context);
  assert.deepEqual(JSON.parse(vm.runInContext("JSON.stringify([nativeMode, state.connected, state.availablePackageLoading])", context)), [true, true, false]);
  await vm.runInContext('loadAvailablePackageCatalog("opsdeck")', context);
  assert.equal(requestedPath, "/opsdeck-api/available-packages?name=opsdeck");
  const live = vm.runInContext("applicationsView()", context);
  assert.match(live, /badge warning">DENIED/u);
  assert.match(live, /not authorized to query the configured package catalog/u);
  assert.doesNotMatch(live, /badge warning">FAILED/u);
});

test("live Packages labels partial repository coverage while retaining observed rows", () => {
  const { context } = contextFor();
  vm.runInContext(`
    state.connected = true;
    state.info = { username: "OpsDeckTest", systemMode: "NATIVE" };
    state.applicationsTab = "packages";
    state.availablePackageName = "opsdeck";
    state.packageInventory = mapInstalledPackageInventory({
      provider: "iris-ipm-installed-v1", namespace: "%SYS", status: "empty", packages: [],
    });
    state.availablePackageCatalog = mapAvailablePackageCatalog({
      provider: "iris-ipm-available-v1", namespace: "%SYS", name: "opsdeck", status: "available",
      packages: [{ name: "opsdeck", availableVersion: "0.2.0", repository: "registry" }],
      truncated: false, repositoryCount: 2, availableRepositoryCount: 1, coverage: "partial",
    });
  `, context);
  const live = vm.runInContext("applicationsView()", context);
  assert.match(live, /badge warning">PARTIAL COVERAGE/u);
  assert.match(live, /opsdeck/u);
  assert.match(live, /0\.2\.0/u);
  assert.match(live, /absence is not established/u);
});

test("Evidence projects bounded audit outcomes without retaining audit row values", () => {
  const { context } = contextFor();
  const serialized = vm.runInContext(`
    state.info = { systemMode: "NATIVE" };
    state.auditQuery = {
      state: "finished", observedAt: "2026-10-02T12:00:00.000Z", resultCount: 1,
      truncatedToMaxRows: false, task: { identitySource: "validated-location" },
      result: [{ TimeStamp: "private-time", Event: "private-event", UserName: "private-user" }]
    };
    JSON.stringify(currentEvidenceCollection())
  `, context);
  const collection = JSON.parse(serialized);
  const record = collection.records.find((item) => item.id === "session:audit-query");
  assert.equal(record.state, "PARTIAL");
  assert.equal(record.observedAt, "2026-10-02T12:00:00.000Z");
  assert.deepEqual(record.evidence, {
    providerState: "finished", identityBasis: "validated-location", fields: ["Event", "TimeStamp", "UserName"], count: 1, truncated: false,
  });
  assert.doesNotMatch(serialized, /private-time|private-event|private-user/u);
  const evidenceView = vm.runInContext("evidenceView()", context);
  assert.match(evidenceView, /Audit async handoff[\s\S]*?PARTIAL[\s\S]*?1 result row/u);
  assert.match(evidenceView, /full result-schema and pagination behavior are not established/u);

  for (const [providerState, expected] of [["denied", "DENIED"], ["failed", "FAILED"], ["unavailable", "UNAVAILABLE"], ["canceled", "BLOCKED"]]) {
    vm.runInContext(`state.auditQuery = { state: "${providerState}", observedAt: "2026-10-02T12:00:00.000Z" }`, context);
    const result = JSON.parse(vm.runInContext("JSON.stringify(currentEvidenceCollection())", context));
    assert.equal(result.records.find((item) => item.id === "session:audit-query").state, expected);
  }
});

test("denied native sources name IRIS authority and demo sources name persona authority", () => {
  const { context } = contextFor();
  const native = vm.runInContext('state.info={}; state.sourceErrors.users="HTTP 403"; sourcePanel("users")', context);
  assert.match(native, /Access denied by IRIS/);
  const demo = vm.runInContext('state.info.systemMode="DEMO"; sourcePanel("users")', context);
  assert.match(demo, /Access denied by persona/);
});

test("restricted demo retains its known identity when application inventory is denied", async () => {
  const { context, element } = contextFor("/", async path => ({
    ok: path !== "/api/admin/v2/web-apps", status: path === "/api/admin/v2/web-apps" ? 403 : 200,
    json: async () => path === "/api/admin/v2/web-apps" ? { error: "Persona does not have authority" } :
      path === "/api/session" ? {} : { status: { errors: [] }, result: { username: "DemoRestricted", serverVersion: "Fixture", apiVersion: 2, systemMode: "DEMO", namespaces: [], privileges: {} } },
  }));
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.match(element.innerHTML, /DemoRestricted/);
  assert.match(element.innerHTML, /does not have authority/);
  assert.doesNotMatch(element.innerHTML, /Checking connection…/);
  assert.equal(vm.runInContext('state.verification', context), null);
});

test("similarly named paths do not select native authentication mode", () => {
  const { context } = contextFor("/opsdeck-other/");
  assert.equal(vm.runInContext('nativeMode', context), false);
});

test("live operation review requires confirmation and renders its verified receipt in session Evidence", async () => {
  let enabled = false;
  const calls = [];
  const { context } = contextFor("/opsdeck/index.html", async (path, options) => {
    calls.push({ path, options });
    if (path === "/api/admin/info") return { ok: true, status: 200, json: async () => realmJSON({ status: { errors: [] }, result: { username: "Qualification", privileges: { Secure: { use: true } } } }) };
    if (options.method === "PUT") enabled = JSON.parse(options.body).Enabled;
    return { ok: true, status: 200, json: async () => realmJSON({ status: { errors: [] }, result: { Enabled: enabled, NameSpace: "%SYS" } }) };
  });
  function realmJSON(value) { return vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(value))})`, context); }
  vm.runInContext(`state.connected=true; state.info={username:"Qualification",serverVersion:"Fixture IRIS"}; nativeAuthorization="Basic opaque-fixture"; state.route="applications"; state.apps=mapWebApps({status:{errors:[]},result:[{Name:"/opsdeck-fixture",Namespace:"%SYS",Enabled:false,Type:"CSP",AuthenticationMethods:["Password"]}]});`, context);
  await vm.runInContext('prepareWebAppOperation("/opsdeck-fixture")', context);
  assert.equal(vm.runInContext('state.webAppOperation.state', context), "REVIEW_REQUIRED", vm.runInContext('state.webAppOperation.reason', context));
  assert.equal(calls.filter(call => call.options.method === "PUT").length, 0);
  const review = vm.runInContext('applicationsView()', context);
  assert.match(review, /Confirm enable \/opsdeck-fixture/u);
  assert.match(review, /Impact[\s\S]*Enabled true/u);
  assert.match(review, /Planned effect; authoritative read-back determines the outcome/u);
  await vm.runInContext('confirmWebAppOperation(state.webAppOperation.plan.id)', context);
  const write = calls.filter(call => call.options.method === "PUT");
  assert.equal(write.length, 1);
  assert.equal(write[0].options.headers.Authorization, "Basic opaque-fixture");
  assert.deepEqual(JSON.parse(write[0].options.body), { Enabled: true });
  const collection = vm.runInContext('currentEvidenceCollection()', context);
  assert.ok(collection.records.some(record => record.kind === "operation-receipt" && record.state === "VERIFIED"));
  const rendered = vm.runInContext('evidenceView()', context);
  assert.match(rendered, /Enable \/opsdeck-fixture/u);
  assert.match(rendered, /operation-receipt/u);
  assert.match(rendered, /Verified Receipt/u);
  assert.equal(vm.runInContext('sessionLedger(currentEvidenceCollection()).categories.confirmations.length', context), 1);
  assert.match(rendered, /authoritative|Authoritative/u);
  vm.runInContext('clearSession()', context);
  assert.equal(vm.runInContext('state.operationEvidence.length', context), 0);
});

test('focused confirmation reviews the same plan, returns without dispatch, and refuses an invalidated review',async()=>{
  let enabled=false;
  const writes=[];
  const {context,element}=contextFor('/opsdeck/index.html',async(path,options)=>{
    if(options.method==='PUT'){writes.push(JSON.parse(options.body));enabled=JSON.parse(options.body).Enabled;}
    const result=path==='/api/admin/info'?{username:'Qualification',privileges:{Secure:{use:true}}}:{Enabled:enabled,NameSpace:'%SYS'};
    return {ok:true,status:200,json:async()=>vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify({status:{errors:[]},result}))})`,context)};
  });
  vm.runInContext('state.connected=true;state.info={username:"Qualification"};state.apps=mapWebApps({status:{errors:[]},result:[{Name:"/opsdeck-fixture",Namespace:"%SYS",Enabled:false,Type:"CSP",AuthenticationMethods:["Password"]}]});',context);
  await vm.runInContext('prepareWebAppOperation("/opsdeck-fixture")',context);
  vm.runInContext('state.commandOpen=true;openConfirmationReview("webapp",state.webAppOperation.plan.id)',context);
  assert.equal(vm.runInContext('state.confirmationReview.plan===state.webAppOperation.plan&&!state.commandOpen',context),true);
  assert.match(element.innerHTML,/Plan Review · Exact confirmation/u);
  assert.match(element.innerHTML,/<main class="workspace" inert>/u);
  assert.equal(writes.length,0);
  vm.runInContext('closeConfirmationReview()',context);
  assert.equal(vm.runInContext('state.confirmationReview===null&&state.commandOpen',context),true);
  assert.equal(writes.length,0);
  vm.runInContext('openConfirmationReview("webapp",state.webAppOperation.plan.id);state.observeOnly=true;setObserveOnly(true)',context);
  await vm.runInContext('completeConfirmationReview()',context);
  assert.equal(writes.length,0,'Observe Only blocks a review already open');
  vm.runInContext('state.observeOnly=false;setObserveOnly(false);openConfirmationReview("webapp",state.webAppOperation.plan.id);state.webAppOperation={...state.webAppOperation,plan:{...state.webAppOperation.plan}}',context);
  await vm.runInContext('completeConfirmationReview()',context);
  assert.equal(writes.length,0,'replacement with the same id cannot inherit confirmation');
  await vm.runInContext('prepareWebAppOperation("/opsdeck-fixture")',context);
  vm.runInContext('openConfirmationReview("webapp",state.webAppOperation.plan.id)',context);
  await vm.runInContext('completeConfirmationReview()',context);
  assert.deepEqual(writes,[{Enabled:true}]);
  assert.equal(vm.runInContext('state.webAppOperation.state',context),'VERIFIED');
  vm.runInContext('clearSession()',context);
  assert.equal(vm.runInContext('state.confirmationReview',context),null);
});

test("logout during operation preflight prevents further authority requests or dispatch", async () => {
  let release;
  let count = 0;
  const { context } = contextFor("/opsdeck/index.html", async () => {
    count++;
    await new Promise(resolve => { release = resolve; });
    return { ok: true, status: 200, json: async () => ({ status: { errors: [] }, result: { Enabled: false, NameSpace: "%SYS" } }) };
  });
  vm.runInContext(`state.connected=true; state.info={username:"Qualification"}; state.apps=mapWebApps({status:{errors:[]},result:[{Name:"/opsdeck-fixture",Namespace:"%SYS",Enabled:false,Type:"CSP",AuthenticationMethods:["Password"]}]});`, context);
  const pending = vm.runInContext('prepareWebAppOperation("/opsdeck-fixture")', context);
  vm.runInContext('clearSession()', context);
  release();
  await pending;
  assert.equal(count, 1);
  assert.equal(vm.runInContext('state.webAppOperation', context), null);
  assert.equal(vm.runInContext('state.operationEvidence.length', context), 0);
});

test("live Packages reviews pinned intent, confirms once and projects install/remove receipts", async () => {
  let installedVersion = null;
  const calls = [];
  const name = "qualification-package";
  const { context } = contextFor("/opsdeck/index.html", async (path, options) => {
    calls.push({ path, method: options.method });
    let value;
    if (path === "/opsdeck-api/packages") value = { provider: "iris-ipm-installed-v1", namespace: "%SYS", status: installedVersion ? "available" : "empty", packages: installedVersion ? [{ name, installedVersion }] : [] };
    else if (path === "/opsdeck-api/package-authority") value = { provider: "iris-ipm-operations-v1", username: "Qualification", namespace: "%SYS", state: "SUPPORTED" };
    else if (path.startsWith("/opsdeck-api/available-packages?")) value = catalog();
    else if (path === "/opsdeck-api/package-operation") { const body = JSON.parse(options.body); installedVersion = body.action === "install" ? body.version : null; value = { provider: "iris-ipm-operations-v1", username: "Qualification", namespace: "%SYS", state: "ACCEPTED" }; }
    else throw new Error("Unexpected request");
    return { ok: true, status: 200, json: async () => realmJSON(value) };
  });
  function realmJSON(value) { return vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(value))})`, context); }
  function catalog() { return { provider: "iris-ipm-available-v1", namespace: "%SYS", name, status: "available", coverage: "complete", repositoryCount: 1, availableRepositoryCount: 1, truncated: false, packages: [{ name, availableVersion: "0.0.1", repository: "qualification-repo" }] }; }
  vm.runInContext('state.connected=true;state.info={username:"Qualification",serverVersion:"Fixture IRIS"};nativeAuthorization="Basic opaque-fixture";state.applicationsTab="packages";', context);
  await vm.runInContext('loadPackageInventory(true)', context);
  context.fixtureCatalog = realmJSON(catalog());
  vm.runInContext('state.availablePackageCatalog=mapAvailablePackageCatalog(fixtureCatalog)', context);
  for (const action of ["install", "remove"]) {
    await vm.runInContext('prepareLivePackageOperation(0)', context);
    assert.equal(vm.runInContext('state.livePackageOperation.state', context), "REVIEW_REQUIRED");
    assert.match(vm.runInContext('packagesWorkspaceView()', context), new RegExp(`Confirm ${action} qualification-package`));
    const before = calls.filter(x => x.method === "POST").length;
    await vm.runInContext('confirmLivePackageOperation(state.livePackageOperation.plan.id)', context);
    await vm.runInContext('confirmLivePackageOperation(state.livePackageOperation.plan.id)', context);
    assert.equal(calls.filter(x => x.method === "POST").length, before + 1);
    assert.equal(vm.runInContext('state.livePackageOperation.state', context), "VERIFIED");
  }
  assert.equal(installedVersion, null);
  assert.equal(vm.runInContext('currentEvidenceCollection().records.filter(r=>r.kind==="operation-receipt").length', context), 2);
  assert.match(vm.runInContext('evidenceView()', context), /operation-receipt/u);
  vm.runInContext('clearSession()', context);
  assert.equal(vm.runInContext('state.livePackageOperation', context), null);
});

test('an accepted package call with unchanged inventory remains a failed receipt throughout the UI',async()=>{
  const name='qualification-package';let dispatches=0;
  const {context}=contextFor('/opsdeck/index.html',async(path,options)=>{
    let value;
    if(path==='/opsdeck-api/packages')value={provider:'iris-ipm-installed-v1',namespace:'%SYS',status:'empty',packages:[]};
    else if(path==='/opsdeck-api/package-authority')value={provider:'iris-ipm-operations-v1',username:'Qualification',namespace:'%SYS',state:'SUPPORTED'};
    else if(path.startsWith('/opsdeck-api/available-packages?'))value=catalog;
    else if(path==='/opsdeck-api/package-operation'){dispatches++;value={provider:'iris-ipm-operations-v1',username:'Qualification',namespace:'%SYS',state:'ACCEPTED'};}
    else throw Error('Unexpected request');
    return {ok:true,status:200,json:async()=>vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(value))})`,context)};
  });
  const catalog={provider:'iris-ipm-available-v1',namespace:'%SYS',name,status:'available',coverage:'complete',repositoryCount:1,availableRepositoryCount:1,truncated:false,packages:[{name,availableVersion:'0.0.1',repository:'qualification-repo'}]};
  context.fixtureCatalog=vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(catalog))})`,context);
  vm.runInContext('state.connected=true;state.info={username:"Qualification"};state.applicationsTab="packages";state.availablePackageCatalog=mapAvailablePackageCatalog(fixtureCatalog)',context);
  await vm.runInContext('loadPackageInventory(true);',context);
  await vm.runInContext('prepareLivePackageOperation(0)',context);
  await vm.runInContext('confirmLivePackageOperation(state.livePackageOperation.plan.id)',context);
  assert.equal(dispatches,1);
  assert.equal(vm.runInContext('state.livePackageOperation.state',context),'MISMATCH');
  const review=vm.runInContext('packagesWorkspaceView()',context);
  assert.match(review,/read-back FAILED/u);
  assert.doesNotMatch(review,/verified the result|Verified Receipt is available/u);
  const ledger=vm.runInContext('evidenceView()',context);
  assert.match(ledger,/install qualification-package[\s\S]*?FAILED/u);
  assert.doesNotMatch(ledger,/Verified Receipt · install/u);
  assert.equal(vm.runInContext('currentEvidenceCollection().records.find(r=>r.kind==="operation-receipt").state',context),'FAILED');
  assert.match(vm.runInContext('operationOutcome({receipt:{verification:"FAILED"}})',context),/Operation receipt/u);
  const workflowReview=vm.runInContext('workflowRunner={snapshot:()=>({state:"MISMATCH",step:"verify",workflow:{target:{key:"/fixture"},targetRef:{label:"LOCAL"}},receipt:{verification:"FAILED"}})};workflowPanel("/fixture")',context);
  assert.match(workflowReview,/Operation receipt · FAILED/u);
  assert.doesNotMatch(workflowReview,/Verified Receipt/u);
});

test('native availability workflow stops at confirmation, dispatches once, and projects its receipt into the existing ledger',async()=>{
  let enabled=false;const calls=[];
  const {context}=contextFor('/opsdeck/index.html',async(path,options)=>{
    calls.push({path,method:options.method||'GET'});
    if(options.method==='PUT')enabled=JSON.parse(options.body).Enabled;
    const value=path==='/api/admin/info'?{username:'Qualification',privileges:{Secure:{use:true}}}:{Enabled:enabled,NameSpace:'%SYS'};
    return {ok:true,status:200,json:async()=>vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify({status:{errors:[]},result:value}))})`,context)};
  });
  vm.runInContext('state.connected=true;state.info={username:"Qualification"};state.apps=mapWebApps({status:{errors:[]},result:[{Name:"/opsdeck-fixture",Namespace:"%SYS",Enabled:false,Type:"CSP",AuthenticationMethods:["Password"]}]});',context);
  await vm.runInContext('startAvailabilityWorkflow("/opsdeck-fixture")',context);
  assert.equal(vm.runInContext('workflowRunner.snapshot().state',context),'AWAITING_CONFIRMATION');assert.equal(calls.filter(c=>c.method==='PUT').length,0);
  assert.match(vm.runInContext('applicationsView()',context),/Confirm workflow/u);
  await vm.runInContext('confirmAvailabilityWorkflow(workflowRunner.snapshot().plan.id)',context);
  assert.equal(vm.runInContext('workflowRunner.snapshot().state',context),'VERIFIED');assert.equal(calls.filter(c=>c.method==='PUT').length,1);
  assert.equal(vm.runInContext('sessionLedger(currentEvidenceCollection()).categories.receipts.length',context),1);
  assert.equal(vm.runInContext('sessionLedger(currentEvidenceCollection()).categories.confirmations.length',context),1);
  await vm.runInContext('confirmAvailabilityWorkflow(workflowRunner.snapshot().plan.id)',context);assert.equal(calls.filter(c=>c.method==='PUT').length,1);
  vm.runInContext('clearSession()',context);assert.equal(vm.runInContext('workflowRunner',context),null);assert.equal(vm.runInContext('state.operationEvidence.length',context),0);
});

test('Entity Graph uses detail observation Evidence from the existing session projection',()=>{
  const {context}=contextFor();
  vm.runInContext('state.connected=true;state.info={username:"Qualification"};const user=mapReadOnlySource("users",{status:{errors:[]},result:[{Name:"operator"}]}).items[0];state.userDetails.operator=mapSecurityUserDetail({status:{errors:[]},result:{Name:"operator",Roles:["reader"]}},user);',context);
  const output=vm.runInContext('evidenceView()',context);assert.match(output,/Entity Graph/u);assert.match(output,/has-role/u);assert.match(output,/Inspect Evidence · PARTIAL/u);
  const collection=vm.runInContext('currentEvidenceCollection()',context);assert.ok(collection.records.some(record=>record.id.startsWith('session:relationships:user:')));
});

test('target comparison retains the local typed detail for the existing Evidence graph with one read',async()=>{
  const calls=[];const {context}=contextFor('/opsdeck/index.html',async path=>{
    calls.push(path);
    return {ok:true,status:200,json:async()=>vm.runInContext('({status:{errors:[]},result:{Name:"/opsdeck-fixture",NameSpace:"%SYS",Enabled:true,DispatchClass:"Fixture.Dispatch"}})',context)};
  });
  vm.runInContext('state.connected=true;state.info={username:"Qualification"};state.apps=mapWebApps({status:{errors:[]},result:[{Name:"/opsdeck-fixture",Namespace:"%SYS",Enabled:true,AuthenticationMethods:[]}]});',context);
  await vm.runInContext('compareApplicationTargets("/opsdeck-fixture")',context);
  assert.equal(calls.length,1);
  assert.equal(vm.runInContext('state.webAppDetails["/opsdeck-fixture"]?.values.DispatchClass',context),'Fixture.Dispatch');
  assert.equal(vm.runInContext('state.targetComparison.observations.filter(o=>o.state==="UNAVAILABLE").length',context),3);
  const output=vm.runInContext('evidenceView()',context);
  assert.match(output,/dispatches-to/u);assert.match(output,/Fixture.Dispatch/u);assert.match(output,/Inspect Evidence · PARTIAL/u);
  assert.equal(vm.runInContext('projectEntityGraph(relationshipObservations(state),currentEvidenceCollection()).edges.length',context),1);
});

test('native intelligence rehearsal is allowed in Observe Only, requires confirmation, rechecks profile and records its receipt',async()=>{
  let enabled=true,holdProfileRead=false,releaseProfileRead;const calls=[];
  const {context}=contextFor('/opsdeck/index.html',async(path,options)=>{
    calls.push({path,method:options.method||'GET'});
    let value;
    if(path==='/opsdeck-api/intent-rehearsal'){
      value=vm.runInContext('({provider:"opsdeck-intent-rehearsal-v1",username:"Qualification",namespace:"%SYS",profileId:"AI_PROFILE_ADMIN",dispatchAllowed:0,trust:"server-reconstructed-current-iris-state",state:"REVIEW_REQUIRED",planInput:{id:"intent:integration",intent:"AI rehearsal disable /opsdeck-fixture",target:{domain:"applications",kind:"web-app",provider:"iris-admin-api",key:"/opsdeck-fixture",scope:"%SYS",label:"/opsdeck-fixture",observedAt:new Date().toISOString()},targetRef:state.targetRef,capability:{id:"webapp.disable",state:"SUPPORTED",...OPERATION_POLICIES["webapp.disable"]},parameters:{enabled:false},preState:{enabled:true},createdAt:new Date().toISOString(),ttlSeconds:120,preStateEvidence:"native:observed",authorityValidation:{state:"SUPPORTED",evidence:"native:profile-human-policy"},expectedReadback:"Enabled is false"}})',context);
    }else{
      if(options.method==='PUT')enabled=JSON.parse(options.body).Enabled;
      value={status:{errors:[]},result:{Enabled:enabled,NameSpace:'%SYS'}};
    }
    const response={ok:true,status:200,json:async()=>vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(value))})`,context)};
    if(holdProfileRead&&path==='/opsdeck-api/intent-rehearsal')return new Promise(resolve=>{releaseProfileRead=()=>resolve(response);});
    return response;
  });
  vm.runInContext('state.connected=true;state.info={username:"Qualification"};state.route="evidence";state.observeOnly=true;setObserveOnly(true);state.intelligence.text="disable /opsdeck-fixture";state.intelligence.profileId="AI_PROFILE_ADMIN";',context);
  await vm.runInContext('rehearseIntent()',context);
  assert.equal(vm.runInContext('state.intelligence.operation.state',context),'REVIEW_REQUIRED');assert.equal(calls.filter(c=>c.method==='PUT').length,0);
  assert.match(vm.runInContext('intelligencePanel()',context),/Confirm AI rehearsal/u);
  await vm.runInContext('confirmWebAppOperation(state.webAppOperation.plan.id)',context);assert.equal(calls.filter(c=>c.method==='PUT').length,0);
  vm.runInContext('state.observeOnly=false;setObserveOnly(false);',context);
  await vm.runInContext('confirmWebAppOperation(state.webAppOperation.plan.id)',context);
  assert.equal(vm.runInContext('state.intelligence.operation.state',context),'VERIFIED');assert.equal(calls.filter(c=>c.method==='PUT').length,1);
  assert.equal(calls.filter(c=>c.path==='/opsdeck-api/intent-rehearsal').length,2);
  assert.match(vm.runInContext('currentEvidenceCollection().records.find(r=>r.kind==="operation-receipt").evidence.warnings.join(" ")',context),/AI_PROFILE_ADMIN/u);
  vm.runInContext('invalidateIntentDraft()',context);assert.equal(vm.runInContext('state.webAppOperation',context),null);
  enabled=true;await vm.runInContext('rehearseIntent()',context);holdProfileRead=true;
  const confirming=vm.runInContext('const cancelledIntent=state.webAppOperation;confirmWebAppOperation(state.webAppOperation.plan.id)',context);
  for(let attempt=0;attempt<20&&!releaseProfileRead;attempt++)await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(typeof releaseProfileRead,'function');
  vm.runInContext('state.intelligence.profileId="AI_PROFILE_USER";invalidateIntentDraft()',context);releaseProfileRead();await confirming;
  assert.equal(vm.runInContext('cancelledIntent.state',context),'CANCELLED');assert.equal(calls.filter(c=>c.method==='PUT').length,1,'changed profile cancels the old confirmation before another PUT');
  vm.runInContext('clearSession()',context);assert.equal(vm.runInContext('state.intelligence.operation',context),null);
});

test('editing intent removes its current output without rebuilding the editor or deleting historical Evidence',()=>{
  let requests=0;const {context,element}=contextFor('/opsdeck/index.html',()=>{requests++;throw Error('No request expected');});
  vm.runInContext('state.connected=true;state.info={username:"Qualification"};state.intelligence.observation={target:{key:"/app"},value:{enabled:true}};state.operationEvidence=[{id:"historical:intent",kind:"read-observation",state:"PARTIAL",title:"Earlier intent observation",observedAt:new Date().toISOString(),source:{identity:"fixture"},resource:{key:"/app"},summary:"Historical observation remains in the session."}];',context);
  const output={innerHTML:vm.runInContext('intelligencePanel()',context)},editor={id:'intent-text'};
  context.document.activeElement=editor;let selectors=[];
  element.querySelector=selector=>{selectors.push(selector);return selector==='#intent-output'?output:null;};
  vm.runInContext('state.intelligence.text="disable /app";invalidateIntentDraft()',context);
  assert.match(output.innerHTML,/Intent changed\. Reconstruct the current intent again/u);
  assert.doesNotMatch(output.innerHTML,/OBSERVED|Impact Forecast|data-webapp-confirm=/u);
  assert.equal(context.document.activeElement,editor);assert.deepEqual(selectors,['#intent-output']);assert.equal(requests,0);
  assert.match(vm.runInContext('intelligencePanel()',context),/Intent changed\. Reconstruct the current intent again/u);
  assert.equal(vm.runInContext('currentEvidenceCollection().records.filter(r=>r.id==="historical:intent").length',context),1);
});

test('an obsolete intelligence completion releases busy state without rebuilding the edited intent',async()=>{
  let release;const calls=[];const {context,element}=contextFor('/opsdeck/index.html',async path=>{
    calls.push(path);return new Promise(resolve=>{release=()=>resolve({ok:true,status:200,json:async()=>vm.runInContext('({provider:"opsdeck-intent-rehearsal-v1",username:"Qualification",namespace:"%SYS",profileId:"AI_PROFILE_USER",dispatchAllowed:0,trust:"server-reconstructed-current-iris-state",state:"OBSERVED",target:{key:"/app"},value:{enabled:true},observedAt:new Date().toISOString()})',context)});});
  });
  vm.runInContext('state.connected=true;state.info={username:"Qualification"};state.route="evidence";state.intelligence.text="inspect /app";',context);
  const output={innerHTML:''},editor={id:'intent-text'},action={disabled:true,addEventListener(){}};
  element.querySelector=selector=>selector==='#intent-output'?output:selector==='#intent-rehearse'?action:null;
  let rendered=element.innerHTML;
  Object.defineProperty(element,'innerHTML',{get:()=>rendered,set:value=>{rendered=value;context.document.activeElement={id:'body'};}});
  const pending=vm.runInContext('rehearseIntent()',context);
  for(let attempt=0;attempt<20&&!release;attempt++)await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(typeof release,'function');context.document.activeElement=editor;
  vm.runInContext('state.intelligence.text="disable /app";invalidateIntentDraft()',context);
  release();await pending;
  assert.equal(context.document.activeElement,editor);assert.equal(action.disabled,false);
  assert.equal(action.textContent,'Observe / Operation Rehearsal');
  assert.match(output.innerHTML,/Intent changed/u);assert.equal(calls.length,1);
  assert.equal(vm.runInContext('!state.intelligence.busy&&state.intelligence.observation===null&&state.intelligence.operation===null&&state.operationEvidence.length===0',context),true);
});
