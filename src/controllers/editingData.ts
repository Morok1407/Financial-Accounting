import { getDataFile, getDataArchiveFile } from "./searchData";
import { checkBill } from "../middleware/checkData";
import { expenditureTransaction, incomeTransaction } from "../middleware/transferring";
import { archiveExpenditurePlan, archiveIncomePlan } from "../middleware/duplicating";
import { pluginInstance, HistoryData, PlanData, BillData, TransferBetweenBills } from "../../main";

export const editingJsonToHistory = async (data: HistoryData, oldData: HistoryData) => {
    const { jsonData, content, file, status } = await getDataFile<HistoryData>('History')
    if(!(status === 'success')) return status
    if(!jsonData) return 'Error with data history'
    if(!content) return 'Error with content history'
    if(!file) return 'Error with file history'

    if(data.type === 'expense') {
        const resultCheckBill  = await checkBill(data, oldData)
        if(!(resultCheckBill === 'success')) resultCheckBill
    }

    if(data.type === 'expense') {
        const result = await expenditureTransaction(data, 'edit', oldData)
        if(result !== 'success') {
            return result
        }
    } else if (data.type === 'income') {
        const result = await incomeTransaction(data, 'edit', oldData)
        if(result !== 'success') {
            return result
        }
    } else {
        return 'Error'
    }

    try {
        const newData = jsonData.map(item => item.id === data.id ? {...item, ...data} : item)
        const dataStr = JSON.stringify(newData, null, 4);
        const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
        await pluginInstance.app.vault.modify(file, newContent)

        return "success"
    } catch (err) {
        return err
    }
}

export const editingJsonToPlan = async (data: PlanData) => {
    type Modifier = 'expense' | 'income';

    const sourceMap = {
        expense: () => getDataFile<PlanData>('Expenditure plan'),
        income: () => getDataFile<PlanData>('Income plan'),
    } as const;
    
    try {
        const loader = sourceMap[data.type];
        if (!loader) return 'Element not found'

        const { jsonData, content, file, status } = await loader();
        if (status !== 'success') return status;
        if (!jsonData) return ('jsonData is null or undefined');
        if(!file) return "History file is null or undefined"
        if(!content) return "History content is null or undefined"

        const newData = jsonData.map(item => item.id === data.id ? {...item, ...data} : item)
        const dataStr = JSON.stringify(newData, null, 4) + "\n```";
        const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr);
        await pluginInstance.app.vault.modify(file, newContent)

        if(data.type === 'expense') {
            await archiveExpenditurePlan()
        } else if (data.type === 'income') {
            await archiveIncomePlan()
        } else {
            return 'Error: Plan archiving error'
        }

        return "success"
    } catch (err) {
        return err
    }
}

export const editingJsonToBill = async (data: BillData) => {
    if (data.balance === '') {
        data.balance = '0'
    }
    
    const { jsonData, content, file, status } = await getDataArchiveFile<BillData>('Archive bills')
    if(!(status === 'success')) return status
    if(!jsonData) return 'Error with data bill'
    if(!content) return 'Error with content bill'
    if(!file) return 'Error with file bill'
    
    try {
        const newData = jsonData.map(item => item.id === data.id ? {...item, ...data} : item)
        const dataStr = JSON.stringify(newData, null, 4) + "\n```";
        const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr);
        await pluginInstance.app.vault.modify(file, newContent)

        return "success"
    } catch (err) {
        return err
    }
}

export const updateFile = async (newData: object, file: any, content: any) => {
    try {
        const dataStr = JSON.stringify(newData, null, 4);
        const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
        await pluginInstance.app.vault.modify(file, newContent);

        return 'success'
    } catch (error) {
        return `Error update ${file.name}: ${error}`
    }
}