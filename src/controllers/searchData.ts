import { App, TFile } from 'obsidian'
import { stateManager, DataFileResult, HistoryData, PlanData, BillData, DataItemResult } from "../../main";
import { getDate } from "../middleware/otherFunc";
import { createDirectory } from "./createDirectory";
import MainPlugin from "../../main";

declare const app: App;

export const getDataFile = async <T>(fileName: 'History' | 'Expenditure plan' | 'Income plan'): Promise<DataFileResult<T>> => {
    const { selectedYear, selectedMonth } = stateManager();
    const { year, month } =
    selectedYear && selectedMonth
        ? { year: selectedYear, month: selectedMonth }
        : getDate();
    const filePath = `${MainPlugin.instance.settings.targetFolder}/${year}/${month}/${fileName}.md`;
    const file = app.vault.getAbstractFileByPath(filePath);
    if(!(file instanceof TFile)) {
        await createDirectory()
        return { status: 'error', error: new Error(`File not found: ${filePath}. Please try again`) }
    }
    const content: string = await app.vault.read(file);
    if(!content) {
        return { status: 'error', error: new Error(`File is empty: ${filePath}`) }
    }
    const jsonMatch = content.match(/```json([\s\S]*?)```/);
    if(jsonMatch === null) throw new Error('jsonMatch file is null')
    let jsonData: T[] | null;
    if(jsonMatch[1].length > 3) {
        jsonData = JSON.parse(jsonMatch[1].trim());
    } else {
        jsonData = null;
    }
    const dataFile: DataFileResult<T> = {
        jsonData, content, file, status: 'success'
    }
    return dataFile
}

export const getSpecificFile = async <T>(fileName: string, year: string, month: string): Promise<DataFileResult<T>> => {
    const filePath = `${MainPlugin.instance.settings.targetFolder}/${year}/${month}/${fileName}.md`
    const file = app.vault.getAbstractFileByPath(filePath);
    if(!(file instanceof TFile)) {
        return { status: 'error', error: new Error(`File not found: ${filePath}`) }
    }
    const content = await app.vault.read(file);
    if(!content) {
        return { status: 'error', error: new Error(`File is empty: ${filePath}`) }
    }
    const jsonMatch = content.match(/```json([\s\S]*?)```/);
    if(jsonMatch === null) throw new Error('jsonMatch file is null')
    let jsonData;
    if(jsonMatch[1].length > 3) {
        jsonData = JSON.parse(jsonMatch[1].trim());
    } else {
        jsonData = null;
    }
    const dataFile: DataFileResult<T> = {
        jsonData, content, file, status: 'success'
    }
    return dataFile
}

export const getDataArchiveFile = async <T>(fileName: 'Archive bills' | 'Archive expenditure plan' | 'Archive income plan'): Promise<DataFileResult<T>> => {
    const filePath = `${MainPlugin.instance.settings.targetFolder}/Archive/${fileName}.md`
    const file = app.vault.getAbstractFileByPath(filePath);
    if(!(file instanceof TFile)) {
        await createDirectory()
        return { status: 'error', error: new Error(`File not found: ${filePath}. Please try again`) }
    }
    const content = await app.vault.read(file);
    if(!content) {
        return { status: 'error', error: new Error(`File is empty: ${filePath}`) }
    }
    const jsonMatch = content.match(/```json([\s\S]*?)```/);
    if(jsonMatch === null) throw new Error('jsonMatch file is null')
    let jsonData;
    if(jsonMatch[1].length > 3) {
        jsonData = JSON.parse(jsonMatch[1].trim());
    } else {
        jsonData = null;
    }
    const dataFile: DataFileResult<T> = {
        jsonData, content, file, status: 'success'
    }
    return dataFile
}

export const searchElementById = async <T extends HistoryData | PlanData | BillData>(id: string, modifier: 'History' | 'expense' | 'income' | 'Archive bills'): Promise<DataItemResult<T>> => {
    const sourceMap = {
        History: () => getDataFile<T>('History'),
        expense: () => getDataFile<T>('Expenditure plan'),
        income: () => getDataFile<T>('Income plan'),
        'Archive bills': () => getDataArchiveFile<T>('Archive bills')
    } as const;

    try {
        const loader = sourceMap[modifier];
        if (!loader) return { status: 'error', error: new Error('Element not found') };

        const result = await loader();
        if (result.status === 'error') return { status: 'error', error: result.error };

        if (!result.jsonData) return { status: 'error', error: new Error('jsonData is null or undefined') };

        const item = result.jsonData.find(item => item.id === id);
        if(item === undefined) return { status: 'error', error: new Error('Item is undefined') };
        const dataItem: DataItemResult<T> = {
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
            getDataFile<HistoryData>('History'),
            getDataFile<PlanData>('Expenditure plan'),
            getDataFile<PlanData>('Income plan'),
            getDataArchiveFile<BillData>('Archive bills')
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
            jsonData: filteredHistory.length ? filteredHistory : null
        };

    } catch (err) {
        return { status: 'error', error: err instanceof Error ? err : new Error(String(err))};
    }
};
