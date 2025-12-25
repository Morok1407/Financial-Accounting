import { getDataFile, getDataArchiveFile } from "./searchData";
import { expenditureTransaction, incomeTransaction } from "../middleware/transferring"
import { checkForDeletionData } from "../middleware/checkData";
import { archiveExpenditurePlan, archiveIncomePlan } from "../middleware/duplicating";
import { pluginInstance, HistoryData, PlanData, BillData } from "../../main";
import { json } from "stream/consumers";
import { addJsonToPlan } from "./addData";

export const deleteHistory = async (element: HistoryData) => {
    if(element === null || element === undefined) return 'Element not found'

    const { jsonData: data, content, file, status } = await getDataFile<HistoryData>('History')
    if(status !== 'success') return status
    if(file === null || file === undefined) return "History file is null or undefined"
    if(content === null || content === undefined) return "History content is null or undefined"
    if(data === null || data === undefined) return "History data is null or undefined"

    if(element.type === 'expense') {
        const result = await expenditureTransaction(element, 'remove')
        if(result !== 'success') return result
    } else if (element.type === 'income') {
        const result = await incomeTransaction(element, 'remove')
        if(result !== 'success') return result
    } else {
        return 'Error'
    }

    if(data.length <= 1) {
        try {
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n```");
            await pluginInstance.app.vault.modify(file, newContent);        
            
            return "success"
        } catch (error) {
            return (`Error deleting item: ${error}`)
        }
    } else {
        try {
            const newData = data.filter(item => item.id !== element.id);
            const dataStr = JSON.stringify(newData, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await pluginInstance.app.vault.modify(file, newContent);
        
            return "success"
        } catch (error) {
            return (`Error deleting item: ${error}`)
        }
    }
}

export const deletePlan = async (item: PlanData) => {
    const { id, name, emoji, type } = item;
    if(!id) return 'Element not found';

    type Modifier = 'expense' | 'income';

    const sourceMap = {
        expense: () => getDataFile<PlanData>('Expenditure plan'),
        income: () => getDataFile<PlanData>('Income plan'),
    } as const;

    try {
        const loader = sourceMap[type];
        if (!loader) return 'Element not found'

        const { jsonData, content, file, status } = await loader();
        if (status !== 'success') return status;
        if (!jsonData) return ('jsonData is null or undefined');
        if(!file) return "History file is null or undefined"
        if(!content) return "History content is null or undefined"

        if(await checkForDeletionData(id, 'plan')) return `The category ${emoji} • ${name} cannot be deleted because it is used in history.`

        const createNewContent = (): string => {
            if (jsonData.length <= 1) {
                const newContent = content.replace(/```json[\s\S]*?```/, "```json\n```");
                return newContent
            } else if (jsonData.length >= 2) {
                const newData = jsonData.filter(item => item.id !== id);
                const dataStr = JSON.stringify(newData, null, 4);
                const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
                return newContent
            } else {
                return 'Error'
            }
        }

        const newContent = createNewContent()
        if(newContent === 'Error') return 'Error with create new content'
        await pluginInstance.app.vault.modify(file, newContent);
        if(type === 'expense') {
            const resultArchive = await archiveExpenditurePlan()
            if(!(resultArchive === 'success')) {
                return 'Error archiving expense plan'
            }
        } else if (type === 'income') {
            const resultArchive = await archiveIncomePlan()
            if(!(resultArchive === 'success')) {
                return 'Error archiving income plan'
            }
        } else {
            return 'Error'
        }

        return "success"
    } catch (error) {
        return (`Error deleting item: ${error}`)
    }
}

export const deleteBill = async (item: BillData) => {
    const { id, name, emoji } = item;
    if(!id) return 'Element not found'

    const { jsonData, content, file, status } = await getDataArchiveFile<BillData>('Archive bills')
    if (status !== 'success') return status;
    if (!jsonData) return ('jsonData is null or undefined');
    if(!file) return "History file is null or undefined"
    if(!content) return "History content is null or undefined"

    try {
        if(await checkForDeletionData(id, 'bill')) return 'The bill ${emoji} • ${name} cannot be deleted because it is in use in history.'

        const createNewContent = (): string => {
            if (jsonData.length <= 1) {
                const newContent = content.replace(/```json[\s\S]*?```/, "```json\n```");
                return newContent
            } else if (jsonData.length >= 2) {
                const newData = jsonData.filter(item => item.id !== id);
                const dataStr = JSON.stringify(newData, null, 4);
                const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
                return newContent
            } else {
                return 'Error'
            }
        }

        const newContent = createNewContent()
        if(newContent === 'Error') return 'Error with create new content'
        await pluginInstance.app.vault.modify(file, newContent);
        
        return "success"

    } catch (error) {
        return (`Error deleting item: ${error}`)
    }
}