import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {packApiCatalog} from '../scripts/api-catalog-pack.mjs';
import {expandApiCatalog} from '../public/api-catalog-codec.js';
import {compileRequest,requestPreview} from '../public/sysadmin-explorer.js';
const original=JSON.parse(await readFile(new URL('../public/api-catalog.json',import.meta.url)));
const packed=JSON.parse(await readFile(new URL('../public/api-catalog.compact.json',import.meta.url)));
test('shipped catalog expands exactly operation-by-operation, schema-by-schema and field-by-field',()=>{
 const expanded=expandApiCatalog(packed);assert.deepEqual(expanded,original);assert.equal(expanded.operations.length,276);
 for(let i=0;i<original.operations.length;i++)assert.deepEqual(expanded.operations[i],original.operations[i],original.operations[i].id);
 for(const [name,schema] of Object.entries(original.schemas))assert.deepEqual(expanded.schemas[name],schema,name);
 assert.deepEqual(packApiCatalog(original),packed);assert.equal(expandApiCatalog(original),original);
});
test('expanded shipped representation yields identical branded request previews for all compilable operations',()=>{
 const expanded=expandApiCatalog(packed);let compared=0;
 for(const operation of original.operations){
  const parameters=Object.fromEntries(operation.parameters.filter(p=>p.required).map(p=>[p.name,p.schema.type==='integer'?1:'OpsDeckFixture']));
  const input={parameters,...(operation.body?{body:{}}:{})};let before,after;
  try{before=requestPreview(compileRequest(original,operation.id,input));}catch(error){before={error:error.message};}
  try{after=requestPreview(compileRequest(expanded,operation.id,input));}catch(error){after={error:error.message};}
  assert.deepEqual(after,before,operation.id);compared++;
 }
 assert.equal(compared,276);
 const input={parameters:{name:'OpsDeckMutationFixtureRole'},body:{Description:'reviewed'}};
 assert.deepEqual(requestPreview(compileRequest(expanded,'PUT /api/admin/v2/security/role',input)),requestPreview(compileRequest(original,'PUT /api/admin/v2/security/role',input)));
});
test('dictionary transport refuses malformed tags, references, duplicate keys and excessive nesting',()=>{
 const root=value=>({schema:'opsdeck-api-catalog-dictionary-v1',strings:['x'],value});
 for(const value of [[0,9],[0,-1],[3],[2,0,1,0,2],{},[0,0,0]])assert.throws(()=>expandApiCatalog(root(value)),/catalog/u);
 let value=null;for(let i=0;i<42;i++)value=[1,value];assert.throws(()=>expandApiCatalog(root(value)),/bound/u);
 assert.throws(()=>expandApiCatalog({...root(null),strings:[1]}),/representation/u);
});
