import {evidenceLabel} from './evidence-center.js?v=opsdeck-0.8.0';
export function commandIndex({workspaces=[],entities=[],operations=[],apiOperations=[],evidence=[]}) {
  const rows = [
    ...workspaces.map(([id,label])=>({id:`workspace:${id}`,kind:'workspace',label,route:id})),
    ...entities.slice(0,400).map(item=>({...item,kind:'entity'})),
    ...operations.map(item=>({...item,kind:'operation'})),
    ...apiOperations.map(item=>({id:`api:${item.id}`,kind:'API operation',label:item.id,summary:item.summary,operation:item.id})),
    ...evidence.map(item=>({id:`evidence:${item.id}`,kind:'Evidence',label:evidenceLabel(item),summary:`${item.state||''} ${item.targetRef?.label||''} ${item.resource?.key||''} ${item.summary||''}`,evidenceId:item.id,route:'evidence'})),
  ];
  const ids = new Set();
  return rows.filter(item=>{if(ids.has(item.id))return false;ids.add(item.id);return true;});
}
export function searchCommands(index,query='',limit=40) {
  const words = String(query).trim().toLowerCase().slice(0,128).split(/\s+/u).filter(Boolean);
  const matches = index.filter(item=>words.every(word=>`${item.kind} ${item.label} ${item.summary||''}`.toLowerCase().includes(word)));
  return matches.sort((a,b)=>(b.label.toLowerCase().startsWith(words.join(' '))?1:0)-(a.label.toLowerCase().startsWith(words.join(' '))?1:0)).slice(0,Math.min(60,Math.max(1,limit)));
}
