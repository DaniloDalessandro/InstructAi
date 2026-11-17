const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const vm=require('node:vm');
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/utils/video.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exportsObject,URL});
const {getVideoEmbedUrl}=exportsObject;
test('watch, short and existing embed URLs produce a working YouTube embed',()=>{
  for(const url of ['https://www.youtube.com/watch?v=aqz-KE-bpKQ','https://youtu.be/aqz-KE-bpKQ','https://www.youtube.com/embed/aqz-KE-bpKQ','https://www.youtube.com/shorts/aqz-KE-bpKQ'])assert.equal(getVideoEmbedUrl(url),'https://www.youtube.com/embed/aqz-KE-bpKQ');
});
test('other video providers are not rewritten',()=>{
  assert.equal(getVideoEmbedUrl('https://player.vimeo.com/video/123'),'https://player.vimeo.com/video/123');
});
test('similarly named domains are not treated as YouTube',()=>{
  assert.equal(getVideoEmbedUrl('https://evil-youtube.com/watch?v=aqz-KE-bpKQ'),'https://evil-youtube.com/watch?v=aqz-KE-bpKQ');
});
