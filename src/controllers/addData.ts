import { getDataArchiveFile, getDataFile } from "./searchData";
import { archiveExpenditurePlan, archiveIncomePlan } from "../middleware/duplicating";
import { checkBill } from "../middleware/checkData";
import { expenditureTransaction, incomeTransaction } from "../middleware/transferring";
import { HistoryData, PlanData, BillData, ResultOfExecution } from "../../main";
import MainPlugin from "../../main";

export const addJsonToHistory = async (data: HistoryData): Promise<ResultOfExecution> => {
    if(data.type === 'expense') {
        const resultCheckBill  = await checkBill(data)
        if(resultCheckBill.status === 'error') {
            return { status: 'error', error: resultCheckBill.error }
        }
    }

    const historyData = await getDataFile<HistoryData>('History')
    if (historyData.status === 'error') return { status: 'error', error: historyData.error };

    if(data.type === 'expense') {
        const result = await expenditureTransaction(data, 'add')
        if (result.status === 'error') return { status: 'error', error: result.error };
    } else if (data.type === 'income') {
        const result = await incomeTransaction(data, 'add')
        if (result.status === 'error') return { status: 'error', error: result.error };
    } else {
        return { status: 'error', error: new Error('The specified type is not suitable') }
    }  

    if (historyData.content === undefined) return { status: 'error', error: new Error('Сontent is undefined') };
    if(historyData.file === undefined) return { status: 'error', error: new Error('File is undefined') };

    try {
        if(historyData.jsonData === null) {
            const dataStr = JSON.stringify([data], null, 4) + "\n```";
            const newContent = historyData.content.replace(/```$/, dataStr);
            await MainPlugin.instance.app.vault.modify(historyData.file, newContent)

            return { status: 'success' };
        } else if(historyData.jsonData.length >= 1) {
            const dataStr = JSON.stringify([data], null, 4) + "]\n```";
            const index = historyData.content.lastIndexOf("}");
            const newContent = historyData.content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await MainPlugin.instance.app.vault.modify(historyData.file, newContent);

            return { status: 'success' };
        } else {
            throw new Error('jsonData has an unexpected format');
        }
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Failed to add JSON to history: ${String(error)}`) }
    }
}

export const addJsonToPlan = async (data: PlanData): Promise<ResultOfExecution> => {
    if(data.type === 'expense') {
        const result = await addJsonToExpenditurePlan(data)
        return result
    } else if (data.type === 'income') {
        const result = await addJsonToIncomePlan(data)
        return result
    } else {
        return { status: 'error', error: new Error('The specified type is not suitable') }
    }
}

async function addJsonToExpenditurePlan(data: PlanData): Promise<ResultOfExecution> {
    const planData = await getDataFile<PlanData>('Expenditure plan')
    if(planData.status === 'error') return { status: 'error', error: planData.error }
    if(planData.jsonData === undefined) return { status: 'error', error: new Error('Archive bills is null or undefined') }
    if(planData.content === null || planData.content === undefined) return { status: 'error', error: new Error('Archive bills content is null or undefined') }
    if(planData.file === null || planData.file === undefined) return { status: 'error', error: new Error('Archive bills content is null or undefined') }

    try {
        if(planData.jsonData === null) {
            const dataStr = JSON.stringify([data], null, 4) + "\n```";
            const newContent = planData.content.replace(/```$/, dataStr);
            await MainPlugin.instance.app.vault.modify(planData.file, newContent)
            
            const resultArchive = await archiveExpenditurePlan()
            if(resultArchive.status === 'error') return { status: 'error', error: resultArchive.error } 

            return { status: 'success' }
        } else if (planData.jsonData.length >= 1) {
            const dataStr = JSON.stringify([data], null, 4) + "]\n```";
    
            const index = planData.content.lastIndexOf("}");
            const newContent = planData.content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await MainPlugin.instance.app.vault.modify(planData.file, newContent);
    
            const resultArchive = await archiveExpenditurePlan()
            if (resultArchive.status === 'error') return { status: 'error', error: resultArchive.error }
    
            return { status: 'success' }
        } else {
            return { status: 'error', error: new Error('Error with jsonData expenditure plan') }
        }
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Error creating expediture plans: ${String(error)}`)  }
    }
}

async function addJsonToIncomePlan(data: PlanData): Promise<ResultOfExecution> {
    const planData = await getDataFile<PlanData>('Income plan')
    if(planData.status === 'error') return { status: 'error', error: planData.error }
    if(planData.jsonData === undefined) return { status: 'error', error: new Error('Archive bills is null or undefined') }
    if(planData.content === null || planData.content === undefined) return { status: 'error', error: new Error('Archive bills content is null or undefined') }
    if(planData.file === null || planData.file === undefined) return { status: 'error', error: new Error('Archive bills content is null or undefined') }
    
    try {
        if(planData.jsonData === null) {
            const dataStr = JSON.stringify([data], null, 4) + "\n```";
            const newContent = planData.content.replace(/```$/, dataStr);
            await MainPlugin.instance.app.vault.modify(planData.file, newContent)

            const resultArchive = await archiveIncomePlan()
            if(resultArchive.status === 'error') return { status: 'error', error: new Error('Error archiving income plan') }

            return { status: 'success' }
        } else if(planData.jsonData.length >= 1) {
            const dataStr = JSON.stringify([data], null, 4) + "]\n```";

            const index = planData.content.lastIndexOf("}");
            const newContent = planData.content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await MainPlugin.instance.app.vault.modify(planData.file, newContent);

            const resultArchive = await archiveIncomePlan()
            if (resultArchive.status === 'error') return { status: 'error', error: new Error('Error archiving income plan') }

            return { status: 'success' }
        } else {
            return { status: 'error', error: new Error('Error with jsonData income plan')}
        }
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Error creating income plans: ${String(error)}`) }
    }
}

export const addJsonToBills = async (data: BillData): Promise<ResultOfExecution> => {    
    if(data.balance === '') {
        data.balance = '0'
    }

    const billData = await getDataArchiveFile('Archive bills')
    if(billData.status === 'error') return { status: 'error', error: billData.error }
    if(billData.jsonData === undefined) return { status: 'error', error: new Error('Archive bills is null or undefined') }
    if(billData.content === null || billData.content === undefined) return { status: 'error', error: new Error('Archive bills content is null or undefined') }
    if(billData.file === null || billData.file === undefined) return { status: 'error', error: new Error('Archive bills content is null or undefined') }

    try {
        if(billData.jsonData === null) {
            const dataStr = JSON.stringify([data], null, 4) + "\n```";
            const newContent = billData.content.replace(/```$/, dataStr);
            await MainPlugin.instance.app.vault.modify(billData.file, newContent)

            return { status: 'success' }
        } else if(billData.jsonData.length >= 1) {
            const dataStr = JSON.stringify([data], null, 4) + "]\n```";
            const index = billData.content.lastIndexOf("}");
            const newContent = billData.content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await MainPlugin.instance.app.vault.modify(billData.file, newContent);
            
            return { status: 'success'}
        } else {
            return { status: 'error', error: new Error('Error with jsonData bills')}
        }
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Error creating bills: ${String(error)}`) }
    }
}