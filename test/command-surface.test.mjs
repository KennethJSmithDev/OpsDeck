import test from 'node:test';
import assert from 'node:assert/strict';
import {commandIndex,searchCommands} from '../public/command-surface.js';
test('command search uses current projections across all five categories and never adds execution authority',()=>{
  const index=commandIndex({workspaces:[['logs','Logs']],entities:[{id:'entity:1',label:'/app/foo',route:'applications'}],
    operations:[{id:'operation:1',label:'Operation Rehearsal enable'}],apiOperations:[{id:'GET /v2/devices',summary:'List devices'}],evidence:[{id:'receipt:1',title:'Verified Receipt',summary:'Read-back matched'}]});
  assert.deepEqual(new Set(index.map(x=>x.kind)),new Set(['workspace','entity','operation','API operation','Evidence']));
  assert.equal(searchCommands(index,'api devices')[0].kind,'API operation');
  assert.equal(searchCommands(index,'foo')[0].label,'/app/foo');
  assert.equal(searchCommands(index,'verified')[0].evidenceId,'receipt:1');
  assert.ok(index.every(x=>!x.dispatch&&!x.authority));
  assert.equal(searchCommands(index,'unobserved user').length,0);
});

test('receipt and rehearsal discovery match the ledger display labels and retain target scope',()=>{
  const evidence=[{id:'receipt:actual',kind:'operation-receipt',state:'VERIFIED',title:'Disable /app',summary:'Read-back matched',targetRef:{label:'LOCAL'},resource:{key:'/app'}},
    {id:'plan:actual',kind:'operation-plan',state:'UNVERIFIED',title:'Enable /app',summary:'Review required'}];
  const index=commandIndex({evidence});
  assert.equal(searchCommands(index,'Verified Receipt local /app')[0].evidenceId,'receipt:actual');
  assert.equal(searchCommands(index,'Operation Rehearsal')[0].evidenceId,'plan:actual');
  assert.equal(evidence[0].title,'Disable /app','label projection does not rewrite exported Evidence');
});
