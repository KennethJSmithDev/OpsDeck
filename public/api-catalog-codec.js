// Lossless transport representation only. Expansion precedes the existing explorer contract.
export function expandApiCatalog(payload){
  if(payload?.schema==='opsdeck-declared-api-catalog-v2')return payload;
  if(payload?.schema!=='opsdeck-api-catalog-dictionary-v1'||!Array.isArray(payload.strings)||payload.strings.length>20000||payload.strings.some(s=>typeof s!=='string'||s.length>4096))throw new Error('API catalog representation invalid.');
  let nodes=0;
  const string=index=>{if(!Number.isInteger(index)||index<0||index>=payload.strings.length)throw new Error('API catalog string reference invalid.');return payload.strings[index];};
  const quoted=payload.strings.map(value=>JSON.stringify(value));
  const expand=(value,depth=0)=>{
    if(++nodes>100000||depth>40)throw new Error('API catalog expansion exceeds bound.');
    if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
    if(!Array.isArray(value))throw new Error('API catalog node invalid.');
    if(value[0]===0&&value.length===2){string(value[1]);return quoted[value[1]];}
    if(value[0]===1)return '['+value.slice(1).map(item=>expand(item,depth+1)).join(',')+']';
    if(value[0]===2&&value.length%2===1){
      const entries=[],seen=new Set();
      for(let i=1;i<value.length;i+=2){const key=string(value[i]);if(seen.has(key))throw new Error('API catalog duplicate property.');seen.add(key);entries.push(quoted[value[i]]+':'+expand(value[i+1],depth+1));}
      return '{'+entries.join(',')+'}';
    }
    throw new Error('API catalog node tag invalid.');
  };
  const catalog=JSON.parse(expand(payload.value));
  if(catalog?.schema!=='opsdeck-declared-api-catalog-v2'||!Array.isArray(catalog.operations)||!catalog.schemas||typeof catalog.schemas!=='object')throw new Error('Expanded API catalog contract invalid.');
  return catalog;
}
