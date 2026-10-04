// Optional representation projector. No provider, operation, credential or Evidence dependencies.
export const FX_DIMENSIONS = Object.freeze({
  material: Object.freeze(['Galactic','Gem','Glass','Transparent','Matte','Metallic','Crystal','Cybernetic','Digital','Dull']),
  fx: Object.freeze(['Minimal','Calm','Glow','Full']), motion: Object.freeze(['System','Full','Reduced','Off']),
});
export const ROLE_PROJECTIONS = Object.freeze({
  Admin: ['Galactic','Gem'], Manager: ['Metallic','Crystal'], 'Tech / IT': ['Cybernetic','Digital'],
  Regular: ['Glass','Transparent'], Guest: ['Matte','Dull'],
});
const materials = Object.freeze({
  Galactic: ['104,110,245', '28,189,207', '14px', '16px', '96%', 'radial'],
  Gem: ['163,107,239', '82,187,211', '6px', '8px', '98%', 'facet'],
  Glass: ['109,166,205', '139,190,215', '12px', '18px', '94%', 'sheen'],
  Transparent: ['103,158,194', '105,177,197', '10px', '0px', '92%', 'plain'],
  Matte: ['120,132,147', '120,132,147', '8px', '0px', '100%', 'plain'],
  Metallic: ['154,174,192', '207,218,228', '7px', '0px', '100%', 'sheen'],
  Crystal: ['81,172,206', '190,173,241', '12px', '8px', '97%', 'facet'],
  Cybernetic: ['64,171,189', '114,136,203', '3px', '0px', '100%', 'grid'],
  Digital: ['91,139,204', '135,168,218', '4px', '0px', '100%', 'dots'],
  Dull: ['126,130,140', '126,130,140', '4px', '0px', '100%', 'plain'],
});
export function projectFx(preference = {}, context = {}) {
  const role = Object.hasOwn(ROLE_PROJECTIONS, context.role) ? context.role : 'Guest';
  const material = FX_DIMENSIONS.material.includes(preference.material) ? preference.material : ROLE_PROJECTIONS[role][0];
  const fx = FX_DIMENSIONS.fx.includes(preference.fx) ? preference.fx : 'Calm';
  const motion = FX_DIMENSIONS.motion.includes(preference.motion) ? preference.motion : 'System';
  const effectiveMotion = motion === 'Off' ? 'off' : motion === 'Reduced' || context.reducedMotion ? 'reduced' : 'full';
  const intensity = { Minimal: 0, Calm: .06, Glow: .13, Full: .2 }[fx];
  const [tint, secondary, radius, blur, opacity, texture] = materials[material];
  return Object.freeze({ material, fx, motion, effectiveMotion, role,
    tokens: Object.freeze({ '--fx-tint': tint, '--fx-secondary': secondary, '--fx-radius': radius,
      '--fx-blur': blur, '--fx-opacity': opacity, '--fx-intensity': String(intensity),
      '--fx-shadow': ['Glow','Full'].includes(fx) ? `0 0 24px rgba(${tint},${intensity})` : 'none' }),
    texture: intensity === 0 ? 'plain' : texture,
  });
}
export function applyFx(root, projection) {
  removeFx(root);
  for (const [key,value] of Object.entries(projection.tokens)) root.style.setProperty(key,value);
  Object.assign(root.dataset, { fxMaterial: projection.material.toLowerCase(), fxLevel: projection.fx.toLowerCase(),
    fxMotion: projection.effectiveMotion, fxTexture: projection.texture });
}
export function removeFx(root) {
  for (const key of ['--fx-tint','--fx-secondary','--fx-radius','--fx-blur','--fx-opacity','--fx-intensity','--fx-shadow']) root.style.removeProperty(key);
  for (const key of ['fxMaterial','fxLevel','fxMotion','fxTexture']) delete root.dataset[key];
}
