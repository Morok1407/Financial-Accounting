import Big from 'big.js'
import { App } from 'obsidian'
import { getAdditionalData } from "../controllers/searchData";
import { HistoryData, ResultOfExecution, BillData } from "../../main";
import { DB_PATH } from '../controllers/DB';

declare const app: App;

export const checkBill = async (data: HistoryData, oldData?: HistoryData ): Promise<ResultOfExecution> => {
    const bills = await getAdditionalData<BillData>('accounts');
    if(bills.status === 'error') return { status: 'error', error: bills.error};
    const bill = bills.jsonData.find(b => b.id === data.bill.id);

    if (!bill) {
        return { status: 'error', error: new Error(`Bill ${data.bill.id} not found`)};
    }

    const currentBalance = oldData
        ? new Big(bill.balance).plus(oldData.amount)
        : new Big(bill.balance);

    if (new Big(data.amount).gte(currentBalance)) {
        return { status: 'error', error: new Error(`On bill ${bill.name} insufficient funds`)};
    }

    return { status: "success" };
}

export const checkForDeletionData = async (
    id: string,
    modifier: 'plan' | 'bill'
): Promise<boolean> => {
    const adapter = app.vault.adapter;

    try {
        const dbList = await adapter.list(DB_PATH);

        const yearFiles = dbList.files.filter(f => /\d{4}\.json$/.test(f));

        for (const filePath of yearFiles) {
            const raw = await adapter.read(filePath);
            const yearData = JSON.parse(raw);

            for (const month of Object.values(yearData.months) as any[]) {
                const found = month.history.some((item: HistoryData) => {
                    if (modifier === 'plan') return item?.category?.id === id;
                    if (modifier === 'bill') return item?.bill?.id === id;
                    return false;
                });

                if (found) return true;
            }
        }

        return false;
    } catch (err) {
        console.error('Error in checkForDeletionData:', err);
        throw err instanceof Error ? err : new Error(String(err));
    }
};