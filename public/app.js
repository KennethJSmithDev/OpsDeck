import { mapServerInfo, mapWebApps, mapWebAppDetail, mapSecurityUserDetail, sameSecurityUserRelationships, mapSecurityRoleDetail, sameSecurityRoleDetail, mapSecurityRoleOwners, sameSecurityRoleOwners, mapSecurityResourceDetail, sameSecurityResourceDetail, mapTaskDetail, sameTaskDetail, mapRestServiceSpec, mapReadOnlySource, sameReadOnlySource, READ_ONLY_SOURCES, sameWebAppState, inspectAuditLocation, validateAuditLocation, mapAuditAsyncResult, AUDIT_QUERY_MAX_ROWS } from "./iris-provider.js?v=opsdeck-0.8.0";
import { createEvidenceCollection, exportEvidenceJSON, exportEvidenceMarkdown, exportEvidenceCSV, filterEvidence, operationReceiptEvidence, sessionLedger, evidenceLabel } from "./evidence-center.js?v=opsdeck-0.8.0";
import { comparePackageCatalogToInstalled, fixturePackageInventory, livePackageSelection, mapAvailablePackageCatalog, mapInstalledPackageInventory, preparePackagePlan } from "./packages-workspace.js?v=opsdeck-0.8.0-ipm";
import { mapAuditJob, upsertJob } from "./job-center.js?v=opsdeck-0.8.0";
import { ProductIdentity } from "./product-identity.js?v=opsdeck-0.8.0-about";
import { createOperationPlan, createIPMPackageOperationProvider, createWebAppOperationProvider, executeOperationPlan, OPERATION_POLICIES, setObserveOnly } from "./operation-engine.js?v=opsdeck-0.8.0-ipm";
import {configureCurrentTarget,targetChoices,readAcrossTargets,compareTargetObservations} from './target-context.js?v=target-1';
import {relationshipObservations,projectEntityGraph} from './entity-graph.js?v=graph-1';
import {createWorkflow,createWorkflowRunner} from './workflow-engine.js?v=workflow-1';
import {INTENT_PROVIDERS,AI_PROFILES,deterministicIntentProvider,reconstructIntentOperation} from './trusted-intelligence.js?v=intent-1';

const navItems = [
  ["overview", "Overview"], ["applications", "Applications"], ["access", "Access"],
  ["security", "Security"], ["tasks", "Tasks"], ["system", "System"],
  ["logs", "Logs"], ["evidence", "Evidence"],
];
const domainSources = {
  applications: ["restServices", "restServicesV2"],
  access: ["users", "roles", "resources"],
  security: ["walletCollections", "x509Credentials", "oauthResourceServers", "oauthServerDefinitions", "oauthServer"],
  tasks: ["tasks"],
  system: ["systemUsage", "processes", "databases", "devices"],
  logs: ["auditEnabled", "auditEvents", "messagesLog", "messageRotations", "systemMonitorLog", "taskHistory", "journalFiles", "alerts"],
};

// Product qualification maturity is separate from observed IRIS authority/provider results.
const unqualifiedRouteCapabilities = Object.freeze({
  logs: Object.freeze(["Audit records", "messages.log", "SystemMonitor.log"]),
});
const navigationContextRoutes = Object.freeze({
  access: ["security"], security: ["access"], system: ["logs"], logs: ["evidence"],
});

function isAuthorityDenial(error) {
  return /does not have authority|HTTP 403|denied/i.test(String(error || ""));
}

function providerUiEvidence(model, sourceId) {
  if (sourceId === "identity") {
    if (model.info) return { status: "SUPPORTED", detail: "Identity was observed in the current session." };
    if (model.error) return { status: isAuthorityDenial(model.error) ? "DENIED" : "UNAVAILABLE", detail: model.error };
    return { status: "UNKNOWN", detail: "Identity has not been observed in this session." };
  }
  if (sourceId === "webApps") {
    if (model.verification) return model.verification.matched
      ? { status: "SUPPORTED", detail: "The current web-application result matched its independent read-back." }
      : { status: "PARTIAL", detail: "The current web-application result differed from its independent read-back." };
    if (model.error) return { status: isAuthorityDenial(model.error) ? "DENIED" : "UNAVAILABLE", detail: model.error };
    return { status: "UNKNOWN", detail: "No current web-application read-back is available." };
  }
  if (!Object.hasOwn(READ_ONLY_SOURCES, sourceId)) {
    return { status: "UNSUPPORTED", detail: "No fixed provider is registered for this source." };
  }
  if (Object.hasOwn(model.sourceData || {}, sourceId) && model.sourceData[sourceId]) {
    const state = model.sourceData[sourceId].status;
    if (state === "denied") return { status: "DENIED", detail: "IRIS denied this fixed-source read." };
    if (state === "unavailable") return { status: "UNAVAILABLE", detail: "The fixed source is unavailable." };
    if (state === "read-failure" || state === "failed") return { status: "FAILED", detail: "The fixed-source read failed." };
    // A valid empty collection is still an observed, available provider result.
    return { status: "SUPPORTED", detail: state === "empty" ? `${READ_ONLY_SOURCES[sourceId].label} returned a valid empty result.` : `${READ_ONLY_SOURCES[sourceId].label} returned a mapped result.` };
  }
  if (Object.hasOwn(model.sourceErrors || {}, sourceId)) {
    const error = model.sourceErrors[sourceId];
    return { status: isAuthorityDenial(error) ? "DENIED" : "UNAVAILABLE", detail: String(error) };
  }
  return {
    status: "UNKNOWN",
    detail: model.sourceLoading === sourceId ? `${READ_ONLY_SOURCES[sourceId].label} is being read.` : `${READ_ONLY_SOURCES[sourceId].label} has not been read in this session.`,
  };
}

function routeUiEvidence(model, route) {
  let sourceIds;
  if (route === "overview") sourceIds = ["identity", "webApps"];
  else if (route === "applications") sourceIds = ["webApps", ...domainSources.applications];
  else if (route === "evidence") sourceIds = ["webApps"];
  else if (domainSources[route]) sourceIds = domainSources[route];
  else return { status: "UNSUPPORTED", sources: [], qualifications: [], detail: "No OpsDeck route or provider is registered for this destination." };

  const sources = sourceIds.map((id) => ({ id, label: id === "identity" ? "Server identity" : id === "webApps" ? "Web applications" : READ_ONLY_SOURCES[id]?.label || id, ...providerUiEvidence(model, id) }));
  const observed = sources.filter((source) => source.status !== "UNKNOWN");
  let status = "UNKNOWN";
  if (observed.length === sources.length && observed.every((source) => source.status === "SUPPORTED")) status = "SUPPORTED";
  else if (observed.length === sources.length && observed.length > 0 && observed.every((source) => source.status === "DENIED")) status = "DENIED";
  else if (observed.length === sources.length && observed.length > 0 && observed.every((source) => source.status === "UNAVAILABLE")) status = "UNAVAILABLE";
  else if (observed.length > 0) status = "PARTIAL";

  const qualifications = (unqualifiedRouteCapabilities[route] || []).map((label) => ({ label, status: "UNQUALIFIED" }));
  const detail = [
    ...sources.map((source) => `${source.label}: ${source.status.toLowerCase()}`),
    ...qualifications.map((item) => `${item.label}: unqualified`),
  ].join("; ");
  return { status, sources, qualifications, detail };
}

function relatedNavigationRoutes(model, route) {
  const related = [...(navigationContextRoutes[route] || [])];
  if (route === "applications" && model.selected) related.unshift("evidence");
  if (route === "access" && model.selectedItems?.[model.sourceTabs?.access]) related.unshift("security");
  if (route === "tasks" && model.selectedItems?.tasks) related.unshift("logs");
  const activeSources = domainSources[route] || [];
  if (activeSources.some((sourceId) => Object.hasOwn(model.sourceErrors || {}, sourceId))) related.unshift("evidence");
  return [...new Set(related)].filter((item) => item !== route && navItems.some(([id]) => id === item));
}

function projectUiNavigation(model, viewportWidth = 1024, compactLayout = viewportWidth <= 980) {
  const activeRoute = navItems.some(([route]) => route === model.route) ? model.route : "overview";
  const related = relatedNavigationRoutes(model, activeRoute);
  const order = [
    "overview",
    ...(activeRoute === "overview" ? [] : [activeRoute]),
    ...related,
    ...navItems.map(([route]) => route),
  ].filter((route, index, all) => all.indexOf(route) === index);
  const primaryCount = compactLayout ? 3 : order.length;
  const items = order.map((route, index) => {
    const [, label] = navItems.find(([id]) => id === route);
    const evidence = routeUiEvidence(model, route);
    return { route, label, evidence, active: route === activeRoute, contextual: related.includes(route) && route !== activeRoute, primary: index < primaryCount };
  });
  return {
    viewportWidth,
    layout: compactLayout ? "compact" : "wide",
    items,
    primaryRoutes: items.filter((item) => item.primary).map((item) => item.route),
    moreRoutes: items.filter((item) => !item.primary).map((item) => item.route),
  };
}
const state = {
  route: location.hash.slice(1) || "overview",
  targetRef:{id:'local',label:'LOCAL',origin:location.origin||'same-origin',environment:'LOCAL'},
  targetCompareOpen:false,targetComparison:null,targetCompareBusy:false,targetCompareError:'',
  theme: localStorage.getItem("opsdeck.theme") || "dark",
  observeOnly: true, commandOpen: false, commandQuery: "", commandApi: null, commandError: "", confirmationReview: null,
  apiExplorer: {parameters:{},body:'{}',preview:null,result:null,operation:null,busy:false},
  intelligence:{text:'inspect /opsdeck',profileId:'AI_PROFILE_USER',providerId:'deterministic',operation:null,observation:null,busy:false,error:'',revision:0},
  fxOpen: false, fxReady: false, fxError: "", fxPreference: {}, fxRole: "",
  capabilitySummary:null,capabilitySummaryBusy:false,capabilitySummaryError:'',
  connected: false,
  busy: false,
  error: "",
  info: null,
  apps: [],
  appsReadAt: "",
  selected: "",
  lastRead: null,
  verification: null,
  webAppOperation: null,
  operationEvidence: [],
  sourceData: {}, sourceErrors: {}, sourceLoading: "", sourceVerification: {}, selectedRotation: "", rotationLoading: "",
  sourceTabs: { applications: "restServices", access: "users", security: "walletCollections", tasks: "tasks", system: "systemUsage", logs: "auditEnabled" },
  systemSection: "providers",
  selectedItems: {},
  evidenceFilter: "",
  evidenceStateFilter: "ALL",
  semanticQuery: "",
  semanticResult: null,
  semanticInterpretation: null,
  semanticBusy: false,
  semanticError: "",
  applicationsTab: "web-apps",
  packageFilter: "all",
  packagePlan: null,
  packageInventory: null,
  packageInventoryError: "",
  packageInventoryLoading: false,
  availablePackageName: "",
  availablePackageCatalog: null,
  availablePackageError: "",
  availablePackageErrorStatus: 0,
  availablePackageLoading: false,
  selectedSnippet: "",
  snippetText: "",
  snippetLoading: false,
  snippetError: "",
  webAppDetails: {}, webAppDetailErrors: {}, webAppDetailLoading: "",
  userDetails: {}, userDetailErrors: {}, userDetailLoading: "", userDetailVerification: {},
  roleDetails: {}, roleDetailErrors: {}, roleDetailLoading: "", roleDetailVerification: {},
  roleOwners: {}, roleOwnerErrors: {}, roleOwnerLoading: "", roleOwnerVerification: {},
  resourceDetails: {}, resourceDetailErrors: {}, resourceDetailLoading: "", resourceDetailVerification: {},
  taskDetails: {}, taskDetailErrors: {}, taskDetailLoading: "", taskDetailVerification: {},
  restSpecs: {}, restSpecErrors: {}, restSpecLoading: "",
  auditQuery: null, auditQueryBusy: false, jobs: [],
  mobileMoreOpen: false,
};

const nativeMode = location.pathname === "/opsdeck" || location.pathname?.startsWith("/opsdeck/") === true;
let nativeAuthorization = null;
let workflowRunner = null;
let sessionEpoch = 0;
let nextSnapshot = 0;
let fxModule = null;
let commandModule = null;
let apiCatalog = [];
let apiCatalogDocument = null;
let explorerModule = null;
let mutationModule = null;
try { state.fxPreference = JSON.parse(localStorage.getItem("opsdeck.fx") || "{}"); if (!state.fxPreference || typeof state.fxPreference !== "object") state.fxPreference = {}; } catch { state.fxPreference = {}; }
const snapshotIds = new WeakMap();
function recordHandle(data, index) {
  if (!snapshotIds.has(data)) snapshotIds.set(data, ++nextSnapshot);
  return `snapshot:${snapshotIds.get(data)}:${index}`;
}
function uniqueRecord(items, predicate) {
  const matches = (items || []).filter(predicate);
  return matches.length === 1 ? matches[0] : null;
}
const app = document.querySelector("#app");
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const fmtTime = (value) => value ? new Intl.DateTimeFormat(undefined, {
  hour: "2-digit", minute: "2-digit", second: "2-digit",
}).format(new Date(value)) : "—";

const IRIS_CONCEPTS = Object.freeze({
  namespace: Object.freeze({ title: "Namespace", body: "A namespace is IRIS's logical view of code and data. A namespace shown on a row scopes that observation; it does not establish an all-namespace inventory." }),
  sys: Object.freeze({ title: "%SYS", body: "%SYS exposes system and administrative code. Seeing a %SYS row does not grant this signed-in identity any additional privilege." }),
  ipm: Object.freeze({ title: "IPM package state", body: "Installed registrations and configured-repository search are separate observations. A catalog result is not an installation, and a lower catalog version is not an update." }),
  access: Object.freeze({ title: "DENIED and UNAVAILABLE", body: "DENIED means IRIS rejected this identity's request. UNAVAILABLE means OpsDeck could not obtain a usable response. Neither state means the source is empty." }),
  readback: Object.freeze({ title: "Authoritative read-back", body: "After a request, a separate read from IRIS must show the requested state before OpsDeck can call the operation verified. An HTTP success alone is not proof." }),
  job: Object.freeze({ title: "Asynchronous Job", body: "A returned job identity means work was accepted. Completion and its result are separate observations; OpsDeck does not retry an ambiguous dispatch." }),
  logs: Object.freeze({ title: "Fixed log observation", body: "OpsDeck reads only named log sources through bounded readers. This view does not browse arbitrary files or expose the resolved source path." }),
  evidence: Object.freeze({ title: "OperationReceipt", body: "A receipt records OpsDeck's bounded before/request/after verification projection. IRIS remains the source of truth; a receipt does not replace it." }),
  certainty: Object.freeze({ title: "KNOWN / INFERRED / UNVERIFIED", body: "KNOWN is directly observed, INFERRED is a conclusion drawn from observations, and UNVERIFIED marks a claim that has not crossed its required qualification boundary." }),
});
const CONCEPTS_BY_ROUTE = Object.freeze({
  overview: ["namespace", "sys"],
  applications: { "web-apps": ["namespace", "readback"], packages: ["ipm"] },
  access: ["access"], security: ["access"], tasks: ["job", "readback"],
  system: ["namespace"], logs: ["logs", "access"], evidence: ["evidence", "certainty", "readback"],
});
const LEARNING_SNIPPETS = Object.freeze([
  Object.freeze({ id: "namespace", title: "Inspect the current namespace", file: "snippet-namespace.txt" }),
  Object.freeze({ id: "try-catch", title: "Handle an ObjectScript exception", file: "snippet-try-catch.txt" }),
  Object.freeze({ id: "http-read", title: "Make a bounded HTTP GET", file: "snippet-http-read.txt" }),
]);

async function requestJson(path, options = {}) {
  const owner = sessionEpoch;
  if (state.observeOnly && options.method && options.method !== "GET" && !(options.method==='POST'&&path==='/opsdeck-api/intent-rehearsal')) throw new Error("Observe Only policy blocks dispatch.");
  let response;
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (nativeMode && nativeAuthorization) headers.Authorization = nativeAuthorization;
  try {
    response = await fetch(path, {
      cache: "no-store",
      credentials: "same-origin",
      ...options,
      headers,
      signal: options.signal || AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (owner !== sessionEpoch) throw new Error("Previous session request discarded.");
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new Error(`Timed out waiting for ${nativeMode ? "IRIS" : "the local OpsDeck proxy"}.`);
    }
    throw new Error(`Could not reach ${nativeMode ? "IRIS" : "the local OpsDeck proxy"}.`);
  }
  const data = await response.json().catch(() => ({}));
  if (owner !== sessionEpoch) throw new Error("Previous session request discarded.");
  if (!response.ok) {
    if (response.status === 401) { clearSession(); state.error = "Authentication failed (HTTP 401). Sign in again."; render(); }
    const messages = Array.isArray(data.status?.errors) ? data.status.errors
      .map((item) => typeof item === "string" ? item : item?.message || item?.error)
      .filter((item) => typeof item === "string" && item.trim()) : [];
    const message = nativeMode && response.status === 401 ? "IRIS authentication failed (HTTP 401)." : (typeof data.error === "string" && data.error.trim()) || messages.join(" ") || `Request failed with HTTP ${response.status}.`;
    const error = new Error(response.status === 403 ? `Request denied (HTTP 403). ${message}` : message);
    error.status = response.status;
    throw error;
  }
  return data;
}

function setTheme(theme) {
  theme = ["dark","light","system","inverse"].includes(theme) ? theme : "system";
  state.theme = theme;
  localStorage.setItem("opsdeck.theme", theme);
  const resolved = theme === "system"
    ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : theme === "inverse" ? "light" : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.base = theme;
}

async function openCommands() {
  const owner = sessionEpoch;
  activateDialog('command'); state.commandError = ''; render();
  try {
    commandModule ||= await import('./command-surface.js?v=command-1');
    if (!apiCatalog.length) {
      const response = await fetch(`${nativeMode ? '/opsdeck/' : './'}api-catalog.json`, {cache:'force-cache'});
      if (!response.ok) throw new Error('Declared API metadata unavailable.');
      let catalog = await response.json();
      if(catalog.schema==='opsdeck-api-catalog-dictionary-v1'){const {expandApiCatalog}=await import('./api-catalog-codec.js?v=catalog-1');catalog=expandApiCatalog(catalog);}
      if (catalog.schema !== 'opsdeck-declared-api-catalog-v2' || !Array.isArray(catalog.operations)) throw new Error('API catalog contract invalid.');
      apiCatalogDocument = catalog;
      apiCatalog = catalog.operations;
    }
  } catch { if (owner === sessionEpoch) state.commandError = 'Some command metadata is unavailable. Existing workspaces remain accessible.'; }
  if (owner !== sessionEpoch || !state.commandOpen) return;
  render(); app.querySelector('#command-search')?.focus();
}
function activateDialog(kind) {
  state.commandOpen=kind==='command';state.fxOpen=kind==='fx';state.targetCompareOpen=kind==='targets';
  if(kind!=='confirmation')state.confirmationReview=null;
}
function reviewedOperation(kind,id) {
  const operation=kind==='workflow'?workflowRunner?.snapshot():kind==='package'?state.livePackageOperation:state.webAppOperation;
  return operation?.plan?.id===id&&operation.state===(kind==='workflow'?'AWAITING_CONFIRMATION':'REVIEW_REQUIRED')&&!operation.busy?operation:null;
}
function openConfirmationReview(kind,id) {
  const operation=reviewedOperation(kind,id);if(!operation||state.observeOnly)return;
  const review={kind,id,plan:operation.plan,owner:sessionEpoch,returnToCommands:state.commandOpen};
  activateDialog('confirmation');state.confirmationReview=review;render();app.querySelector('#confirmation-final')?.focus();
}
function closeConfirmationReview() {
  const review=state.confirmationReview;state.confirmationReview=null;state.commandOpen=review?.returnToCommands===true;render();
  app.querySelector(review?.kind==='workflow'?'[data-workflow-confirm]':review?.kind==='package'?'[data-live-package-confirm]':'[data-webapp-confirm]')?.focus();
}
async function completeConfirmationReview() {
  const review=state.confirmationReview,operation=review&&reviewedOperation(review.kind,review.id);
  if(!review)return;
  if(review.owner!==sessionEpoch||!state.connected||state.observeOnly||operation?.plan!==review.plan){closeConfirmationReview();return;}
  state.confirmationReview=null;state.commandOpen=review.returnToCommands;render();
  if(review.kind==='workflow')await confirmAvailabilityWorkflow(review.id);
  else if(review.kind==='package')await confirmLivePackageOperation(review.id);
  else await confirmWebAppOperation(review.id);
}
function confirmationReviewPanel() {
  const review=state.confirmationReview;
  return `<div class="command-backdrop"><section class="panel command-panel confirmation-panel" role="dialog" aria-modal="true" aria-labelledby="confirmation-title"><div class="panel-head"><h2 id="confirmation-title">Plan Review · Exact confirmation</h2></div><div class="confirmation-body"><p>Current identity: <strong>${esc(state.info?.username||'Unavailable')}</strong>. Observe Only ${state.observeOnly?'ON':'OFF'}.</p><h3>${esc(review.plan.intent)}</h3>${planReview(review.plan)}<p>Confirm this exact plan and observed pre-state. Current policy and authority are checked again before dispatch; the outcome belongs in the Session Ledger.</p></div><div class="confirmation-actions"><button class="button secondary" id="confirmation-back">Back to plan</button><button class="button primary" id="confirmation-final" ${state.observeOnly?'disabled':''}>Confirm change</button></div></section></div>`;
}
async function openFxStudio() {
  const owner=sessionEpoch;activateDialog('fx');render();await refreshFx();
  if(owner!==sessionEpoch||!state.fxOpen)return;
  render();app.querySelector('#fx-close')?.focus();
}
const dialogOutsideElements=new Map();
function syncDialogScope() {
  const open=state.commandOpen||state.fxOpen||state.targetCompareOpen||state.confirmationReview;
  for(const element of document.querySelectorAll?.('body > :not(script):not(style)')||[]){
    if(element===app||element.contains?.(app))continue;
    if(open){if(!dialogOutsideElements.has(element))dialogOutsideElements.set(element,element.inert);element.inert=true;}
  }
  if(!open){for(const [element,inert] of dialogOutsideElements)element.inert=inert;dialogOutsideElements.clear();}
}
function commandResults() {
  if (!commandModule) return [];
  const entities = state.apps.slice(0,200).map((item,index)=>({id:`app:${item.namespace}:${item.name}`,label:`${item.name} · ${item.namespace}`,route:'applications',appName:item.name,appHandle:recordHandle(state.apps,index)}));
  for (const [sourceId, data] of Object.entries(state.sourceData)) for (const [index,item] of (data.items || []).slice(0,100).entries()) {
    const route = Object.keys(domainSources).find(key=>domainSources[key].includes(sourceId));
    if (route) entities.push({id:`entity:${sourceId}:${index}`,label:item.ref?.label || item.ref?.key || `${sourceId} ${index+1}`,route,sourceId,handle:recordHandle(data,index)});
  }
  const operations = Object.entries(OPERATION_POLICIES).filter(([id])=>!id.includes('fixture')&&!id.startsWith('ipm.package.')&&!id.startsWith('sysadmin.metadata.')&&!id.startsWith('sysadmin.auditEvent.')).map(([id,policy])=>({id:`operation:${id}`,label:`Operation Rehearsal · ${policy.semanticAction}`,summary:policy.providerOperation,route:'applications',capability:id}));
  return commandModule.searchCommands(commandModule.commandIndex({workspaces:navItems,entities,operations,apiOperations:apiCatalog,evidence:currentEvidenceCollection().records}),state.commandQuery);
}
function commandPanel() {
  const rows = commandResults();
  const api = apiCatalog.find(item=>item.id===state.commandApi);
  return `<div class="command-backdrop"><section class="panel command-panel" role="dialog" aria-modal="true" aria-labelledby="command-title"><div class="panel-head"><h2 id="command-title">Command Palette</h2><button class="button quiet" id="command-close" aria-label="Close command palette">Close</button></div><label class="command-search-label">Search workspace, entity, operation, API operation, Evidence<input id="command-search" type="search" maxlength="128" value="${esc(state.commandQuery)}" autocomplete="off" placeholder="Find an operation or current evidence"></label>${state.commandError ? `<p role="status">${esc(state.commandError)}</p>` : ''}${api ? apiExplorerPanel(api) : `<div class="command-results">${rows.length ? rows.map((row,index)=>`<button class="command-result" data-command-result="${index}"><small>${esc(row.kind)}</small><strong>${esc(row.label)}</strong>${row.summary ? `<span>${esc(row.summary)}</span>` : ''}</button>`).join('') : '<p role="status">No matching current projection. Unobserved entities are not invented.</p>'}</div>`}</section></div>`;
}
function apiExplorerPanel(api) {
  const model=state.apiExplorer, operation=model.operation;
  const bodySchema=api.body?.$ref ? apiCatalogDocument?.schemas[api.body.$ref.split('/').at(-1)] : api.body;
  return `<article class="command-api"><div class="panel-kicker">SYSADMIN EXPLORER · DECLARED CONTRACT</div><h3>${esc(api.id)}</h3><p>${esc(api.summary)}</p>${api.mutationScope?`<p>Supported changes: <strong>${esc(api.mutationScope.fields.join(', '))}</strong> on existing entities with complete observed invariant guards.</p>`:''}<p>Required privilege/resource: <code>${esc(api.requiredPrivileges.join(', ')||'Not declared')}</code>. ${api.method==='GET'?'Read':'Mutation'} · IRIS enforces current identity authority.</p><div class="api-parameters">${api.parameters.map(p=>`<label>${esc(p.name)} ${p.required?'(required)':'(optional)'}<input data-api-parameter="${esc(p.name)}" type="${['integer','number'].includes(p.schema.type)?'number':'text'}" maxlength="512" value="${esc(model.parameters[p.name]??(p.name==='maxRows'?20:''))}" ${p.required?'required':''} ${p.name==='maxRows'?'min="1" max="100"':''}><small>${esc(p.description)}</small></label>`).join('')}${api.body?`<details><summary>Declared JSON body fields</summary><pre>${esc(JSON.stringify(bodySchema,null,2))}</pre></details><label>JSON request body<textarea id="api-body" rows="5" maxlength="16384" spellcheck="false">${esc(model.body)}</textarea></label>`:''}</div><div class="projection-exports"><button class="button secondary" id="api-preview">Request preview</button><button class="button primary" id="api-action" ${model.busy?'disabled':''}>${api.method==='GET'?'Observe operation':'Operation Rehearsal'}</button><button class="button quiet" id="api-back">Back to commands</button></div><p>Reads are bounded to 100 projected rows and 64 KiB. Sensitive and undeclared fields are withheld. Rehearsal sends no mutation.</p><div id="api-output">${model.revision&&!model.preview&&!model.result&&!operation?'<p role="status">Draft changed. Preview or rehearse the current request again.</p>':''}${model.preview?`<details open><summary>Request preview</summary><pre>${esc(JSON.stringify(model.preview,null,2))}</pre></details>`:''}${model.result?`<p role="status">${esc(model.result.state)} · ${esc(model.result.reason||model.result.verification||'')}</p>${model.result.value!==undefined?`<details open><summary>Response projection</summary><pre>${esc(JSON.stringify(model.result.value,null,2))}</pre></details><p>${esc(JSON.stringify(model.result.stats))}</p>${projectionExports('api')}`:''}`:''}${operation?`<p role="status">${esc(operation.state)} · ${esc(operation.reason||'')}</p>${operation.plan?`${planReview(operation.plan)}${operation.state==='REVIEW_REQUIRED'?`<button class="button primary" data-webapp-confirm="${esc(operation.plan.id)}" ${state.observeOnly?'disabled title="Observe Only blocks confirmation"':''}>Confirm ${esc(operation.plan.intent)}</button>`:''}`:operation.forecast?`<details open><summary>Impact Forecast · unresolved</summary><pre>${esc(JSON.stringify(operation.forecast,null,2))}</pre></details>`:''}`:''}</div></article>`;
}
function apiEvidence(result,kind,api) {
  const observedAt=new Date().toISOString();
  state.operationEvidence=[...state.operationEvidence,{id:`sysadmin:evidence:${Date.now()}`,kind,
    state:['DENIED','UNAVAILABLE','FAILED','BLOCKED'].includes(result.state)?result.state:'PARTIAL',
    title:`${api.method} ${api.path}`,targetRef:state.targetRef,observedAt,source:{identity:'iris-sysadmin-schema-provider-v1'},resource:{key:api.path},
    summary:`${result.state}: ${result.reason||'Bounded response observed; no independent verification inferred.'}`,
    evidence:{providerState:result.state,reason:result.reason||'',truncated:result.stats?.truncated??false}}].slice(-64);
}
async function runApiAction(previewOnly=false) {
  const owner=sessionEpoch,api=apiCatalog.find(item=>item.id===state.commandApi),model=state.apiExplorer;
  const revision=model.revision||0;
  if(!api||model.busy)return;
  model.busy=true;
  try{
    explorerModule ||= await import('./sysadmin-explorer.js?v=sysadmin-1');
    if(owner!==sessionEpoch||state.apiExplorer!==model||(model.revision||0)!==revision)return;
    const body=api.body?JSON.parse(model.body):undefined;
    const request=explorerModule.compileRequest(apiCatalogDocument,api.id,{parameters:model.parameters,body});
    model.preview=explorerModule.requestPreview(request);
    if(previewOnly)return;
    const transport=(path,options)=>{if(owner!==sessionEpoch||!state.connected||state.apiExplorer!==model||(model.revision||0)!==revision)throw new Error('Operation context changed.');return requestJson(path,options);};
    if(api.method==='GET'){
      const result=nativeMode&&state.info?.systemMode!=='DEMO'?await explorerModule.observeRequest(request,transport):{state:'UNAVAILABLE',reason:'native-iris-provider-required-no-demo-substitute'};
      if(owner!==sessionEpoch||state.apiExplorer!==model||(model.revision||0)!==revision)return;
      model.result=result;apiEvidence(result,['OBSERVED','EMPTY'].includes(result.state)?'read-observation':'refusal',api);
    }else{
      let operation;
      const metadataCandidate=Object.entries(OPERATION_POLICIES).some(([id,policy])=>(id.startsWith('sysadmin.metadata.')||id.startsWith('sysadmin.auditEvent.'))&&policy.providerOperation===api.id);
      if(metadataCandidate){mutationModule ||= await import('./metadata-mutations.js?v=mutation-1');if(owner!==sessionEpoch||state.apiExplorer!==model||(model.revision||0)!==revision)return;}
      const metadataMutation=metadataCandidate&&mutationModule.isMetadataMutationRequest(request);
      if((metadataMutation||api.id==='PUT /api/admin/v2/web-app')&&(!nativeMode||state.info?.systemMode==='DEMO'))operation={state:'UNAVAILABLE',reason:'native-canonical-planner-required'};
      else if(metadataMutation)operation=await mutationModule.rehearseMetadataMutation(request,{requestJson:transport,username:state.info?.username,targetRef:state.targetRef});
      else operation=await explorerModule.rehearseRequest(request,{requestJson:transport,username:state.info?.username,
        resolveTarget:name=>{const selected=uniqueRecord(state.apps,item=>item.name===name);return selected?{domain:'applications',kind:'web-app',provider:'iris-admin-api',key:name,scope:selected.namespace,label:name,observedAt:new Date().toISOString()}:null;}});
      if(owner!==sessionEpoch||state.apiExplorer!==model||(model.revision||0)!==revision)return;
      model.operation=operation;
      if(operation.plan){state.webAppOperation=operation;state.operationEvidence=[...state.operationEvidence,{id:operation.plan.id,kind:'operation-plan',state:'UNVERIFIED',title:operation.plan.intent,observedAt:operation.plan.createdAt,source:{identity:operation.provider.identity},resource:operation.plan.target,summary:'Canonical rehearsal from schema input. No mutation dispatched.',evidence:{operationId:operation.plan.id,capability:operation.plan.capability.id,requiresConfirmation:true,authorityState:operation.plan.authorityValidation.state}}].slice(-64);}
      if(!operation.plan||operation.state==='BLOCKED')apiEvidence(operation,'refusal',api);
    }
  }catch{if(owner===sessionEpoch&&state.apiExplorer===model&&(model.revision||0)===revision){model.result={state:'BLOCKED',reason:'request-schema-or-provider-contract-invalid'};if(!previewOnly)apiEvidence(model.result,'refusal',api);}}
  finally{if(owner===sessionEpoch&&state.apiExplorer===model){model.busy=false;if((model.revision||0)===revision){render();app.querySelector('#api-action')?.focus();}else{const action=app.querySelector('#api-action');if(action)action.disabled=false;}}}
}
function invalidateApiDraft() {
  const model=state.apiExplorer;
  if(model.operation?.plan===state.webAppOperation?.plan)state.webAppOperation=null;
  model.revision=(model.revision||0)+1;model.preview=null;model.operation=null;model.result=null;
  const output=app.querySelector('#api-output');
  if(output)output.innerHTML='<p role="status">Draft changed. Preview or rehearse the current request again.</p>';
  app.querySelectorAll('[data-webapp-confirm]').forEach(button=>{button.disabled=true;});
}
function closeCommands() { state.commandOpen=false; render(); app.querySelector('#command-open')?.focus(); }
function targetComparisonPanel() {
  const model=state.targetComparison;
  return `<div class="command-backdrop"><section class="panel command-panel" role="dialog" aria-modal="true" aria-labelledby="targets-title"><div class="panel-head"><h2 id="targets-title">Compare Targets</h2><button class="button quiet" id="targets-close">Close comparison</button></div>${state.targetCompareBusy?'<p role="status">Observing each configured target independently…</p>':''}${state.targetCompareError?`<p role="status">${esc(state.targetCompareError)}</p>`:''}${model?`<p><code>${esc(model.semanticRef.key)}</code> · ${esc(model.semanticRef.scope||'instance')}</p><div class="target-comparison">${model.observations.map(observation=>`<article class="target-card"><h3>${esc(observation.targetRef.label)} ${badge(observation.state,observation.state==='VERIFIED'?'success':['DENIED','UNAVAILABLE'].includes(observation.state)?'warning':'accent')}</h3><p>${esc(observation.targetRef.environment)} · ${esc(observation.reason||observation.observedAt||'')}</p>${observation.value?`<pre>${esc(JSON.stringify(observation.value,null,2))}</pre>`:''}</article>`).join('')}</div><p>Observed differences: ${esc(model.differences.join(', ')||'None established among comparable observations')}</p><p>${esc(model.basis)}</p>`:'<p>DEV, QA and PROD remain unconfigured. No target or authority is inferred from an environment label.</p>'}</section></div>`;
}
async function compareApplicationTargets(name) {
  const selected=uniqueRecord(state.apps,item=>item.name===name);
  if(!selected||state.targetCompareBusy)return;
  const owner=sessionEpoch;
  activateDialog('targets');state.targetCompareBusy=true;state.targetCompareError='';render();
  try{
    const targets=targetChoices(state.targetRef);
    const reader=async(ref,targetRef)=>{
      if(!nativeMode||state.info?.systemMode==='DEMO')return {state:'UNAVAILABLE',reason:'native-iris-provider-required-no-demo-substitute',targetRef};
      const payload=await requestJson(`/api/admin/v2/web-app?${new URLSearchParams({name:ref.key})}`);
      if(owner!==sessionEpoch)throw new Error('Target session expired.');
      const detail=mapWebAppDetail(payload,selected);
      state.webAppDetails[name]=detail;delete state.webAppDetailErrors[name];
      return {state:'OBSERVED',targetRef,observedAt:detail.ref.observedAt,value:detail.values};
    };
    const observations=await readAcrossTargets(targets,selected.ref,{local:reader});
    if(owner!==sessionEpoch)return;
    state.targetComparison=compareTargetObservations(observations,selected.ref);
    for(const observation of observations)state.operationEvidence=[...state.operationEvidence,{id:`target:${observation.targetRef.id}:${Date.now()}`,targetRef:observation.targetRef,kind:['OBSERVED','EMPTY','VERIFIED'].includes(observation.state)?'read-observation':'refusal',state:['DENIED','UNAVAILABLE'].includes(observation.state)?observation.state:'PARTIAL',title:`Compare Targets · ${observation.targetRef.label}`,observedAt:observation.observedAt||new Date().toISOString(),source:{identity:'iris-admin-api'},resource:selected.ref,summary:`${observation.state}: ${observation.reason||'Independent target observation; no global truth inferred.'}`,evidence:{providerState:observation.state}}].slice(-64);
  }catch{if(owner===sessionEpoch)state.targetCompareError='Comparison unavailable; observations remain separate.';}
  finally{if(owner===sessionEpoch){state.targetCompareBusy=false;render();if(state.targetCompareOpen)app.querySelector('#targets-close')?.focus();}}
}
function bindCommandSurface() {
  app.querySelector('#command-open')?.addEventListener('click',openCommands);
  app.querySelector('#command-close')?.addEventListener('click',closeCommands);
  app.querySelector('#command-search')?.addEventListener('input',event=>{
    state.commandQuery=event.target.value.slice(0,128); state.commandApi=null; render(); app.querySelector('#command-search')?.focus();
  });
  app.querySelectorAll('[data-api-parameter]').forEach(input=>input.addEventListener('input',()=>{state.apiExplorer.parameters[input.dataset.apiParameter]=input.value;invalidateApiDraft();}));
  app.querySelector('#api-body')?.addEventListener('input',event=>{state.apiExplorer.body=event.target.value;invalidateApiDraft();});
  app.querySelector('#api-preview')?.addEventListener('click',()=>runApiAction(true));
  app.querySelector('#api-action')?.addEventListener('click',()=>runApiAction());
  app.querySelector('#api-back')?.addEventListener('click',()=>{state.commandApi=null;render();app.querySelector('#command-search')?.focus();});
  app.querySelectorAll('[data-command-result]').forEach(button=>button.addEventListener('click',()=>{
    const command = commandResults()[Number(button.dataset.commandResult)]; if (!command) return;
    if (command.kind === 'API operation') { state.commandApi=command.operation;state.apiExplorer={parameters:{},body:'{}',preview:null,result:null,operation:null,busy:false}; render(); app.querySelector('#api-action')?.focus(); return; }
    state.route = command.route || 'applications';
    if (command.appName) { state.applicationsTab='web-apps'; state.selected=command.appHandle; }
    if (command.sourceId) { state.sourceTabs[state.route]=command.sourceId; state.selectedItems[command.sourceId]=command.handle; }
    if (command.capability) state.applicationsTab = command.capability.startsWith('ipm.') ? 'packages' : 'web-apps';
    if (command.evidenceId) state.evidenceFilter=command.evidenceId;
    state.commandOpen=false; location.hash=state.route; render(); ensureRouteSource();
    if (command.appName) loadWebAppDetail(command.appName);
  }));
}
function presentationRole() {
  if (state.fxRole || state.fxPreference.role) return state.fxRole || state.fxPreference.role;
  if (!state.connected) return 'Guest';
  // Presentation only: observed privileges never gain authority from this label.
  if (state.info?.privileges?.Secure === true) return 'Admin';
  if (state.info?.privileges?.Operate === true) return 'Tech / IT';
  return 'Regular';
}
function applyCurrentFx() {
  if (!fxModule || state.fxPreference.disabled) return;
  fxModule.applyFx(document.documentElement, fxModule.projectFx(state.fxPreference, {
    role: presentationRole(), reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  }));
}
async function refreshFx() {
  const owner = sessionEpoch;
  try {
    fxModule ||= await import('./fx-studio.js?v=fx-1');
    if (owner !== sessionEpoch) return;
    state.fxReady = true; state.fxError = '';
    applyCurrentFx();
  } catch { if (owner === sessionEpoch) state.fxError = 'FX Studio is unavailable. Canonical base themes and operations remain available.'; }
}
function fxStudioPanel() {
  const projection = fxModule?.projectFx(state.fxPreference, { role: presentationRole() });
  const select = (key, label, values, value) => `<label>${label}<select data-fx-dimension="${key}">${values.map(item => `<option value="${esc(item)}" ${item === value ? 'selected' : ''}>${esc(item)}</option>`).join('')}</select></label>`;
  return `<div class="fx-backdrop"><section class="panel fx-studio" role="dialog" aria-modal="true" aria-labelledby="fx-title"><div class="panel-head"><h2 id="fx-title">FX Studio</h2><button class="button quiet" id="fx-close" aria-label="Close FX Studio">Close</button></div><p>Project one semantic workspace. Appearance role sets an initial material; it grants no authority. Your choices override it.</p><div class="fx-controls">${select('base','BASE',['system','dark','inverse'],state.theme)}${fxModule ? select('role','Presentation role',Object.keys(fxModule.ROLE_PROJECTIONS),presentationRole()) + select('material','MATERIAL',fxModule.FX_DIMENSIONS.material,projection.material) + select('fx','FX',fxModule.FX_DIMENSIONS.fx,projection.fx) + select('motion','MOTION',fxModule.FX_DIMENSIONS.motion,projection.motion) : ''}</div><p>Semantic state colors stay fixed. System reduced motion is respected. Preferences stay in this browser; no IRIS or Evidence state is changed.</p>${state.fxError ? `<p role="status">${esc(state.fxError)}</p>` : ''}<button class="button secondary" id="fx-remove">Remove FX projection</button>${state.fxPreference.disabled ? '<p role="status">Canonical base only. Choose a dimension to enable FX.</p>' : ''}</section></div>`;
}
function badge(label, tone = "neutral") {
  return `<span class="badge ${esc(tone)}">${esc(label)}</span>`;
}

function environmentBadge(systemMode) {
  const presentation = {
    DEMO: ["DEMO", "warning"],
    DEVELOPMENT: ["DEVELOPMENT", "accent"],
    TEST: ["TEST", "warning"],
    LIVE: ["LIVE / PRODUCTION", "error"],
    FAILOVER: ["FAILOVER", "error"],
  }[systemMode];
  return presentation ? `<span class="environment-identity" aria-label="Observed IRIS system mode">${badge(presentation[0], presentation[1])}</span>` : "";
}

function shell(content) {
  const user = state.info ? esc(state.info.username) : "Not connected";
  const version = state.info ? esc(state.info.serverVersion) : "Local instance not verified";
  const connected = state.connected;
  const demoMode = state.info?.systemMode === "DEMO";
  const modalInert=state.commandOpen||state.fxOpen||state.targetCompareOpen||state.confirmationReview?' inert':'';
  return `
    <div class="shell">
      <header class="topbar"${modalInert}>
        <a class="brand" href="#overview" aria-label="OpsDeck overview"><span class="brand-mark">OD</span><span>OpsDeck</span></a>
        <div class="instance-line"><span class="instance-label">${demoMode ? "Demo dataset" : "IRIS instance"}</span><span class="instance-value">${version}</span>${connected ? environmentBadge(state.info?.systemMode) : ""}</div>
        <div class="top-actions">
          <span class="connection-state">${badge(connected ? (demoMode ? "Safe demo" : "Live session") : "Disconnected", connected ? (demoMode ? "warning" : "success") : "muted")}</span>
          ${connected ? `<span class="user-chip">${user}</span>` : ""}
          <label class="target-picker"><span class="sr-only">Operating target</span><select id="target-select" aria-label="Operating target"><option value="local">LOCAL</option><option value="dev" disabled>DEV · unconfigured</option><option value="qa" disabled>QA · unconfigured</option><option value="prod" disabled>PROD · unconfigured</option></select></label>
          ${connected ? `<button class="button quiet observe-only" id="observe-only" type="button" aria-pressed="${state.observeOnly}" title="Executor policy: observations and rehearsal allowed; confirmation and dispatch blocked when on">Observe Only ${state.observeOnly ? "ON" : "OFF"}</button>` : ""}
          ${connected && !demoMode ? '<button class="button quiet" id="disconnect-button" type="button">Sign out</button>' : ""}
          <button class="button quiet" id="fx-open" type="button" aria-haspopup="dialog">FX Studio</button><label class="theme-picker"><span class="sr-only">Color theme</span><select id="theme-select" aria-label="Color theme"><option value="dark" ${state.theme === "dark" ? "selected" : ""}>Dark</option><option value="light" ${state.theme === "light" ? "selected" : ""}>Light</option><option value="system" ${state.theme === "system" ? "selected" : ""}>System</option><option value="inverse" ${state.theme === "inverse" ? "selected" : ""}>Inverse IRIS</option></select></label>
        </div>
      </header>
      <aside class="sidebar ${state.mobileMoreOpen ? "more-open" : ""}" id="mobile-secondary-nav" aria-label="Primary navigation"${modalInert}>
        <div class="nav-caption">WORKSPACE</div>
        ${(() => {
          const projection = projectUiNavigation(state, document.documentElement.clientWidth || 1024, compactNavigationQuery.matches);
          return projection.items.map((item, index) => {
            const stateClass = item.evidence.status.toLowerCase().replaceAll("_", "-");
            const qualification = item.evidence.qualifications.length ? item.evidence.qualifications.map((entry) => entry.label).join(", ") : "";
            const statusText = `${item.label}: ${item.evidence.status}${qualification ? ` · unqualified: ${qualification}` : ""}`;
            return `<button class="nav-item ${item.primary ? "nav-primary" : "nav-secondary"} ${item.active ? "active" : ""} ${item.contextual ? "nav-contextual" : ""}" data-route="${item.route}" data-capability-state="${item.evidence.status.toLowerCase()}" data-context-priority="${item.contextual}" aria-label="${esc(`${item.label}. ${statusText}. Route visibility does not grant IRIS authority.`)}" title="${esc(`${statusText}. ${item.evidence.detail}`)}" ${item.active ? 'aria-current="page"' : ""}><span class="nav-index">${String(navItems.findIndex(([route]) => route === item.route) + 1).padStart(2, "0")}</span><span class="nav-label">${esc(item.label)}</span><span class="nav-capability badge ${item.evidence.status === "SUPPORTED" ? "success" : ["DENIED", "UNAVAILABLE"].includes(item.evidence.status) ? "error" : ["PARTIAL", "UNQUALIFIED"].includes(item.evidence.status) || qualification ? "warning" : "muted"}"><span class="nav-capability-dot" aria-hidden="true"></span><span class="nav-capability-label">${esc(item.evidence.status)}</span></span>${qualification ? `<span class="nav-qualification badge warning" title="${esc(`${qualification} remains unqualified`)}"><span class="nav-qualification-label">Unqualified</span></span>` : ""}</button>`;
          }).join("");
        })()}
        ${compactNavigationQuery.matches ? `<button class="nav-item nav-more" id="mobile-more" type="button" aria-expanded="${state.mobileMoreOpen}" aria-controls="mobile-secondary-nav">More</button>` : ""}
        <div class="sidebar-note"><span class="note-dot"></span><span>${demoMode ? "Safe demo · sanitized" : "Evidence-gated operations"}</span></div>
      </aside>
      <main class="workspace"${modalInert}>${content}</main><button class="button command-trigger" id="command-open" type="button" aria-haspopup="dialog" aria-label="Open command palette"${modalInert}>Command <kbd>⌘/Ctrl K</kbd></button>${state.fxOpen ? fxStudioPanel() : ""}${state.commandOpen ? commandPanel() : ""}${state.targetCompareOpen?targetComparisonPanel():''}${state.confirmationReview?confirmationReviewPanel():''}
      <footer class="statusbar"${modalInert}><span><i class="status-dot ${connected ? "online" : ""}"></i>${connected ? (demoMode ? "Safe demo provider active" : "IRIS connection active") : "Connect to your local IRIS instance"}</span><span>${demoMode ? "Sanitized deterministic data · no IRIS connection" : nativeMode ? "Same-origin session · credentials remain in tab memory" : "Loopback session · credentials are not saved"}</span><span>Last read ${fmtTime(state.lastRead)}</span></footer>
    </div>`;
}

function connectView() {
  const error = state.error ? `<div class="notice error" role="alert">${esc(state.error)}</div>` : "";
  return shell(`
    <section class="connect-layout">
      <div class="intro-block">
        <div class="eyebrow"><span class="eyebrow-rule"></span>LIVE ENVIRONMENT · LOCAL ONLY</div>
        <h1>Operations,<br><span>with evidence.</span></h1>
        <p>Connect to the local IRIS instance to load its identity and web applications from the authoritative SysAdmin API.</p>
        <div class="promise-list"><div><span class="promise-check">01</span><span>${nativeMode ? "Credentials stay in this tab's memory and are sent directly to same-origin IRIS APIs." : "Credentials remain in this browser request and the local proxy process."}</span></div><div><span class="promise-check">02</span><span>Observe Only starts ON. Read allowed sources and rehearse canonical operations before considering a change.</span></div><div><span class="promise-check">03</span><span>Confirmed changes require policy, current authority and authoritative read-back for a Verified Receipt.</span></div></div>
      </div>
      <form id="connect-form" class="connect-card" autocomplete="off">
        <div class="card-overline">SECURE LOCAL SESSION</div>
        <h2>Connect to IRIS</h2>
        <p class="card-copy">Use an account allowed to read server information and web applications.</p>
        ${error}
        <label for="username">Username</label>
        <input id="username" name="username" autocomplete="username" required maxlength="128">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="off" required maxlength="512">
        <button class="button primary connect-button" type="submit" ${state.busy ? "disabled" : ""}>${state.busy ? '<span class="spinner"></span>Checking connection…' : "Connect to local IRIS"}</button>
        <div class="local-only"><span class="lock-icon" aria-hidden="true">⌑</span> ${nativeMode ? "Direct to same-origin IRIS · HTTP Basic" : "Requests stay on this computer · HTTP Basic · loopback only"}</div>
      </form>
    </section>
    <section class="gate-strip"><div><span class="gate-kicker">CURRENT AUTHORITY · CURRENT TARGET</span><strong>Observe → rehearse → review → confirm</strong></div><div>${badge("Observe Only ON", "accent")}</div><p>Operation Rehearsal stops before dispatch. Unresolved authority or effects refuse; observations and outcomes stay in the Session Ledger.</p></section>`);
}



function demoPersonaProfile() {
  if (state.info?.systemMode !== "DEMO") return null;
  const profiles = {
    DemoOperator: {
      label: "Operations",
      mission: "Inspect runtime health, scheduled work, applications, and operational logs without security-administration access.",
      allowed: ["Applications", "Tasks", "System", "Logs"],
      withheld: ["Access", "Security"],
    },
    DemoSecurity: {
      label: "Security Administrator",
      mission: "Inspect identities, roles, resources, credential metadata, applications, and security-relevant logs.",
      allowed: ["Applications", "Access", "Security", "Logs"],
      withheld: ["Tasks", "System"],
    },
    DemoAppAdmin: {
      label: "Application Administrator",
      mission: "Inspect application registration and REST relationships while unrelated administrative domains remain outside the persona.",
      allowed: ["Applications"],
      withheld: ["Access", "Security", "Tasks", "System", "Logs"],
    },
    DemoRestricted: {
      label: "Restricted User",
      mission: "Demonstrate that insufficient authority is visible as an access boundary rather than being misreported as empty operational state.",
      allowed: ["Overview"],
      withheld: ["Applications", "Access", "Security", "Tasks", "System", "Logs"],
    },
  };
  return profiles[state.info.username] || null;
}

function demoPersonaCard() {
  const profile = demoPersonaProfile();
  if (!profile) return "";
  const chips = (items, tone) => items.map((item) => badge(item, tone)).join("");
  return `
    <section class="panel persona-story" aria-labelledby="persona-story-title">
      <div class="persona-story-main">
        <div class="panel-kicker">CURRENT DEMO PERSONA</div>
        <h2 id="persona-story-title">${esc(profile.label)}</h2>
        <p>${esc(profile.mission)}</p>
      </div>
      <div class="persona-scope">
        <div><strong>In scope</strong><span class="persona-chips">${chips(profile.allowed, "success")}</span></div>
        <div><strong>Withheld by persona</strong><span class="persona-chips">${chips(profile.withheld, "muted")}</span></div>
      </div>
      <p class="persona-hint">Use the <strong>DEMO ACCESS</strong> selector above to switch identities. The dataset stays deterministic; only authority changes.</p>
    </section>`;
}

function safeDemoTour() {
  if (state.info?.systemMode !== "DEMO") return "";
  return `
    <section class="panel judge-tour" aria-labelledby="judge-tour-title">
      <div class="panel-head"><div><div class="panel-kicker">EVALUATOR SHORTCUT</div><h2 id="judge-tour-title">90-second judge tour</h2></div>${badge("Safe demo", "warning")}</div>
      <p class="judge-tour-copy">This demo uses deterministic sanitized sample data, but exercises the same UI, mapping, access-boundary, and evidence semantics as OpsDeck. It does not claim a live IRIS connection.</p>
      <div class="judge-tour-steps">
        <button class="tour-step" data-route="applications"><span>01</span><strong>Applications</strong><small>Inspect application identity and read-back semantics.</small></button>
        <button class="tour-step" data-route="access"><span>02</span><strong>Access</strong><small>Follow user, role, resource, and ownership relationships.</small></button>
        <button class="tour-step" data-route="security"><span>03</span><strong>Boundaries</strong><small>See valid empty and deliberately unavailable sources stay distinct.</small></button>
        <button class="tour-step" data-route="evidence"><span>04</span><strong>Evidence</strong><small>See what is verified, unavailable, blocked, or still unqualified.</small></button>
      </div>
    </section>`;
}

function overviewView() {
  const info = state.info;
  if (!info) {
    return shell(`${pageHeader("Overview", "Loading the live identity and application state.")}<section class="panel empty-state" role="status"><div class="panel-kicker">RESTORING SESSION</div><h2>Checking IRIS state</h2><p>The session is valid. OpsDeck is reading the authoritative identity and web-application list.</p></section>`);
  }
  const privilegeCount = info.privileges ? Object.values(info.privileges).filter(Boolean).length : null;
  const demoMode = info.systemMode === "DEMO";
  const inventoryObserved = Boolean(state.appsReadAt);
  const inventoryStatus = state.error ? (isAuthorityDenial(state.error) ? "DENIED" : "UNAVAILABLE") : state.busy ? "LOADING" : "NOT READ";
  return shell(`
    ${pageHeader("Overview", demoMode ? "Explore the evaluator-safe dataset and OpsDeck evidence semantics." : "A verified view of the connected instance.")}
    <section class="overview-grid">
      <article class="panel identity-panel">
        <div class="panel-head"><div><div class="panel-kicker">${demoMode ? "SANITIZED DEMO IDENTITY" : "CONNECTED INSTANCE"}</div><h2>Server identity</h2></div>${badge(demoMode ? "Demo" : "Live", demoMode ? "warning" : "success")}</div>
        <dl class="identity-grid">
          <dt>Server</dt><dd>${esc(info.serverVersion)}</dd>
          <dt>Product</dt><dd>${esc(info.product)}</dd>
          <dt>API</dt><dd>SysAdmin v${esc(info.apiVersion)}</dd>
          <dt>Account</dt><dd>${esc(info.username)}</dd>
          <dt>Namespaces</dt><dd>${info.namespaces ? (info.namespaces.map((item) => `<span class="inline-code">${esc(item.name)}</span>`).join(" ") || "None returned") : "Not returned"}</dd>
          <dt>Privileges</dt><dd>${privilegeCount === null ? "Not returned" : `${privilegeCount} enabled flags reported · Secure ${Object.hasOwn(info.privileges, "Secure") ? (info.privileges.Secure ? "available" : "not available") : "not returned"}`}</dd>
        </dl>
        <div class="panel-foot">Identity source <code>GET /api/admin/info</code> · ${fmtTime(info.observedAt)}</div>
      </article>
      <article class="panel read-panel">
        <div class="panel-head"><div><div class="panel-kicker">${demoMode ? "DEMO CONTRACT READ" : "AUTHORITATIVE READ"}</div><h2>Web applications</h2></div><button class="button quiet" id="refresh-button" ${state.busy ? "disabled" : ""}>Refresh</button></div>
        ${inventoryObserved ? `<div class="read-metric"><strong>${state.apps.length}</strong><span>applications returned</span></div>` : `<p class="read-summary" role="status">${badge(inventoryStatus,"warning")} Inventory count not established.</p>`}
        <p class="read-summary">${!inventoryObserved ? "Application inventory has not been observed in this refresh." : state.apps.length ? `First resource <code>${esc(state.apps[0].name)}</code> in namespace <code>${esc(state.apps[0].namespace)}</code>.` : `${demoMode ? "The demo" : "The live API"} returned an empty collection.`}</p>
        <div class="readback-row">${state.verification ? badge(state.verification.matched ? (demoMode ? "Demo repeat matched" : "Read-back verified") : "Read-back mismatch", state.verification.matched ? "success" : "error") : badge(state.error ? "Read-back unavailable" : "Read-back pending", "muted")}<span>${state.verification ? `${state.verification.count} entries compared at ${fmtTime(state.verification.at)}` : state.error ? "No independent comparison is available." : "A second read follows each refresh."}</span></div>
        <div class="panel-foot">List source <code>GET /api/admin/v2/web-apps</code></div>
      </article>
    </section>
    ${state.error ? `<div class="notice error" role="alert">${esc(state.error)}</div>` : ""}
    ${safeDemoTour()}
    ${demoPersonaCard()}
    <section class="panel roadmap-panel"><div class="panel-head"><div><div class="panel-kicker">PRODUCT COVERAGE</div><h2>Operations workspace</h2></div>${badge(demoMode ? "Evaluator-safe surface" : `Observe Only ${state.observeOnly?'ON':'OFF'}`, "accent")}</div><div class="roadmap-grid">${navItems.slice(2).map(([, title], i) => `<div class="roadmap-item"><span class="roadmap-index">${String(i + 2).padStart(2, "0")}</span><strong>${title}</strong><span>${["Users, roles and resources", "Credential metadata", "Task inventory", "System and process views", "Audit and journal sources", "Session Ledger and Verified Receipts"][i]}</span></div>`).join("")}</div><p class="roadmap-note">${demoMode ? "Evaluator mode uses a deterministic demo provider. Native observations, rehearsal and execution require their actual IRIS providers; failed reads retain their state." : "Observe current provider state, rehearse supported operations, review their Impact Forecast and confirm the exact plan. Policy and current authority govern dispatch; outcomes stay in the Session Ledger."}</p></section>`);
}

function pageHeader(title, description) {
  const demoMode = state.info?.systemMode === "DEMO";
  const routeHelp = CONCEPTS_BY_ROUTE[state.route];
  const conceptIds = Array.isArray(routeHelp) ? routeHelp : routeHelp?.[state.applicationsTab] || [];
  const help = conceptIds.length ? `<details class="concept-help"><summary>IRIS concepts in this view</summary><ul>${conceptIds.map((id) => `<li><strong>${esc(IRIS_CONCEPTS[id].title)}:</strong> ${esc(IRIS_CONCEPTS[id].body)}</li>`).join("")}</ul></details>` : "";
  const snippetBody = state.selectedSnippet ? `<div class="snippet-body"><pre><code>${esc(state.snippetText || "")}</code></pre>${state.snippetLoading ? '<p role="status">Loading text…</p>' : ""}${state.snippetError ? `<p class="snippet-error" role="alert">${esc(state.snippetError)}</p>` : ""}${state.snippetText ? `<button class="button quiet" type="button" data-download-snippet="${esc(state.selectedSnippet)}">Download .txt</button>` : ""}<p class="snippet-note">Text for learning and review only. OpsDeck never executes snippets.</p></div>` : "";
  const snippets = `<details class="concept-help snippet-library" ${state.selectedSnippet ? "open" : ""}><summary>ObjectScript snippet library</summary><p class="snippet-note">Small read-only examples. Select one to load its text.</p><ul>${LEARNING_SNIPPETS.map(item => `<li><button class="snippet-select" type="button" data-snippet="${esc(item.id)}">${esc(item.title)}</button></li>`).join("")}</ul>${snippetBody}</details>`;
  return `<div class="page-header"><div><div class="eyebrow"><span class="eyebrow-rule"></span>OPSDECK WORKSPACE</div><h1>${title}</h1><p>${description}</p></div><div class="page-header-meta">${demoMode ? badge("Evaluator mode", "warning") : badge("IRIS 2026.2", "accent")}${help}${snippets}</div></div>`;
}

function applicationsView() {
  if (state.applicationsTab === "packages") {
    const description = state.info?.systemMode === "DEMO"
      ? "Review a visibly synthetic package planning fixture."
      : "Inspect installed packages when a bounded live IPM provider is qualified.";
    return shell(`${pageHeader("Applications", description)}${applicationsTabs()}${packagesWorkspaceView()}`);
  }
  const inventoryObserved = Boolean(state.appsReadAt);
  const selected = state.apps.find((item, index) => recordHandle(state.apps, index) === state.selected) || state.apps[0] || null;
  const rows = state.apps.map((item, index) => `<tr class="app-row ${selected === item ? "selected" : ""}" tabindex="0" role="button" data-app="${recordHandle(state.apps, index)}" aria-label="Inspect ${esc(item.name)}"><td data-label="Web application"><span class="app-name">${esc(item.name)}</span><span class="app-sub">${esc(item.dispatchClass || item.type)}</span></td><td data-label="Namespace"><code>${esc(item.namespace)}</code></td><td data-label="State">${item.enabled ? badge("Enabled", "success") : badge("Disabled", "muted")}</td><td data-label="Type">${esc(item.type)}</td><td data-label="Authentication">${esc(item.authenticationMethods.join(", ") || "None returned")}</td></tr>`).join("");
  const detail = selected ? state.webAppDetails[selected.name] : null;
  const detailError = selected ? state.webAppDetailErrors[selected.name] : null;
  const restMatches = selected ? restServiceMatches(selected) : [];
  const detailContent = !selected ? `<div class="source-message">Select a web application.</div>` :
    !uniqueRecord(state.apps, item => item.name === selected.name) ? `<div class="source-message">Detail requires an unambiguous provider name. A scoped detail request is not qualified.</div>` :
    state.webAppDetailLoading === selected.name ? `<div class="source-message">Loading authoritative web-app detail…</div>` :
      detailError ? `<div class="source-message source-error" role="alert"><strong>Detail unavailable</strong><p>${esc(detailError)}</p><code>GET /api/admin/v2/web-app?name=…</code></div>` :
        detail ? `<dl class="detail-grid">${Object.entries(detail.values).map(([key, value]) => `<dt>${esc(key)}</dt><dd>${cellValue(value)}</dd>`).join("")}</dl><div class="inspector-foot">GET /api/admin/v2/web-app · ${esc(detail.ref.provider)} · observed ${fmtTime(detail.ref.observedAt)}</div>` :
          `<p class="app-sub">Expanded configuration is fetched only when requested.</p><button class="button secondary" data-load-webapp-detail="${esc(selected.name)}">Load authoritative detail</button>`;
  const relationshipContent = !selected ? "" : restMatches.length ? restMatches.map(({ sourceId, item }) => {
    const specKey = JSON.stringify([sourceId, item.ref.key, item.ref.scope]);
    const spec = state.restSpecs[specKey];
    const specError = state.restSpecErrors[specKey];
    const specContent = state.restSpecLoading === specKey ? `<div class="source-message">Loading the authoritative REST specification…</div>` :
      specError ? `<div class="source-message source-error" role="alert">${esc(specError)}</div>` :
        spec ? `<div class="spec-summary"><div>${esc(spec.format)} · ${spec.operationCount} operations</div><strong>${esc(spec.title)}${spec.version ? ` · ${esc(spec.version)}` : ""}</strong><ul>${spec.operations.slice(0, 12).map((operation) => `<li><code>${esc(operation.method)} ${esc(operation.path)}</code>${operation.summary ? ` · ${esc(operation.summary)}` : ""}</li>`).join("")}</ul>${spec.operationCount > 12 ? `<p>Showing 12 of ${spec.operationCount} operations.</p>` : ""}</div>` :
          item.values.swaggerSpec ? `<button class="button quiet" data-load-rest-spec="${esc(specKey)}">Retrieve live specification</button>` : `<span class="app-sub">IRIS did not publish a specification link.</span>`;
    return `<div class="relationship-item"><div><strong>${esc(item.ref.label)}</strong><span>${esc(item.values.dispatchClass || "REST service")} · ${esc(sourceId === "restServices" ? "management REST v1" : "management REST v2")}</span></div>${specContent}</div>`;
  }).join("") : `<div class="source-message">No exact REST-service link has been observed for this web application. Check both live discovery sources; OpsDeck does not infer a relationship from dispatch-class names.</div>`;
  return shell(`
    ${pageHeader("Applications", "Live web applications from the IRIS management API.")}
    ${applicationsTabs()}
    <div class="app-toolbar"><div>${inventoryObserved?`<strong>${state.apps.length}</strong><span> web applications</span>`:'<span>Current inventory count not established</span>'}<span class="toolbar-divider">·</span><span>Scope <code>All returned namespaces</code></span></div><div>${state.verification ? badge(state.verification.matched ? "Authoritative read-back matched" : "Read-back mismatch", state.verification.matched ? "success" : "error") : badge("Read-back pending", "muted")}</div></div>
    ${state.error ? `<div class="notice error" role="alert">${esc(state.error)}</div>` : ""}
    ${!inventoryObserved&&state.apps.length?'<p class="source-message">Earlier observed rows are retained below; the current inventory is not established.</p>':''}
    <section class="apps-layout">
      <article class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Web application</th><th>Namespace</th><th>State</th><th>Type</th><th>Authentication</th></tr></thead><tbody>${rows || `<tr><td colspan="5" class="empty-cell">${inventoryObserved?'No web applications were returned by IRIS.':'Application inventory has not been observed in this refresh.'}</td></tr>`}</tbody></table></div><div class="panel-foot">Provider <code>SysAdmin API v2</code> · Updated ${fmtTime(state.lastRead)}</div></article>
      <aside class="panel inspector"><div class="panel-kicker">RESOURCE INSPECTOR</div>${selected ? `<h2 class="inspector-title"><code>${esc(selected.name)}</code></h2><p class="inspector-sub">Provider-owned identity · namespace scoped</p><dl class="detail-grid"><dt>Namespace</dt><dd><code>${esc(selected.namespace)}</code></dd><dt>Enabled</dt><dd>${selected.enabled ? "Yes" : "No"}</dd><dt>Type</dt><dd>${selected.type === null ? "Not returned" : esc(selected.type)}</dd><dt>Resource</dt><dd>${selected.resource === null ? "Not returned" : selected.resource ? `<code>${esc(selected.resource)}</code>` : "None"}</dd><dt>Authentication</dt><dd>${esc(selected.authenticationMethods.join(", ") || "None returned")}</dd><dt>Default namespace</dt><dd>${selected.namespaceDefault === null ? "Not returned" : selected.namespaceDefault ? "Yes" : "No"}</dd><dt>System application</dt><dd>${selected.isSystemApp === null ? "Not returned" : selected.isSystemApp ? "Yes" : "No"}</dd><dt>Dispatch class</dt><dd>${selected.dispatchClass === null ? "Not returned" : selected.dispatchClass ? `<code>${esc(selected.dispatchClass)}</code>` : "None"}</dd></dl><div class="inspector-foot">Key <code>${esc(selected.ref.key)}</code> · refreshed ${fmtTime(selected.ref.observedAt)}</div><section class="inspector-section"><div class="panel-kicker">AUTHORITATIVE DETAIL</div>${detailContent}</section><section class="inspector-section"><div class="panel-kicker">REST SERVICE RELATIONSHIP</div>${relationshipContent}</section>${webAppOperationPanel(selected)}` : `<div class="empty-inspector">Select an application to inspect its observed fields.</div>`}</aside>
    </section>
    ${projectionExports("webApps")}<section class="verification-banner ${state.verification?.matched ? "verified" : state.verification ? "mismatch" : "pending"}"><div class="verification-symbol">${state.verification?.matched ? "✓" : state.verification ? "!" : "·"}</div><div><strong>${state.verification?.matched ? "Read-back confirmed" : state.verification ? "Read-back requires review" : state.error ? "Read-back not established" : "Waiting for authoritative read-back"}</strong><p>${state.verification ? `${state.verification.count} web-app records from the rendered list were compared with a second GET response.` : state.error ? "No current independent comparison is available." : "OpsDeck performs a separate read after the initial list is rendered."}</p></div><code>GET /api/admin/v2/web-apps</code></section>
    <section class="panel provider-panel"><div class="panel-head"><div><div class="panel-kicker">REST DISCOVERY</div><h2>Namespace REST services</h2></div>${badge("Live source", "accent")}</div>${sourceSelector("applications")}${sourcePanel(state.sourceTabs.applications)}</section>`);
}

function impactForecast(plan) {
  if(plan.capability.id==='sysadmin.rehearse')return {target:plan.target.label,preState:'Not observed',expectedTransition:'Not established',authority:'UNVERIFIED · operation-specific privilege required',risk:'HIGH conservative review classification; actual effect not established',reversibility:'Not established',likelyEffect:'Not established',certainty:'UNVERIFIED: schema representation only. Dispatch refused by canonical policy.'};
  if(plan.capability.id.startsWith('sysadmin.auditEvent.'))return {target:plan.target.label,preState:JSON.parse(plan.preStateFingerprint),expectedTransition:plan.expectedReadback,authority:`${plan.authorityValidation.state} · ${plan.capability.requiredPrivileges.join(', ')}`,risk:plan.risk,reversibility:'Restore the observed flag through a fresh reviewed plan.',likelyEffect:'Changes only the selected OpsDeck fixture custom event flag. Global auditing is unchanged. Actual record generation is not established.',certainty:'INFERRED custom-event flag effect; authoritative read-back must match the flag and unchanged description guard.'};
  if(plan.capability.id.startsWith('sysadmin.metadata.'))return {target:plan.target.label,preState:JSON.parse(plan.preStateFingerprint),expectedTransition:plan.expectedReadback,authority:`${plan.authorityValidation.state} · ${plan.capability.requiredPrivileges.join(', ')}`,risk:plan.risk,reversibility:'Restore the observed description through a fresh reviewed plan.',likelyEffect:'Updates descriptive metadata only. The family’s observed invariant fields must remain unchanged; no availability or authority change is requested.',certainty:'INFERRED description-only effect; independent detail read-back must match the description and invariant guard.'};
  const packageOperation = plan.capability.id.startsWith('ipm.');
  return {
    target: `${plan.target.label} · ${plan.target.scope || 'instance'}`,
    preState: JSON.parse(plan.preStateFingerprint),
    expectedTransition: plan.expectedReadback,
    authority: `${plan.authorityValidation.state} · ${plan.capability.requiredPrivileges.join(', ')}`,
    risk: plan.risk,
    reversibility: plan.irreversible ? 'Non-reversible' : packageOperation ? 'Not established; lifecycle hooks may have lasting effects' : 'Enabled flag can be restored; interrupted requests cannot be undone',
    likelyEffect: packageOperation ? 'Package-declared resources and lifecycle hooks may affect dependent services. No dependency closure is inferred.' : plan.parameters.enabled ? 'Application routes become available to authorized users.' : 'Application routes stop accepting requests; active users and dependent services may be interrupted.',
    certainty: 'INFERRED forecast from observed pre-state and deterministic operation policy. Actual outcome is recorded separately.',
  };
}
function planReview(plan) {
  const impact = impactForecast(plan);
  const operatingTarget=plan.targetRef?`${plan.targetRef.label} · ${plan.targetRef.environment} · ${plan.targetRef.origin}`:'Not established';
  return `<details class="plan-impact" open><summary>Plan Review · Impact Forecast</summary><dl class="detail-grid"><dt>Operating target</dt><dd>${esc(operatingTarget)}</dd><dt>Affected target</dt><dd>${esc(impact.target)}</dd><dt>Observed pre-state</dt><dd><code>${esc(JSON.stringify(impact.preState))}</code></dd><dt>Expected transition</dt><dd>${esc(impact.expectedTransition)}</dd><dt>Authority</dt><dd>${esc(impact.authority)}</dd><dt>Risk</dt><dd>${esc(impact.risk)}</dd><dt>Reversibility</dt><dd>${esc(impact.reversibility)}</dd><dt>Likely service/user effect</dt><dd>${esc(impact.likelyEffect)}</dd><dt>Plan freshness</dt><dd>Expires ${esc(plan.expiresAt)}</dd></dl><p>${esc(impact.certainty)}</p></details>`;
}
function operationEvent(operation, kind, result = {}) {
  const plan = operation.plan;
  const classification = ['DENIED','UNAVAILABLE','FAILED','BLOCKED'].includes(result.state) ? result.state : 'UNVERIFIED';
  state.operationEvidence = [...state.operationEvidence, {
    id: `${plan.id}:${kind}:${Date.now()}`, targetRef:plan.targetRef, kind, state: classification,
    title: kind === 'confirmation' ? `Confirmation · ${plan.intent}` : `Refusal / unresolved outcome · ${plan.intent}`,
    observedAt: new Date().toISOString(), source: { identity: operation.provider.identity }, resource: plan.target,
    summary: kind === 'confirmation' ? 'Human confirmation bound to this exact plan and observed pre-state. Dispatch outcome is recorded separately.' : `${result.state}: ${result.reason || 'No verified receipt; no automatic retry.'}`,
    evidence: { operationId: plan.id, capability: plan.capability.id, risk: plan.risk, authorityState: plan.authorityValidation.state, providerState: result.state || 'UNVERIFIED', reason: result.reason || 'no-verified-receipt' },
  }].slice(-64);
}
function webAppOperationPanel(selected) {
  const comparison=`<section class="inspector-section"><button class="button secondary" data-compare-targets="${esc(selected.name)}">Compare Targets</button><p>Same semantic application reference; separate observations and authority per configured target.</p></section><section class="inspector-section"><div class="panel-kicker">CANONICAL WORKFLOW</div><button class="button secondary" data-workflow-start="${esc(selected.name)}" ${!nativeMode||state.info?.systemMode==='DEMO'?'disabled title="Live IRIS provider required"':''}>Rehearse availability workflow</button><p>Observe → rehearse → confirm → execute → verify. Rehearsal stops for exact human confirmation.</p>${workflowPanel(selected.name)}</section>`;
  if (!nativeMode || !state.connected || state.info?.systemMode === "DEMO") return comparison;
  const operation = state.webAppOperation;
  const current = operation?.plan?.target.key === selected.name ? operation : null;
  const unique = Boolean(uniqueRecord(state.apps, item => item.name === selected.name));
  return `${comparison}<section class="inspector-section"><div class="panel-kicker">OPERATION REHEARSAL</div><p>Change only this application's Enabled flag. Disabling it can interrupt requests to its routes.</p><button class="button secondary" data-webapp-plan="${esc(selected.name)}" ${!unique || operation?.busy ? "disabled" : ""}>Operation Rehearsal · ${selected.enabled ? "disable" : "enable"}</button>${current ? `<p role="status">${esc(current.state)}</p>${current.plan ? `${planReview(current.plan)}<p><strong>Target</strong> <code>${esc(current.plan.target.key)}</code> · ${esc(current.plan.target.scope)}</p><p><strong>Impact</strong> Enabled ${current.plan.parameters.enabled ? "true" : "false"}; ${esc(current.plan.risk)} risk. Authority is checked again before dispatch.</p><p><strong>Freshness</strong> Expires ${esc(current.plan.expiresAt)}</p><p>Planned effect; authoritative read-back determines the outcome.</p>${current.state === "REVIEW_REQUIRED" ? `<button class="button primary" data-webapp-confirm="${esc(current.plan.id)}" ${state.observeOnly ? "disabled title='Observe Only blocks confirmation'" : ""}>Confirm ${current.plan.parameters.enabled ? "enable" : "disable"} ${esc(current.plan.target.key)}</button>` : ""}` : ""}${current.reason ? `<p>${esc(current.reason)}</p>` : ""}` : operation && !operation.plan ? `<p role="status">${esc(operation.state)} · ${esc(operation.reason || "")}</p>` : ""}</section>`;
}

function workflowPanel(name){
  const run=workflowRunner?.snapshot();
  if(!run||run.workflow.target.key!==name)return '';
  return `<div class="workflow-review"><p role="status"><strong>${esc(run.state)}</strong> · ${esc(run.step)}</p><p>${esc(run.workflow.targetRef.label)} · <code>${esc(run.workflow.target.key)}</code></p>${run.plan?planReview(run.plan):''}${run.reason?`<p>${esc(run.reason)}</p>`:''}${run.state==='AWAITING_CONFIRMATION'?`<button class="button primary" data-workflow-confirm="${esc(run.plan.id)}" ${state.observeOnly?'disabled title="Observe Only blocks confirmation"':''}>Confirm workflow · ${esc(run.workflow.operationId)}</button>`:''}${run.receipt?`<p>${run.receipt.verification==='VERIFIED'?'Verified Receipt':'Operation receipt'} · ${esc(run.receipt.verification)}. Inspect the Session Ledger for its evidence.</p>`:''}</div>`;
}

async function startAvailabilityWorkflow(name){
  if(!nativeMode||!state.connected||state.info?.systemMode==='DEMO')return;
  const selected=uniqueRecord(state.apps,item=>item.name===name);
  if(!selected||workflowRunner&&['OBSERVING','REHEARSING','EXECUTING'].includes(workflowRunner.snapshot()?.state))return;
  const owner=sessionEpoch;
  const provider=createWebAppOperationProvider({username:state.info.username,requestJson:(path,options)=>{
    if(owner!==sessionEpoch||!state.connected)throw new Error('Workflow session expired.');
    return requestJson(path,options);
  }});
  const target={domain:'applications',kind:'web-app',provider:'iris-admin-api',key:selected.name,scope:selected.namespace,label:selected.name,targetRef:provider.targetRef,observedAt:new Date().toISOString()};
  const workflow=createWorkflow({id:`availability:${Date.now()}`,operationId:selected.enabled?'webapp.disable':'webapp.enable',target});
  workflowRunner=createWorkflowRunner({isCurrent:()=>owner===sessionEpoch&&state.connected,
    observe:async()=>({state:'OBSERVED',targetRef:provider.targetRef,observedAt:new Date().toISOString(),value:await provider.readPreState({target,capability:{id:workflow.operationId}})}),
    rehearse:async(wf,observation)=>{
      const authority=await provider.checkAuthority();
      if(authority.state!=='SUPPORTED')return {state:authority.state,reason:'existing-authority-required'};
      const enabled=wf.operationId==='webapp.enable';
      return {state:'REVIEW_REQUIRED',provider,plan:createOperationPlan({id:`${wf.id}:plan`,intent:`Workflow ${enabled?'enable':'disable'} ${target.key}`,target,
        capability:{id:wf.operationId,state:'SUPPORTED',...OPERATION_POLICIES[wf.operationId]},parameters:{enabled},preState:observation.value,
        preStateEvidence:`workflow:${wf.id}:observation`,authorityValidation:authority,expectedReadback:`Enabled is ${enabled}`,expiresAt:Date.now()+120000})};
    },
    onEvidence:({workflow:wf,kind,plan,result})=>{
      if(owner!==sessionEpoch)return;
      if(kind==='operation-receipt'){state.operationEvidence=[...state.operationEvidence,operationReceiptEvidence(result.receipt)].slice(-64);return;}
      const observedAt=new Date().toISOString();
      state.operationEvidence=[...state.operationEvidence,{id:kind==='read-observation'?`workflow:${wf.id}:observation`:`workflow:${wf.id}:${kind}:${Date.now()}`,targetRef:wf.targetRef,kind,
        state:kind==='read-observation'?'PARTIAL':kind==='refusal'?['DENIED','BLOCKED','UNAVAILABLE'].includes(result?.state)?result.state:'UNVERIFIED':'UNVERIFIED',
        title:`Workflow ${kind} · ${wf.target.key}`,observedAt,source:{identity:provider.identity},resource:wf.target,
        summary:kind==='read-observation'?'Fresh provider pre-state observed. No dispatch or independent verification inferred.':kind==='operation-plan'?'Canonical workflow rehearsal stops before dispatch for exact confirmation.':kind==='confirmation'?'Human confirmation bound to the exact plan and pre-state.':`${result?.state||'UNRESOLVED'}: ${result?.reason||'No verified receipt; no automatic retry.'}`,
        evidence:kind==='read-observation'?{providerState:'OBSERVED',fields:['enabled']}:kind==='operation-plan'?{operationId:plan.id,capability:plan.capability.id,risk:plan.risk,preStateEvidence:plan.preStateEvidence,authorityState:plan.authorityValidation.state}:kind==='confirmation'?{operationId:plan.id,capability:plan.capability.id,risk:plan.risk,authorityState:plan.authorityValidation.state}:{operationId:plan?.id||wf.id,reason:result?.reason||'workflow-unresolved',providerState:result?.state||'UNRESOLVED'}}].slice(-64);
    },
  });
  const pending=workflowRunner.start(workflow);render();await pending;if(owner===sessionEpoch)render();
}

async function confirmAvailabilityWorkflow(id){
  const run=workflowRunner?.snapshot();if(run?.state!=='AWAITING_CONFIRMATION'||run.plan.id!==id)return;
  const owner=sessionEpoch;
  const pending=workflowRunner.confirm({confirmed:true,planId:run.plan.id,preStateFingerprint:run.plan.preStateFingerprint});render();await pending;if(owner===sessionEpoch)render();
}

async function prepareWebAppOperation(name) {
  if (!nativeMode || !state.connected || state.info?.systemMode === "DEMO" || state.webAppOperation?.busy) return;
  const selected = uniqueRecord(state.apps, item => item.name === name);
  if (!selected) return;
  const owner = sessionEpoch;
  const username = state.info.username;
  const provider = createWebAppOperationProvider({ username, requestJson: (path, options) => {
    if (owner !== sessionEpoch || !state.connected) throw new Error("Operation session expired.");
    return requestJson(path, options);
  } });
  const target = { domain: "applications", kind: "web-app", provider: "iris-admin-api", key: selected.name, scope: selected.namespace, label: selected.name, targetRef:provider.targetRef, observedAt: new Date().toISOString() };
  state.webAppOperation = { busy: true, state: "PREFLIGHT" };
  render();
  try {
    const preState = await provider.readPreState({ target, capability: { id: "webapp.enable" } });
    const authority = await provider.checkAuthority();
    if (owner !== sessionEpoch) return;
    if (authority.state !== "SUPPORTED") { state.webAppOperation = { state: authority.state, reason: "Existing IRIS application administration authority is required." }; return; }
    const id = preState.enabled ? "webapp.disable" : "webapp.enable";
    const policy = OPERATION_POLICIES[id];
    const plan = createOperationPlan({
      id: `webapp:${Date.now()}`, intent: `${preState.enabled ? "Disable" : "Enable"} ${name}`, target,
      capability: { id, state: "SUPPORTED", ...policy }, parameters: { enabled: !preState.enabled }, preState,
      preStateEvidence: "iris-admin-api:selected-webapp-detail", authorityValidation: authority,
      preconditions: [{ claim: "Unique application identity and fresh namespace-scoped state", observed: true, evidence: "iris-admin-api:selected-webapp-detail" }],
      expectedReadback: `Enabled is ${!preState.enabled}`, expiresAt: Date.now() + 120000,
    });
    state.webAppOperation = { plan, provider, state: "REVIEW_REQUIRED", busy: false };
    state.operationEvidence = [...state.operationEvidence, { id: plan.id, targetRef:plan.targetRef, kind: "operation-plan", state: "UNVERIFIED", title: plan.intent, observedAt: plan.createdAt, source: { identity: provider.identity }, resource: plan.target, summary: `UNVERIFIED: planned Enabled=${plan.parameters.enabled}; changing application availability can interrupt requests. No mutation has occurred.`, evidence: { operationId: plan.id, risk: plan.risk, capability: id, authorityState: authority.state, requiresConfirmation: true, preStateEvidence: plan.preStateEvidence, expectedReadback: plan.expectedReadback } }].slice(-32);
  } catch (error) {
    if (owner === sessionEpoch) state.webAppOperation = { state: "UNAVAILABLE", reason: error.message };
  } finally { if (owner === sessionEpoch) render(); }
}

function operationOutcome(result) {
  if (result.reason) return result.reason;
  if (!result.receipt) return "No verified receipt. No automatic retry.";
  return `Authoritative read-back ${result.receipt.verification}. ${result.receipt.verification === "VERIFIED" ? "Verified Receipt" : "Operation receipt"} is available in the Session Ledger.`;
}

async function confirmWebAppOperation(id) {
  const operation = state.webAppOperation;
  if (!operation || operation.state !== "REVIEW_REQUIRED" || operation.plan?.id !== id || operation.busy) return;
  if (state.observeOnly) { operationEvent(operation,"refusal",{state:"BLOCKED",reason:"observe-only-policy"}); render(); return; }
  const owner = sessionEpoch;
  operationEvent(operation, "confirmation");
  operation.busy = true;
  operation.state = "IN_FLIGHT";
  render();
  const result = await executeOperationPlan(operation.plan, operation.provider, { providerIdentity: operation.provider.identity, isCurrent:()=>owner===sessionEpoch&&state.connected&&state.webAppOperation===operation, confirmation: { planId: id, preStateFingerprint: operation.plan.preStateFingerprint, confirmed: true } });
  if (owner !== sessionEpoch) return;
  operation.state = result.state;
  operation.reason = operationOutcome(result);
  operation.busy = false;
  if (result.receipt) state.operationEvidence = [...state.operationEvidence, operationReceiptEvidence(result.receipt)].slice(-64);
  else operationEvent(operation, "refusal", result);
  render();
}

function applicationsTabs() {
  return `${state.applicationsTab === "packages" && state.packageInventory ? projectionExports("packages") : ""}<div class="source-tabs application-tabs" role="tablist" aria-label="Applications workspace"><button class="source-tab ${state.applicationsTab === "web-apps" ? "active" : ""}" role="tab" aria-selected="${state.applicationsTab === "web-apps"}" data-application-tab="web-apps">Web applications</button><button class="source-tab ${state.applicationsTab === "packages" ? "active" : ""}" role="tab" aria-selected="${state.applicationsTab === "packages"}" data-application-tab="packages">Packages</button></div>`;
}

function packageOperationPanel() {
  const operation = state.livePackageOperation;
  if (!operation) return "";
  const plan = operation.plan;
  return `<section class="panel package-plan-review"><div class="panel-kicker">OPERATION REHEARSAL · PACKAGE</div><p role="status">${esc(operation.state)}</p>${plan ? `${planReview(plan)}<h3>${esc(plan.intent)}</h3><p><strong>Target</strong> ${esc(plan.target.key)} · ${esc(plan.target.scope)}</p><p><strong>Version</strong> ${esc(plan.parameters.requestedVersion)} · repository ${esc(plan.parameters.sourceIdentity)}</p><p><strong>Impact</strong> ${plan.parameters.installedVersion ? "Removes package-owned resources." : "Installs package-declared resources and lifecycle hooks."} HIGH risk. Authority is checked again before dispatch.</p><p><strong>Freshness</strong> Expires ${esc(plan.expiresAt)}</p><p>Planned effect; authoritative installed inventory determines the outcome.</p>${operation.state === "REVIEW_REQUIRED" ? `<button class="button primary" data-live-package-confirm="${esc(plan.id)}" ${state.observeOnly ? "disabled title='Observe Only blocks confirmation'" : ""}>Confirm ${plan.capability.id.endsWith("remove") ? "remove" : "install"} ${esc(plan.target.key)}</button>` : ""}` : ""}${operation.reason ? `<p>${esc(operation.reason)}</p>` : ""}</section>`;
}

async function prepareLivePackageOperation(index) {
  if (!nativeMode || !state.connected || state.info?.systemMode === "DEMO" || state.livePackageOperation?.busy) return;
  const row = comparePackageCatalogToInstalled(state.availablePackageCatalog, state.packageInventory)[index];
  const selection = livePackageSelection(row);
  if (!selection) return;
  const { action, ...parameters } = selection;
  const owner = sessionEpoch;
  const provider = createIPMPackageOperationProvider({ username: state.info.username, requestJson: (path, options) => {
    if (owner !== sessionEpoch || !state.connected) throw new Error("Operation session expired.");
    return requestJson(path, options);
  } });
  const id = `ipm.live.${action}`;
  const target = { domain: "applications", kind: "package", provider: "iris-ipm-installed-v1", key: row.name, scope: row.namespace, label: row.name, targetRef:provider.targetRef, observedAt: new Date().toISOString() };
  state.livePackageOperation = { busy: true, state: "PREFLIGHT" };
  render();
  try {
    const preState = await provider.readPreState({ target, parameters, capability: { id } });
    const authority = await provider.checkAuthority();
    if (owner !== sessionEpoch) return;
    if (authority.state !== "SUPPORTED") { state.livePackageOperation = { state: "DENIED", reason: "Existing IRIS package-management authority is required." }; return; }
    const plan = createOperationPlan({ id: `package:${action}:${Date.now()}`, intent: `${action} ${row.name}`, target,
      capability: { id, state: "SUPPORTED", ...OPERATION_POLICIES[id] }, parameters, preState,
      preStateEvidence: "iris-ipm:selected-package-prestate", authorityValidation: authority,
      preconditions: [{ claim: "Exact selected package version/source and fresh inventory", observed: true, evidence: "iris-ipm:selected-package-prestate" }],
      expectedReadback: action === "install" ? "Exact installed package/version" : "Exact package absent", expiresAt: Date.now() + 120000 });
    state.livePackageOperation = { plan, provider, state: "REVIEW_REQUIRED", busy: false };
    state.operationEvidence = [...state.operationEvidence, { id: plan.id, targetRef:plan.targetRef, kind: "operation-plan", state: "UNVERIFIED", title: plan.intent, observedAt: plan.createdAt, source: { identity: provider.identity }, resource: plan.target, summary: "Reviewed package lifecycle impact; no mutation has occurred.", evidence: { risk: plan.risk, capability: id, authorityState: authority.state, requiresConfirmation: true, preStateEvidence: plan.preStateEvidence, expectedReadback: plan.expectedReadback } }].slice(-32);
  } catch (error) { if (owner === sessionEpoch) state.livePackageOperation = { state: "UNAVAILABLE", reason: error.message }; }
  finally { if (owner === sessionEpoch) render(); }
}

async function confirmLivePackageOperation(id) {
  const operation = state.livePackageOperation;
  if (!operation || operation.state !== "REVIEW_REQUIRED" || operation.plan?.id !== id || operation.busy) return;
  if (state.observeOnly) { operationEvent(operation,"refusal",{state:"BLOCKED",reason:"observe-only-policy"}); render(); return; }
  const owner = sessionEpoch;
  operationEvent(operation, "confirmation");
  operation.busy = true; operation.state = "IN_FLIGHT"; render();
  const result = await executeOperationPlan(operation.plan, operation.provider, { providerIdentity: operation.provider.identity,
    confirmation: { planId: id, preStateFingerprint: operation.plan.preStateFingerprint, confirmed: true } });
  if (owner !== sessionEpoch) return;
  operation.busy = false; operation.state = result.state;
  operation.reason = operationOutcome(result);
  if (result.receipt) state.operationEvidence = [...state.operationEvidence, operationReceiptEvidence(result.receipt)].slice(-64);
  else operationEvent(operation, "refusal", result);
  render();
  if (result.state === "VERIFIED") await loadPackageInventory(true);
}

function packagesWorkspaceView() {
  const isDemo = state.info?.systemMode === "DEMO";
  if (!isDemo) {
    const inventory = state.packageInventory;
    const rows = inventory?.packages.filter(item => state.packageFilter === "all" || item.state === "installed") || [];
    const stateLabel = state.packageInventoryLoading ? "LOADING" : state.packageInventoryError ? "FAILED" : inventory?.state || "NOT READ";
    const stateStyle = inventory?.state === "AVAILABLE" ? "accent" : "warning";
    const catalogResult = state.availablePackageCatalog;
    const catalog = catalogResult?.coverage === "partial" && ["AVAILABLE", "TRUNCATED"].includes(catalogResult.state)
      ? { ...catalogResult, state: "PARTIAL COVERAGE" } : catalogResult;
    const catalogRows = catalog ? comparePackageCatalogToInstalled(catalog, inventory) : [];
    const catalogErrorState = state.availablePackageErrorStatus === 403 ? "DENIED" : "FAILED";
    const catalogBadge = state.availablePackageLoading ? "LOADING" : state.availablePackageError ? catalogErrorState : catalog?.state || "NOT QUERIED";
    const catalogBody = state.availablePackageError
      ? state.availablePackageErrorStatus === 403
        ? `<p class="source-message source-error" role="status">The current IRIS identity is not authorized to query the configured package catalog.</p>`
        : `<p class="source-message source-error" role="alert">${esc(state.availablePackageError)}</p>`
      : catalog?.state === "DENIED" ? `<p class="source-message source-error" role="status">The current IRIS identity is not authorized to read configured IPM repository definitions.</p>`
        : catalog?.state === "FAILED" ? `<p class="source-message source-error" role="alert">The IPM catalog query failed. No available version is inferred.</p>`
          : catalog?.state === "UNAVAILABLE" ? `<p class="source-message" role="status">Configured catalog coverage is unavailable${catalog.reason ? ` (${esc(catalog.reason)}).` : "."}</p>`
            : catalog?.state === "EMPTY" ? `<p class="source-message" role="status">No matching package was returned by all observed enabled repositories.</p>`
              : catalogRows.length ? `<div class="package-list">${catalogRows.map((item, index) => `<article class="package-card"><div class="package-card-head"><div><strong>${esc(item.name)}</strong><small>${esc(item.description)}</small></div>${badge((item.relationship || item.state).replaceAll("_", " ").replaceAll("-", " "), ["INSTALLED_OLDER", "INSTALLED_NEWER"].includes(item.relationship) ? "warning" : item.relationship === "INSTALLED_VERSION_UNCOMPARABLE" || item.relationship === "INSTALLED_STATE_UNKNOWN" ? "muted" : "accent")}</div><dl class="detail-grid"><dt>Available</dt><dd>${esc(item.availableVersion)}</dd><dt>Installed</dt><dd>${esc(item.installedVersion || (item.installedStateKnown ? "Not installed in this namespace" : "Not observed"))}</dd><dt>Repository</dt><dd><code>${esc(item.repository)}</code></dd>${item.origin ? `<dt>Origin</dt><dd>${esc(item.origin)}</dd>` : ""}</dl>${nativeMode && livePackageSelection(item) ? `<button class="button secondary" data-live-package-plan="${index}" ${state.livePackageOperation?.busy ? "disabled" : ""}>Operation Rehearsal · ${livePackageSelection(item).action}</button>` : `<p class="source-message">No qualified operation is available for this identity/version. Update remains unqualified.</p>`}</article>`).join("")}</div>`
                : `<p class="source-message">Enter one exact package identity to query configured repositories.</p>`;
    return `<section class="panel packages-workspace"><div class="panel-head"><div><div class="panel-kicker">APPLICATIONS → PACKAGES</div><h2>Installed package inventory</h2></div>${badge(stateLabel, stateStyle)}</div><p class="source-message">Installed rows come from IPM registrations in the current namespace. Catalog lookup is a separate bounded exact-name query through configured repositories.</p><div class="evidence-toolbar"><label>Inventory <select id="package-filter"><option value="all" ${state.packageFilter === "all" ? "selected" : ""}>All installed</option><option value="installed" ${state.packageFilter === "installed" ? "selected" : ""}>Installed</option></select></label><span class="package-source">Source identity <code>${esc(inventory?.sourceIdentity || "iris-ipm-installed-v1")}</code>${inventory?.namespace ? ` · Namespace <code>${esc(inventory.namespace)}</code>` : ""}</span><button class="button secondary" data-refresh-packages ${state.packageInventoryLoading ? "disabled" : ""}>Refresh</button></div>${state.packageInventoryError ? `<p class="source-message source-error" role="alert">${esc(state.packageInventoryError)}</p>` : ""}${inventory?.state === "DENIED" ? `<p class="source-message source-error" role="status">The current IRIS identity is not authorized to read installed IPM registrations.</p>` : ""}${inventory?.state === "FAILED" ? `<p class="source-message source-error" role="alert">The installed package provider could not return inventory.</p>` : ""}<div class="package-list">${rows.map(item => `<article class="package-card"><div class="package-card-head"><div><strong>${esc(item.name)}</strong><small>Installed IPM registration</small></div>${badge("INSTALLED", "accent")}</div><dl class="detail-grid"><dt>Namespace</dt><dd><code>${esc(item.namespace)}</code></dd><dt>Installed</dt><dd>${esc(item.installedVersion)}</dd><dt>Available</dt><dd>Not queried for this package</dd><dt>Source</dt><dd>${esc(item.source)}</dd></dl></article>`).join("") || `<p class="source-message">${inventory?.state === "EMPTY" ? "No installed package registrations were returned." : state.packageInventoryLoading ? "Reading installed package registrations…" : "No package rows are available."}</p>`}</div>${inventory?.truncated ? `<p class="source-message">Showing the first 250 registrations. Inventory is truncated.</p>` : ""}</section><section class="panel packages-workspace"><div class="panel-head"><div><div class="panel-kicker">CONFIGURED REPOSITORIES</div><h2>Available package lookup</h2></div>${badge(catalogBadge, catalog?.state === "AVAILABLE" || catalog?.state === "TRUNCATED" ? "accent" : "warning")}</div><form class="evidence-toolbar" data-available-package-form><label>Exact package name <input id="available-package-name" name="name" maxlength="128" pattern="[A-Za-z0-9][A-Za-z0-9_.-]{0,127}" value="${esc(state.availablePackageName)}" autocomplete="off" required></label><button class="button secondary" type="submit" ${state.availablePackageLoading ? "disabled" : ""}>${state.availablePackageLoading ? "Searching…" : "Search configured repositories"}</button><span class="package-source">Provider <code>iris-ipm-available-v1</code>${catalog ? ` · ${catalog.availableRepositoryCount}/${catalog.repositoryCount} repositories reachable` : ""}</span></form>${catalogBody}${packageOperationPanel()}${catalog?.coverage === "partial" && !["UNAVAILABLE", "DENIED", "FAILED"].includes(catalog.state) ? `<p class="source-message">Only ${catalog.availableRepositoryCount} of ${catalog.repositoryCount} configured repositories responded. Results are partial; absence is not established.</p>` : ""}${catalog?.truncated ? `<p class="source-message">Catalog rows reached the 50-row cap.</p>` : ""}</section>`;
  }
  const inventory = fixturePackageInventory();
  const items = inventory.packages.filter(item => state.packageFilter === "all" || (state.packageFilter === "installed" ? Boolean(item.installedVersion) : !item.installedVersion));
  const review = state.packagePlan;
  const plan = review?.plan;
  return `<section class="panel packages-workspace"><div class="panel-head"><div><div class="panel-kicker">APPLICATIONS → PACKAGES</div><h2>Package inventory preview</h2></div>${badge("SYNTHETIC FIXTURE", "warning")}</div><p class="source-message">These package rows are synthetic development fixtures. No configured registry, installed IPM inventory, or Open Exchange availability was queried.</p><div class="evidence-toolbar"><label>Inventory <select id="package-filter"><option value="all" ${state.packageFilter === "all" ? "selected" : ""}>Installed and available</option><option value="installed" ${state.packageFilter === "installed" ? "selected" : ""}>Installed</option><option value="available" ${state.packageFilter === "available" ? "selected" : ""}>Available</option></select></label><span class="package-source">Source identity <code>${esc(inventory.sourceIdentity)}</code></span></div><div class="package-list">${items.map(item => `<article class="package-card"><div class="package-card-head"><div><strong>${esc(item.name)}</strong><small>${esc(item.description)}</small></div>${badge(item.state.toUpperCase(), item.state === "update-available" ? "warning" : "accent")}</div><dl class="detail-grid"><dt>Namespace</dt><dd><code>${esc(item.namespace)}</code></dd><dt>Installed</dt><dd>${esc(item.installedVersion || "Not installed")}</dd><dt>Available</dt><dd>${esc(item.availableVersion || "Not observed")}</dd><dt>Source</dt><dd>${esc(item.source)}</dd></dl><div class="package-actions">${item.installedVersion ? `<button class="button secondary" data-package-plan="update" data-package-name="${esc(item.name)}" ${item.availableVersion ? "" : "disabled"}>Operation Rehearsal · update</button><button class="button quiet" data-package-plan="remove" data-package-name="${esc(item.name)}">Operation Rehearsal · remove</button>` : `<button class="button secondary" data-package-plan="install" data-package-name="${esc(item.name)}">Operation Rehearsal · install</button>`}</div></article>`).join("") || `<p class="source-message">No synthetic package rows match this filter.</p>`}</div><section class="panel package-catalog-example"><div class="panel-head"><div><div class="panel-kicker">CATALOG COMPARISON · SYNTHETIC</div><h3>opsdeck</h3></div>${badge("INSTALLED NEWER", "warning")}</div><p class="source-message">Demo scenario only: installed 0.2.1 is newer than the synthetic configured-catalog version 0.2.0. This is not a live registry observation or update recommendation.</p><dl class="detail-grid"><dt>Installed</dt><dd>0.2.1</dd><dt>Available example</dt><dd>0.2.0</dd><dt>Source</dt><dd>synthetic safe-demo fixture</dd></dl></section>${plan ? `<section class="package-plan-review"><div class="panel-kicker">OPERATION PLAN · REVIEW ONLY</div><h3>${esc(plan.intent)}</h3>${planReview(plan)}<div class="package-plan-facts"><p><strong>Risk</strong> ${esc(plan.risk)} · explicit confirmation required</p><p><strong>Target</strong> ${esc(plan.target.key)} · namespace <code>${esc(plan.target.scope)}</code></p><p><strong>Operation</strong> ${esc(plan.capability.providerOperation)}</p><p><strong>Source</strong> ${esc(plan.parameters.sourceIdentity)} · requested version ${esc(plan.parameters.requestedVersion || "current")}</p><p><strong>Current version</strong> ${esc(plan.parameters.installedVersion || "not installed")}</p><p><strong>Pre-state</strong> ${esc(plan.preStateEvidence)} · plan expires ${esc(plan.expiresAt)}</p><p><strong>Authority</strong> ${esc(plan.authorityValidation.state)} · ${esc(plan.authorityValidation.evidence)}</p><p><strong>Expected read-back</strong> ${esc(plan.expectedReadback)}</p></div><div class="notice warning"><strong>Executor unavailable.</strong> The plan is synthetic and review-only. Real IPM execution requires a qualified 0.6 executor and disposable package fixture.</div><button class="button secondary" disabled aria-disabled="true">Confirm package operation · unavailable</button></section>` : ""}</section>`;
}

function restServiceMatches(webApp) {
  const matches = [];
  for (const sourceId of domainSources.applications) {
    const data = state.sourceData[sourceId];
    if (!data || data.resultType !== "array") continue;
    for (const item of data.items) {
      const linked = sourceId === "restServices"
        ? item.ref.key === webApp.name && item.ref.scope === webApp.namespace
        : (Array.isArray(item.values.webApplications)
          ? item.values.webApplications.includes(webApp.name)
          : item.values.webApplications === webApp.name);
      if (linked) matches.push({ sourceId, item });
    }
  }
  return matches;
}

function sourceSelector(route) {
  return `<div class="source-tabs" role="tablist" aria-label="${esc(route)} sources">${(domainSources[route] || []).map((id) => {
    const source = READ_ONLY_SOURCES[id];
    return `<button class="source-tab ${state.sourceTabs[route] === id ? "active" : ""}" role="tab" aria-selected="${state.sourceTabs[route] === id}" data-source="${id}">${esc(source.label)}</button>`;
  }).join("")}</div>`;
}

function cellValue(value) {
  if (value === null || value === undefined) return "Not returned";
  if (typeof value === "boolean") return value ? badge("Yes", "success") : badge("No", "muted");
  if (Array.isArray(value)) return esc(value.join(", ") || "None");
  if (typeof value === "object") return "[record]";
  return esc(value);
}

function projectionExports(sourceId) {
  if(sourceId==='webApps'&&!state.appsReadAt)return '';
  return `<div class="projection-exports" aria-label="Export existing observation"><button class="button quiet" data-export-projection="${esc(sourceId)}" data-format="copy">Copy JSON</button><button class="button quiet" data-export-projection="${esc(sourceId)}" data-format="json">Download JSON</button><button class="button quiet" data-export-projection="${esc(sourceId)}" data-format="csv">Download CSV</button></div>`;
}
function sourcePanel(sourceId) {
  return `${state.sourceData[sourceId] ? projectionExports(sourceId) : ''}${sourcePanelBody(sourceId)}`;
}
function sourcePanelBody(sourceId) {
  const isRotation = /^messagesRotation:[0-9A-F]{64}$/u.test(sourceId);
  const source = READ_ONLY_SOURCES[sourceId] || (isRotation ? { label: "messages.log rotation", path: "/opsdeck-api/message-rotation" } : null);
  const data = state.sourceData[sourceId];
  const error = state.sourceErrors[sourceId];
  if (state.sourceLoading === sourceId) return `<div class="source-message">Loading the selected live source…</div>`;
  if (error) {
    const denied = isAuthorityDenial(error);
    return `<div class="source-message source-error ${denied ? "source-denied" : ""}" role="alert"><strong>${denied ? (state.info?.systemMode === "DEMO" ? "Access denied by persona" : "Access denied by IRIS") : "Source unavailable"}</strong><p>${esc(error)}</p><code>GET ${esc(source.path)}</code><button class="button quiet" data-refresh-source="${sourceId}">Retry source</button></div>`;
  }
  if (sourceId === "alerts") {
    if (!data) return `<div class="source-message"><strong>Stateful alert feed</strong><p>IRIS returns alerts since the previous feed read. OpsDeck does not poll this source automatically; requesting a batch advances that read boundary.</p><button class="button secondary" data-load-alerts>Read alert batch</button><div class="panel-foot">GET <code>${esc(source.path)}</code> · ${esc(source.requiredPrivilege)} · iris-monitor-api</div></div>`;
    const fieldShapes = data.items.map((item) => `<li><strong>${esc(item.ref.label)}</strong><span>${item.values.observedFields.length ? item.values.observedFields.map((field) => `<code>${esc(field)}</code>`).join(" ") : "No fields returned"}</span></li>`).join("");
    return `<div class="source-toolbar"><div><strong>${data.count}</strong><span> alerts returned in this batch</span></div><button class="button quiet" data-load-alerts>Read next batch</button></div>${data.count ? `<p class="source-caveat">Alert values are withheld until the live record schema and safe display fields are qualified. These field names describe shape only.</p><ul class="relationship-list">${fieldShapes}</ul>` : `<div class="source-message" role="status">IRIS returned no alerts in this batch.</div>`}<div class="panel-foot">GET <code>${esc(source.path)}</code> · stateful feed · ${fmtTime(data.observedAt)}</div>`;
  }
  if (sourceId === "messageRotations") {
    if (!data) return `<div class="source-message">Select the fixed rotation family to list bounded identities.</div>`;
    const labels = { available: "Observed", empty: "No rotations", truncated: "Partial coverage", denied: "Denied", unavailable: "Unavailable", failed: "Failed" };
    const items = data.rotations.map((item) => `<li class="owner-row"><span><strong>${esc(item.sourceTimestamp)}</strong><span class="app-sub">${item.size} bytes · <code>${esc(item.sourceIdentity)}</code></span></span><button class="button quiet" data-read-rotation="${esc(item.sourceIdentity)}" ${state.rotationLoading ? "disabled" : ""}>Read bounded observation</button></li>`).join("");
    const selected = state.selectedRotation ? sourcePanel(state.selectedRotation) : "";
    const inventoryMetrics = ["available", "empty", "truncated"].includes(data.status) ? `<strong>${data.count}</strong><span> fixed-family files · ${data.scannedCount} entries scanned</span>` : "<span>Inventory count not established</span>";
    return `<div class="source-toolbar"><div>${badge(labels[data.status] || "Unresolved", data.status === "available" ? "success" : data.status === "denied" || data.status === "failed" ? "error" : "warning")} ${inventoryMetrics}</div><button class="button quiet" data-refresh-source="messageRotations">Rescan fixed family</button></div>${data.coverage === "partial" || data.truncated ? `<p class="source-caveat">Coverage is partial. The bounded scan may omit family members.</p>` : ""}${items ? `<ul class="relationship-list">${items}</ul>` : `<div class="source-message" role="status">${data.status === "empty" ? "No approved messages.log rotations were observed." : data.status === "denied" ? "IRIS denied fixed-family enumeration for this identity." : "The fixed-family inventory is unavailable; it is not treated as an empty catalog."}</div>`}${selected}<div class="panel-foot">GET <code>${esc(source.path)}</code> · nonrecursive · max 250 entries / 20 identities · no paths returned · ${fmtTime(data.observedAt)}</div>`;
  }
  if (sourceId === "messagesLog" || sourceId === "systemMonitorLog" || isRotation) {
    if (!data) return `<div class="source-message">Select the fixed source to read its bounded recent observation.</div>`;
    const labels = { available: "Available", empty: "Valid empty", truncated: "Truncated", unavailable: "Unavailable", denied: "Denied", "read-failure": "Read failure" };
    const tone = data.status === "available" ? "success" : data.status === "empty" ? "accent" : ["denied", "read-failure"].includes(data.status) ? "error" : "warning";
    const rows = data.items.map((item) => `<li id="log-${sourceId}-${esc(item.ref.key.slice(5))}"><span class="log-line-number">${esc(item.ref.key.slice(5))}</span><code>${esc(item.values.line)}</code></li>`).join("");
    const analysis = data.analysis;
    const analysisLabels = { available: "Observed", empty: "No markers", truncated: "Partial", unavailable: "Unavailable", denied: "Denied", "read-failure": "Read failure", failed: "Analysis failed" };
    const analysisTone = analysis?.status === "available" ? "accent" : analysis?.status === "empty" ? "muted" : ["denied", "read-failure", "failed"].includes(analysis?.status) ? "error" : "warning";
    const findings = analysis?.findings?.map((finding) => `<li class="log-finding"><div class="log-finding-head"><strong>${esc(finding.title)}</strong>${badge(`Line ${finding.lineNumber}`, "muted")}</div><p>${esc(finding.summary)} Marker <code>${esc(finding.marker)}</code>.</p><p><strong>Consequence:</strong> ${esc(finding.consequence)}</p><p><strong>Next step:</strong> ${esc(finding.nextAction)}</p></li>`).join("") || "";
    const analysisPanel = analysis ? `<section class="log-analysis" aria-label="Embedded Python log interpretation"><div class="log-analysis-head"><div><div class="panel-kicker">EMBEDDED PYTHON · RULE-BASED</div><h3>Interpretation of this observation</h3></div>${badge(analysisLabels[analysis.status] || "Unresolved", analysisTone)}</div><p class="source-caveat">Fixed markers are observations from these returned lines. They do not establish overall system health or an IRIS authorization decision.</p>${findings ? `<ol class="log-findings">${findings}</ol>` : `<div class="source-message" role="status">${analysis.status === "empty" ? "The source contained no lines in this observation." : ["available", "truncated"].includes(analysis.status) ? "No configured markers were found in this bounded observation." : "The log lines remain available, but this interpretation did not complete."}</div>`}${analysis.findingsTruncated ? `<div class="source-message" role="status">The interpretation is limited to the first 20 matching lines.</div>` : ""}<div class="panel-foot">${esc(analysis.provider)} · ${analysis.lineCount} lines reviewed${analysis.truncated ? " · source observation truncated" : ""} · session only</div></section>` : "";
    const stateMessage = {
      empty: "The source was read successfully and contained no lines in the bounded observation.",
      unavailable: "IRIS could not locate or open this fixed source.",
      denied: "The current IRIS process lacks the required log-inspection authority.",
      "read-failure": "IRIS failed while reading this fixed source.",
    }[data.status] || "";
    const refresh = isRotation ? `<button class="button quiet" data-read-rotation="${esc(sourceId)}">Read again</button>` : `<button class="button quiet" data-refresh-source="${sourceId}">Read again</button>`;
    return `<div class="source-toolbar"><div>${badge(labels[data.status] || "Unresolved", tone)} <strong>${data.count}</strong><span> complete lines returned${data.truncated ? " · recent observation is truncated" : ""}</span></div>${refresh}</div>${stateMessage ? `<div class="source-message" role="status">${esc(stateMessage)}</div>` : ""}${rows ? `<ol class="fixed-log-lines" aria-label="${esc(source.label)} recent lines">${rows}</ol>` : ""}${analysisPanel}<div class="panel-foot">GET <code>${esc(source.path)}${isRotation ? "?id=…" : ""}</code> · ${esc(data.provider)} · at most 64 KiB / 250 complete lines · ${fmtTime(data.observedAt)}${isRotation ? ` · source ${esc(data.sourceIdentity || sourceId)} · ${esc(data.sourceTimestamp || "timestamp unavailable")}` : ""}</div>`;
  }
  if (!data) return `<div class="source-message">Select a source to load authoritative IRIS data.</div>`;
  const items = data.items;
  const selectedKey = state.selectedItems[sourceId];
  const selectedIndex = items.findIndex((item, index) => recordHandle(data, index) === selectedKey || (!String(selectedKey).startsWith("snapshot:") && item.ref.key === selectedKey));
  const selected = items[selectedIndex < 0 ? 0 : selectedIndex];
  const keys = selected ? Object.keys(selected.values) : [];
  const columns = keys.slice(0, 6);
  const visibleColumns = sourceId === "tasks"
    ? ["Type", "Namespace", "Suspended", ...columns.filter((key) => ![keys[0], "Type", "Namespace", "Suspended"].includes(key))].filter((key) => keys.includes(key)).slice(0, 5)
    : columns.filter((key) => key !== (keys[0] || ""));
  const rows = items.map((item, index) => `<tr class="provider-row ${selected === item ? "selected" : ""}" tabindex="0" role="button" data-item="${esc(sourceId)}::${recordHandle(data, index)}"><td data-label="Resource"><strong>${esc(item.ref.label)}</strong><span class="app-sub">${item.ref.scope ? esc(item.ref.scope) : esc(item.ref.kind)}</span></td>${visibleColumns.map((key) => `<td data-label="${esc(key)}">${cellValue(item.values[key])}</td>`).join("")}</tr>`).join("");
  const objectMetrics = data.resultType === "object" && selected
    ? `<div class="metric-grid">${Object.entries(selected.values).map(([key, value]) => `<article class="metric-card"><span>${esc(key)}</span><strong>${cellValue(value)}</strong></article>`).join("")}</div>`
    : null;
  const detail = selected && data.resultType !== "object"
    ? `<aside class="panel inspector provider-inspector"><div class="panel-kicker">AUTHORITATIVE RESOURCE</div><h2 class="inspector-title">${esc(selected.ref.label)}</h2><p class="inspector-sub">Provider key <code>${esc(selected.ref.key)}</code>${selected.ref.scope ? ` · ${esc(selected.ref.scope)}` : ""}</p><dl class="detail-grid">${Object.entries(selected.values).map(([key, value]) => `<dt>${esc(key)}</dt><dd>${cellValue(value)}</dd>`).join("")}</dl><div class="inspector-foot">${esc(selected.ref.provider)} · observed ${fmtTime(selected.ref.observedAt)}</div>${["users", "roles", "resources", "tasks"].includes(sourceId) && items.filter(item => item.ref.key === selected.ref.key).length !== 1 ? "<p class=\"app-sub\">Detail requires an unambiguous provider key; no scoped detail request is qualified.</p>" : sourceId === "users" ? userDetailContent(selected) : sourceId === "roles" ? roleDetailContent(selected) : sourceId === "resources" ? resourceDetailContent(selected) : sourceId === "tasks" ? taskDetailContent(selected) : ""}</aside>`
    : "";
  const verification = state.sourceVerification[sourceId];
  return `<div class="source-toolbar"><div><strong>${data.count ?? 1}</strong><span> ${data.resultType === "array" ? "records returned" : "live object"}</span></div><div>${verification ? badge(verification.matched ? "Second read matched" : "Second read differed", verification.matched ? "success" : "error") : ""} <button class="button quiet" data-refresh-source="${sourceId}">Refresh source</button></div></div>
    ${objectMetrics || `<div class="provider-layout"><article class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Resource</th>${visibleColumns.map((key) => `<th>${esc(key)}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="${visibleColumns.length + 1}" class="empty-cell">IRIS returned an empty collection.</td></tr>`}</tbody></table></div></article>${detail}</div>`}
    <div class="panel-foot">GET <code>${esc(source.path)}</code> · ${esc(source.requiredPrivilege)} · ${esc(data.provider)} · ${fmtTime(data.observedAt)}${verification ? ` · repeated ${fmtTime(verification.at)}` : ""}</div>`;
}

function relationList(title, refs, relationKind = "role") {
  if (refs === null) return `<div class="relationship-block"><strong>${esc(title)}</strong><p class="source-message">IRIS did not return this relationship.</p></div>`;
  return `<div class="relationship-block"><strong>${esc(title)} <span class="app-sub">${refs.length} returned</span></strong>${refs.length ? `<ul class="relationship-list">${refs.map((ref) => `<li><button class="link-button" data-related-${relationKind}="${esc(ref.key)}"><code>${esc(ref.label)}</code></button></li>`).join("")}</ul>` : `<p class="source-message">None returned.</p>`}</div>`;
}

function userDetailContent(selected) {
  const key = selected.ref.key;
  const detail = state.userDetails[key];
  const error = state.userDetailErrors[key];
  const verification = state.userDetailVerification[key];
  const content = state.userDetailLoading === key
    ? `<div class="source-message">Loading authoritative user detail…</div>`
    : error
      ? `<div class="source-message source-error" role="alert"><strong>User detail unavailable</strong><p>${esc(error)}</p></div>`
      : detail
        ? `${relationList("Direct roles", detail.relationships.directRoles)}${relationList("Escalation roles", detail.relationships.escalationRoles)}<div class="inspector-foot">GET <code>${esc(detail.source)}?name=…</code> · ${esc(detail.ref.provider)} · observed ${fmtTime(detail.ref.observedAt)}${verification ? ` · ${verification.matched ? "Second read matched" : "Second read differed"} at ${fmtTime(verification.at)}` : ""}</div>`
        : `<p class="app-sub">Expanded user relationships are fetched only when requested.</p>`;
  const button = state.userDetailLoading === key ? "" : `<button class="button secondary" data-load-user-detail="${esc(key)}">${detail ? "Refresh and verify relationships" : "Load authoritative detail"}</button>`;
  return `<section class="inspector-section"><div class="panel-kicker">DIRECT USER RELATIONSHIPS</div>${content}${button}</section>`;
}

function roleDetailContent(selected) {
  const key = selected.ref.key;
  const detail = state.roleDetails[key];
  const error = state.roleDetailErrors[key];
  const verification = state.roleDetailVerification[key];
  const owners = state.roleOwners[key];
  const ownerError = state.roleOwnerErrors[key];
  const content = state.roleDetailLoading === key
    ? `<div class="source-message">Loading authoritative role detail…</div>`
    : error
      ? `<div class="source-message source-error" role="alert"><strong>Role detail unavailable</strong><p>${esc(error)}</p></div>`
      : detail
        ? `<dl class="detail-grid"><dt>Description</dt><dd>${detail.description === null ? "Not returned" : esc(detail.description)}</dd><dt>Escalation only</dt><dd>${detail.escalationOnly === null ? "Not returned" : cellValue(detail.escalationOnly)}</dd></dl>${relationList("Direct granted roles", detail.grantedRoles, "role")}${resourcePermissionList(detail.resources)}<div class="inspector-foot">GET <code>/api/admin/v2/security/role?name=…</code> · ${esc(detail.ref.provider)} · observed ${fmtTime(detail.ref.observedAt)}${verification ? ` · ${verification.matched ? "Second read matched" : "Second read differed"} at ${fmtTime(verification.at)}` : ""}</div>`
        : `<p class="app-sub">Role detail and direct resource grants are fetched only when requested.</p>`;
  const load = state.roleDetailLoading === key ? "" : `<button class="button secondary" data-load-role-detail="${esc(key)}">${detail ? "Refresh and verify role" : "Load authoritative detail"}</button>`;
  const ownersContent = state.roleOwnerLoading === key
    ? `<div class="source-message">Loading bounded role holders…</div>`
    : ownerError
      ? `<div class="source-message source-error" role="alert"><strong>Role holders unavailable</strong><p>${esc(ownerError)}</p></div>`
      : owners
        ? `<strong>Direct holders <span class="app-sub">${owners.length} returned · maxRows=20</span></strong>${owners.length ? `<ul class="relationship-list">${owners.map((owner) => `<li class="owner-row"><code>${esc(owner.name)}</code><span>${esc(owner.type)}</span><span>AdminOption: ${esc(owner.adminOption)}</span></li>`).join("")}</ul>` : `<p class="source-message">None returned.</p>`}<div class="inspector-foot">GET <code>/api/admin/v2/security/role/owners?name=…&amp;maxRows=20</code> · ${state.roleOwnerVerification[key] ? (state.roleOwnerVerification[key].matched ? "Second read matched" : "Second read differed") : "Direct holder records; no closure inferred"}</div>`
        : `<p class="app-sub">Direct role holders are fetched separately, bounded to 20 rows.</p>`;
  const ownerButton = state.roleOwnerLoading === key ? "" : `<button class="button quiet" data-load-role-owners="${esc(key)}">${owners ? "Refresh holders" : "Load direct holders"}</button>`;
  return `<section class="inspector-section"><div class="panel-kicker">ROLE DETAIL · DIRECT RELATIONSHIPS</div>${content}${load}</section><section class="inspector-section"><div class="panel-kicker">ROLE HOLDERS</div>${ownersContent}${ownerButton}</section>`;
}

function resourcePermissionList(resources) {
  if (resources === null) return `<div class="relationship-block"><strong>Direct resource grants</strong><p class="source-message">IRIS did not return this relationship.</p></div>`;
  return `<div class="relationship-block"><strong>Direct resource grants <span class="app-sub">${resources.length} returned</span></strong>${resources.length ? `<ul class="relationship-list">${resources.map((resource) => `<li><button class="link-button" data-related-resource="${esc(resource.ref.key)}"><code>${esc(resource.ref.label)}</code></button><span>Permissions: ${esc(resource.permissions)}</span></li>`).join("")}</ul>` : `<p class="source-message">None returned.</p>`}</div>`;
}

function resourceDetailContent(selected) {
  const key = selected.ref.key;
  const detail = state.resourceDetails[key];
  const error = state.resourceDetailErrors[key];
  const verification = state.resourceDetailVerification[key];
  const content = state.resourceDetailLoading === key
    ? `<div class="source-message">Loading authoritative resource detail…</div>`
    : error
      ? `<div class="source-message source-error" role="alert"><strong>Resource detail unavailable</strong><p>${esc(error)}</p></div>`
      : detail
        ? `<dl class="detail-grid"><dt>Description</dt><dd>${detail.description === null ? "Not returned" : esc(detail.description)}</dd><dt>Public permission</dt><dd>${detail.publicPermission === null ? "Not returned" : esc(detail.publicPermission)}</dd></dl><div class="inspector-foot">GET <code>/api/admin/v2/security/resource?name=…</code> · ${esc(detail.ref.provider)} · observed ${fmtTime(detail.ref.observedAt)}${verification ? ` · ${verification.matched ? "Second read matched" : "Second read differed"} at ${fmtTime(verification.at)}` : ""}</div>`
        : `<p class="app-sub">Resource detail is fetched only when requested.</p>`;
  const button = state.resourceDetailLoading === key ? "" : `<button class="button secondary" data-load-resource-detail="${esc(key)}">${detail ? "Refresh and verify resource" : "Load authoritative detail"}</button>`;
  return `<section class="inspector-section"><div class="panel-kicker">RESOURCE DETAIL</div>${content}${button}</section>`;
}

function taskDetailContent(selected) {
  const key = selected.ref.key;
  const detail = state.taskDetails[key];
  const error = state.taskDetailErrors[key];
  const verification = state.taskDetailVerification[key];
  const content = state.taskDetailLoading === key
    ? `<div class="source-message">Loading authoritative task detail…</div>`
    : error
      ? `<div class="source-message source-error" role="alert"><strong>Task detail unavailable</strong><p>${esc(error)}</p></div>`
      : detail
        ? `<dl class="detail-grid">${Object.entries(detail.values).map(([field, value]) => `<dt>${esc(field)}</dt><dd>${cellValue(value)}</dd>`).join("")}</dl><div class="inspector-foot">GET <code>/api/admin/v2/task?id=…</code> · ${esc(detail.ref.provider)} · observed ${fmtTime(detail.ref.observedAt)}${verification ? ` · ${verification.matched ? "Second read matched" : "Second read differed"} at ${fmtTime(verification.at)}` : ""}</div>`
        : `<p class="app-sub">Expanded task configuration is fetched only when requested.</p>`;
  const button = state.taskDetailLoading === key ? "" : `<button class="button secondary" data-load-task-detail="${esc(key)}">${detail ? "Refresh and verify task" : "Load authoritative detail"}</button>`;
  return `<section class="inspector-section"><div class="panel-kicker">AUTHORITATIVE TASK DETAIL</div>${content}${button}</section>`;
}

function providerDomainView(route) {
  const title = navItems.find(([item]) => item === route)?.[1] || "Workspace";
  const descriptions = {
    access: "Users, roles, and resources returned by the IRIS security API.",
    security: "Credential and OAuth configuration metadata. Secret material is never rendered.",
    tasks: "Scheduled task definitions from the live IRIS management API.",
    system: "Live system usage, processes, databases, and device inventory.",
    logs: "Audit configuration, bounded fixed log observations, task history, and journal inventory. Each reader remains qualified only within its recorded scope.",
  };
  const sourceId = state.sourceTabs[route] || domainSources[route]?.[0];
  const systemNavigation = route === "system" ? `<div class="system-sections" role="tablist" aria-label="System sections"><button class="source-tab ${state.systemSection === "providers" ? "active" : ""}" role="tab" aria-selected="${state.systemSection === "providers"}" data-system-section="providers">System providers</button><button class="source-tab ${state.systemSection === "about" ? "active" : ""}" role="tab" aria-selected="${state.systemSection === "about"}" data-system-section="about">About</button></div>` : "";
  if (route === "system" && state.systemSection === "about") {
    const identity = ProductIdentity.resolve({
      irisVersion: state.info?.serverVersion,
      deployment: state.info?.systemMode === "DEMO" ? "demo" : nativeMode ? "native" : "reference",
    });
    return shell(`${pageHeader("About", "OpsDeck product identity and runtime context.")}${systemNavigation}<section class="panel about-panel"><div class="panel-kicker">${esc(identity.releaseLabel)}</div><h2>${esc(identity.name)}</h2><p class="about-version">Version ${esc(identity.publicVersion)}</p><p class="source-message">OpsDeck presents observed IRIS context separately from its public product identity. Runtime fields are shown only when supplied by the active product context.</p><details class="about-details"><summary>Technical details</summary><dl class="detail-grid"><dt>Internal version</dt><dd>${esc(identity.internalVersion)}</dd><dt>Package version</dt><dd>${esc(identity.packageVersion)}</dd><dt>Git commit</dt><dd><code>${esc(identity.gitCommit || "Not embedded in source package")}</code></dd><dt>Build timestamp</dt><dd>${esc(identity.buildTimestamp || "Not embedded in source package")}</dd><dt>IRIS version</dt><dd>${esc(identity.irisVersion)}</dd><dt>Namespace</dt><dd><code>${esc(identity.namespace)}</code></dd><dt>Deployment target</dt><dd>${esc(identity.deploymentTarget)}</dd></dl></details></section>`);
  }
  const logTools = route === "logs" ? auditQueryPanel() : "";
  const jobs = route === "tasks" ? jobCenterPanel() : "";
  const caveat = route === "logs" ? `<p class="source-caveat">Fixed log routes accept only the two semantic source identities. Returned lines preserve legitimate log text; the resolved filesystem location is never returned. Alerts are a stateful feed and are read only when explicitly requested.</p>` : "";
  return shell(`${pageHeader(title, descriptions[route] || "Live IRIS provider data.")}${systemNavigation}${jobs}${logTools}<section class="panel provider-panel"><div class="panel-head"><div><div class="panel-kicker">LIVE PROVIDER DATA</div><h2>${esc(READ_ONLY_SOURCES[sourceId]?.label || title)}</h2></div>${badge("Read only", "accent")}</div>${sourceSelector(route)}${sourcePanel(sourceId)}${caveat}</section>`);
}

function jobCenterPanel() {
  const jobs = visibleJobs();
  const tone = status => ({ COMPLETED: "success", FAILED: "error", DENIED: "error", CANCELED: "muted", UNAVAILABLE: "warning", AMBIGUOUS: "error" })[status] || "accent";
  const rows = jobs.slice().reverse().map(job => `<article class="job-row"><div><strong>${esc(job.operation)}</strong><small>${esc(job.provider)} · accepted ${fmtTime(job.acceptedAt)}</small></div><div>${badge(job.status, tone(job.status))}<p>${esc(job.progress || "No progress detail was returned.")}</p>${job.resultIdentity ? `<small>Result <code>${esc(job.resultIdentity.id)}</code></small>` : ""}</div></article>`).join("");
  return `<section class="panel job-center"><div class="panel-head"><div><div class="panel-kicker">SESSION-SCOPED ASYNC WORK</div><h2>Job Center</h2></div>${badge(`${jobs.length} JOB${jobs.length === 1 ? "" : "S"}`, jobs.length ? "accent" : "muted")}</div><p class="source-message">Jobs appear only when IRIS returns an accepted asynchronous identity. Unknown or incomplete outcomes stay visible as unresolved; OpsDeck does not retry dispatch.</p>${rows ? `<div class="job-list">${rows}</div>` : `<p class="source-message">No asynchronous jobs have been observed in this session.</p>`}</section>`;
}

function visibleJobs() {
  if (state.info?.systemMode === "DEMO" && !(state.jobs || []).length) return [{
    identity: "fixture:job:maintenance-01", operation: "Synthetic maintenance task",
    provider: "opsdeck-demo-v1", acceptedAt: "2026-10-02T12:00:00Z",
    updatedAt: "2026-10-02T12:00:08Z", status: "COMPLETED",
    progress: "Synthetic completed job shown to demonstrate Job Center projection; no IRIS task was run.",
    resultIdentity: null,
  }];
  return state.jobs || [];
}

function auditQueryPanel() {
  const query = state.auditQuery;
  const tone = query?.state === "denied" || query?.state === "failed" ? "error" :
    query?.state === "finished" ? "success" : query ? "warning" : "muted";
  const safeFields = ["TimeStamp", "Event", "EventSource", "UserName", "PID", "Namespace"];
  const result = Array.isArray(query?.result)
    ? query.result.length
      ? `<div class="table-wrap"><table><thead><tr>${safeFields.map((field) => `<th>${esc(field)}</th>`).join("")}</tr></thead><tbody>${query.result.map((record) => `<tr>${safeFields.map((field) => `<td>${Object.hasOwn(record, field) ? esc(record[field]) : "—"}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
      : `<p class="source-message">No audit records matched this bounded query.</p>`
    : "";
  const task = query?.task ? `<small>Task state: ${esc(query.task.state)} · identity: ${esc(query.task.identitySource || "unverified")}</small>` : "";
  return `<section class="panel provider-panel audit-query-panel"><div class="panel-head"><div><div class="panel-kicker">READ ONLY · BOUNDED</div><h2>Audit records</h2></div><button class="button quiet" data-run-audit-query ${state.auditQueryBusy ? "disabled" : ""}>${state.auditQueryBusy ? "Reading…" : "Read recent records · max 1"}</button></div><p class="source-message">Reads one record at most for the signed-in user over the last 10 minutes. Only reviewed audit fields are displayed.</p>${query ? `<p class="source-message"><strong>${badge(query.state.toUpperCase(), tone)}</strong> ${esc(query.message)}</p>${task}${result}` : ""}</section>`;
}

async function loadCapabilitySummary(){
  if(state.capabilitySummaryBusy)return;
  const owner=sessionEpoch;state.capabilitySummaryBusy=true;state.capabilitySummaryError='';render();
  try{
    const value=await requestJson(nativeMode?'/opsdeck/capability-summary.json':'./capability-summary.json');
    const keys=['declared','exposed','observed','reproduced','independentlyVerified','mutable','qualifiedMutationWorkflows','exposedMutableOperations'];
    if(value.schema!=='opsdeck-capability-summary-v1'||!value.counts||keys.some(key=>!Number.isInteger(value.counts[key])||value.counts[key]<0||value.counts[key]>100000)||typeof value.unit!=='string'||value.unit.length>256||typeof value.qualificationBoundary!=='string'||value.qualificationBoundary.length>512)throw new Error('Qualification summary contract unavailable.');
    if(owner!==sessionEpoch)return;
    state.capabilitySummary={counts:Object.fromEntries(keys.map(key=>[key,value.counts[key]])),unit:value.unit,qualificationBoundary:value.qualificationBoundary};
  }catch{if(owner===sessionEpoch)state.capabilitySummaryError='Qualification snapshot unavailable. Current-session Evidence remains available.';}
  finally{if(owner===sessionEpoch){state.capabilitySummaryBusy=false;render();}}
}
function capabilitySummaryPanel(){
  const summary=state.capabilitySummary;
  const metrics=[['exposed','IRIS operations exposed'],['observed','Runtime-observed'],['independentlyVerified','Independently verified'],['qualifiedMutationWorkflows','Qualified mutation workflows']];
  return `<section class="panel capability-summary"><div class="panel-head"><div><div class="panel-kicker">PRODUCT QUALIFICATION · SOURCE-GENERATED</div><h2>Capability accounting</h2></div><button class="button secondary" id="capability-summary-load" ${state.capabilitySummaryBusy?'disabled':''}>${state.capabilitySummaryBusy?'Loading…':summary?'Refresh qualification snapshot':'Show qualification snapshot'}</button></div><p class="source-message">Recorded qualification across its named identities and targets. Current-session access still depends on the signed-in identity and operating target.</p>${state.capabilitySummaryError?`<p role="status">${esc(state.capabilitySummaryError)}</p>`:''}${summary?`<div class="capability-metrics">${metrics.map(([key,label])=>`<div><strong>${summary.counts[key]}</strong><span>${esc(label)}</span></div>`).join('')}</div><details><summary>Counting unit and qualification scope</summary><p>${esc(summary.unit)}</p><p>${esc(summary.qualificationBoundary)}</p><p>${summary.counts.declared} declared · ${summary.counts.reproduced} reproduced · ${summary.counts.mutable} mutation-shaped contracts · ${summary.counts.exposedMutableOperations} exposed mutation operations.</p><p>Independent verification is scoped to its recorded read-back or effect evidence. Historical workflow variants do not increase the discrete operation count.</p></details>`:''}</section>`;
}
function evidenceView() {
  const isDemo = state.info?.systemMode === "DEMO";
  const productIdentity = ProductIdentity.resolve({
    irisVersion: state.info?.serverVersion,
    deployment: isDemo ? "demo" : nativeMode ? "native" : "reference",
  });
  const audit = isDemo ? null : state.auditQuery;
  const readback = state.verification
    ? (state.verification.matched
      ? { label: "VERIFIED", tone: "success", detail: `${state.verification.count} web-app identities matched on an independent second read.` }
      : { label: "MISMATCH", tone: "error", detail: "The second web-app read differed from the displayed state." })
    : { label: "PENDING", tone: "muted", detail: "No current read-back comparison is available in this session." };
  const auditState = { accepted: "UNVERIFIED", queued: "PARTIAL", running: "PARTIAL", finished: "PARTIAL", failed: "FAILED", canceled: "BLOCKED", denied: "DENIED", unavailable: "UNAVAILABLE", ambiguous: "UNVERIFIED" }[audit?.state] || "PENDING";
  const auditCount = Number.isInteger(audit?.resultCount) ? `${audit.resultCount} result row${audit.resultCount === 1 ? "" : "s"}` : "an unknown number of result rows";
  const auditDetail = audit?.state === "finished"
    ? `A bounded audit task finished with ${auditCount}. The response remains partial evidence; full result-schema and pagination behavior are not established.`
    : audit ? `The bounded audit task is ${audit.state}. Its state is retained in this session without raw task identifiers or unreviewed result values.`
      : "No bounded audit query has been observed in this session. Historical native qualification covers one finished empty v1 async result; full result-schema and pagination behavior remain unverified.";
  const auditTone = ["FAILED", "DENIED"].includes(auditState) ? "error" : ["PENDING", "UNVERIFIED", "PARTIAL", "BLOCKED", "UNAVAILABLE"].includes(auditState) ? "warning" : "muted";
  const cards = [
    { title: "Web application read-back", state: readback.label, tone: readback.tone, detail: readback.detail, note: isDemo ? "Demo semantics only · live IRIS verification is separately qualified." : "Current session evidence." },
    { title: "Provider state semantics", state: "PRESERVED", tone: "success", detail: "Valid empty collections, unavailable providers, denied access, and mapping failures remain distinct states.", note: "No fixture fallback is substituted for a failed live provider." },
    { title: "Audit async handoff", state: auditState, tone: auditTone, detail: auditDetail, note: "Current-session observation only; the query is bounded to maxRows=1 and does not establish a complete audit-result schema." },
    { title: "IPM / ZPM lifecycle", state: "QUALIFIED", tone: "success", detail: "Local-source load, uninstall, and clean same-source reload were reproduced for OpsDeck 0.2.0. Registration, /opsdeck, deployed asset hashes, operational HTTP behavior, cleanup, and unrelated-state preservation were verified.", note: "Scope: tested local-source lifecycle only. Exact core IPM version and public-registry installation remain unverified." }
  ];
  const evidenceCollection = currentEvidenceCollection();
  const ledger = sessionLedger(evidenceCollection);
  const ledgerCounts = Object.entries(ledger.categories).map(([kind, records]) => `${records.length} ${kind}`).join(" · ");
  const visibleEvidence = filterEvidence(evidenceCollection, state.evidenceFilter || "", state.evidenceStateFilter || "ALL");
  const evidencePanel = `<section class="panel durable-evidence-panel"><div class="panel-head"><div><div class="panel-kicker">BOUNDED EVIDENCE CENTER</div><h2>${isDemo ? "Session Ledger · synthetic preview" : "Session Ledger"}</h2></div>${badge(isDemo ? "SYNTHETIC FIXTURE" : "SESSION ONLY", "warning")}</div><p class="source-message">${esc(ledgerCounts)}${ledger.truncated ? " · bounded collection truncated" : ""}</p><p class="source-message">${isDemo ? "Synthetic fixture data only. It demonstrates redacted receipt browsing and export, not IRIS execution." : "Evidence is held in session memory. No persistent IRIS evidence provider is attached; exports are explicit and bounded."}</p><div class="evidence-toolbar"><label>Filter <input id="evidence-filter" type="search" value="${esc(state.evidenceFilter || "")}" maxlength="128" placeholder="Find evidence"></label><label>State <select id="evidence-state-filter">${["ALL", "VERIFIED", "PARTIAL", "FAILED", "UNVERIFIED", "BLOCKED", "UNAVAILABLE", "DENIED"].map(item => `<option value="${item}" ${(state.evidenceStateFilter || "ALL") === item ? "selected" : ""}>${item}</option>`).join("")}</select></label><button class="button secondary" data-export-evidence="json" ${visibleEvidence.length ? "" : "disabled"}>Download JSON</button><button class="button secondary" data-export-evidence="copy" ${visibleEvidence.length ? "" : "disabled"}>Copy JSON</button><button class="button secondary" data-export-evidence="csv" ${visibleEvidence.length ? "" : "disabled"}>Download CSV</button><button class="button secondary" data-export-evidence="markdown" ${visibleEvidence.length ? "" : "disabled"}>Download Markdown</button></div>${visibleEvidence.length ? `<div class="evidence-record-list">${visibleEvidence.map(item => `<article class="evidence-record"><div><strong>${esc(evidenceLabel(item))}</strong>${badge(item.state, item.state === "VERIFIED" ? "success" : "warning")}</div><small>${esc(item.kind)} · ${esc(item.observedAt)} · source ${esc(item.source?.identity || "unknown")} · resource ${esc(item.resource?.key || "unknown")}</small><small>Operating target ${esc(item.targetRef.label)} · ${esc(item.targetRef.environment)} · ${esc(item.targetRef.origin)}</small><p>${esc(item.summary)}</p></article>`).join("")}</div>` : `<p class="source-message">${evidenceCollection.state === "EMPTY" ? "No evidence records are available in this session." : `No records match the selected filter · ${evidenceCollection.state}.`}</p>`}</section>`;
  const cardHtml = cards.map((item) => `<article class="evidence-card"><div class="evidence-card-head"><strong>${esc(item.title)}</strong>${badge(item.state, item.tone)}</div><p>${esc(item.detail)}</p><small>${esc(item.note)}</small></article>`).join("");
  return shell(`
    ${pageHeader("Evidence", "What OpsDeck can prove, what it cannot, and where qualification deliberately stops.")}
    <p class="source-message evidence-product-identity">${esc(productIdentity.name)} · ${esc(productIdentity.releaseLabel)} ${esc(productIdentity.publicVersion)}</p>
    ${isDemo ? `<div class="evidence-demo-notice"><strong>SAFE DEMO</strong><span>Sanitized deterministic data. This page demonstrates evidence semantics, not a live IRIS claim.</span></div>` : ""}
    <section class="panel evidence-flow-panel"><div class="panel-head"><div><div class="panel-kicker">EVIDENCE-GATED OPERATION</div><h2>Observed state stays tied to authority</h2></div>${badge("No shadow state", "accent")}</div>
      <div class="evidence-flow" aria-label="OpsDeck evidence flow"><div><span>01</span><strong>Request</strong><small>Known operation</small></div><b>→</b><div><span>02</span><strong>Bounded provider</strong><small>Allowlisted route</small></div><b>→</b><div><span>03</span><strong>IRIS authority</strong><small>Source of truth</small></div><b>→</b><div><span>04</span><strong>Rendered state</strong><small>Safe projection</small></div><b>→</b><div><span>05</span><strong>Read-back</strong><small>Where qualified</small></div></div>
    </section>
    <section class="evidence-grid">${cardHtml}</section>
    ${capabilitySummaryPanel()}
    ${evidencePanel}
    ${intelligencePanel()}
    ${entityGraphPanel(evidenceCollection)}
    ${semanticSearchPanel()}
    <section class="panel evidence-legend"><div class="panel-head"><div><div class="panel-kicker">STATE SEMANTICS</div><h2>Absence is not failure, and failure is not absence</h2></div></div>
      <div class="state-legend-grid"><div>${badge("VERIFIED", "success")}<p>Independent evidence agrees with the displayed state.</p></div><div>${badge("EMPTY", "accent")}<p>The authoritative provider returned a valid empty collection.</p></div><div>${badge("UNAVAILABLE", "warning")}<p>The source could not provide a usable result. OpsDeck does not invent one.</p></div><div>${badge("DENIED", "error")}<p>The current identity lacks authority for the source.</p></div><div>${badge("UNVERIFIED", "muted")}<p>The behavior has not crossed its required qualification boundary.</p></div></div>
      <div class="evidence-actions"><button class="button secondary" data-route="applications">Inspect applications</button><button class="button secondary" data-route="access">Inspect access relationships</button><button class="button secondary" data-route="security">Inspect provider boundaries</button></div>
    </section>`);
}

function semanticSearchPanel() {
  const supported = nativeMode && state.info?.systemMode !== "DEMO";
  const result = state.semanticResult;
  return `<section class="panel"><div class="panel-head"><div><div class="panel-kicker">DERIVED NAVIGATION · EXPERIMENTAL</div><h2>Concept search</h2></div>${badge(result?.state || (supported ? "UNQUALIFIED" : "UNAVAILABLE"), "warning")}</div><p class="source-message">Rebuildable IRIS Vector index of authorized fixed-log findings. A transparent concept vocabulary ranks overlap; similarity is navigation, not proof. Rich source content is read only when selected.</p>${supported ? `<form data-semantic-form><label>Investigation <input name="query" type="search" maxlength="256" value="${esc(state.semanticQuery)}" placeholder="For example: slow database connection" required></label><button class="button secondary" ${state.semanticBusy ? "disabled" : ""}>Search indexed findings</button></form><button class="button quiet" data-semantic-refresh ${state.semanticBusy ? "disabled" : ""}>Index authorized messages findings</button>` : `<p class="source-message">Native derived provider is unavailable in this deployment. No demo data replaces live search.</p>`}${state.semanticError ? `<p class="source-message">${esc(state.semanticError)}</p>` : ""}${result ? `<p class="source-message">${result.items.length} bounded results · ${esc(result.model)}</p>${result.items.map(item => `<article class="evidence-record"><strong>${esc(item.text)}</strong><small>Source ${esc(item.sourceIdentity)} · similarity ${item.similarity.toFixed(3)} · source timestamp ${esc(item.sourceTimestamp || "unobserved")}</small><p>${esc(item.evidenceRef)}</p><button class="button quiet" data-semantic-source="${esc(item.sourceIdentity)}">Inspect current source</button></article>`).join("")}${result.items.length ? `<button class="button secondary" data-semantic-interpret ${state.semanticBusy ? "disabled" : ""}>Interpret compact context</button>` : ""}` : ""}${state.semanticInterpretation ? `<p class="source-message"><strong>Deterministic local interpretation</strong> · external inference UNVERIFIED<br>${esc(state.semanticInterpretation.explanation)}</p>` : ""}</section>`;
}

async function runSemanticSearch(query, refresh = false) {
  if (!nativeMode || !state.connected || state.semanticBusy) return;
  const owner = sessionEpoch;
  state.semanticBusy = true;
  state.semanticError = "";
  state.semanticQuery = String(query).slice(0, 256);
  state.semanticInterpretation = null;
  render();
  try {
    const { mapDerivedSearch } = await import("./semantic-search.js?v=opsdeck-vector-preview-1");
    if (owner !== sessionEpoch) return;
    if (refresh) {
      const refreshed = await requestJson("/opsdeck-api/derived-refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceId: "messagesLog" }) });
      if (owner !== sessionEpoch) return;
      if (refreshed.state !== "SUPPORTED") throw new Error(`Index refresh: ${refreshed.state || "FAILED"}`);
    }
    const payload = await requestJson(`/opsdeck-api/derived-search?q=${encodeURIComponent(state.semanticQuery || "error")}`);
    if (owner !== sessionEpoch) return;
    state.semanticResult = mapDerivedSearch(payload, state.info.username);
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.semanticError = error.message;
    state.semanticResult = { state: error.status === 403 ? "DENIED" : "FAILED", model: "opsdeck-concepts-v1", items: [] };
  } finally {
    if (owner === sessionEpoch) { state.semanticBusy = false; render(); }
  }
}

async function interpretSemanticResult() {
  const owner = sessionEpoch;
  try {
    const { createContextBundle, deterministicInterpretationProvider, interpretContext } = await import("./semantic-search.js?v=opsdeck-vector-preview-1");
    if (owner !== sessionEpoch || !state.semanticResult) return;
    const identity = ProductIdentity.resolve({ irisVersion: state.info?.serverVersion, deployment: "native" });
    const result = await interpretContext(deterministicInterpretationProvider, createContextBundle(identity, state.semanticResult));
    if (owner !== sessionEpoch) return;
    state.semanticInterpretation = result;
  } catch (error) { if (owner === sessionEpoch) state.semanticError = error.message; }
  if (owner === sessionEpoch) render();
}

function currentEvidenceCollection() {
  const isDemo = state.info?.systemMode === "DEMO";
  const records = isDemo ? [{ id: "fixture:operation:application-enable", kind: "operation-receipt", state: "VERIFIED", title: "Fixture application enable", observedAt: "2026-10-02T12:00:00Z", source: { identity: "opsdeck-fixture-v1" }, resource: { key: "/opsdeck-fixture", scope: "%SYS" }, summary: "Synthetic fixture plan completed with fixture read-back; this does not qualify a live IRIS operation.", evidence: { operationId: "fixture-op-001", verification: "fixture-readback" } }] : state.verification ? [{ id: "session:applications-readback", kind: "read-observation", state: state.verification.matched ? "VERIFIED" : "FAILED", title: "Applications independent read-back", observedAt: state.verification.at, source: { identity: "iris-admin-api" }, resource: { key: "web-app-inventory", scope: "%SYS" }, summary: state.verification.matched ? `${state.verification.count} web-application identities matched the independent second read.` : "The independent second read differed from the current web-application inventory.", evidence: { matched: state.verification.matched, count: state.verification.count } }] : [];
  for (const [sourceId, observation] of Object.entries(state.sourceData)) {
    if (!observation?.observedAt) continue;
    const verification = state.sourceVerification[sourceId];
    const label = READ_ONLY_SOURCES[sourceId]?.label || 'Bounded source';
    records.push({ id: `session:source:${sourceId}`, kind: 'read-observation',
      state: verification?.matched ? 'VERIFIED' : verification ? 'FAILED' : 'PARTIAL',
      title: `${label} observation`, observedAt: observation.observedAt,
      source: { identity: observation.provider || 'iris-admin-api' }, resource: { key: sourceId },
      summary: `Observed provider state ${observation.state || 'available'}. ${verification ? 'Compared with another read.' : 'No independent verification inferred.'}`,
      evidence: { providerState: observation.state || 'available', matched: verification?.matched ?? null },
    });
  }
  for (const [sourceId, error] of Object.entries(state.sourceErrors)) records.push({
    id: `session:refusal:${sourceId}`, kind: 'refusal', state: isAuthorityDenial(error) ? 'DENIED' : 'UNAVAILABLE',
    title: `${READ_ONLY_SOURCES[sourceId]?.label || 'Source'} refused / unavailable`,
    observedAt: state.lastRead || new Date().toISOString(), source: { identity: 'iris-admin-api' }, resource: { key: sourceId },
    summary: 'The provider did not yield a usable observation. No synthetic fallback or authority inference.',
    evidence: { providerState: isAuthorityDenial(error) ? 'DENIED' : 'UNAVAILABLE' },
  });
  const audit = isDemo ? null : state.auditQuery;
  if (audit?.observedAt) {
    const states = { accepted: "UNVERIFIED", queued: "PARTIAL", running: "PARTIAL", finished: "PARTIAL", failed: "FAILED", canceled: "BLOCKED", denied: "DENIED", unavailable: "UNAVAILABLE" };
    const safeFields = ["Event", "EventSource", "Namespace", "PID", "TimeStamp", "UserName"];
    const fields = Array.isArray(audit.result) && audit.result.length
      ? Object.keys(audit.result[0]).filter((field) => safeFields.includes(field)).sort()
      : [];
    const count = Number.isInteger(audit.resultCount) && audit.resultCount >= 0 && audit.resultCount <= AUDIT_QUERY_MAX_ROWS ? audit.resultCount : null;
    const evidence = { providerState: typeof audit.state === "string" ? audit.state : "unverified", identityBasis: audit.task?.identitySource || "unverified", fields };
    if (count !== null) evidence.count = count;
    if (typeof audit.truncatedToMaxRows === "boolean") evidence.truncated = audit.truncatedToMaxRows;
    records.push({
      id: "session:audit-query",
      kind: "read-observation",
      state: states[audit.state] || "UNVERIFIED",
      title: "Bounded audit query",
      observedAt: audit.observedAt,
      source: { identity: "iris-admin-api" },
      resource: { domain: "security", kind: "audit-query", provider: "iris-admin-api", key: "bounded-audit-records", label: "Bounded audit records", observedAt: audit.observedAt },
      summary: count === null ? `Bounded audit query state: ${audit.state}.` : `Bounded audit query state: ${audit.state}; ${count} reviewed row${count === 1 ? "" : "s"} returned.`,
      evidence,
    });
  }
  for (const job of visibleJobs()) {
    const states = { ACCEPTED: "UNVERIFIED", QUEUED: "PARTIAL", RUNNING: "PARTIAL", COMPLETED: "PARTIAL", FAILED: "FAILED", CANCELED: "BLOCKED", PAUSED: "PARTIAL", DENIED: "DENIED", UNAVAILABLE: "UNAVAILABLE", AMBIGUOUS: "UNVERIFIED" };
    records.push({
      id: job.identity,
      kind: "read-observation",
      state: states[job.status] || "UNVERIFIED",
      title: "Asynchronous job observation",
      observedAt: job.updatedAt || job.acceptedAt,
      source: { identity: job.provider },
      resource: { domain: "tasks", kind: "async-job", provider: job.provider, key: job.identity, label: job.operation, observedAt: job.updatedAt || job.acceptedAt },
      summary: `${job.operation}: ${job.status}. ${job.progress || "No additional progress was returned."}`,
      evidence: { providerState: job.status, identityBasis: job.resultIdentity ? "validated-location" : "session-correlation" },
    });
  }
  const logObservations = Object.entries(state.sourceData).filter(([sourceId]) =>
    ["messagesLog", "systemMonitorLog"].includes(sourceId) || /^messagesRotation:[0-9A-F]{64}$/u.test(sourceId));
  for (const [sourceId, observation] of logObservations) {
    const analysis = observation?.analysis;
    for (const finding of analysis?.findings || []) {
      records.push({
        id: finding.id,
        kind: "read-observation",
        state: "PARTIAL",
        title: finding.title,
        observedAt: observation.observedAt,
        source: { identity: observation.provider, provider: analysis.provider },
        resource: { domain: "logs", kind: sourceId, provider: observation.provider, key: `line:${finding.lineNumber}`, label: `${analysis.source} line ${finding.lineNumber}`, observedAt: observation.observedAt },
        summary: `INFERRED: ${finding.summary} ${finding.consequence} Suggested next step: ${finding.nextAction}`,
        evidence: { providerState: analysis.status, fields: ["ruleId", "lineNumber", "marker"], identityBasis: "bounded-fixed-log-line", truncated: observation.truncated, bytesReturned: observation.bytesReturned },
      });
    }
  }
  if (state.packagePlan?.plan) {
    const plan = state.packagePlan.plan;
    records.push({ id: plan.id, kind: "operation-plan", state: "UNVERIFIED", title: plan.intent, observedAt: plan.createdAt, source: { identity: state.packagePlan.executorIdentity || "not-attached" }, resource: { key: plan.target.key, scope: plan.target.scope }, summary: "Synthetic package plan preview. No package operation was executed; live IPM execution remains unavailable.", evidence: { risk: plan.risk, capability: plan.capability.id, preStateEvidence: plan.preStateEvidence } });
  }
  for(const observation of relationshipObservations(state))records.push({id:observation.id,targetRef:observation.targetRef,kind:'read-observation',state:'PARTIAL',title:`${observation.ref.label||observation.ref.key} relationships`,observedAt:observation.observedAt,source:{identity:observation.ref.provider},resource:observation.ref,summary:`${isDemo?'Synthetic demonstration. ':''}${observation.links.length} observed relationship references; referenced entities and effective authority are not independently inferred.`,evidence:{count:observation.links.length,providerState:'observed-relationships'}});
  records.push(...state.operationEvidence);
  records.sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  return createEvidenceCollection(records, records.length ? "AVAILABLE" : "EMPTY");
}

function entityGraphPanel(collection){
  const graph=projectEntityGraph(relationshipObservations(state),collection);
  return `<section class="panel entity-graph-panel"><div class="panel-head"><div><div class="panel-kicker">CURRENT SESSION · RELATIONSHIP PROJECTION</div><h2>Entity Graph</h2></div>${badge(`${graph.edges.length} EDGE${graph.edges.length===1?'':'S'}`,'accent')}</div><p class="source-message">${esc(graph.basis)}</p>${graph.edges.length?`<div class="graph-edges">${graph.edges.map(edge=>`<article class="graph-edge"><code>${esc(edge.fromRef.label||edge.fromRef.key)}</code><strong>${esc(edge.relationship)}</strong><code>${esc(edge.toRef.label||edge.toRef.key)}</code><button class="button quiet" data-graph-evidence="${esc(edge.evidenceRef)}">Inspect Evidence · ${esc(edge.evidenceState)}</button></article>`).join('')}</div>`:'<p class="source-message">No admitted relationship edges are available. Observe application dispatch, user/role detail or task namespace relationships to expand this projection.</p>'}${graph.withheld||graph.truncated?`<p class="source-caveat">${graph.withheld} relationship inputs withheld. ${graph.truncated?'Projection bound reached; coverage is partial.':''}</p>`:''}</section>`;
}

function intelligencePanel(){
  const model=state.intelligence,operation=model.operation;
  const live=nativeMode&&state.connected&&state.info?.systemMode!=='DEMO';
  return `<section class="panel intelligence-panel"><div class="panel-head"><div><div class="panel-kicker">UNTRUSTED PROPOSAL → AUTHORITATIVE REHEARSAL</div><h2>Trusted intelligence</h2></div>${badge(live?'RECONSTRUCTION AVAILABLE':'NATIVE PROVIDER REQUIRED',live?'accent':'muted')}</div><p class="source-message">A proposal grants no authority. Current human authority, the selected AI profile and operation policy intersect before a plan can execute.</p><div class="intelligence-controls"><label>Provider<select id="intent-provider">${INTENT_PROVIDERS.map(provider=>`<option value="${esc(provider.id)}" ${model.providerId===provider.id?'selected':''} ${provider.state!=='AVAILABLE'?'disabled':''}>${esc(provider.label)}${provider.state==='UNCONFIGURED'?' · not configured':''}</option>`).join('')}</select></label><label>AI profile<select id="intent-profile">${AI_PROFILES.map(profile=>`<option value="${esc(profile)}" ${model.profileId===profile?'selected':''}>${esc(profile.replace('AI_PROFILE_','').replaceAll('_',' '))}</option>`).join('')}</select></label><label class="intent-text">Intent<input id="intent-text" maxlength="512" value="${esc(model.text)}" placeholder="inspect /app, enable /app or disable /app" /></label></div><button class="button secondary" id="intent-rehearse" ${!live||model.busy?'disabled':''}>${model.busy?'Reconstructing intent…':'Observe / Operation Rehearsal'}</button><div id="intent-output">${model.revision&&!model.busy&&!model.error&&!model.observation&&!operation?'<p role="status">Intent changed. Reconstruct the current intent again.</p>':''}${model.error?`<p role="status">${esc(model.error)}</p>`:''}${model.observation?`<p role="status">OBSERVED · ${esc(model.observation.target.key)} · ${esc(model.profileId)}</p><pre>${esc(JSON.stringify(model.observation.value,null,2))}</pre>`:''}${operation?.plan?`<p role="status">${esc(operation.state)} · ${esc(operation.profileId)}</p>${planReview(operation.plan)}${operation.state==='REVIEW_REQUIRED'?`<button class="button primary" data-webapp-confirm="${esc(operation.plan.id)}" ${state.observeOnly?'disabled title="Observe Only blocks confirmation"':''}>Confirm AI rehearsal · ${esc(operation.plan.capability.id)}</button>`:''}${operation.reason?`<p>${esc(operation.reason)}</p>`:''}`:''}</div></section>`;
}

function invalidateIntentDraft(){
  const model=state.intelligence;
  if(model.operation?.plan===state.webAppOperation?.plan)state.webAppOperation=null;
  model.revision++;model.operation=null;model.observation=null;model.error='';
  const output=app.querySelector('#intent-output');
  if(output)output.innerHTML='<p role="status">Intent changed. Reconstruct the current intent again.</p>';
  app.querySelectorAll('[data-webapp-confirm]').forEach(button=>{button.disabled=true;});
}

async function rehearseIntent(){
  const model=state.intelligence;
  if(!nativeMode||!state.connected||state.info?.systemMode==='DEMO'||model.busy||model.providerId!=='deterministic')return;
  const owner=sessionEpoch,revision=model.revision,profileId=model.profileId;
  model.busy=true;model.error='';render();
  try{
    const candidate=await deterministicIntentProvider.propose(model.text);
    if(owner!==sessionEpoch||model!==state.intelligence||revision!==model.revision)return;
    const transport=(path,options)=>{
      if(owner!==sessionEpoch||!state.connected||state.intelligence!==model||model.revision!==revision)throw new Error('Intent operation context changed.');
      return requestJson(path,options);
    };
    const operation=await reconstructIntentOperation(candidate,{profileId,username:state.info.username,targetRef:state.targetRef,requestJson:transport});
    if(owner!==sessionEpoch||model!==state.intelligence||revision!==model.revision)return;
    const observedAt=new Date().toISOString();
    if(operation.state==='OBSERVED'){
      model.observation=operation;model.operation=null;
      state.operationEvidence=[...state.operationEvidence,{id:`intent:observation:${Date.now()}`,targetRef:operation.targetRef,kind:'read-observation',state:'PARTIAL',title:`Intent observation · ${operation.target.key}`,observedAt:operation.observedAt,source:{identity:'opsdeck-intent-rehearsal-v1'},resource:operation.target,summary:`${profileId}: fresh authoritative pre-state observed; no dispatch or independent verification inferred.`,evidence:{providerState:'OBSERVED',fields:['enabled'],identityBasis:'server-reconstructed-current-iris-state'}}].slice(-64);
    }else if(operation.state==='REVIEW_REQUIRED'){
      model.operation={...operation,busy:false};model.observation=null;state.webAppOperation=model.operation;
      state.operationEvidence=[...state.operationEvidence,{id:operation.plan.id,targetRef:operation.plan.targetRef,kind:'operation-plan',state:'UNVERIFIED',title:operation.plan.intent,observedAt:operation.plan.createdAt,source:{identity:operation.provider.identity},resource:operation.plan.target,summary:`${profileId}: server-reconstructed rehearsal. Current human, profile and operation authority must be revalidated before dispatch.`,evidence:{operationId:operation.plan.id,capability:operation.plan.capability.id,risk:operation.plan.risk,authorityState:operation.plan.authorityValidation.state,preStateEvidence:operation.plan.preStateEvidence,requiresConfirmation:true,expectedReadback:operation.plan.expectedReadback}}].slice(-64);
    }else{model.error=`${operation.state}: ${operation.reason||'No executable plan admitted.'}`;}
  }catch(error){
    if(owner===sessionEpoch&&model===state.intelligence&&revision===model.revision){model.error=error.message;state.operationEvidence=[...state.operationEvidence,{id:`intent:refusal:${Date.now()}`,targetRef:state.targetRef,kind:'refusal',state:error.status===401||error.status===403?'DENIED':'UNAVAILABLE',title:'Intent reconstruction refused',observedAt:new Date().toISOString(),source:{identity:'opsdeck-intent-rehearsal-v1'},resource:{key:'intent-rehearsal'},summary:'No executable intent was admitted. No dispatch or authority expansion.',evidence:{reason:'intent-reconstruction-refused',providerState:error.status===403?'DENIED':'UNAVAILABLE'}}].slice(-64);}
  }finally{if(owner===sessionEpoch&&model===state.intelligence){model.busy=false;if(revision===model.revision)render();else{const action=app.querySelector('#intent-rehearse');if(action){action.disabled=!nativeMode||!state.connected||state.info?.systemMode==='DEMO'||model.providerId!=='deterministic';action.textContent='Observe / Operation Rehearsal';}}}}
}

function render() {
  setTheme(state.theme);
  if (fxModule && !state.fxPreference.disabled) applyCurrentFx();
  if (!state.connected) app.innerHTML = connectView();
  else if (state.route === "applications") app.innerHTML = applicationsView();
  else if (state.route === "overview") app.innerHTML = overviewView();
  else if (state.route === "evidence") app.innerHTML = evidenceView();
  else app.innerHTML = providerDomainView(state.route);
  syncDialogScope();
  bindCommandSurface();
  app.querySelector('#capability-summary-load')?.addEventListener('click',loadCapabilitySummary);
  app.querySelector('#confirmation-back')?.addEventListener('click',closeConfirmationReview);
  app.querySelector('#confirmation-final')?.addEventListener('click',completeConfirmationReview);
  app.querySelector('#intent-rehearse')?.addEventListener('click',rehearseIntent);
  app.querySelector('#intent-text')?.addEventListener('input',event=>{state.intelligence.text=event.target.value.slice(0,512);invalidateIntentDraft();});
  app.querySelector('#intent-profile')?.addEventListener('change',event=>{state.intelligence.profileId=event.target.value;invalidateIntentDraft();render();});
  app.querySelector('#intent-provider')?.addEventListener('change',event=>{state.intelligence.providerId=event.target.value;invalidateIntentDraft();render();});
  app.querySelectorAll('[data-workflow-start]').forEach(button=>button.addEventListener('click',()=>startAvailabilityWorkflow(button.dataset.workflowStart)));
  app.querySelectorAll('[data-workflow-confirm]').forEach(button=>button.addEventListener('click',()=>openConfirmationReview('workflow',button.dataset.workflowConfirm)));
  app.querySelectorAll('[data-graph-evidence]').forEach(button=>button.addEventListener('click',()=>{state.evidenceFilter=button.dataset.graphEvidence;state.route='evidence';render();}));
  app.querySelectorAll('[data-compare-targets]').forEach(button=>button.addEventListener('click',()=>compareApplicationTargets(button.dataset.compareTargets)));
  app.querySelector('#targets-close')?.addEventListener('click',()=>{state.targetCompareOpen=false;render();app.querySelector('[data-compare-targets]')?.focus();});
  app.querySelector('#target-select')?.addEventListener('change',event=>{if(event.target.value!=='local'){event.target.value='local';return;}});
  app.querySelectorAll('[data-export-projection]').forEach(button=>button.addEventListener('click',async()=>{
    const id=button.dataset.exportProjection;
    const value=id==='api'?state.apiExplorer.result?.value:id==='webApps'?state.apps:id==='packages'?state.packageInventory:state.sourceData[id];
    if (value === undefined || value === null) return;
    try {
      const {exportProjection}=await import('./export-projection.js?v=export-1');
      const format=button.dataset.format;
      const content=exportProjection(value,format==='csv'?'csv':'json');
      if(format==='copy'){await navigator.clipboard.writeText(content);button.textContent='JSON copied';return;}
      const blob=new Blob([content],{type:format==='csv'?'text/csv;charset=utf-8':'application/json'});
      const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`opsdeck-${id}.${format}`;anchor.click();URL.revokeObjectURL(url);
    }catch{button.textContent='Export unavailable or exceeds 64 KiB';}
  }));
  app.querySelector("#observe-only")?.addEventListener("click", () => { state.observeOnly = !state.observeOnly; if (typeof setObserveOnly === "function") setObserveOnly(state.observeOnly); render(); });
  app.querySelector("#fx-open")?.addEventListener("click", openFxStudio);
  app.querySelector("#fx-close")?.addEventListener("click", () => { state.fxOpen = false; render(); app.querySelector("#fx-open")?.focus(); });
  app.querySelector("#fx-remove")?.addEventListener("click", () => { fxModule?.removeFx(document.documentElement); state.fxPreference = {disabled:true}; localStorage.setItem("opsdeck.fx", JSON.stringify(state.fxPreference)); render(); });
  app.querySelectorAll("[data-fx-dimension]").forEach(control => control.addEventListener("change", async event => {
    const dimension = control.dataset.fxDimension;
    if (dimension === "base") setTheme(event.target.value);
    else if (dimension === "role") { state.fxRole = event.target.value; state.fxPreference.role = event.target.value; delete state.fxPreference.material; }
    else state.fxPreference[dimension] = event.target.value;
    state.fxPreference.disabled = false;
    localStorage.setItem("opsdeck.fx", JSON.stringify(state.fxPreference)); await refreshFx(); render(); app.querySelector(`[data-fx-dimension="${dimension}"]`)?.focus();
  }));
  app.querySelector("#theme-select")?.addEventListener("change", (event) => setTheme(event.target.value));
  app.querySelector("#mobile-more")?.addEventListener("click", () => {
    state.mobileMoreOpen = !state.mobileMoreOpen;
    app.querySelector(".sidebar")?.classList.toggle("more-open", state.mobileMoreOpen);
    app.querySelector("#mobile-more").setAttribute("aria-expanded", String(state.mobileMoreOpen));
  });
  app.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => {
    state.route = button.dataset.route;
    state.mobileMoreOpen = false;
    location.hash = state.route;
    render();
    ensureRouteSource();
  }));
  app.querySelectorAll("[data-snippet]").forEach((button) => button.addEventListener("click", async () => {
    const item = LEARNING_SNIPPETS.find(entry => entry.id === button.dataset.snippet);
    if (!item) return;
    state.selectedSnippet = item.id;
    state.snippetText = "";
    state.snippetError = "";
    state.snippetLoading = true;
    render();
    try {
      const base = nativeMode ? "/opsdeck/" : "./";
      const response = await fetch(`${base}${encodeURIComponent(item.file)}`, { headers: { Accept: "text/plain" }, cache: "force-cache" });
      if (state.selectedSnippet !== item.id) return;
      if (!response.ok) throw new Error(`Snippet text unavailable (HTTP ${response.status}).`);
      state.snippetText = (await response.text()).slice(0, 12000);
    } catch (error) {
      if (state.selectedSnippet !== item.id) return;
      state.snippetError = error.message || "Snippet text unavailable.";
    } finally {
      if (state.selectedSnippet === item.id) {
        state.snippetLoading = false;
        render();
      }
    }
  }));
  app.querySelectorAll("[data-download-snippet]").forEach((button) => button.addEventListener("click", () => {
    if (!state.snippetText || button.dataset.downloadSnippet !== state.selectedSnippet) return;
    const item = LEARNING_SNIPPETS.find(entry => entry.id === state.selectedSnippet);
    if (!item) return;
    const blob = new Blob([state.snippetText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = item.file;
    anchor.click();
    URL.revokeObjectURL(url);
  }));
  app.querySelectorAll("[data-source]").forEach((button) => button.addEventListener("click", () => {
    const route = state.route;
    state.sourceTabs[route] = button.dataset.source;
    render();
    if (button.dataset.source !== "alerts") loadSource(button.dataset.source);
  }));
  app.querySelectorAll("[data-system-section]").forEach((button) => button.addEventListener("click", () => {
    state.systemSection = button.dataset.systemSection;
    render();
  }));
  app.querySelectorAll("[data-load-alerts]").forEach((button) => button.addEventListener("click", () => loadSource("alerts", true)));
  app.querySelectorAll("[data-read-rotation]").forEach((button) => button.addEventListener("click", () => loadMessageRotation(button.dataset.readRotation)));
  app.querySelectorAll("[data-run-audit-query]").forEach((button) => button.addEventListener("click", () => runAuditQuery()));
  app.querySelectorAll("[data-application-tab]").forEach((button) => button.addEventListener("click", () => { state.applicationsTab = button.dataset.applicationTab; render(); if (button.dataset.applicationTab === "packages" && !state.packageInventory) loadPackageInventory(); }));
  app.querySelector("[data-refresh-packages]")?.addEventListener("click", () => loadPackageInventory(true));
  app.querySelector("[data-available-package-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = app.querySelector("#available-package-name")?.value?.trim() || "";
    state.availablePackageName = name;
    loadAvailablePackageCatalog(name);
  });
  app.querySelector("#package-filter")?.addEventListener("change", (event) => { state.packageFilter = event.target.value; render(); });
  app.querySelectorAll("[data-package-plan]").forEach((button) => button.addEventListener("click", () => {
    state.packagePlan = preparePackagePlan(fixturePackageInventory(), button.dataset.packageName, button.dataset.packagePlan);
    render();
  }));
  app.querySelector("#evidence-filter")?.addEventListener("input", (event) => {
    const input=event.target,focused=document.activeElement===input,start=input.selectionStart,end=input.selectionEnd;
    state.evidenceFilter=input.value.slice(0,128);render();
    if(focused){const replacement=app.querySelector('#evidence-filter');replacement?.focus();if(Number.isInteger(start)&&Number.isInteger(end))replacement?.setSelectionRange(start,end);}
  });
  app.querySelector("#evidence-state-filter")?.addEventListener("change", (event) => { state.evidenceStateFilter = event.target.value; render(); });
  app.querySelector("[data-semantic-form]")?.addEventListener("submit", (event) => { event.preventDefault(); runSemanticSearch(event.currentTarget.elements.query.value); });
  app.querySelector("[data-semantic-refresh]")?.addEventListener("click", () => runSemanticSearch(state.semanticQuery || "error", true));
  app.querySelector("[data-semantic-interpret]")?.addEventListener("click", interpretSemanticResult);
  app.querySelectorAll("[data-semantic-source]").forEach(button => button.addEventListener("click", () => { state.route = "logs"; state.sourceTabs.logs = button.dataset.semanticSource; location.hash = "logs"; render(); loadSource(button.dataset.semanticSource); }));
  app.querySelectorAll("[data-export-evidence]").forEach(button => button.addEventListener("click", async () => {
    const collection = currentEvidenceCollection();
    const records = filterEvidence(collection, state.evidenceFilter || "", state.evidenceStateFilter || "ALL");
    const format = button.dataset.exportEvidence;
    try {
      const content = format === "csv" ? exportEvidenceCSV(collection, records) : format === "markdown" ? exportEvidenceMarkdown(collection, records) : exportEvidenceJSON(collection, records);
      if (format === "copy") { await navigator.clipboard.writeText(content); button.textContent = "JSON copied"; return; }
      const blob = new Blob([content], {type: format === "csv" ? "text/csv;charset=utf-8" : format === "markdown" ? "text/markdown;charset=utf-8" : "application/json"});
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = format === "csv" ? "opsdeck-evidence.csv" : format === "markdown" ? "opsdeck-evidence.md" : "opsdeck-evidence.json";
      anchor.click(); URL.revokeObjectURL(url);
    } catch { button.textContent = "Export unavailable"; }
  }));
  app.querySelectorAll("[data-item]").forEach((row) => row.addEventListener("click", () => {
    const [sourceId, key] = row.dataset.item.split("::");
    state.selectedItems[sourceId] = key;
    render();
  }));
  app.querySelectorAll("[data-load-user-detail]").forEach((button) => button.addEventListener("click", () => loadUserDetail(button.dataset.loadUserDetail)));
  app.querySelectorAll("[data-load-role-detail]").forEach((button) => button.addEventListener("click", () => loadRoleDetail(button.dataset.loadRoleDetail)));
  app.querySelectorAll("[data-load-role-owners]").forEach((button) => button.addEventListener("click", () => loadRoleOwners(button.dataset.loadRoleOwners)));
  app.querySelectorAll("[data-load-resource-detail]").forEach((button) => button.addEventListener("click", () => loadResourceDetail(button.dataset.loadResourceDetail)));
  app.querySelectorAll("[data-load-task-detail]").forEach((button) => button.addEventListener("click", () => loadTaskDetail(button.dataset.loadTaskDetail)));
  app.querySelectorAll("[data-related-role]").forEach((button) => button.addEventListener("click", () => {
    state.route = "access";
    state.sourceTabs.access = "roles";
    state.selectedItems.roles = button.dataset.relatedRole;
    location.hash = "access";
    render();
    loadSource("roles");
  }));
  app.querySelectorAll("[data-related-resource]").forEach((button) => button.addEventListener("click", () => {
    state.route = "access";
    state.sourceTabs.access = "resources";
    state.selectedItems.resources = button.dataset.relatedResource;
    location.hash = "access";
    render();
    loadSource("resources");
  }));
  app.querySelectorAll("[data-refresh-source]").forEach((button) => button.addEventListener("click", () => loadSource(button.dataset.refreshSource, true)));
  app.querySelectorAll("[data-app]").forEach((row) => {
    const select = () => { state.selected = row.dataset.app; render(); };
    row.addEventListener("click", select);
    row.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } });
  });
  app.querySelectorAll("[data-load-webapp-detail]").forEach((button) => button.addEventListener("click", () => loadWebAppDetail(button.dataset.loadWebappDetail, true)));
  app.querySelectorAll("[data-load-rest-spec]").forEach((button) => button.addEventListener("click", () => loadRestSpec(button.dataset.loadRestSpec, true)));
  app.querySelectorAll("[data-webapp-plan]").forEach(button => button.addEventListener("click", () => prepareWebAppOperation(button.dataset.webappPlan)));
  app.querySelectorAll("[data-webapp-confirm]").forEach(button => button.addEventListener("click", () => openConfirmationReview('webapp',button.dataset.webappConfirm)));
  app.querySelectorAll("[data-live-package-plan]").forEach(button => button.addEventListener("click", () => prepareLivePackageOperation(Number(button.dataset.livePackagePlan))));
  app.querySelectorAll("[data-live-package-confirm]").forEach(button => button.addEventListener("click", () => openConfirmationReview('package',button.dataset.livePackageConfirm)));
  app.querySelector("#connect-form")?.addEventListener("submit", connect);
  app.querySelector("#disconnect-button")?.addEventListener("click", disconnect);
  app.querySelector("#refresh-button")?.addEventListener("click", () => refreshLive(true));
}

function clearSession() {
  sessionEpoch += 1;
  workflowRunner?.cancel();workflowRunner=null;
  nativeAuthorization = null;
  state.connected = false;
  state.capabilitySummaryBusy=false;state.capabilitySummaryError='';
  state.auditQuery = null;
  state.jobs = [];
  state.auditQueryBusy = false;
  state.busy = false;
  state.error = "";
  state.info = null;
  state.apps = [];
  state.appsReadAt = "";
  state.selected = "";
  state.lastRead = null;
  state.verification = null;
  state.webAppOperation = null;
  state.livePackageOperation = null;
  state.operationEvidence = [];
  state.commandOpen=false; state.commandQuery=""; state.commandApi=null; state.commandError=""; state.confirmationReview=null;
  state.apiExplorer={parameters:{},body:'{}',preview:null,result:null,operation:null,busy:false};
  state.intelligence={text:'inspect /opsdeck',profileId:'AI_PROFILE_USER',providerId:'deterministic',operation:null,observation:null,busy:false,error:'',revision:0};
  state.targetCompareOpen=false;state.targetComparison=null;state.targetCompareBusy=false;state.targetCompareError='';
  state.observeOnly=true; if (typeof setObserveOnly === "function") setObserveOnly(true);
  for (const key of [
    "sourceData", "sourceErrors", "sourceVerification", "selectedItems", "webAppDetails", "webAppDetailErrors",
    "userDetails", "userDetailErrors", "userDetailVerification", "roleDetails", "roleDetailErrors",
    "roleDetailVerification", "roleOwners", "roleOwnerErrors", "roleOwnerVerification", "resourceDetails",
    "resourceDetailErrors", "resourceDetailVerification", "taskDetails", "taskDetailErrors", "taskDetailVerification",
    "restSpecs", "restSpecErrors",
  ]) state[key] = {};
  for (const key of ["sourceLoading", "webAppDetailLoading", "userDetailLoading", "roleDetailLoading", "roleOwnerLoading", "resourceDetailLoading", "taskDetailLoading", "restSpecLoading"]) state[key] = "";
  state.sourceTabs = { applications: "restServices", access: "users", security: "walletCollections", tasks: "tasks", system: "systemUsage", logs: "auditEnabled" };
  state.applicationsTab = "web-apps";
  state.packageFilter = "all";
  state.packagePlan = null;
  state.packageInventory = null;
  state.packageInventoryError = "";
  state.packageInventoryLoading = false;
  state.availablePackageName = "";
  state.availablePackageCatalog = null;
  state.availablePackageError = "";
  state.availablePackageErrorStatus = 0;
  state.availablePackageLoading = false;
  state.evidenceFilter = "";
  state.evidenceStateFilter = "ALL";
  state.semanticQuery = "";
  state.semanticResult = null;
  state.semanticInterpretation = null;
  state.semanticBusy = false;
  state.semanticError = "";
  state.route = "overview";
  history.replaceState(null, "", "#overview");
}

function expireSession(message) {
  clearSession();
  state.error = message;
  render();
}

async function disconnect() {
  clearSession();
  render();
  if (!nativeMode) {
    try { await requestJson("/api/logout", { method: "POST" }); } catch { /* state was cleared before the remote request */ }
  }
}

async function connect(event) {
  clearSession();
  const owner = sessionEpoch;
  event.preventDefault();
  const form = event.currentTarget;
  const passwordInput = form.elements.password;
  state.busy = true;
  state.error = "";
  render();
  try {
    if (nativeMode) {
      const username = form.elements.username.value.trim();
      const password = passwordInput.value;
      const bytes = new TextEncoder().encode(`${username}:${password}`);
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      nativeAuthorization = `Basic ${btoa(binary)}`;
      passwordInput.value = "";
      state.sourceData = {};
      state.sourceErrors = {};
      state.webAppDetails = {};
      state.webAppDetailErrors = {};
      state.restSpecs = {};
      state.restSpecErrors = {};
      state.connected = true;
      state.route = "overview";
      history.replaceState(null, "", "#overview");
      state.busy = false;
      render();
      await refreshLive(true);
      if (owner !== sessionEpoch) return;
      if (state.connected) ensureRouteSource();
      return;
    }
    const body = {
      username: form.elements.username.value.trim(),
      password: passwordInput.value,
    };
    passwordInput.value = "";
    const result = await requestJson("/api/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (owner !== sessionEpoch) return;
    passwordInput.value = "";
    state.sourceData = {};
    state.sourceErrors = {};
    state.webAppDetails = {};
    state.webAppDetailErrors = {};
    state.restSpecs = {};
    state.restSpecErrors = {};
    state.connected = true;
    // /api/connect validates and maps the observed info envelope server-side.
    state.info = result.info;
    state.route = "overview";
    history.replaceState(null, "", "#overview");
    state.busy = false;
    render();
    await refreshLive(true);
    if (owner !== sessionEpoch) return;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    passwordInput.value = "";
    expireSession(error.message);
    document.querySelector("#username")?.focus();
  }
}

async function apiPayload(path) {
  return requestJson(nativeMode ? nativeApiPath(path) : path);
}

async function readJson(path) {
  return requestJson(nativeMode ? nativeApiPath(path) : path);
}

function nativeApiPath(path) {
  if (path.startsWith("/api/read/")) {
    const url = new URL(path, location.origin || "http://localhost");
    const route = url.pathname.slice("/api/read/".length);
    const source = READ_ONLY_SOURCES[route];
    if (source && route !== "availablePackages") return source.path;
    if (route === "availablePackages") {
      const names = url.searchParams.getAll("name");
      if (names.length !== 1 || [...url.searchParams.keys()].some((key) => key !== "name") || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u.test(names[0])) {
        throw new Error("Enter one exact package identity for catalog lookup.");
      }
      return `${source.path}?name=${encodeURIComponent(names[0])}`;
    }
    if (route === "packages") return "/opsdeck-api/packages";
    const details = {
      webAppDetail: ["/api/admin/v2/web-app", "name"],
      userDetail: ["/api/admin/v2/security/user", "name"],
      roleDetail: ["/api/admin/v2/security/role", "name"],
      roleOwners: ["/api/admin/v2/security/role/owners", "name"],
      resourceDetail: ["/api/admin/v2/security/resource", "name"],
      taskDetail: ["/api/admin/v2/task", "id"],
    }[route];
    if (details) return `${details[0]}?${details[1]}=${encodeURIComponent(url.searchParams.get(details[1]) || "")}${route === "roleOwners" ? `&maxRows=${encodeURIComponent(url.searchParams.get("maxRows") || "20")}` : ""}`;
    if (route === "restServiceSpec") {
      const sourceId = url.searchParams.get("source");
      const name = url.searchParams.get("name");
      const namespace = url.searchParams.get("namespace");
      const service = uniqueRecord(state.sourceData[sourceId]?.items, (item) => item.ref.key === name && item.ref.scope === namespace);
      if (!service || typeof service.values.swaggerSpec !== "string") throw new Error("IRIS did not publish a specification for this discovered service.");
      const origin = location.origin || "http://localhost";
      const spec = new URL(service.values.swaggerSpec, origin);
      if (spec.origin !== origin || !spec.pathname.startsWith("/api/mgmnt/")) throw new Error("IRIS returned a specification URL outside the same-origin management API.");
      return spec.pathname;
    }
    throw new Error("This native IRIS read route is not enabled.");
  }
  return path;
}

async function refreshLive(compareReadback) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  state.busy = true;
  state.error = "";
  state.verification = null;
  try {
    state.appsReadAt = "";
    render();
    const infoPayload = await apiPayload("/api/admin/info");
    if (owner !== sessionEpoch) return;
    state.info = mapServerInfo(infoPayload);
    const listPayload = await apiPayload("/api/admin/v2/web-apps");
    if (owner !== sessionEpoch) return;
    state.apps = mapWebApps(listPayload);
    state.appsReadAt = new Date().toISOString();
    state.lastRead = state.appsReadAt;
    if (!state.selected || !state.apps.some((item, index) => recordHandle(state.apps, index) === state.selected)) {
      state.selected = state.apps.length ? recordHandle(state.apps, 0) : "";
    }
    render();

    if (compareReadback) {
      const firstRead = state.apps;
      const secondPayload = await apiPayload("/api/admin/v2/web-apps");
    if (owner !== sessionEpoch) return;
      const secondRead = mapWebApps(secondPayload);
      state.verification = {
        matched: sameWebAppState(firstRead, secondRead),
        count: firstRead.length,
        at: new Date().toISOString(),
      };
      state.lastRead = state.verification.at;
    }
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.error = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) {
      expireSession(error.message);
    }
  } finally {
    if (owner !== sessionEpoch) return;
    state.busy = false;
    render();
  }
}

async function loadSource(sourceId, force = false) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (!force && (state.sourceData[sourceId] || state.sourceErrors[sourceId])) return;
  state.sourceLoading = sourceId;
  delete state.sourceErrors[sourceId];
  render();
  try {
    const payload = await readJson(`/api/read/${sourceId}`);
    if (owner !== sessionEpoch) return;
    const previous = state.sourceData[sourceId];
    const current = mapReadOnlySource(sourceId, payload);
    state.sourceData[sourceId] = current;
    if (previous && sourceId !== "alerts") state.sourceVerification[sourceId] = {
      matched: sameReadOnlySource(previous, current),
      at: current.observedAt,
    };
    delete state.sourceErrors[sourceId];
    state.lastRead = state.sourceData[sourceId].observedAt;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.sourceErrors[sourceId] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) {
      expireSession(error.message);
    }
  } finally {
    if (owner !== sessionEpoch) return;
    state.sourceLoading = "";
    render();
  }
}

async function loadMessageRotation(identity) {
  if (!state.connected || !/^messagesRotation:[0-9A-F]{64}$/u.test(identity) || state.rotationLoading) return;
  const owner = sessionEpoch;
  state.rotationLoading = identity;
  render();
  try {
    const payload = await readJson(`/api/read/messageRotation?id=${encodeURIComponent(identity)}`);
    if (owner !== sessionEpoch) return;
    state.sourceData[identity] = mapReadOnlySource(identity, payload);
    state.selectedRotation = identity;
    state.lastRead = state.sourceData[identity].observedAt;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.sourceErrors[identity] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) expireSession(error.message);
  } finally {
    if (owner !== sessionEpoch) return;
    state.rotationLoading = "";
    render();
  }
}

async function loadPackageInventory(force = false) {
  if (!state.connected || (state.packageInventoryLoading && !force)) return;
  const owner = sessionEpoch;
  state.packageInventoryLoading = true;
  state.packageInventoryError = "";
  render();
  try {
    const payload = await readJson("/api/read/packages");
    if (owner !== sessionEpoch) return;
    state.packageInventory = mapInstalledPackageInventory(payload);
    state.lastRead = new Date().toISOString();
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.packageInventoryError = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) expireSession(error.message);
  } finally {
    if (owner !== sessionEpoch) return;
    state.packageInventoryLoading = false;
    render();
  }
}

async function loadAvailablePackageCatalog(name) {
  if (!state.connected || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u.test(name) || state.availablePackageLoading) return;
  const owner = sessionEpoch;
  state.availablePackageLoading = true;
  state.availablePackageError = "";
  state.availablePackageErrorStatus = 0;
  state.availablePackageCatalog = null;
  render();
  try {
    const query = new URLSearchParams({ name });
    const payload = await readJson(`/api/read/availablePackages?${query}`);
    if (owner !== sessionEpoch) return;
    state.availablePackageCatalog = mapAvailablePackageCatalog(payload);
    state.lastRead = new Date().toISOString();
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.availablePackageError = error.message;
    state.availablePackageErrorStatus = Number(error.status) || 0;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) expireSession(error.message);
  } finally {
    if (owner !== sessionEpoch) return;
    state.availablePackageLoading = false;
    render();
  }
}

async function runAuditQuery() {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (state.auditQueryBusy || !state.info?.username) return;
  let stage = "submit";
  let httpStatus = null;
  let currentTask = null;
  let locationShape = null;
  let jobIdentity = null;
  let resultIdentity = null;
  const observedAt = new Date().toISOString();
  const publishAuditQuery = (query) => {
    const fullQuery = { ...query, observedAt };
    if (fullQuery.jobIdentity) jobIdentity = fullQuery.jobIdentity;
    else if (jobIdentity) fullQuery.jobIdentity = jobIdentity;
    if (fullQuery.resultIdentity) resultIdentity = fullQuery.resultIdentity;
    else if (resultIdentity) fullQuery.resultIdentity = resultIdentity;
    state.auditQuery = fullQuery;
    if (fullQuery.jobIdentity) {
      try { state.jobs = upsertJob(state.jobs, mapAuditJob(fullQuery, state.jobs.find(job => job.identity === fullQuery.jobIdentity))); } catch { /* keep the source observation visible if its Job projection is incomplete */ }
    }
  };
  state.auditQueryBusy = true;
  publishAuditQuery({ state: "accepted", message: "Submitting one filtered query for the current account, bounded to maxRows=1." });
  render();
  try {
    const now = Date.now();
    const query = new URLSearchParams({
      usernames: state.info.username,
      beginDateTime: new Date(now - 10 * 60 * 1000).toISOString(),
      endDateTime: new Date(now).toISOString(),
      maxRows: String(AUDIT_QUERY_MAX_ROWS),
    });
    const headers = { Accept: "application/json" };
    if (nativeMode && nativeAuthorization) headers.Authorization = nativeAuthorization;
    const response = await fetch(`/api/admin/v2/security/audit/records?${query}`, {
      method: "POST", cache: "no-store", credentials: "same-origin", headers,
      signal: AbortSignal.timeout(20000),
    });
    if (owner !== sessionEpoch) return;
    if (response.status === 401) { clearSession(); state.error = "Authentication failed (HTTP 401). Sign in again."; render(); return; }
    httpStatus = response.status;
    if (response.status === 401 || response.status === 403) {
      publishAuditQuery({ state: "denied", stage, httpStatus, message: `IRIS denied the bounded audit query (HTTP ${response.status}).` });
      return;
    }
    if (response.status !== 202) {
      publishAuditQuery({ state: "unavailable", stage, httpStatus, message: `Audit query handoff was unavailable (HTTP ${response.status}).` });
      return;
    }
    stage = "validate Location";
    locationShape = inspectAuditLocation(response.headers.get("Location"), location.href);
    jobIdentity = `session:audit-job:${observedAt}`;
    publishAuditQuery({ state: "accepted", stage, httpStatus, locationShape, jobIdentity, message: "IRIS accepted the query (HTTP 202). Validating the returned Location." });
    render();
    const handle = validateAuditLocation(response.headers.get("Location"), location.href);
    resultIdentity = handle;
    currentTask = { idVerified: true };
    stage = "async result read";
    publishAuditQuery({ state: "queued", stage, httpStatus, locationShape, jobIdentity, resultIdentity: handle, message: "IRIS accepted the query. Reading the exact same-origin async resource from Location.", task: currentTask });
    render();
    const deadline = Date.now() + 30000;
    for (let attempt = 0; attempt < 40 && Date.now() < deadline; attempt += 1) {
      const payload = await requestJson(handle.url, { redirect: "error", signal: AbortSignal.timeout(Math.min(5000, Math.max(1, deadline - Date.now()))) });
    if (owner !== sessionEpoch) return;
      httpStatus = 200;
      stage = "async task contract";
      const mapped = mapAuditAsyncResult(payload, handle);
      currentTask = mapped.task;
      const taskState = mapped.task.state.toLowerCase();
      if (taskState === "queued" || taskState === "running") {
        publishAuditQuery({
          state: taskState, stage, httpStatus, locationShape, jobIdentity, resultIdentity: handle, message: taskState === "queued" ? "Async task is queued; waiting for a live state update." : "Async task is running; waiting for a terminal state.",
          task: mapped.task,
        });
        render();
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (owner !== sessionEpoch) return;
        continue;
      }
      if (taskState === "finished") {
        publishAuditQuery({ state: "finished", stage, httpStatus, locationShape, jobIdentity, resultIdentity: handle, message: "Async task finished. Only the bounded Result and reviewed fields are shown.", ...mapped });
      } else if (taskState === "failed") {
        publishAuditQuery({ state: "failed", stage, httpStatus, locationShape, jobIdentity, resultIdentity: handle, message: "Async audit query failed.", task: mapped.task, failure: "IRIS reported a task failure." });
      } else if (taskState === "canceled") {
        publishAuditQuery({ state: "canceled", stage, httpStatus, locationShape, jobIdentity, resultIdentity: handle, message: "Async audit query was canceled by IRIS.", task: mapped.task });
      } else {
        publishAuditQuery({ state: "unavailable", stage, httpStatus, locationShape, jobIdentity, resultIdentity: handle, message: "Async task is paused; no completion is inferred.", task: mapped.task });
      }
      return;
    }
    publishAuditQuery({ state: "unavailable", jobIdentity, resultIdentity, message: "Async task remained nonterminal during the bounded wait. No completion is inferred.", task: state.auditQuery?.task });
  } catch (error) {
    if (owner !== sessionEpoch) return;
    const denied = error.status === 401 || error.status === 403;
    const ambiguous = httpStatus === 202 && ["validate Location", "async result read", "async task contract"].includes(stage);
    publishAuditQuery({
      state: denied ? "denied" : ambiguous ? "ambiguous" : "unavailable",
      message: denied ? `IRIS denied the async audit read (HTTP ${error.status}).` : ambiguous ? "IRIS accepted the query, but its async identity or result could not be verified. No retry was attempted." : "Audit query or async result is unavailable.",
      stage,
      httpStatus: error.status || httpStatus,
      task: currentTask,
      locationShape,
      failure: ["validate Location", "async task contract"].includes(stage) ? error.message : "The request did not produce a usable async result.",
    });
  } finally {
    if (owner !== sessionEpoch) return;
    state.auditQueryBusy = false;
    render();
  }
}

async function loadWebAppDetail(name, force = false) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (!force && (state.webAppDetails[name] || state.webAppDetailErrors[name])) return;
  const selected = uniqueRecord(state.apps, (item) => item.name === name);
  if (!selected) return;
  state.webAppDetailLoading = name;
  delete state.webAppDetailErrors[name];
  render();
  try {
    const payload = await readJson(`/api/read/webAppDetail?name=${encodeURIComponent(selected.name)}`);
    if (owner !== sessionEpoch) return;
    state.webAppDetails[name] = mapWebAppDetail(payload, selected);
    state.lastRead = state.webAppDetails[name].ref.observedAt;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.webAppDetailErrors[name] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) {
      expireSession(error.message);
    }
  } finally {
    if (owner !== sessionEpoch) return;
    state.webAppDetailLoading = "";
    render();
  }
}

async function loadUserDetail(name) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (state.userDetailLoading) return;
  const selected = uniqueRecord(state.sourceData.users?.items, (item) => item.ref.key === name);
  if (!selected) return;
  const previous = state.userDetails[name];
  state.userDetailLoading = name;
  delete state.userDetailErrors[name];
  render();
  try {
    const payload = await readJson(`/api/read/userDetail?name=${encodeURIComponent(selected.ref.key)}`);
    if (owner !== sessionEpoch) return;
    const detail = mapSecurityUserDetail(payload, selected);
    state.userDetails[name] = detail;
    if (previous) state.userDetailVerification[name] = {
      matched: sameSecurityUserRelationships(previous, detail),
      at: detail.ref.observedAt,
    };
    state.lastRead = detail.ref.observedAt;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.userDetailErrors[name] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) {
      expireSession(error.message);
    }
  } finally {
    if (owner !== sessionEpoch) return;
    state.userDetailLoading = "";
    render();
  }
}

async function loadRoleDetail(name) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (state.roleDetailLoading) return;
  const selected = uniqueRecord(state.sourceData.roles?.items, (item) => item.ref.key === name);
  if (!selected) return;
  const previous = state.roleDetails[name];
  state.roleDetailLoading = name;
  delete state.roleDetailErrors[name];
  render();
  try {
    const payload = await readJson(`/api/read/roleDetail?name=${encodeURIComponent(selected.ref.key)}`);
    if (owner !== sessionEpoch) return;
    const detail = mapSecurityRoleDetail(payload, selected);
    state.roleDetails[name] = detail;
    if (previous) state.roleDetailVerification[name] = { matched: sameSecurityRoleDetail(previous, detail), at: detail.ref.observedAt };
    state.lastRead = detail.ref.observedAt;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.roleDetailErrors[name] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) { expireSession(error.message); }
  } finally {
    if (owner !== sessionEpoch) return;
    state.roleDetailLoading = "";
    render();
  }
}

async function loadRoleOwners(name) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (state.roleOwnerLoading) return;
  const selected = uniqueRecord(state.sourceData.roles?.items, (item) => item.ref.key === name);
  if (!selected) return;
  const previous = state.roleOwners[name];
  state.roleOwnerLoading = name;
  delete state.roleOwnerErrors[name];
  render();
  try {
    const query = new URLSearchParams({ name: selected.ref.key, maxRows: "20" });
    const payload = await readJson(`/api/read/roleOwners?${query}`);
    if (owner !== sessionEpoch) return;
    const owners = mapSecurityRoleOwners(payload, selected);
    state.roleOwners[name] = owners;
    if (previous) state.roleOwnerVerification[name] = { matched: sameSecurityRoleOwners(previous, owners), at: new Date().toISOString() };
    state.lastRead = new Date().toISOString();
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.roleOwnerErrors[name] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) { expireSession(error.message); }
  } finally {
    if (owner !== sessionEpoch) return;
    state.roleOwnerLoading = "";
    render();
  }
}

async function loadResourceDetail(name) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (state.resourceDetailLoading) return;
  const selected = uniqueRecord(state.sourceData.resources?.items, (item) => item.ref.key === name);
  if (!selected) return;
  const previous = state.resourceDetails[name];
  state.resourceDetailLoading = name;
  delete state.resourceDetailErrors[name];
  render();
  try {
    const payload = await readJson(`/api/read/resourceDetail?name=${encodeURIComponent(selected.ref.key)}`);
    if (owner !== sessionEpoch) return;
    const detail = mapSecurityResourceDetail(payload, selected);
    state.resourceDetails[name] = detail;
    if (previous) state.resourceDetailVerification[name] = { matched: sameSecurityResourceDetail(previous, detail), at: detail.ref.observedAt };
    state.lastRead = detail.ref.observedAt;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.resourceDetailErrors[name] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) { expireSession(error.message); }
  } finally {
    if (owner !== sessionEpoch) return;
    state.resourceDetailLoading = "";
    render();
  }
}

async function loadTaskDetail(id) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (state.taskDetailLoading) return;
  const selected = uniqueRecord(state.sourceData.tasks?.items, (item) => item.ref.key === id);
  if (!selected) return;
  const previous = state.taskDetails[id];
  state.taskDetailLoading = id;
  delete state.taskDetailErrors[id];
  render();
  try {
    const payload = await readJson(`/api/read/taskDetail?id=${encodeURIComponent(id)}`);
    if (owner !== sessionEpoch) return;
    const detail = mapTaskDetail(payload, selected);
    state.taskDetails[id] = detail;
    if (previous) state.taskDetailVerification[id] = { matched: sameTaskDetail(previous, detail), at: detail.ref.observedAt };
    state.lastRead = detail.ref.observedAt;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.taskDetailErrors[id] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) { expireSession(error.message); }
  } finally {
    if (owner !== sessionEpoch) return;
    state.taskDetailLoading = "";
    render();
  }
}

async function loadRestSpec(specKey, force = false) {
  if (!state.connected) return;
  const owner = sessionEpoch;
  if (!force && (state.restSpecs[specKey] || state.restSpecErrors[specKey])) return;
  const [sourceId, name, namespace] = JSON.parse(specKey);
  const service = uniqueRecord(state.sourceData[sourceId]?.items, (item) => item.ref.key === name && item.ref.scope === namespace);
  if (!service) return;
  state.restSpecLoading = specKey;
  delete state.restSpecErrors[specKey];
  render();
  try {
    const query = new URLSearchParams({ source: sourceId, name, namespace });
    const payload = await readJson(`/api/read/restServiceSpec?${query}`);
    if (owner !== sessionEpoch) return;
    state.restSpecs[specKey] = mapRestServiceSpec(payload, service.ref);
    state.lastRead = state.restSpecs[specKey].ref.observedAt;
  } catch (error) {
    if (owner !== sessionEpoch) return;
    state.restSpecErrors[specKey] = error.message;
    if (error.status === 401 || /connect to IRIS|session|credentials|authentication/i.test(error.message)) {
      expireSession(error.message);
    }
  } finally {
    if (owner !== sessionEpoch) return;
    state.restSpecLoading = "";
    render();
  }
}

function ensureRouteSource() {
  const route = state.route;
  if (route === "applications" || domainSources[route]) {
    const sourceId = state.sourceTabs[route] || domainSources[route]?.[0];
    if (sourceId) loadSource(sourceId);
  }
}

async function restoreSession() {
  const owner = sessionEpoch;
  if (nativeMode) {
    state.connected = false;
    state.busy = false;
    render();
    return;
  }
  try {
    await requestJson("/api/session");
    if (owner !== sessionEpoch) return;
    state.connected = true;
    await refreshLive(true);
    if (owner !== sessionEpoch) return;
    ensureRouteSource();
  } catch {
    if (owner !== sessionEpoch) return;
    clearSession();
    render();
  }
}

addEventListener("hashchange", () => {
  const route = location.hash.slice(1);
  if (navItems.some(([item]) => item === route)) {
    state.route = route;
    // The active route is promoted into the visible primary set by the projection.
    state.mobileMoreOpen = false;
  }
  render();
  ensureRouteSource();
});
const compactNavigationQuery = matchMedia("(max-width: 980px)");
compactNavigationQuery.addEventListener("change", (event) => {
  if (!event.matches) state.mobileMoreOpen = false;
  render();
});
matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => { if (state.theme === "system") setTheme("system"); });
matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => { if (fxModule) applyCurrentFx(); });

if (typeof setObserveOnly === "function") setObserveOnly(state.observeOnly);
if (typeof configureCurrentTarget === 'function') configureCurrentTarget(state.targetRef);
if (!state.fxPreference.disabled) refreshFx();

addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); state.commandOpen ? closeCommands() : openCommands(); return; }
  const dialog=app.querySelector('[role="dialog"]');
  if(!dialog)return;
  if(event.key==='Escape'){
    event.preventDefault();
    if(state.confirmationReview){closeConfirmationReview();return;}
    const trigger=state.commandOpen?'#command-open':state.fxOpen?'#fx-open':'[data-compare-targets]';
    activateDialog(null);render();app.querySelector(trigger)?.focus();return;
  }
  const controls=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],summary')].filter(element=>element.getClientRects().length);
  if(state.commandOpen&&!state.commandApi&&(event.key==='ArrowDown'||event.key==='ArrowUp')){
    const buttons=controls.filter(item=>item.dataset?.commandResult!==undefined);
    if(buttons.length){event.preventDefault();const step=event.key==='ArrowDown'?1:-1,index=buttons.indexOf(document.activeElement);buttons[(index+step+buttons.length)%buttons.length]?.focus();}return;
  }
  if(event.key==='Tab'){
    const first=controls[0],last=controls.at(-1);
    if(!controls.includes(document.activeElement)){event.preventDefault();(event.shiftKey?last:first)?.focus();}
    else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
});

setTheme(state.theme);
render();
restoreSession();
