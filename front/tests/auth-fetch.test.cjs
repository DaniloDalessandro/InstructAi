const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('src/lib/api/authFetch.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const token = seconds => `header.${Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+seconds})).toString('base64url')}.signature`;
function harness(cookies, fetcher) {
  const jar = new Map(Object.entries(cookies));
  const document = {};
  Object.defineProperty(document,'cookie',{get:()=>[...jar].map(([key,value])=>`${key}=${encodeURIComponent(value)}`).join('; '),set:text=>{const [pair,...attrs]=text.split('; ');const [key,...value]=pair.split('=');if(attrs.includes('max-age=0'))jar.delete(key);else jar.set(key,decodeURIComponent(value.join('=')));}});
  const exports = {};
  const context = {exports,require:name=>name==='jwt-decode'?{jwtDecode:value=>JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString())}:{API_URL:'http://localhost:8002'},document,window:{location:{protocol:'http:',href:''}},localStorage:{removeItem:()=>{}},Headers,FormData,fetch:fetcher,Date,Error,decodeURIComponent,encodeURIComponent};
  vm.runInNewContext(source,context);
  return {authFetch:exports.authFetch,jar,context};
}

test('missing access token is restored from refresh cookie',async()=>{
  const renewed=token(3600);const calls=[];
  const h=harness({refresh:'refresh'},async(url,options)=>{calls.push({url,options});return url.endsWith('/refresh/')?Response.json({access:renewed}):Response.json({ok:true});});
  assert.equal((await h.authFetch('/manuals/')).status,200);
  assert.equal(h.jar.get('access'),renewed);
  assert.equal(calls[1].options.headers.get('Authorization'),`Bearer ${renewed}`);
});
test('concurrent requests share one refresh operation',async()=>{
  let refreshes=0;
  const h=harness({access:token(-10),refresh:'refresh'},async(url)=>{if(url.endsWith('/refresh/')){refreshes++;await new Promise(resolve=>setTimeout(resolve,5));return Response.json({access:token(3600)});}return Response.json({ok:true});});
  await Promise.all([h.authFetch('/a/'),h.authFetch('/b/'),h.authFetch('/c/')]);
  assert.equal(refreshes,1);
});
test('multipart requests preserve the browser boundary and custom headers',async()=>{
  let request;
  const h=harness({access:token(3600)},async(url,options)=>{request=options;return Response.json({ok:true});});
  const form=new FormData();form.append('name','QA');
  await h.authFetch('/upload/',{method:'POST',body:form,headers:new Headers({'Content-Type':'multipart/form-data','X-QA':'yes'})});
  assert.equal(request.headers.has('Content-Type'),false);
  assert.equal(request.headers.get('X-QA'),'yes');
});
test('a 401 is retried after refreshing',async()=>{
  let attempts=0;let refreshes=0;
  const h=harness({access:token(3600),refresh:'refresh'},async(url)=>{if(url.endsWith('/refresh/')){refreshes++;return Response.json({access:token(3600)});}attempts++;return Response.json({}, {status:attempts===1?401:200});});
  assert.equal((await h.authFetch('/profile/')).status,200);
  assert.equal(attempts,2);assert.equal(refreshes,1);
});
test('temporary refresh failure keeps a still-valid token and session',async()=>{
  const h=harness({access:token(30),refresh:'refresh'},async(url)=>url.endsWith('/refresh/')?Response.json({}, {status:503}):Response.json({ok:true}));
  assert.equal((await h.authFetch('/a/')).status,200);
  assert.equal(h.jar.get('refresh'),'refresh');
  assert.equal(h.context.window.location.href,'');
});
test('rejected refresh clears stale user data',async()=>{
  const h=harness({refresh:'invalid',user:'stale'},async()=>Response.json({}, {status:401}));
  await assert.rejects(()=>h.authFetch('/profile/'));
  assert.equal(h.jar.has('user'),false);assert.equal(h.jar.has('refresh'),false);
  assert.equal(h.context.window.location.href,'/login');
});

test('a late failed refresh does not erase a newly signed-in session',async()=>{
  const newAccess=token(3600);
  let h;
  h=harness({access:token(-10),refresh:'old-refresh'},async(url)=>{
    if(url.endsWith('/refresh/')){
      h.jar.set('access',newAccess);h.jar.set('refresh','new-refresh');h.jar.set('user','new-user');
      return Response.json({}, {status:401});
    }
    return Response.json({ok:true});
  });
  assert.equal((await h.authFetch('/profile/')).status,200);
  assert.equal(h.jar.get('refresh'),'new-refresh');
  assert.equal(h.jar.get('user'),'new-user');
  assert.equal(h.context.window.location.href,'');
});
