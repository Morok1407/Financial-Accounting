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

export const transferJsonToBills = async (data: TransferBetweenBills) => {
    if(data.fromBillId === data.toBillId) {
        return 'Cannot transfer to the same bill'
    }

    const { jsonData: resultBills, file, content, status } = await getDataArchiveFile<BillData>('Archive bills')
    if(!status) return status
    if(!resultBills) return 'Bills is null or undefined'
    if(!content) return 'Bill content is null or undefined'
    if(!file) return 'Bill file is null or undefined'

    const bill = resultBills.find(b => b.id === data.fromBillId);
    if(!bill) return 'Bill is null or undefined'
    if(data.amount > bill.balance) {
        return `Insufficient funds in the ${bill.name}`
    }
    
    const amount = Number(data.amount);

    const fromBill = resultBills.find(b => b.id === data.fromBillId);
    const toBill = resultBills.find(b => b.id === data.toBillId);

    if (!fromBill || !toBill) {
        throw new Error('Один из счетов не найден');
    }

    fromBill.balance -= amount;
    toBill.balance += amount;

    try {

        const newData = resultBills.map(item => {
            if(item.id === data.fromBillId) {
                return { ...item, balance: fromBill.balance };
            } else if (item.id === data.toBillId) {
                return { ...item, balance: toBill.balance };
            } else {
                return item;
            }
        })

        const dataStr = JSON.stringify(newData, null, 4);
        const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
        await pluginInstance.app.vault.modify(file, newContent);

        return 'success'
    } catch (error) {
        return error
    }
}