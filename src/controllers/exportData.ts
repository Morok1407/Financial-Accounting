import type MainPlugin from '../../main';
import type { accountsData, categoriesData, HistoryData, YearData } from '../../main';

// JSON from older versions may contain numbers despite the current TS types.
const csvCell = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;
const label = (item: { name: string; emoji: string } | undefined, id: string): string =>
    item ? `${item.name} ${item.emoji}`.trim() : id;

export async function exportHistoryCsv(plugin: MainPlugin): Promise<string> {
    const { vault } = plugin.app;
    const { adapter } = vault;
    const accounts: accountsData = JSON.parse(await adapter.read(`${plugin.dbPath}/accounts.json`));
    const categories: categoriesData = JSON.parse(await adapter.read(`${plugin.dbPath}/categories.json`));
    const accountMap = new Map(accounts.accounts.map(item => [item.id, item]));
    const categoryMap = new Map([
        ...categories.categories.expenditure_plan,
        ...categories.categories.income_plan,
    ].map(item => [`${item.type}:${item.id}`, item]));
    const listing = await adapter.list(plugin.dbPath);
    const history: HistoryData[] = [];
    for (const path of listing.files.filter(path => /(?:^|\/)\d{4}\.json$/.test(path)).sort()) {
        const data: YearData = JSON.parse(await adapter.read(path));
        for (const month of Object.values(data.months)) history.push(...month.history);
    }
    history.sort((a, b) => a.date.localeCompare(b.date));
    const rows = [['Date', 'Type', 'Amount', 'Currency', 'Category', 'Account', 'Note']];
    for (const item of history) {
        const account = accountMap.get(item.bill.id);
        rows.push([
            item.date,
            item.type === 'expense' ? 'Expense' : 'Income',
            item.amount,
            item.currency || account?.currency || plugin.settings.baseCurrency,
            label(categoryMap.get(`${item.type}:${item.category.id}`), item.category.id),
            label(account, item.bill.id),
            item.comment ?? '',
        ]);
    }
    // UTF-8 BOM preserves Cyrillic and emoji when opening the CSV in Excel.
    const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
    const stem = `financial-accounting-history-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    let path = `${stem}.csv`;
    let suffix = 1;
    while (await adapter.exists(path)) path = `${stem}-${suffix++}.csv`;
    await vault.create(path, csv);
    return path;
}
