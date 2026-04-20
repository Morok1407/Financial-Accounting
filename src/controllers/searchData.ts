import { stateManager, DataFileResult, HistoryData, PlanData, BillData, DataItemResult, ResultOfAllData } from "../../main";
import { getDate } from "../middleware/otherFunc";
import MainPlugin from "../../main";

export const getAdditionalData = async <T>(option: 'accounts' | 'categories', categoriName?: 'income_plan' | 'expenditure_plan'): Promise<DataFileResult<T>> => {
    const filePath = `${MainPlugin.instance.dbPath}/${option}.json`;

    try {
        const file = await MainPlugin.instance.app.vault.adapter.read(filePath);
        if(categoriName === 'income_plan' || categoriName === 'expenditure_plan') {
            const jsonData: T[] = JSON.parse(file)[option][categoriName];
            const data: DataFileResult<T> = {
                jsonData, status: 'success'
            }
            return data;
        } else if(option === 'accounts') {
            const jsonData: T[] = JSON.parse(file)[option];
            const data: DataFileResult<T> = {
                jsonData, status: 'success'
            }
            return data;
        } else {
            return { status: 'error', error: new Error('Invalid option provided') };
        }
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(String(error))};
    }
}

export const getMainData = async <T>(option: 'history' | 'income_plan' | 'expenditure_plan'): Promise<DataFileResult<T>> => {
    const { selectedYear, selectedMonth } = stateManager();
    const { year, month } =
    selectedYear && selectedMonth
        ? { year: selectedYear, month: selectedMonth }
        : getDate();
    
    const filePath = `${MainPlugin.instance.dbPath}/${year}.json`;

    try {
        const file = await MainPlugin.instance.app.vault.adapter.read(filePath);
        const jsonData: T[] = JSON.parse(file).months[month][option];
        const data: DataFileResult<T> = {
            jsonData, status: 'success'
        }
        return data;
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(String(error))};
    }
}

export const getAllFile = async <T>(option: string): Promise<ResultOfAllData<T>> => {
    const filePath = `${MainPlugin.instance.dbPath}/${option}.json`;

    try {
        const file = await MainPlugin.instance.app.vault.adapter.read(filePath);
        const jsonData = JSON.parse(file);
        return { status: 'success', json: jsonData };
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(String(error))};
    }
}

export const searchElementById = async <T extends HistoryData | PlanData | BillData>(id: string, modifier: 'history' | 'expense' | 'income' | 'accounts'): Promise<DataItemResult<T | BillData>> => {
    const sourceMap = {
        history: () => getMainData<T>('history'),
        accounts: () => getAdditionalData<T>('accounts'),
        expense: () => getAdditionalData<T>('categories', 'expenditure_plan'),
        income: () => getAdditionalData<T>('categories', 'income_plan'),
    } as const;

    try {
        const loader = sourceMap[modifier];
        if (!loader) return { status: 'error', error: new Error('Element not found') };

        const result = await loader();
        if (result.status === 'error') return { status: 'error', error: result.error };

        const item = result.jsonData.find(item => item.id === id);
        if(item === undefined) return { status: 'error', error: new Error('Item is undefined') };
        const dataItem: DataItemResult<T | BillData> = {
            item, status: 'success',
        }
        return dataItem;

    } catch (err) {
        return { status: 'error', error: err instanceof Error ? err : new Error(String(err))};
    }
};

export const searchHistory = async (
    inputValue: string
): Promise<DataFileResult<HistoryData>> => {
    try {
        const search = inputValue.toLowerCase();

        const [
            history,
            expenditure,
            income,
            bills
        ] = await Promise.all([
            getMainData<HistoryData>('history'),
            getAdditionalData<PlanData>('categories', 'expenditure_plan'),
            getAdditionalData<PlanData>('categories', 'income_plan'),
            getAdditionalData<BillData>('accounts')
        ]);

        if (history.status === 'error') {
            return history
        }

        if (!history.jsonData) {
            throw new Error('History jsonData is null or undefined');
        }

        if(expenditure.status === 'error' || income.status === 'error' || bills.status === 'error') {
            throw new Error('One of the additional data files returned an error');
        }

        if (!expenditure.jsonData|| !income.jsonData || !bills.jsonData) {
            throw new Error('Additional data is null or undefined');
        }

        const additionalData = [
            ...expenditure.jsonData,
            ...income.jsonData,
            ...bills.jsonData
        ];

        const matchedAdditionalIds = additionalData
            .filter(item => 'name' in item && item.name.toLowerCase().includes(search))
            .map(item => item.id);

        const filteredHistory = history.jsonData.filter(item => {
            const baseMatch =
                item.type?.toLowerCase().includes(search) ||
                item.amount.toString().includes(inputValue) ||
                item.comment?.toLowerCase().includes(search);

            if (matchedAdditionalIds.length === 0) {
                return baseMatch;
            }

            return (
                baseMatch ||
                item.bill?.id && matchedAdditionalIds.includes(item.bill.id) ||
                item.category?.id && matchedAdditionalIds.includes(item.category.id)
            );
        });

        return {
            status: 'success',
            jsonData: filteredHistory.length ? filteredHistory : []
        };

    } catch (err) {
        return { status: 'error', error: err instanceof Error ? err : new Error(String(err))};
    }
};