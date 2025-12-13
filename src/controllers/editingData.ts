import { getDataFile, getDataArchiveFile } from "./searchData";
import { checkBill } from "../middleware/checkData";
import { expenditureTransaction, incomeTransaction } from "../middleware/transferring";
import { archiveExpenditurePlan, archiveIncomePlan } from "../middleware/duplicating";
import { pluginInstance } from "../../main";

export const editingJsonToHistory = async (data: object, oldData?: object) => {
    if(data.amount === 0) {
        return 'Cannot be corrected to 0'
    }

    const { jsonData, content, file, status } = await getDataFile('History')
    if(!(status === 'success')) {
        return status
    }

    if(data.type === 'expense') {
        const resultCheckBill  = await checkBill(data, oldData)
        if(!(resultCheckBill === 'success')) {
            return resultCheckBill
        }
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

export const editingJsonToPlan = async (data: object) => {
    const { jsonData, content, file, status } = await getDataFile(data.type === 'expense' ? 'Expenditure plan' : data.type === 'income' ? 'Income plan' : 'Error')
    if(!(status === 'success')) {
        return status
    }
    
    try {
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

export const editingJsonToBill = async (data: object) => {
    const { jsonData, content, file, status } = await getDataArchiveFile('Archive bills')
    if(!(status === 'success')) {
        return status
    }
    
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

        return { status: 'success' }
    } catch (error) {
        return `Error update ${file.name}: ${error}`
    }
}

export const transferJsonToBills = async (data: object) => {
    if(data.fromBillId === data.toBillId) {
        return 'Cannot transfer to the same bill'
    }

    const { jsonData: resultBills, file, content, status } = await getDataArchiveFile('Archive bills')
    if(!status) {
        return status
    }
    const bill = resultBills.find(b => b.id === data.fromBillId);
    if(data.amount > bill.balance) {
        return `Insufficient funds in the ${bill.name}`
    }
    
    let fromBillBalance;
    let toBillBalance;
    resultBills.forEach((e, i) => {
        if(e.id === data.fromBillId) {
            fromBillBalance = resultBills[i].balance;
        }
        if(e.id === data.toBillId) {
            toBillBalance = resultBills[i].balance;
        }
    })

    try {
        fromBillBalance -= Number(data.amount)
        toBillBalance += Number(data.amount)

        const newData = resultBills.map(item => {
            if(item.id === data.fromBillId) {
                return { ...item, balance: fromBillBalance };
            } else if (item.id === data.toBillId) {
                return { ...item, balance: toBillBalance };
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