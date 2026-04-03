import { getAllFile } from "./searchData";
import { checkBill } from "../middleware/checkData";
import { updateFile } from "../controllers/editingData";
import { expenditureTransaction, incomeTransaction } from "../middleware/transferring";
import { HistoryData, PlanData, BillData, ResultOfExecution, stateManager } from "../../main";
import { getDate } from '../middleware/otherFunc';
import { DB_PATH } from "./DB";
import MainPlugin from "../../main";

export const addJsonToHistory = async (data: HistoryData): Promise<ResultOfExecution> => {
    if(data.type === 'expense') {
        const resultCheckBill  = await checkBill(data)
        if(resultCheckBill.status === 'error') {
            return { status: 'error', error: resultCheckBill.error }
        }
    }

    const { selectedYear, selectedMonth } = stateManager();
    const { year, month } =
    selectedYear && selectedMonth
        ? { year: selectedYear, month: selectedMonth }
        : getDate();
            
    if(data.type === 'expense') {
        const result = await expenditureTransaction(data, 'add')
        if (result.status === 'error') return { status: 'error', error: result.error };
    } else if (data.type === 'income') {
        const result = await incomeTransaction(data, 'add')
        if (result.status === 'error') return { status: 'error', error: result.error };
    } else {
        return { status: 'error', error: new Error('The specified type is not suitable') }
    }

    const allData = await getAllFile(year)
    if (allData.status === 'error') return { status: 'error', error: allData.error };

    try {
        allData.months[month].history.push(data);

        const result = await updateFile(`${allData.year}`, allData);
        if (result.status === 'error') return { status: 'error', error: result.error };

        return { status: 'success' };
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Failed to add JSON to history: ${String(error)}`) }
    }
}

export const addJsonToPlan = async (data: PlanData): Promise<ResultOfExecution> => {
    const additionalData = await getAllFile('categories');
    if(additionalData.status === 'error') return { status: 'error', error: additionalData.error };

    const BD = await MainPlugin.instance.app.vault.adapter.list(DB_PATH);

    const yearsFiles = BD.files.filter(path => /\/\d{4}\.json$/.test(path))

    if (yearsFiles.length === 0) {
        return { status: 'error', error: new Error('No yearly files found. Please generate a yearly file first.') }
    }
    try {
        yearsFiles.forEach(async (filePath) => {
            const file = await MainPlugin.instance.app.vault.adapter.read(filePath);
            const jsonData = JSON.parse(file);

            for (const month in jsonData.months) {
                if(data.type === 'income') {
                    jsonData.months[month].income_plan.push({id: data.id, amount: data.amount});
                } else if (data.type === 'expense') {
                    jsonData.months[month].expenditure_plan.push({id: data.id, amount: data.amount});
                } else {
                    throw new Error('The specified type is not suitable');
                }
            }

            const result = await updateFile(`${jsonData.year}`, jsonData);
            if (result.status === 'error') return { status: 'error', error: result.error };
        })

        if(data.type === 'income') {
            additionalData.categories.income_plan.push({ id: data.id, name: data.name, emoji: data.emoji, comment: data.comment, type: data.type});
        } else if (data.type === 'expense') {
            additionalData.categories.expenditure_plan.push({ id: data.id, name: data.name, emoji: data.emoji, comment: data.comment, type: data.type});
        } else {
            return { status: 'error', error: new Error('The specified type is not suitable') }
        }

        const result = await updateFile('categories', additionalData);
        if (result.status === 'error') return { status: 'error', error: result.error };

        return { status: 'success' };
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Error creating expediture plans: ${String(error)}`)  }
    }
}

export const addJsonToBills = async (data: BillData): Promise<ResultOfExecution> => {    
    if(data.balance === '') {
        data.balance = '0'
    }

    const allData = await getAllFile('accounts')
    if (allData.status === 'error') return { status: 'error', error: allData.error };

    try {
        allData.accounts.push(data);

        const result = await updateFile('accounts', allData);
        if (result.status === 'error') return { status: 'error', error: result.error };

        return { status: 'success' }
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Error creating bills: ${String(error)}`) }
    }
}