import test from 'node:test';
import assert from 'node:assert/strict';
import { projectFx, applyFx, removeFx, FX_DIMENSIONS, ROLE_PROJECTIONS } from '../public/fx-studio.js';
test('all independent material/FX/motion projections preserve semantic tokens and user override', () => {
  for (const material of FX_DIMENSIONS.material) for (const fx of FX_DIMENSIONS.fx) for (const motion of FX_DIMENSIONS.motion) {
    const projection = projectFx({ material, fx, motion }, { role: 'Admin', reducedMotion: true });
    assert.equal(projection.material,material); assert.equal(projection.fx,fx);
    assert.equal(projection.effectiveMotion, motion === 'Off' ? 'off' : 'reduced');
    assert.ok(Object.keys(projection.tokens).every(key=>key.startsWith('--fx-')));
    assert.equal(Object.hasOwn(projection.tokens,'--success'),false);
  }
  for (const [role,choices] of Object.entries(ROLE_PROJECTIONS)) assert.equal(projectFx({}, {role}).material, choices[0]);
  assert.equal(projectFx({material:'Glass'}, {role:'Admin'}).material,'Glass');
});
test('removing the projector restores the canonical base and leaves operational state unchanged', () => {
  const values = new Map([['--success','green'],['--surface','canonical']]);
  const root = { dataset: {theme:'dark',target:'fixture'}, style: {setProperty:(k,v)=>values.set(k,v),removeProperty:k=>values.delete(k)} };
  applyFx(root,projectFx({material:'Galactic',fx:'Full'}));
  assert.equal(root.dataset.theme,'dark');
  removeFx(root);
  assert.deepEqual([...values], [['--success','green'],['--surface','canonical']]);
  assert.deepEqual(root.dataset,{theme:'dark',target:'fixture'});
});
