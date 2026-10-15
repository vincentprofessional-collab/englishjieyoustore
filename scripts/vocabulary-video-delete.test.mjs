import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(filename, imports, env = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(filename, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, process: { env }, TextEncoder, btoa, require: (name) => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  } });
  return exports;
}

test('only an administrator can delete an eligible file, and refreshed lists omit it across related words', async () => {
  const entry = { normalizedWord: 'baby', level: '小学', inflections: [{ value: 'babies' }] };
  const media = load('../src/lib/media/url.ts', {});
  const items = ['The baby smiles.mp4', 'Two babies laugh 笑.mp4', 'A balloon flies.mp4'];
  const stored = new Set(items.map(name => media.toSupabaseSafeStoragePath(`vocabulary/${name}`)));
  const invalidated = [];
  const cache = { unstable_cache: fn => fn, revalidateTag: tag => invalidated.push(tag) };
  let role = 'admin';
  let loggedIn = true;
  let storageError = false;
  const deleted = [];
  const storage = { storage: { from(bucket) {
    assert.equal(bucket, 'videos');
    return {
      async list(prefix, { search }) {
        assert.ok(prefix === 'vocabulary' || prefix === '');
        const names = [...stored].filter(path => prefix ? path.startsWith('vocabulary/') : path.startsWith('u-')).map(path => prefix ? path.slice('vocabulary/'.length) : path);
        return { data: names.filter(name => !search || name.toLowerCase().startsWith(search.toLowerCase())).map(name => ({ id: name, name })), error: null };
      },
      async remove(paths) {
        if (storageError) return { error: new Error('storage unavailable') };
        deleted.push(...paths);
        for (const path of paths) stored.delete(path);
        return { error: null };
      },
    };
  } } };
  const session = {
    auth: { getUser: async () => ({ data: { user: loggedIn ? { id: 'account' } : null }, error: null }) },
    rpc: async () => ({ data: null, error: null }),
    from(table) {
      const query = {
        select() { return this; }, eq() { return this; },
        maybeSingle: async () => ({ data: table === 'profiles' ? { role } : null, error: null }),
        then(resolve) { resolve({ data: [], error: null }); },
      };
      return query;
    },
  };
  const vocabulary = { getAllVocabularyEntries: () => [entry], getExtendedVocabularyEntry: async (word) => word === 'baby' ? entry : null };
  const server = { createServerSupabaseClient: async () => session };
  const videos = load('../src/lib/vocabulary/videos.ts', {
    'server-only': {}, 'next/cache': cache, '@supabase/supabase-js': { createClient: () => storage },
    '@/data/vocabulary/video-catalog.json': items.map((name) => ({ bytes: 1000, name, reviewRequired: false })),
    '@/lib/media/url': media,
    '@/lib/supabase/server': server, '@/lib/vocabulary/local-vocabulary': vocabulary,
  }, { NEXT_PUBLIC_SUPABASE_URL: 'https://storage.invalid', SUPABASE_SERVICE_ROLE_KEY: 'mock' });
  const route = load('../src/app/api/vocabulary-videos/route.ts', {
    'next/cache': cache, '@/lib/media/url': media, 'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    '@/lib/vocabulary/videos': videos, '@/lib/supabase/server': server, '@/lib/vocabulary/local-vocabulary': vocabulary,
  });
  const request = (path, origin = 'https://site.invalid') => ({
    headers: new Headers({ origin }), nextUrl: new URL('https://site.invalid/api/vocabulary-videos'),
    json: async () => ({ word: 'baby', path }),
  });

  assert.equal((await videos.getVocabularyVideos(entry)).totalVideos, 2);
  loggedIn = false;
  assert.equal((await route.DELETE(request(items[0]))).status, 401);
  loggedIn = true; role = 'member';
  assert.equal((await route.DELETE(request(items[0]))).status, 403);
  role = 'admin';
  assert.equal((await route.DELETE(request(items[0], 'https://other.invalid'))).status, 403);
  assert.equal((await route.DELETE(request('../guide.mp4'))).status, 400);
  assert.equal((await route.DELETE(request(items[2]))).status, 400);
  assert.equal(deleted.length, 0);

  storageError = true;
  assert.equal((await route.DELETE(request(items[0]))).status, 503);
  assert.equal((await videos.getVocabularyVideos(entry)).totalVideos, 2);
  storageError = false;
  assert.equal((await route.DELETE(request(items[0]))).status, 200);
  assert.equal(deleted[0], `vocabulary/${items[0]}`);
  const refreshed = await videos.getVocabularyVideos(entry);
  assert.equal(refreshed.totalVideos, 1);
  assert.equal(refreshed.videos[0].path, items[1]);
  assert.equal(refreshed.canDelete, true);
  const related = await videos.getVocabularyVideos({ ...entry, normalizedWord: 'babies', inflections: [{ value: 'baby' }] });
  assert.equal(related.totalVideos, 1);
  assert.equal((await route.DELETE(request(items[1]))).status, 200);
  assert.equal(deleted.at(-1), media.toSupabaseSafeStoragePath(`vocabulary/${items[1]}`));
  assert.equal((await videos.getVocabularyVideos(entry)).totalVideos, 0);
  assert.ok(invalidated.includes('vocabulary-video-files'));
});
