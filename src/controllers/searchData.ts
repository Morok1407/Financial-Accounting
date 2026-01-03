import { App, TFile } from 'obsidian'
import { pluginInstance, stateManager, DataFileResult, HistoryData, PlanData, BillData } from "../../main";
import { getDate } from "../middleware/otherFunc";
import { createDirectory } from "./createDirectory";

declare const app: App;

export const getDataFile = async <T>(fileName: 'History' | 'Expenditure plan' | 'Income plan'): Promise<DataFileResult<T>> => {
    const { selectedYear, selectedMonth } = stateManager();
    const { year, month } =
    selectedYear && selectedMonth
        ? { year: selectedYear, month: selectedMonth }
        : getDate();
    const filePath = `${pluginInstance.settings.targetFolder}/${year}/${month}/${fileName}.md`;
    const file = app.vault.getAbstractFileByPath(filePath);
    if(!(file instanceof TFile)) {
        await createDirectory()
        return { status: `File not found: ${filePath}. Please try again` }
    }
    const content = await app.vault.read(file);
    if(!content) {
        return { status: `File is empty: ${filePath}` }
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

export const getSpecificFile = async <T>(fileName: string, year: string, month: string): Promise<DataFileResult<T>> => {
    const filePath = `${pluginInstance.settings.targetFolder}/${year}/${month}/${fileName}.md`
    const file = app.vault.getAbstractFileByPath(filePath);
    if(!(file instanceof TFile)) {
        return { status: `File not found` }
    }
    const content = await app.vault.read(file);
    if(!content) {
        return { status: `File is empty` }
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
    const filePath = `${pluginInstance.settings.targetFolder}/Archive/${fileName}.md`
    const file = app.vault.getAbstractFileByPath(filePath);
    if(!(file instanceof TFile)) {
        await createDirectory()
        return { status: `File not found: ${filePath}. Please try again` }
    }
    const content = await app.vault.read(file);
    if(!content) {
        return { status: `File is empty: ${filePath}` }
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

export const searchElementById = async (id: string, modifier: 'History' | 'expense' | 'income' | 'Archive bills') => {
    const sourceMap = {
        History: () => getDataFile<HistoryData>('History'),
        expense: () => getDataFile<PlanData>('Expenditure plan'),
        income: () => getDataFile<PlanData>('Income plan'),
        'Archive bills': () => getDataArchiveFile<BillData>('Archive bills')
    } as const;

    try {
        const loader = sourceMap[modifier];
        if (!loader) return 'Element not found'

        const { jsonData, status } = await loader();
        if (status !== 'success') return status;

        if (!jsonData) {
            throw new Error('jsonData is null or undefined');
        }

        const item = (jsonData as Array<{ id: string }>).find(item => item.id === id);

        return item
            ? { status: 'success', item }
            : { status: 'Item not found' };

    } catch (err) {
        return { status: err };
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

        if (history.status !== 'success') {
            return { status: history.status };
        }

        if (!history.jsonData) {
            throw new Error('History jsonData is null or undefined');
        }

        if (!expenditure.jsonData || !income.jsonData || !bills.jsonData) {
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
        return { status: err };
    }
};
