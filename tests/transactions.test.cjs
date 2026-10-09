const assert = require('node:assert/strict');
const esbuild = require('esbuild');

(async () => {
    const result = await esbuild.build({
        stdin: { contents: `export { default as Plugin, stateManager } from './main';
            export * from './src/controllers/addData'; export * from './src/controllers/editingData';
            export * from './src/controllers/deleteData'; export * from './src/middleware/transferring';
            export * from './src/middleware/checkData';`, resolveDir: process.cwd(), loader: 'ts' },
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
    const api = mod.exports;
    const plugin = new api.Plugin();
    api.Plugin.instance = plugin;
    api.stateManager({ selectedYear: '2026', selectedMonth: '10', selectedCurrency: 'USD' });
    const bill = (id, currency, balance) => ({ id, currency, balance, name: id, emoji: '💳', generalBalance: true, archived: false });
    const files = {
        accounts: { accounts: [bill('usd', 'USD', '100'), bill('eur', 'EUR', '50'), bill('usd2', 'USD', '0')] },
        categories: { categories: { income_plan: [], expenditure_plan: [] } },
        2026: { year: 2026, months: { 10: { history: [] } } },
    };
    let failWrite = false;
    let writes = 0;
    const key = path => path.split('/').pop().replace('.json', '');
    plugin.app = { vault: { configDir: '.obsidian', adapter: {
        exists: async path => key(path) in files,
        read: async path => JSON.stringify(files[key(path)]),
        write: async (path, json) => { if (failWrite) throw Error('Disk unavailable'); writes++; files[key(path)] = JSON.parse(json); },
        list: async () => ({ files: [`${plugin.dbPath}/2026.json`], folders: [] }),
    } } };
    const balance = id => files.accounts.accounts.find(b => b.id === id).balance;
    const tx = (id, account, amount, type = 'expense') => ({ id, bill: { id: account }, category: { id: 'food' }, amount, type, date: '2026-10-09T12:00:00' });
    const ok = result => assert.equal(result.status, 'success', result.error?.message);
    const bad = result => assert.equal(result.status, 'error');

    ok(await api.addJsonToPlan({ id: 'food', name: 'Food', emoji: '🍕', type: 'expense', amount: '0', parentId: null, archived: false }));
    const expense = tx('a', 'usd', '0.125');
    ok(await api.addJsonToHistory(expense));
    assert.equal(balance('usd'), '99.875');
    assert.equal(files[2026].months[10].history[0].currency, 'USD');
    const edited = { ...expense, bill: { id: 'eur' }, amount: '5' };
    writes = 0;
    ok(await api.editingJsonToHistory(edited, expense));
    assert.equal(writes, 2, 'one accounts write and one history write');
    assert.equal(balance('usd'), '100');
    assert.equal(balance('eur'), '45');
    bad(await api.deleteBill(files.accounts.accounts.find(b => b.id === 'eur')));
    bad(await api.deletePlan(files.categories.categories.expenditure_plan[0]));
    ok(await api.deleteHistory(edited));
    assert.equal(balance('eur'), '50');
    assert.equal(files[2026].months[10].history.length, 0);
    ok(await api.checkBill(tx('full', 'usd', '100')));
    bad(await api.checkBill(tx('over', 'usd2', '1'), expense));
    const income = tx('income', 'eur', '0.1', 'income');
    ok(await api.addJsonToHistory(income));
    assert.equal(balance('eur'), '50.1');
    ok(await api.deleteHistory(income));
    assert.equal(balance('eur'), '50');
    for (const amount of ['-1', '0', 'invalid']) bad(await api.addJsonToHistory(tx('bad', 'usd', amount)));

    ok(await api.transferBetweenBills({ type: 'same-currency', fromBillId: 'usd', toBillId: 'usd2', amount: '10.125' }));
    assert.equal(balance('usd'), '89.875');
    assert.equal(balance('usd2'), '10.125');
    ok(await api.transferBetweenBills({ type: 'cross-currency', fromBillId: 'usd', toBillId: 'eur', sourceAmount: '10', targetAmount: '9.25' }));
    assert.equal(balance('eur'), '59.25');
    const snapshot = JSON.stringify(files);
    for (const amount of ['-1', '0', 'invalid', '999']) bad(await api.transferBetweenBills({ type: 'same-currency', fromBillId: 'usd', toBillId: 'usd2', amount }));
    bad(await api.transferBetweenBills({ type: 'same-currency', fromBillId: 'usd', toBillId: 'usd', amount: '1' }));
    bad(await api.transferBetweenBills({ type: 'same-currency', fromBillId: 'usd', toBillId: 'eur', amount: '1' }));
    assert.equal(JSON.stringify(files), snapshot);
    failWrite = true;
    bad(await api.transferBetweenBills({ type: 'same-currency', fromBillId: 'usd', toBillId: 'usd2', amount: '1' }));
    assert.equal(JSON.stringify(files), snapshot);
    console.log('Transaction, transfer, precision, validation and write-failure checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
