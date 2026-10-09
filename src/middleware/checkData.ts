import Big from 'big.js'
import { getAdditionalData } from "../controllers/searchData";
import { HistoryData, ResultOfExecution, BillData, YearData } from "../../main";
import MainPlugin from '../../main';

export const validateHistory = async (data: HistoryData): Promise<ResultOfExecution> => {
    try {
        if (!new Big(data.amount).gt(0)) throw new Error();
    } catch {
        return { status: 'error', error: new Error('Enter a positive amount') };
    }
    const bills = await getAdditionalData<BillData>('accounts', undefined, true);
    if (bills.status === 'error') return bills;
    const bill = bills.jsonData.find(b => b.id === data.bill.id);
    if (!bill) return { status: 'error', error: new Error('Account not found') };
    data.currency = bill.currency;
    return { status: 'success' };
};

export const checkBill = async (data: HistoryData, oldData?: HistoryData ): Promise<ResultOfExecution> => {
    const bills = await getAdditionalData<BillData>('accounts', undefined, true);
    if(bills.status === 'error') return { status: 'error', error: bills.error};
    const bill = bills.jsonData.find(b => b.id === data.bill.id);

    if (!bill) {
        return { status: 'error', error: new Error(`Bill ${data.bill.id} not found`)};
    }

    const currentBalance = oldData && oldData.bill.id === data.bill.id && oldData.type === 'expense'
        ? new Big(bill.balance).plus(oldData.amount)
        : new Big(bill.balance);

    if (new Big(data.amount).gt(currentBalance)) {
        return { status: 'error', error: new Error(`On bill ${bill.name} insufficient funds`)};
    }

    return { status: "success" };
}

export const checkForDeletionData = async (
    id: string,
    modifier: 'plan' | 'bill'
): Promise<boolean> => {
    const adapter = MainPlugin.instance.app.vault.adapter;

    try {
        const dbList = await adapter.list(MainPlugin.instance.dbPath);

        const yearFiles = dbList.files.filter(f => /\d{4}\.json$/.test(f));

        for (const filePath of yearFiles) {
            const raw = await adapter.read(filePath);
            const yearData: YearData = JSON.parse(raw);

            for (const month of Object.values(yearData.months)) {
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
