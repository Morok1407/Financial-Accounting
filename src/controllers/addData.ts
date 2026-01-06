import { getDataArchiveFile, getDataFile } from "./searchData";
import { archiveExpenditurePlan, archiveIncomePlan } from "../middleware/duplicating";
import { checkBill } from "../middleware/checkData";
import { expenditureTransaction, incomeTransaction } from "../middleware/transferring";
import { pluginInstance, HistoryData, PlanData, BillData } from "../../main";

export const addJsonToHistory = async (data: HistoryData) => {
    const resultCheckBill  = await checkBill(data)
    if(data.type === 'expense') {
        if(!(resultCheckBill === 'success')) {
            return resultCheckBill
        }
    }

    const { jsonData, content, file, status } = await getDataFile('History')
    if (status !== 'success') return status;

    if(data.type === 'expense') {
        const result = await expenditureTransaction(data, 'add')
        if (result !== 'success') return result;
    } else if (data.type === 'income') {
        const result = await incomeTransaction(data, 'add')
        if (result !== 'success') return result;
    } else {
        return 'Error'
    }  

    if (content === undefined) throw new Error('content is undefined');
    if(file === undefined) throw new Error('file is undefined');

    try {
        if(jsonData == null) {
            const dataStr = JSON.stringify([data], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await pluginInstance.app.vault.modify(file, newContent)

            return "success"
        } else if(jsonData.length >= 1) {
            const dataStr = JSON.stringify([data], null, 4) + "]\n```";
            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await pluginInstance.app.vault.modify(file, newContent);

            return "success"
        } else {
            throw new Error('jsonData has an unexpected format');
        }
    } catch (err) {
        return err
    }
}

export const addJsonToPlan = async (data: PlanData) => {
    if(data.type === 'expense') {
        const result = await addJsonToExpenditurePlan(data)
        return result
    } else if (data.type === 'income') {
        const result = await addJsonToIncomePlan(data)
        return result
    } else {
        return 'Error'
    }
}

async function addJsonToExpenditurePlan(data: PlanData) {
    const { jsonData, content, file, status } = await getDataFile('Expenditure plan')
    if(!(status === 'success')) {
        return status
    }
    if(jsonData === undefined) throw new Error('Archive bills is null or undefined')
    if(content === null || content === undefined) throw new Error('Archive bills content is null or undefined')
    if(file === null || file === undefined) throw new Error('Archive bills content is null or undefined')

    try {
        if(jsonData === null) {
            const dataStr = JSON.stringify([data], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await pluginInstance.app.vault.modify(file, newContent)
            
            const resultArchive = await archiveExpenditurePlan()
            if(!(resultArchive === 'success')) return 'Error archiving expenditure plan'

            return "success"
        } else if (jsonData.length >= 1) {
            const dataStr = JSON.stringify([data], null, 4) + "]\n```";
    
            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await pluginInstance.app.vault.modify(file, newContent);
    
            const resultArchive = await archiveExpenditurePlan()
            if(!(resultArchive === 'success')) {
                return 'Error archiving expenditure plan'
            }
    
            return "success"
        } else {
            return 'Error with jsonData expenditure plan'
        }
    } catch (err) {
        return err
    }
}

async function addJsonToIncomePlan(data: PlanData) {
    const { jsonData, content, file, status } = await getDataFile('Income plan')
    if(!(status === 'success')) {
        return status
    }
    if(jsonData === undefined) throw new Error('Archive bills is null or undefined')
    if(content === null || content === undefined) throw new Error('Archive bills content is null or undefined')
    if(file === null || file === undefined) throw new Error('Archive bills content is null or undefined')
    
    try {
        if(jsonData === null) {
            const dataStr = JSON.stringify([data], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await pluginInstance.app.vault.modify(file, newContent)

            const resultArchive = await archiveIncomePlan()
            if(!(resultArchive === 'success')) return 'Error archiving income plan'

            return "success"
        } else if(jsonData.length >= 1) {
            const dataStr = JSON.stringify([data], null, 4) + "]\n```";

            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await pluginInstance.app.vault.modify(file, newContent);

            const resultArchive = await archiveIncomePlan()
            if(!(resultArchive === 'success')) {
                return 'Error archiving income plan'
            }

            return "success"
        } else {
            return ('Error with jsonData income plan')
        }
    } catch (err) {
        return err
    }
}

export const addJsonToBills = async (data: BillData) => {    
    if(data.balance === '') {
        data.balance = '0'
    }

    const { jsonData, content, file, status } = await getDataArchiveFile('Archive bills')
    if(!(status === 'success')) {
        return status
    }
    if(jsonData === undefined) throw new Error('Archive bills is null or undefined')
    if(content === null || content === undefined) throw new Error('Archive bills content is null or undefined')
    if(file === null || file === undefined) throw new Error('Archive bills content is null or undefined')

    try {
        if(jsonData === null) {
            const dataStr = JSON.stringify([data], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await pluginInstance.app.vault.modify(file, newContent)

            return "success"
        } else if(jsonData.length >= 1) {
            const dataStr = JSON.stringify([data], null, 4) + "]\n```";
            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await pluginInstance.app.vault.modify(file, newContent);
            
            return "success"
        } else {
            return ('Error with jsonData archive bills')
        }
    } catch (err) {
        return err
    }
}