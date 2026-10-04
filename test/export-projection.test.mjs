import test from 'node:test';
import assert from 'node:assert/strict';
import {exportProjection} from '../public/export-projection.js';

test('exports existing projections without mutation and refuses oversized output',()=>{
  const value={items:[{name:'=SUM(A1)',properties:{enabled:false},note:'a,"b"'}]};
  const before=JSON.stringify(value);
  assert.deepEqual(JSON.parse(exportProjection(value)),value);
  assert.match(exportProjection(value,'csv'),/"'=SUM\(A1\)"/u);
  assert.match(exportProjection(value,'csv'),/"a,""b"""/u);
  assert.equal(JSON.stringify(value),before);
  assert.equal(exportProjection(false),'false');
  assert.throws(()=>exportProjection(false,'csv'),/Scalar projections/u);
  assert.throws(()=>exportProjection({text:'x'.repeat(65536)}),/64 KiB/u);
});
