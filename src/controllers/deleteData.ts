import { getAllFile } from "./searchData";
import { updateFile } from "./editingData";
import { checkForDeletionData } from "../middleware/checkData";
import { HistoryData, PlanData, BillData, ResultOfExecution, stateManager } from "../../main";
import { getDate } from '../middleware/otherFunc';
import { expenditureTransaction, incomeTransaction } from "../middleware/transferring"
import MainPlugin from "../../main";

export const deleteHistory = async (element: HistoryData): Promise<ResultOfExecution> => {
    const { selectedYear, selectedMonth } = stateManager();
    const { year, month } =
    selectedYear && selectedMonth
        ? { year: selectedYear, month: selectedMonth }
        : getDate();

    if(element.type === 'expense') {
        const result = await expenditureTransaction(element, 'remove')
        if(result.status === 'error') return { status: 'error', error: result.error }
    } else if (element.type === 'income') {
        const result = await incomeTransaction(element, 'remove')
        if(result.status === 'error') return { status: 'error', error: result.error }
    } else {
        return { status: 'error', error: new Error('Unknown transaction type') }
    }

    const allData = await getAllFile(year)
    if (allData.status === 'error') return { status: 'error', error: allData.error };

    try {
        const newHistory = allData.months[month].history.filter((item: HistoryData) => item.id !== element.id);
        allData.months[month].history = newHistory;

        const result = await updateFile(`${allData.year}`, allData);
        if (result.status === 'error') return { status: 'error', error: result.error };

        return { status: 'success' };
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Error deleting item: ${String(error)}`)}
    }
}

export const deletePlan = async (data: PlanData): Promise<ResultOfExecution> => {
    if(await checkForDeletionData(data.id, 'plan')) return { status: 'error', error: new Error(`The bill ${data.emoji} • ${data.name} cannot be deleted because it is used in history.`)}

    const additionalData = await getAllFile('categories');
    if(additionalData.status === 'error') return { status: 'error', error: additionalData.error };

    const BD = await MainPlugin.instance.app.vault.adapter.list(MainPlugin.instance.dbPath);

    const yearsFiles = BD.files.filter(path => /\/\d{4}\.json$/.test(path))

    if (yearsFiles.length === 0) {
        return { status: 'error', error: new Error('No yearly files found. Please generate a yearly file first.') }
    }

    try {
        await DelelteToAllFiles(yearsFiles, data)

        if(data.type === 'expense') {
            const newPlan = additionalData.categories.expenditure_plan.filter((item: PlanData) => item.id !== data.id);
            additionalData.categories.expenditure_plan = newPlan;
        } else if (data.type === 'income') {
            const newPlan = additionalData.categories.income_plan.filter((item: PlanData) => item.id !== data.id);
            additionalData.categories.income_plan = newPlan;
        } else {
            return { status: 'error', error: new Error('The plan has an invalid type.')}
        }

        const result = await updateFile('categories', additionalData);
        if (result.status === 'error') return { status: 'error', error: result.error };

        return { status: 'success' }
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Error checking for deletion: ${String(error)}`)}
    }
}

async function DelelteToAllFiles(yearsFiles: string[], data: PlanData): Promise<ResultOfExecution> {
    try {
        for (const filePath of yearsFiles) {
            const file = await MainPlugin.instance.app.vault.adapter.read(filePath);
            const jsonData = JSON.parse(file);

            for (const month in jsonData.months) {
                if (data.type === 'income') {
                    const newPlan = jsonData.months[month].income_plan.filter((item: PlanData) => item.id !== data.id);
                    jsonData.months[month].income_plan = newPlan;
                } else if (data.type === 'expense') {
                    const newPlan = jsonData.months[month].expenditure_plan.filter((item: PlanData) => item.id !== data.id);
                    jsonData.months[month].expenditure_plan = newPlan;
                } else {
                    return { status: 'error', error: new Error('The specified type is not suitable') };
                }
            }

            const result = await updateFile(`${jsonData.year}`, jsonData);
            if (result.status === 'error') {
                return { status: 'error', error: result.error };
            }
        }

        return { status: 'success' };
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(String(error)) };
    }
}

export const deleteBill = async (item: BillData): Promise<ResultOfExecution> => {
    const { id, name, emoji } = item;
    if(!id) return { status: 'error', error: new Error('Element not found')}

    const allData = await getAllFile('accounts')
    if (allData.status === 'error') return { status: 'error', error: allData.error };

    try {
        if(await checkForDeletionData(id, 'bill')) return { status: 'error', error: new Error(`The bill ${emoji} • ${name} cannot be deleted because it is used in history.`)}
        
        const newBills = allData.accounts.filter((item: BillData) => item.id !== id);
        allData.accounts = newBills;

        const result = await updateFile('accounts', allData);
        if (result.status === 'error') return { status: 'error', error: result.error };

        return { status: 'success' }
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Error checking for deletion: ${String(error)}`)}
    }
}