// Serializes an existing safe UI projection; never requests, reconstructs or mirrors provider state.
const MAX_BYTES=65536;
export function exportProjection(value,format='json') {
  if (!['json','csv'].includes(format)) throw new Error('Unsupported export format');
  let output;
  if(format==='json') output=JSON.stringify(value,null,2);
  else {
    if(value===null||typeof value!=='object')throw new Error('Scalar projections support JSON export; no invented CSV columns.');
    const rows=Array.isArray(value)?value:Array.isArray(value?.items)?value.items:Array.isArray(value?.packages)?value.packages:[value];
    const keys=[...new Set(rows.flatMap(row=>Object.keys(row||{})))];
    const cell=value=>{let text=value!==null&&typeof value==='object'?JSON.stringify(value):String(value??'');if(/^[=+@\-\t\r]/u.test(text))text=`'${text}`;return `"${text.replaceAll('"','""')}"`;};
    output=[keys.map(cell).join(','),...rows.map(row=>keys.map(key=>cell(row?.[key])).join(','))].join('\r\n')+'\r\n';
  }
  if(new TextEncoder().encode(output).length>MAX_BYTES)throw new Error('Existing projection exceeds 64 KiB; no silent truncation.');
  return output;
}
