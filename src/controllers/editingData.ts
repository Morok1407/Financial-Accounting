import { TFile } from "obsidian";
import { getDataFile, getDataArchiveFile } from "./searchData";
import { checkBill } from "../middleware/checkData";
import { expenditureTransaction, incomeTransaction } from "../middleware/transferring";
import { archiveExpenditurePlan, archiveIncomePlan } from "../middleware/duplicating";
import { HistoryData, PlanData, BillData, ResultOfExecution } from "../../main";
import MainPlugin from "../../main";

export const editingJsonToHistory = async (data: HistoryData, oldData: HistoryData): Promise<ResultOfExecution> => {
    const history = await getDataFile<HistoryData>('History')
    if(history.status === 'error') return { status: 'error', error: history.error}
    if(!history.jsonData) return { status: 'error', error: new Error('Error with data history') }
    if(!history.content) return { status: 'error', error: new Error('Error with content history') }
    if(!history.file) return { status: 'error', error: new Error('Error with file history')}

    if(data.type === 'expense') {
        const resultCheckBill  = await checkBill(data, oldData)
        if(resultCheckBill.status === 'error') return { status: 'error', error: resultCheckBill.error }
    }

    if(data.type === 'expense') {
        const result = await expenditureTransaction(data, 'edit', oldData)
        if(result.status === 'error') return { status: 'error', error: result.error} 
    } else if (data.type === 'income') {
        const result = await incomeTransaction(data, 'edit', oldData)
        if(result.status === 'error') return { status: 'error', error: result.error} 
    } else {
        return { status: 'error', error: new Error('The specified type is not suitable')}
    }

    try {
        const newData = history.jsonData.map(item => item.id === data.id ? {...item, ...data} : item)
        const dataStr = JSON.stringify(newData, null, 4);
        const newContent = history.content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
        await MainPlugin.instance.app.vault.modify(history.file, newContent)

        return { status: "success"}
    } catch (error) {
        return {status: 'error', error: error instanceof Error ? error : new Error(`Failed to editing JSON to history: ${String(error)}`)}
    }
}

export const editingJsonToPlan = async (data: PlanData): Promise<ResultOfExecution> => {
    const sourceMap = {
        expense: () => getDataFile<PlanData>('Expenditure plan'),
        income: () => getDataFile<PlanData>('Income plan'),
    } as const;
    
    try {
        const loader = sourceMap[data.type];
        if (!loader) return { status: 'error', error: new Error('Element not found')}

        const plan = await loader();
        if (plan.status === 'error') return { status: 'error', error: plan.error }
        if (!plan.jsonData) return { status: 'error', error: new Error('jsonData is null or undefined')};
        if(!plan.file) return { status: 'error', error: new Error("History file is null or undefined")}
        if(!plan.content) return { status: 'error', error: new Error("History content is null or undefined")}

        const newData = plan.jsonData.map(item => item.id === data.id ? {...item, ...data} : item)
        const dataStr = JSON.stringify(newData, null, 4);
        const newContent = plan.content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr  + "\n```");
        await MainPlugin.instance.app.vault.modify(plan.file, newContent)

        if(data.type === 'expense') {
            await archiveExpenditurePlan()
        } else if (data.type === 'income') {
            await archiveIncomePlan()
        } else {
            return { status: 'error', error: new Error('The specified type is not suitable')}
        }

        return { status: "success" }
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Failed to editing JSON to plan: ${String(error)}`) }
    }
}

export const editingJsonToBill = async (data: BillData): Promise<ResultOfExecution> => {
    if (data.balance === '') {
        data.balance = '0'
    }
    
    const bills = await getDataArchiveFile<BillData>('Archive bills')
    if(bills.status === 'error') return { status: 'error', error: bills.error};
    if(!bills.jsonData) return { status: 'error', error: new Error('Error with data bill')}
    if(!bills.content) return { status: 'error', error: new Error('Error with content bill')}
    if(!bills.file) return { status: 'error', error: new Error('Error with file bill')}
    
    try {
        const newData = bills.jsonData.map(item => item.id === data.id ? {...item, ...data} : item)
        const dataStr = JSON.stringify(newData, null, 4);
        const newContent = bills.content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr  + "\n```");
        await MainPlugin.instance.app.vault.modify(bills.file, newContent)

        return { status: "success" }
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Failed to editing JSON to bill: ${String(error)}`) }
    }
}

export const updateFile = async (newData: BillData[] | HistoryData[] | PlanData[], file: TFile, content: string): Promise<ResultOfExecution> => {
    try {
        const dataStr = JSON.stringify(newData, null, 4);
        const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
        await MainPlugin.instance.app.vault.modify(file, newContent);

        return { status: 'success' };
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Error update ${file.name}: ${String(error)}`) };
    }
}