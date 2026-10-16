const assert = require('node:assert/strict');
const esbuild = require('esbuild');

(async () => {
    const result = await esbuild.build({
        entryPoints: ['src/controllers/exportData.ts'], bundle: true,
        platform: 'node', format: 'cjs', write: false,
    });
    const mod = { exports: {} };
    new Function('module', 'exports', result.outputFiles[0].text)(mod, mod.exports);
    const tx = (date, type, currency) => ({
        id: date, date, type, currency, amount: '123.4500',
        category: { id: 'shared' }, bill: { id: 'bank' }, comment: 'Кофе, "большой"\nС собой',
    });
    const files = {
        'db/accounts.json': { accounts: [{ id: 'bank', name: 'Банк', emoji: '🏦', currency: 'KZT', archived: true }] },
        'db/categories.json': { categories: {
            expenditure_plan: [{ id: 'shared', name: 'Еда', emoji: '⭐', type: 'expense' }],
            income_plan: [{ id: 'shared', name: 'Зарплата', emoji: '💰', type: 'income' }],
        } },
        'db/2025.json': { months: { 12: { history: [tx('2025-12-01T12:00:00', 'expense')] } } },
        'db/2026.json': { months: { 1: { history: [tx('2026-01-01T12:00:00', 'income', 'USD')] }, 2: { history: [] } } },
    };
    const created = new Map();
    const plugin = { dbPath: 'db', settings: { baseCurrency: 'EUR' }, app: { vault: {
        adapter: {
            read: async path => JSON.stringify(files[path]),
            list: async () => ({ files: Object.keys(files).reverse() }),
            exists: async path => created.has(path),
        },
        create: async (path, content) => { assert(!created.has(path)); created.set(path, content); },
    } } };
    const path = await mod.exports.exportHistoryCsv(plugin);
    assert.match(path, /^financial-accounting-history-[^/\\]+\.csv$/);
    const csv = created.get(path);
    assert(csv.startsWith('\uFEFF"Date","Type","Amount","Currency","Category","Account","Note"\r\n'));
    assert(csv.includes('"123.4500","KZT","Еда ⭐","Банк 🏦","Кофе, ""большой""\nС собой"'));
    assert(csv.includes('"USD","Зарплата 💰","Банк 🏦"'));
    assert(csv.indexOf('2025-12') < csv.indexOf('2026-01'));
    files['db/2026.json'].months[2].history = [
        { ...tx('2026-02-01T12:00:00', 'expense'), amount: 42.5, comment: 123 },
        { ...tx('2026-02-02T12:00:00', 'expense'), amount: 0, comment: null },
    ];
    const legacyPath = await mod.exports.exportHistoryCsv(plugin);
    const legacyCsv = created.get(legacyPath);
    assert(legacyCsv.includes('"42.5","KZT","Еда ⭐","Банк 🏦","123"\r\n'));
    assert(legacyCsv.includes('"0","KZT","Еда ⭐","Банк 🏦",""\r\n'));
    assert.equal(files['db/2026.json'].months[2].history[0].amount, 42.5, 'export must not modify source data');
    plugin.app.vault.adapter.read = async () => { throw new Error('Read failed'); };
    await assert.rejects(mod.exports.exportHistoryCsv(plugin), /Read failed/);
    assert.equal(created.size, 2, 'failed reads must not produce incomplete exports');
    console.log('CSV export checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
