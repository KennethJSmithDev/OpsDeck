import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInventory } from '../scripts/capability-inventory.mjs';
import { readFile } from 'node:fs/promises';
test('inventory uses discrete operations and cannot silently elevate fixture proof', async () => {
  const inventory = await buildInventory();
  assert.equal(new Set(inventory.operations.map(x => x.id)).size, inventory.operations.length);
  const spec = JSON.parse(await readFile(new URL('../metadata/sysadmin-v2.json', import.meta.url)));
  const expected = Object.values(spec.paths).flatMap(item => Object.keys(item).filter(key => ['get','post','put','delete','patch','head','options'].includes(key))).length;
  assert.equal(inventory.counts.declared, expected);
  assert.equal(inventory.operations.filter(x => x.id === 'PUT /api/admin/v2/web-app').length, 1);
  assert.ok(inventory.workflows.filter(x => x.operation === 'PUT /api/admin/v2/web-app').length > 1);
  for (const row of inventory.operations) {
    if (row.independentlyVerified) assert.ok(row.observed && row.exposed && row.evidence.length);
    if (row.reproduced) assert.ok(row.observed);
    if (!row.exposed) assert.equal(row.observed, false);
  }
  assert.equal(inventory.competitorClaims.every(x => x.independentlyVerifiedByOpsDeck === 0), true);
});

test('runtime reader accounting derives only bounded successful observations and preserves denied gaps',async()=>{
  const inventory=await buildInventory();
  for(const name of ['generic','named','entity','configuration','percent-access']){
    const path=`docs/evidence/phase9-${name}-readers.json`,artifact=JSON.parse(await readFile(new URL(`../${path}`,import.meta.url)));
    for(const record of artifact.records){
      const row=inventory.operations.find(operation=>operation.id===record.operation),proof=row.evidence.find(proof=>proof.artifact===path);
      assert.ok(proof);assert.equal(proof.observed,record.status===200&&['OBSERVED','EMPTY'].includes(record.state));
      assert.equal(proof.reproduced,false);assert.equal(proof.independentlyVerified,false);
    }
  }
  assert.equal(inventory.operations.find(operation=>operation.id==='GET /api/admin/v2/ecp/settings').observed,false);
});

test('semantic verification is admitted only for successful separate reads whose actual projection agrees',async()=>{
  const inventory=await buildInventory(),path='docs/evidence/phase9-semantic-readbacks.json';
  const artifact=JSON.parse(await readFile(new URL(`../${path}`,import.meta.url)));
  const proofFor=id=>inventory.operations.find(row=>row.id===id).evidence.find(proof=>proof.artifact===path);
  const users='GET /api/admin/v2/security/users',audit='GET /api/admin/v2/security/audit/events';
  assert.equal(artifact.records.find(row=>row.operation===users).state,'VERIFIED');
  assert.equal(proofFor(users).independentlyVerified,true);
  assert.match(proofFor(users).scope,/separate HTTP read-back agreement only/u);
  assert.equal(artifact.records.find(row=>row.operation===audit).state,'UNVERIFIED');
  assert.equal(proofFor(audit).observed,true,'both real mappings succeeded even though the snapshots changed');
  assert.equal(proofFor(audit).independentlyVerified,false,'successful HTTP responses alone cannot establish agreement');
  assert.equal(proofFor(audit).reproduced,false);
  const additionalPath='docs/evidence/phase9-additional-readbacks.json';
  const additional=JSON.parse(await readFile(new URL(`../${additionalPath}`,import.meta.url)));
  const additionalProof=id=>inventory.operations.find(row=>row.id===id).evidence.find(proof=>proof.artifact===additionalPath);
  const x509='GET /api/admin/v2/security/x509-credentials',usage='GET /api/admin/v2/monitor/system-usage',databases='GET /api/admin/v2/database-dirs';
  assert.equal(additional.records.find(row=>row.operation===x509).empty,true);
  assert.equal(additionalProof(x509).independentlyVerified,true,'separately mapped valid-empty results agree');
  assert.equal(additional.records.find(row=>row.operation===usage).state,'UNVERIFIED');
  assert.equal(additionalProof(usage).observed,true);
  assert.equal(additionalProof(usage).independentlyVerified,false,'changing live counters remain unverified');
  assert.equal(additional.records.find(row=>row.operation===databases).state,'DENIED');
  assert.equal(additionalProof(databases).observed,false,'a denied read-back cannot add current observation proof');
});

test('generic read-back accounting retains positive projection scope and actual changing dashboard results',async()=>{
  const inventory=await buildInventory(),path='docs/evidence/phase9-generic-readbacks.json';
  const artifact=JSON.parse(await readFile(new URL(`../${path}`,import.meta.url)));
  const proofFor=id=>inventory.operations.find(row=>row.id===id).evidence.find(proof=>proof.artifact===path);
  const empty='GET /api/admin/v2/doc-dbs',changed='GET /api/admin/v2/monitor/dashboard/globals-and-routines';
  assert.equal(artifact.records.find(record=>record.operation===empty).empty,true);
  assert.equal(proofFor(empty).independentlyVerified,true);
  assert.match(proofFor(empty).scope,/schema-derived positive response fields only/u);
  assert.equal(proofFor(empty).readerSha256,artifact.readerSha256);
  assert.equal(artifact.records.find(record=>record.operation===changed).state,'UNVERIFIED');
  assert.equal(proofFor(changed).observed,true);
  assert.equal(proofFor(changed).reproduced,false);
  assert.equal(proofFor(changed).independentlyVerified,false);
  assert.equal(artifact.records.some(record=>record.operation==='GET /api/admin/v2/security/audit/events'),false,'already changed counters are not retried to select a passing instant');
});
