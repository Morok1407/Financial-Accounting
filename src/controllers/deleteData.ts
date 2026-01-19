import { getDataFile, getDataArchiveFile } from "./searchData";
import { expenditureTransaction, incomeTransaction } from "../middleware/transferring"
import { checkForDeletionData } from "../middleware/checkData";
import { archiveExpenditurePlan, archiveIncomePlan } from "../middleware/duplicating";
import { HistoryData, PlanData, BillData, ResultOfExecution } from "../../main";
import MainPlugin from "../../main";

export const deleteHistory = async (element: HistoryData): Promise<ResultOfExecution> => {
    if(element === null || element === undefined) return {status: 'error', error: new Error('Element is null or undefined')};

    const historyData = await getDataFile<HistoryData>('History')
    if(historyData.status === 'error') return {status: 'error', error: historyData.error};
    if(historyData.file === null || historyData.file === undefined) return {status: 'error', error: new Error('History file is null or undefined')};
    if(historyData.content === null || historyData.content === undefined) return {status: 'error', error: new Error('History content is null or undefined')};
    if(historyData.jsonData === null || historyData.jsonData === undefined) return {status: 'error', error: new Error('History data is null or undefined')};

    if(element.type === 'expense') {
        const result = await expenditureTransaction(element, 'remove')
        if(result.status === 'error') return { status: 'error', error: result.error }
    } else if (element.type === 'income') {
        const result = await incomeTransaction(element, 'remove')
        if(result.status === 'error') return { status: 'error', error: result.error }
    } else {
        return { status: 'error', error: new Error('Unknown transaction type') }
    }

    if(historyData.jsonData.length <= 1) {
        try {
            const newContent = historyData.content.replace(/```json[\s\S]*?```/, "```json\n```");
            await MainPlugin.instance.app.vault.modify(historyData.file, newContent);        
            
            return { status: 'success' }
        } catch (error) {
            return { status: 'error', error: new Error(`Error deleting item: ${error}`)}
        }
    } else {
        try {
            const newData = historyData.jsonData.filter(item => item.id !== element.id);
            const dataStr = JSON.stringify(newData, null, 4);
            const newContent = historyData.content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await MainPlugin.instance.app.vault.modify(historyData.file, newContent);
        
            return { status: 'success' }
        } catch (error) {
            return { status: 'error', error: new Error(`Error deleting item: ${error}`)}
        }
    }
}

export const deletePlan = async (item: PlanData): Promise<ResultOfExecution> => {
    const { id, name, emoji, type } = item;
    if(!id) return { status: 'error', error: new Error('Element not found')}

    const sourceMap = {
        expense: () => getDataFile<PlanData>('Expenditure plan'),
        income: () => getDataFile<PlanData>('Income plan'),
    } as const;

    try {
        const loader = sourceMap[type];
        if (!loader) return { status: 'error', error: new Error('Element not found')}

        const data = await loader();
        if (data.status === 'error') return { status: 'error', error: data.error};
        if(data.file === null || data.file === undefined) return { status: 'error', error: new Error('History file is null or undefined')}
        if(data.content === null || data.content === undefined) return { status: 'error', error: new Error('History content is null or undefined')}
        if(data.jsonData === null || data.jsonData === undefined) return { status: 'error', error: new Error('History data is null or undefined')}

        if(await checkForDeletionData(id, 'plan')) return { status: 'error', error: new Error(`The category ${emoji} • ${name} cannot be deleted because it is used in history.`)};
        
        let newContent: string | 'Error';

        if (data.jsonData.length <= 1) {
            newContent = data.content.replace(/```json[\s\S]*?```/, "```json\n```");
        } else if (data.jsonData.length >= 2) {
            const newData = data.jsonData.filter(item => item.id !== id);
            const dataStr = JSON.stringify(newData, null, 4);
            newContent = data.content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
        } else {
            newContent = 'Error'
        }
        
        if(newContent === 'Error') return { status: 'error', error: new Error('Error with create new content')}

        await MainPlugin.instance.app.vault.modify(data.file, newContent);
        if(type === 'expense') {
            const resultArchive = await archiveExpenditurePlan()
            if(resultArchive.status === 'error') return { status: 'error', error: resultArchive.error } 
        } else if (type === 'income') {
            const resultArchive = await archiveIncomePlan()
            if(resultArchive.status === 'error') return { status: 'error', error: resultArchive.error } 
        } else {
            return { status: 'error', error: new Error('The plan has an invalid type.')}
        }

        return { status: 'success'}
    } catch (error) {
        return { status: 'error', error: new Error(`Error deleting item: ${error}`)}
    }
}

export const deleteBill = async (item: BillData): Promise<ResultOfExecution> => {
    const { id, name, emoji } = item;
    if(!id) return { status: 'error', error: new Error('Element not found')}

    const billData = await getDataArchiveFile<BillData>('Archive bills')
    if (billData.status === 'error') return { status: 'error', error: billData.error};
    if (!billData.jsonData) return { status: 'error', error: new Error('jsonData is null or undefined')};
    if(!billData.file) return { status: 'error', error: new Error("History file is null or undefined")}
    if(!billData.content) return { status: 'error', error: new Error("History content is null or undefined")}

    try {
        if(await checkForDeletionData(id, 'bill')) return { status: 'error', error: new Error(`The bill ${emoji} • ${name} cannot be deleted because it is in use in history.`)}

        let newContent: string | 'Error';

        if (billData.jsonData.length <= 1) {
            newContent = billData.content.replace(/```json[\s\S]*?```/, "```json\n```");
        } else if (billData.jsonData.length >= 2) {
            const newData = billData.jsonData.filter(item => item.id !== id);
            const dataStr = JSON.stringify(newData, null, 4);
            newContent = billData.content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
        } else {
            newContent = 'Error';
        }

        if(newContent === 'Error') return { status: 'error', error: new Error('Error with create new content')}
        await MainPlugin.instance.app.vault.modify(billData.file, newContent);
        
        return { status: 'success'}

    } catch (error) {
        return { status: 'error', error: new Error(`Error deleting item: ${error}`)}
    }
}