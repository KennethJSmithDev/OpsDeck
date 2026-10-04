import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { READ_ONLY_SOURCES } from '../src/iris-provider.js';
import { OPERATION_POLICIES } from '../public/operation-engine.js';
import {isGenericReadable} from '../public/sysadmin-explorer.js';
import {createMetadataMutationProvider} from '../public/metadata-mutations.js';
import {buildDeclaredCatalog} from './sysadmin-catalog.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
export async function buildInventory() {
  const [specText, app, provider, engine, routes, evidenceText, competitorsText, generic, metadataAdapter] = await Promise.all([
    read('metadata/sysadmin-v2.json'), read('public/app.js'), read('src/iris-provider.js'),
    read('public/operation-engine.js'), read('src/OpsDeck/Product/FixedLogREST.cls'),
    read('metadata/qualification-witnesses.json'), read('metadata/competitor-claims.json'),
    read('public/sysadmin-explorer.js'), read('public/metadata-mutations.js'),
  ]);
  const spec = JSON.parse(specText), witnesses = JSON.parse(evidenceText);
  let mutationWitnessText;
  try{mutationWitnessText=await read('metadata/mutation-qualification-witnesses.json');}catch(error){if(error.code!=='ENOENT')throw error;}
  if(mutationWitnessText){
    const mutationWitnesses=JSON.parse(mutationWitnessText);
    if(mutationWitnesses.schema!=='opsdeck-mutation-qualification-witnesses-v1'||!Array.isArray(mutationWitnesses.operations)||!Array.isArray(mutationWitnesses.workflows))throw new Error('Mutation witness contract invalid.');
    witnesses.operations.push(...mutationWitnesses.operations);witnesses.workflows.push(...mutationWitnesses.workflows);
  }
  const readerArtifacts=[];
  for(const path of ['docs/evidence/phase9-generic-readers.json','docs/evidence/phase9-named-readers.json','docs/evidence/phase9-entity-readers.json','docs/evidence/phase9-configuration-readers.json','docs/evidence/phase9-percent-access-readers.json']){
    let readerArtifactText;try{readerArtifactText=await read(path);}catch(error){if(error.code!=='ENOENT')throw error;}
    if(!readerArtifactText)continue;
    readerArtifacts.push({path,text:readerArtifactText});
    const artifact=JSON.parse(readerArtifactText);
    if(artifact.schema!=='opsdeck-generic-reader-runtime-v1'||artifact.target!=='OPSDECK_08_TEST_TARGET'||artifact.identity!=='OpsDeckQualify'||artifact.specSha256!==hash(specText)||artifact.dispatchCount!==0||artifact.permissionChanges!==0||!Array.isArray(artifact.records))throw new Error('Generic reader witness boundary invalid.');
    for(const record of artifact.records){
      if(record.method!=='GET'||record.operation!==`GET ${record.path}`)throw new Error('Generic read witness is not a canonical read.');
      witnesses.operations.push({operation:record.operation,observed:record.status===200&&['OBSERVED','EMPTY'].includes(record.state),reproduced:false,independentlyVerified:false,
        scope:`${artifact.observedAt}; ${artifact.target}; ${artifact.identity}; ${record.state}; bounded response only`,artifact:path,artifactSha256:hash(readerArtifactText),readerSha256:artifact.readerSha256});
    }
  }
  for(const readbackPath of ['docs/evidence/phase9-semantic-readbacks.json','docs/evidence/phase9-owner-readbacks.json','docs/evidence/phase9-additional-readbacks.json','docs/evidence/phase9-generic-readbacks.json']){
  let readbackText;try{readbackText=await read(readbackPath);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(readbackText){
    const artifact=JSON.parse(readbackText);readerArtifacts.push({path:readbackPath,text:readbackText});
    const genericReadback=readbackPath.endsWith('/phase9-generic-readbacks.json');
    if(artifact.schema!==(genericReadback?'opsdeck-generic-readback-runtime-v1':'opsdeck-semantic-readback-runtime-v1')||artifact.target!=='OPSDECK_08_TEST_TARGET'||artifact.identity!=='OpsDeckQualify'||artifact.specSha256!==hash(specText)||artifact.dispatchCount!==0||artifact.permissionChanges!==0||!Array.isArray(artifact.records)||genericReadback&&artifact.readerSha256!==hash(generic))throw new Error('Semantic read-back witness boundary invalid.');
    for(const record of artifact.records){
      if(!record.operation.startsWith('GET /api/admin/v2/')||!Array.isArray(record.statuses))throw new Error('Read-back witness is not a canonical read.');
      const observed=record.statuses.length===2&&record.statuses.every(status=>status===200)&&typeof record.empty==='boolean';
      const matched=observed&&record.state==='VERIFIED'&&record.matched===true&&(!genericReadback||record.projectionQualified===true);
      witnesses.operations.push({operation:record.operation,observed,reproduced:matched,independentlyVerified:matched,
        scope:`${artifact.observedAt}; ${artifact.target}; ${artifact.identity}; separate HTTP read-back agreement only; ${record.scope}`,artifact:readbackPath,artifactSha256:hash(readbackText),providerSha256:artifact.providerSha256,readerSha256:artifact.readerSha256});
    }
  }
  }
  const exposure = new Map(),mutationScopes=new Map();
  const add = (method, path, socket) => {
    const id = `${method} ${path}`;
    exposure.set(id, [...new Set([...(exposure.get(id) || []), socket])]);
  };
  for (const [id, source] of Object.entries(READ_ONLY_SOURCES)) add('GET', source.path, `source:${id}`);
  // Extract the native detail transport table, rather than counting UI prose.
  for (const match of app.matchAll(/(\w+): \["(\/api\/admin\/[^"?]+)", "(\w+)"\]/gu)) add('GET', match[2], `detail:${match[1]}`);
  for (const match of app.matchAll(/apiPayload\("(\/api\/admin\/[^"?]+)"\)/gu)) add('GET', match[1], 'native:identity-and-overview');
  for (const [capabilityId,policy] of Object.entries(OPERATION_POLICIES)) {
    if(capabilityId.startsWith('sysadmin.metadata.')||capabilityId.startsWith('sysadmin.auditEvent.')){
      const adapter=createMetadataMutationProvider({familyId:capabilityId.startsWith('sysadmin.auditEvent.')?'auditEvent':capabilityId.split('.')[2],action:capabilityId.startsWith('sysadmin.auditEvent.')?capabilityId.split('.')[2]:'description',username:'inventory',requestJson:async()=>{throw new Error('Inventory cannot dispatch');}});
      if(!['readPreState','checkAuthority','dispatch','readBack','verifyReadback'].every(method=>typeof adapter[method]==='function'))throw new Error('Mutation adapter incomplete.');
      if(!witnesses.workflows.some(proof=>proof.capability===capabilityId&&proof.verified===true))continue;
      const scope=mutationScopes.get(policy.providerOperation)||{fields:[],existingOnly:true,qualification:'Native reversible fixture effect and restoration; named observed guards only'};
      const field=capabilityId.startsWith('sysadmin.auditEvent.')?'Enabled (OpsDeckFixture source only)':'Description';if(!scope.fields.includes(field))scope.fields.push(field);mutationScopes.set(policy.providerOperation,scope);
    }
    const match = /^(GET|POST|PUT|DELETE) (\/\S+)$/u.exec(policy.providerOperation);
    if (match) add(match[1], match[2], `policy:${policy.semanticAction}`);
  }
  if (/fetch\(`\/api\/admin\/v2\/security\/audit\/records\?/u.test(app)) add('POST', '/api/admin/v2/security/audit/records', 'bounded-audit-query');
  for (const match of provider.matchAll(/"(\/api\/admin\/v[12]\/async-result)":/gu)) add('GET', match[1], 'validated-audit-handoff');
  for (const match of routes.matchAll(/<Route Url="([^"]+)" Method="([^"]+)" Call="([^"]+)"/gu)) add(match[2], `/opsdeck-api${match[1]}`, `native:${match[3]}`);
  const operations = [];
  for (const [path, item] of Object.entries(spec.paths)) for (const [verb, contract] of Object.entries(item)) {
    if (!['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(verb)) continue;
    const method = verb.toUpperCase(), fullPath = `/api/admin${path}`, id = `${method} ${fullPath}`;
    const parameters=[...(item.parameters||[]),...(contract.parameters||[])].map(p=>p.$ref?spec.components.parameters[p.$ref.split('/').at(-1)]:p);
    if(isGenericReadable({method,path:fullPath,parameters}))add(method,fullPath,'generic:sysadmin-v2-bounded-reader-v1');
    const proof = witnesses.operations.filter(x => x.operation === id);
    operations.push({ id, method, path: fullPath, tags: contract.tags || [], summary: contract.summary || '',
      declared: true, exposed: exposure.has(id), ...(mutationScopes.has(id)?{mutationScope:mutationScopes.get(id)}:{}), sockets: exposure.get(id) || [],
      observed: proof.some(x => x.observed), reproduced: proof.some(x => x.reproduced),
      independentlyVerified: proof.some(x => x.independentlyVerified), mutable: method !== 'GET',
      evidence: proof, gap: exposure.has(id) ? proof.some(x => x.independentlyVerified) ? 'qualified-at-recorded-scope' : 'runtime-qualification' : 'provider-adapter',
    });
  }
  operations.sort((a,b) => a.id.localeCompare(b.id));
  const declared = new Set(operations.map(x => x.id));
  const supplemental = [...exposure].filter(([id]) => !declared.has(id)).map(([id, sockets]) => ({ id, sockets, declared: false,
    evidence: witnesses.operations.filter(x => x.operation === id) }));
  for (const proof of witnesses.operations) if (!exposure.has(proof.operation)) throw new Error(`Evidence names an unexposed operation: ${proof.operation}`);
  const workflows = Object.entries(OPERATION_POLICIES).filter(([id]) => !id.startsWith('ipm.package.')).map(([id, policy]) => ({
    id, operation: policy.providerOperation, mutable: policy.risk !== 'READ',
    evidence: witnesses.workflows.filter(x => x.capability === id),
    qualified: witnesses.workflows.some(x => x.capability === id && x.verified),
  }));
  const counts = Object.fromEntries(['declared','exposed','observed','reproduced','independentlyVerified','mutable'].map(key => [key, operations.filter(x => x[key]).length]));
  counts.qualifiedMutationWorkflows = workflows.filter(x => x.qualified).length;
  counts.exposedMutableOperations = operations.filter(x => x.exposed && x.mutable).length;
  return { schema: 'opsdeck-capability-inventory-v1', unit: 'HTTP method + canonical SysAdmin v2 path; workflow variants counted separately',
    spec: { url: 'https://raw.githubusercontent.com/intersystems-community/sysadmin-api-specification/master/mainspec_v2.json', sha256: hash(specText) },
    sourceHashes: { app: hash(app), provider: hash(provider), engine: hash(engine), generic:hash(generic), metadataAdapter:hash(metadataAdapter), nativeRoutes: hash(routes), witnesses: hash(evidenceText),...(mutationWitnessText?{mutationWitnesses:hash(mutationWitnessText)}:{}),...Object.fromEntries(readerArtifacts.map(artifact=>[artifact.path,hash(artifact.text)])) },
    qualificationBoundary: 'Recorded identities and targets only. Verification covers named positive read-back projections or fixture effects, not complete endpoint schemas or effective authority. Empty/denied observations do not prove item behavior. No inferred runtime proof from source tests.',
    counts, operations, supplemental, workflows, competitorClaims: JSON.parse(competitorsText) };
}
export function inventoryMarkdown(data) {
  const c = data.counts;
  return `# Generated capability inventory\n\n${c.exposed} IRIS SysAdmin operations exposed · ${c.observed} runtime-observed · ${c.independentlyVerified} independently verified · ${c.qualifiedMutationWorkflows} qualified mutation workflows.\n\nGenerated with \`npm run inventory\`. ${data.unit}. ${data.qualificationBoundary}\n\nOfficial spec SHA-256: \`${data.spec.sha256}\`. ${c.declared} declared operations; ${c.mutable} mutation-shaped contracts, ${c.exposedMutableOperations} exposed mutation operations. POST audit queries are observational but remain conservatively classified by method. Non-SysAdmin product/REST/monitor and v1 handoff routes are listed separately in the JSON.\n\n| Operation | Exposed | Observed | Reproduced | Independent | Mutable | Gap |\n|---|---|---|---|---|---|---|\n${data.operations.map(x => `| ${x.id} | ${x.exposed} | ${x.observed} | ${x.reproduced} | ${x.independentlyVerified} | ${x.mutable} | ${x.gap} |`).join('\n')}\n`;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = await buildInventory();
  await writeFile(new URL('docs/CAPABILITY_INVENTORY.json', root), JSON.stringify(data, null, 2) + '\n');
  await writeFile(new URL('docs/CAPABILITY_INVENTORY.md', root), inventoryMarkdown(data));
  await writeFile(new URL('public/api-catalog.json', root), JSON.stringify(buildDeclaredCatalog(data,JSON.parse(await read('metadata/sysadmin-v2.json'))))+'\n');
  await writeFile(new URL('public/capability-summary.json',root),JSON.stringify({schema:'opsdeck-capability-summary-v1',counts:data.counts,unit:data.unit,qualificationBoundary:data.qualificationBoundary,specSha256:data.spec.sha256,witnessSha256:data.sourceHashes.witnesses,...(data.sourceHashes.mutationWitnesses?{mutationWitnessSha256:data.sourceHashes.mutationWitnesses}:{}),artifacts:Object.entries(data.sourceHashes).filter(([path])=>path.startsWith('docs/evidence/')).map(([path,sha256])=>({path,sha256}))})+'\n');
  console.log(JSON.stringify(data.counts));
}
