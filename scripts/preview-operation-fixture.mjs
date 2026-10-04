// Credential-free UX qualification only. Synthetic state; never contacts IRIS.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname} from 'node:path';
import {OPERATION_POLICIES} from '../public/operation-engine.js?v=opsdeck-0.8.0-ipm';
const root=new URL('../',import.meta.url),name='/ux-fixture',username='SyntheticUX',profiles=['USER','SUPPORT','ADMIN','DBA','SECURITY','PACKAGE_OPERATOR','AUDITOR'].map(id=>`AI_PROFILE_${id}`);
const manifest=await readFile(new URL('module.xml',root),'utf8');
const assets=new Map([...manifest.matchAll(/<FileCopy Name="([^"]+)" Target="\{\$cspdir\}opsdeck\/([^"]+)"/gu)].map(match=>[`/opsdeck/${match[2]}`,match[1]]));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const port=Number(process.env.OPSDECK_UX_PREVIEW_PORT||4177);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid loopback fixture port');
const packageMismatch=process.argv.includes('--package-mismatch');
const denyAppList=process.argv.includes('--deny-app-list');
const delayedDetail=process.argv.includes('--delayed-detail'),invalidDetail=process.argv.includes('--invalid-detail');
const delayedIntent=process.argv.includes('--delayed-intent');
const packageName='ux-fixture-package-with-a-deliberately-long-identity-for-mobile-review',packageVersion='0.0.1',repository='ux-fixture-repository';
let enabled=true,sequence=0,installedPackageVersion=null;
const result=value=>({status:{errors:[]},result:value,console:[]});
const envelope=profileId=>({provider:'opsdeck-intent-rehearsal-v1',username,namespace:'%SYS',profileId,dispatchAllowed:0,trust:'server-reconstructed-current-iris-state'});
createServer(async(request,response)=>{
  const url=new URL(request.url,'http://127.0.0.1:4177'),method=request.method;
  const send=(status,value)=>{response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});response.end(JSON.stringify(value));};
  try{
    if(method==='GET'&&assets.has(url.pathname)){
      const path=assets.get(url.pathname);let bytes=await readFile(new URL(path,root));
      if(path==='public/index.html')bytes=Buffer.from(bytes.toString().replace('<body>','<body><p class="notice warning" role="status">SYNTHETIC UX QUALIFICATION FIXTURE · NO IRIS CONNECTION · use SyntheticUX with any fixture-only text to enter. Every observation, plan and receipt on this page uses disposable in-memory data.</p>'));
      response.writeHead(200,{'Content-Type':types[extname(path)],'Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'"});return response.end(bytes);
    }
    if(method==='GET'&&url.pathname==='/api/admin/info')return send(200,result({username,apiVersion:2,serverVersion:'SYNTHETIC UX FIXTURE — no IRIS connection',systemMode:'TEST',namespaces:[{name:'%SYS'}],privileges:{Secure:{use:true}}}));
    if(method==='GET'&&url.pathname==='/api/admin/v2/web-apps')return denyAppList?send(403,{error:'Outside the current fixture policy.'}):send(200,result([{Name:name,Namespace:'%SYS',Enabled:enabled,Type:'CSP',AuthenticationMethods:['Password']}]));
    if(method==='GET'&&url.pathname==='/api/admin/v2/web-app'&&url.searchParams.get('name')===name){if(delayedDetail)await new Promise(resolve=>setTimeout(resolve,1500));return send(200,result({Name:name,NameSpace:'%SYS',Enabled:invalidDetail?'invalid':enabled,DispatchClass:'Fixture.UX',AutheEnabled:32}));}
    if(method==='GET'&&url.pathname==='/opsdeck-api/message-rotations')return send(200,{provider:'opsdeck-rotated-messages-log-v1',status:'failed',reason:'rotation-enumeration-failed',rotations:[],scannedCount:0,truncated:false});
    if(method==='GET'&&url.pathname==='/opsdeck-api/packages')return send(200,{provider:'iris-ipm-installed-v1',namespace:'%SYS',status:installedPackageVersion?'available':'empty',packages:installedPackageVersion?[{name:packageName,installedVersion:installedPackageVersion}]:[]});
    if(method==='GET'&&url.pathname==='/opsdeck-api/available-packages'&&url.searchParams.get('name')===packageName)return send(200,{provider:'iris-ipm-available-v1',namespace:'%SYS',name:packageName,status:'available',coverage:'complete',repositoryCount:1,availableRepositoryCount:1,truncated:false,packages:[{name:packageName,availableVersion:packageVersion,repository,description:'Disposable in-memory UX fixture only. No package repository or IRIS connection exists.'}]});
    if(method==='GET'&&url.pathname==='/opsdeck-api/package-authority')return send(200,{provider:'iris-ipm-operations-v1',username,namespace:'%SYS',state:'SUPPORTED'});
    if(method==='GET'&&url.pathname==='/opsdeck-api/intent-profiles')return send(200,{...envelope(),state:'OBSERVED',profiles:profiles.map(id=>({id,operationIds:['webapp.observe',...(['AI_PROFILE_ADMIN','AI_PROFILE_SECURITY'].includes(id)?['webapp.enable','webapp.disable']:[])]}))});
    if(['POST','PUT'].includes(method)){
      let body='';for await(const chunk of request){body+=chunk;if(body.length>4096)throw new Error('Bound exceeded');}const input=JSON.parse(body);
      if(method==='POST'&&url.pathname==='/opsdeck-api/package-operation'&&Object.keys(input).length===6&&['install','remove'].includes(input.action)&&input.name===packageName&&input.version===packageVersion&&input.repository===repository&&input.namespace==='%SYS'&&input.expectedInstalledVersion===(installedPackageVersion||'')){
        if(input.action==='install'&&installedPackageVersion||input.action==='remove'&&!installedPackageVersion)return send(409,{error:'Fixture pre-state refused'});
        if(!packageMismatch)installedPackageVersion=input.action==='install'?packageVersion:null;
        return send(200,{provider:'iris-ipm-operations-v1',username,namespace:'%SYS',state:'ACCEPTED'});
      }
      if(method==='PUT'&&url.pathname==='/api/admin/v2/web-app'&&url.searchParams.get('name')===name&&Object.keys(input).length===1&&typeof input.Enabled==='boolean'){enabled=input.Enabled;return send(200,result({}));}
      if(method==='POST'&&url.pathname==='/opsdeck-api/intent-rehearsal'&&Object.keys(input).length===2&&profiles.includes(input.profileId)&&input.candidate?.targetKey===name&&Object.keys(input.candidate).length===2){
        if(delayedIntent)await new Promise(resolve=>setTimeout(resolve,1500));
        const {operationId}=input.candidate,base=envelope(input.profileId),at=new Date().toISOString();
        const target={domain:'applications',kind:'web-app',provider:'iris-admin-api',key:name,scope:'%SYS',label:name,observedAt:at};
        if(operationId==='webapp.observe')return send(200,{...base,state:'OBSERVED',target,value:{enabled},observedAt:at});
        if(!['webapp.enable','webapp.disable'].includes(operationId))return send(400,{...base,state:'FAILED'});
        if(!['AI_PROFILE_ADMIN','AI_PROFILE_SECURITY'].includes(input.profileId))return send(403,{...base,state:'DENIED'});
        return send(200,{...base,state:'REVIEW_REQUIRED',planInput:{id:`ux-fixture:${++sequence}`,intent:`Synthetic UX ${operationId} ${name}`,target,targetRef:{id:'local',label:'LOCAL',origin:'same-origin',environment:'LOCAL'},capability:{id:operationId,state:'SUPPORTED',...OPERATION_POLICIES[operationId]},parameters:{enabled:operationId==='webapp.enable'},preState:{enabled},preStateEvidence:'synthetic-ux:observed',authorityValidation:{state:'SUPPORTED',evidence:'synthetic-ux:profile-human-policy'},createdAt:at,ttlSeconds:120,expectedReadback:`Enabled is ${operationId==='webapp.enable'}`}});
      }
    }
    send(403,{error:'Synthetic UX fixture supports only fixed fixture operations. No IRIS connection exists.'});
  }catch{send(400,{error:'Synthetic fixture request refused.'});}
}).listen(port,'127.0.0.1',()=>console.log(`Synthetic OpsDeck operation UX fixture http://127.0.0.1:${port}/opsdeck/index.html — no IRIS connection`));
