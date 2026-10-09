const assert = require('node:assert/strict');
const esbuild = require('esbuild');

(async () => {
    const result = await esbuild.build({
        stdin: { contents: `export { default as Plugin } from './main'; export * from './src/controllers/DB';`, resolveDir: process.cwd(), loader: 'ts' },
        bundle: true, platform: 'node', format: 'cjs', write: false,
        plugins: [{ name: 'obsidian-test', setup(build) {
            build.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'test' }));
            build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `
                export class Plugin {} export class ItemView {} export class Modal {}
                export class PluginSettingTab {} export class Setting {} export class Notice {}
                export class Menu {} export const Platform = {}; export function setIcon() {}
            ` }));
        } }],
    });
    const mod = { exports: {} };
    new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports);
    const { Plugin, initDB, generateYearlyFile } = mod.exports;
    const plugin = new Plugin();
    Plugin.instance = plugin;
    const files = new Map();
    let saved = null;
    plugin.loadData = async () => saved;
    plugin.saveData = async data => { saved = structuredClone(data); };
    plugin.app = { vault: {
        configDir: '.obsidian',
        adapter: {
            exists: async path => files.has(path),
            read: async path => { if (!files.has(path)) throw Error('Missing ' + path); return files.get(path); },
        },
        createFolder: async path => { files.set(path, null); },
        create: async (path, text) => { assert.ok(!files.has(path)); files.set(path, text); },
    } };

    await plugin.loadSettings();
    const year = new Date().getFullYear();
    assert.equal(plugin.settings.startYear, year);
    assert.equal(plugin.settings.baseCurrency, 'USD');
    assert.equal(saved.startYear, year, 'first launch persists defaults');
    plugin.loadData = async () => { throw Error('DB must use resolved settings'); };
    assert.equal((await initDB()).status, 'success');
    assert.equal((await generateYearlyFile()).status, 'success');
    const annual = JSON.parse(files.get(`${plugin.dbPath}/${year}.json`));
    assert.equal(Object.keys(annual.months).length, 12);
    assert.ok(Object.values(annual.months).every(month => month.history.length === 0));
    const snapshot = [...files];
    assert.equal((await initDB()).status, 'success');
    assert.equal((await generateYearlyFile()).status, 'success');
    assert.deepEqual([...files], snapshot, 'reopening preserves existing files');

    files.set(`${plugin.dbPath}/categories.json`, JSON.stringify({ categories: {
        income_plan: [{ id: 'salary' }], expenditure_plan: [{ id: 'food' }],
    } }));
    plugin.settings.startYear = year - 1;
    assert.equal((await generateYearlyFile()).status, 'success', 'new year works with existing categories');
    assert.ok(files.has(`${plugin.dbPath}/${year - 1}.json`));
    saved = { startYear: year - 2, baseCurrency: 'KZT' };
    plugin.loadData = async () => saved;
    await plugin.loadSettings();
    assert.equal(plugin.settings.baseCurrency, 'KZT');
    assert.equal(plugin.settings.startYear, year - 2);
    console.log('First-run and existing-data checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
