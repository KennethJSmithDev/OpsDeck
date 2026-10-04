import { readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const manifest = await readFile(new URL('module.xml',root),'utf8');
const assets = [];
for (const match of manifest.matchAll(/<FileCopy Name="([^"]+)"/gu)) {
  const bytes = await readFile(new URL(match[1],root));
  assets.push({path:match[1],bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const total = assets.filter(x=>/\.(js|css|html)$/u.test(x.path)).reduce((n,x)=>n+x.bytes,0);
const result = {schema:'opsdeck-representation-measurement-v1',assets,browserBytes:total,
  lazyMetadataBytes:assets.filter(x=>/\.json$/u.test(x.path)).reduce((n,x)=>n+x.bytes,0),
  allManifestFileBytes:assets.reduce((n,x)=>n+x.bytes,0),preservedBaselineBytes:228337,
  deltaBytes:total-228337,deltaPercent:Number(((total/228337-1)*100).toFixed(2)),
  boundary:'Uncompressed source including lazy modules; not transfer size. Browser timing/heap not inferred.'};
await writeFile(new URL('docs/evidence/representation-measurement.json',root),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({browserBytes:total,deltaBytes:result.deltaBytes,deltaPercent:result.deltaPercent}));
