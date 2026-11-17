const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const vm=require('node:vm');
process.env.TZ='America/Sao_Paulo';
const result={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/utils/datetime.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:result,Date});
test('API timestamps become valid local datetime input values',()=>{
  assert.equal(result.formatDateTimeLocal('2026-11-17T12:30:00Z'),'2026-11-17T09:30');
  assert.equal(result.formatDateTimeLocal('2026-11-17T09:30:00-03:00'),'2026-11-17T09:30');
});
test('entered local values remain stable and empty dates remain empty',()=>{
  assert.equal(result.formatDateTimeLocal('2026-11-17T09:30'),'2026-11-17T09:30');
  assert.equal(result.formatDateTimeLocal(null),'');
  assert.equal(result.formatDateTimeLocal('invalid'),'');
});
