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

test('the paywall waits for enabled server plans and never flashes fallback month or quarter cards', async () => {
  const source = ts.transpileModule(fs.readFileSync(new URL('../src/components/project-access-paywall.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  let cursor = 0, resolveProject, resolvePlans;
  const states = [], effects = [];
  const projectResult = new Promise(resolve => { resolveProject = resolve; });
  const plansResult = new Promise(resolve => { resolvePlans = resolve; });
  const react = { useState(initial) {
    const index = cursor++;
    if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
    return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
  }, useEffect(effect) { effects.push(effect); } };
  const fallback = { key: 'bbc', shortTitle: 'BBC', title: 'BBC', description: '' };
  const client = { from(table) { return { select() { return this; }, eq() { return this; }, maybeSingle: () => projectResult, order: () => plansResult }; } };
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/image': {}, 'next/link': {},
    '@/lib/access-control': { getProjectAccessRule: () => fallback, PROJECT_ACCESS_PLANS: [{ label: '月卡' }, { label: '季卡' }], formatProjectPrice: amount => `¥${amount}` },
    '@/lib/supabase/client': { supabase: client }, '@/lib/content/payment-instructions': { DEFAULT_PAYMENT_INSTRUCTIONS: {} }, '@/components/bbc-members': {},
  };
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => { assert.ok(name in imports, name); return imports[name]; } });
  function text(node) {
    if (Array.isArray(node)) return node.map(text).join('');
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    return node && typeof node === 'object' ? text(node.props?.children) : '';
  }
  function render() { cursor = 0; return text(exports.ProjectAccessPaywall({ projectKey: 'bbc' })); }
  assert.equal(render(), '正在加载会员开通信息…');
  effects[3]();
  assert.equal(render(), '正在加载会员开通信息…', 'slow catalog requests cannot show unrelated defaults');
  resolveProject({ data: { project_key: 'bbc', title: 'BBC当前开通方案', short_title: 'BBC', description: '' }, error: null });
  resolvePlans({ data: [{ plan: 'yearly', label: '年卡会员', duration_label: '1年', price_cny: 100 }, { plan: 'lifetime', label: '终身会员', duration_label: '永久', price_cny: 200 }], error: null });
  await new Promise(resolve => setImmediate(resolve));
  const ready = render();
  assert.ok(ready.includes('年卡会员') && ready.includes('终身会员'));
  assert.ok(!ready.includes('月卡') && !ready.includes('季卡') && !ready.includes('正在加载'));
});
