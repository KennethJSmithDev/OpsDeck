const keys=['type','format','enum','required','properties','items','allOf','oneOf','anyOf','$ref','minimum','maximum','readOnly','writeOnly','additionalProperties'];
function compact(value){
  if(Array.isArray(value))return value.map(compact);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).filter(([key])=>keys.includes(key)).map(([key,item])=>[key,key==='properties'?Object.fromEntries(Object.entries(item).map(([name,schema])=>[name,compact(schema)])):compact(item)]));
}
export function buildDeclaredCatalog(inventory,spec){
  const resolveParameter=p=>p.$ref?spec.components.parameters[p.$ref.split('/').at(-1)]:p;
  const operations=inventory.operations.map(({id,method,path,summary,exposed,mutable})=>{
    const pathItem=spec.paths[path.slice('/api/admin'.length)],operation=pathItem[method.toLowerCase()];
    const parameters=new Map();
    for(const parameter of [...(pathItem.parameters||[]),...(operation.parameters||[])].map(resolveParameter))parameters.set(`${parameter.in}:${parameter.name}`,{
      name:parameter.name,in:parameter.in,required:parameter.required===true,schema:compact(parameter.schema),description:(parameter.description||'').replace(/<[^>]+>/gu,' ').slice(0,512)});
    const response=operation.responses?.['200'];
    const resolvedResponse=response?.$ref?spec.components.responses[response.$ref.split('/').at(-1)]:response;
    return {id,method,path,summary,exposed,mutable,requiredPrivileges:[...new Set(summary.match(/%[A-Za-z0-9_]+:[A-Z]/gu)||[])],
      parameters:[...parameters.values()],body:compact(operation.requestBody?.content?.['application/json']?.schema)||null,
      bodyRequired:operation.requestBody?.required===true,response:compact(resolvedResponse?.content?.['application/json']?.schema)||null};
  });
  return {schema:'opsdeck-declared-api-catalog-v2',spec:inventory.spec,operations,schemas:Object.fromEntries(Object.entries(spec.components.schemas).map(([name,schema])=>[name,compact(schema)]))};
}
