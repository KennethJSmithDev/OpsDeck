import {expandApiCatalog} from '../public/api-catalog-codec.js';
export function packApiCatalog(catalog){
  const strings=[],indices=new Map();
  const intern=value=>{if(!indices.has(value)){indices.set(value,strings.length);strings.push(value);}return indices.get(value);};
  const pack=value=>{
    if(typeof value==='string')return [0,intern(value)];
    if(Array.isArray(value))return [1,...value.map(pack)];
    if(value&&typeof value==='object')return [2,...Object.entries(value).flatMap(([key,item])=>[intern(key),pack(item)])];
    return value;
  };
  const payload={schema:'opsdeck-api-catalog-dictionary-v1',strings,value:pack(catalog)};
  if(JSON.stringify(expandApiCatalog(payload))!==JSON.stringify(catalog))throw new Error('API catalog expansion differs from canonical source.');
  return payload;
}
