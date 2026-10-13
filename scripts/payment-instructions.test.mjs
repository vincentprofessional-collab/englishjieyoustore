import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

test('payment text uses safe defaults and reports refused saves instead of publishing a false success', async () => {
  const exports = {};
  let allowed = false;
  let saved = null;
  const client = { from(table) {
    assert.equal(table, 'managed_content_pages');
    const query = {
      select() { return this; },
      eq() { return this; },
      maybeSingle: async () => ({ data: saved ? { meta_json: saved.meta_json } : null }),
      upsert: async (record) => {
        if (!allowed) return { error: new Error('RLS denied') };
        saved = record;
        return { error: null };
      },
    };
    return query;
  } };
  const source = ts.transpileModule(fs.readFileSync(new URL('../src/lib/content/payment-instructions.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: () => ({ supabase: client }) });
  const { DEFAULT_PAYMENT_INSTRUCTIONS: defaults, loadPaymentInstructions: load, normalizePaymentInstructions: normalize, savePaymentInstructions: save } = exports;
  assert.deepEqual(await load(), defaults);
  const copy = normalize({ heading: ' 新标题 ', note: '第一行\n第二行', orderLabel: 123 });
  assert.equal(copy.heading, '新标题');
  assert.equal(copy.note, '第一行\n第二行');
  assert.equal(copy.orderLabel, defaults.orderLabel);
  assert.equal(normalize({ note: ' ' }).note, defaults.note);
  assert.equal(normalize({ note: 'a'.repeat(2500) }).note.length, 2000);
  assert.ok(await save('admin', copy));
  assert.equal(saved, null);
  allowed = true;
  assert.equal(await save('admin', copy), null);
  assert.equal(saved.slug, 'payment-instructions');
  assert.equal(saved.status, 'published');
  assert.equal((await load()).heading, '新标题');
});
