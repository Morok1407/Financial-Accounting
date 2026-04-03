import { getAllFile } from "./searchData";
import { getDate} from "../middleware/otherFunc";
import { checkBill } from "../middleware/checkData";
import { expenditureTransaction, incomeTransaction } from "../middleware/transferring";
import { HistoryData, PlanData, BillData, ResultOfExecution, stateManager } from "../../main";
import MainPlugin from "../../main";
import { DB_PATH } from "./DB";

export const editingJsonToHistory = async (data: HistoryData, oldData: HistoryData): Promise<ResultOfExecution> => {
    if(data.type === 'expense') {
        const resultCheckBill  = await checkBill(data, oldData)
        if(resultCheckBill.status === 'error') return { status: 'error', error: resultCheckBill.error }
    }

    const { selectedYear, selectedMonth } = stateManager();
    const { year, month } =
    selectedYear && selectedMonth
        ? { year: selectedYear, month: selectedMonth }
        : getDate();

    if(data.type === 'expense') {
        const result = await expenditureTransaction(data, 'edit', oldData)
        if(result.status === 'error') return { status: 'error', error: result.error} 
    } else if (data.type === 'income') {
        const result = await incomeTransaction(data, 'edit', oldData)
        if(result.status === 'error') return { status: 'error', error: result.error} 
    } else {
        return { status: 'error', error: new Error('The specified type is not suitable')}
    }

    const allData = await getAllFile(year);
    if (allData.status === 'error') return { status: 'error', error: allData.error };

    try {
        allData.months[month].history = allData.months[month].history.map((item: HistoryData) => item.id === data.id ? {...item, ...data} : item);

        const result = await updateFile(`${allData.year}`, allData);
        if (result.status === 'error') return { status: 'error', error: result.error };

        return { status: "success"}
    } catch (error) {
        return {status: 'error', error: error instanceof Error ? error : new Error(`Failed to editing JSON to history: ${String(error)}`)}
    }
}

export const editingJsonToPlan = async (data: PlanData): Promise<ResultOfExecution> => {
    const allCategories = await getAllFile('categories');
    if (allCategories.status === 'error') return { status: 'error', error: allCategories.error };
    
    try {         
        const plan = data.type === 'expense' ? allCategories.categories.expenditure_plan : allCategories.categories.income_plan;
        const updatedPlan = plan.map((item: PlanData) => item.id === data.id ? {...item, ...data} : item);
        if(data.type === 'expense') {
            allCategories.categories.expenditure_plan = updatedPlan;
        } else if (data.type === 'income') {
            allCategories.categories.income_plan = updatedPlan;
        } else {
            return { status: 'error', error: new Error('The specified type is not suitable')}
        }
        const result = await updateFile('categories', allCategories);
        if (result.status === 'error') return { status: 'error', error: result.error };

        return { status: "success" }
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Failed to editing JSON to plan: ${String(error)}`) }
    }
}

export const editingJsonToBill = async (data: BillData): Promise<ResultOfExecution> => {
    if (data.balance === '') {
        data.balance = '0'
    }

    const allData = await getAllFile('accounts')
    if (allData.status === 'error') return { status: 'error', error: allData.error };
    
    try {
        allData.accounts = allData.accounts.map((item: BillData) => item.id === data.id ? {...item, ...data} : item);

        const result = await updateFile('accounts', allData);
        if (result.status === 'error') return { status: 'error', error: result.error };

        return { status: "success" }
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Failed to editing JSON to bill: ${String(error)}`) }
    }
}

export const updateFile = async (file: string, data: BillData[] | HistoryData[] | PlanData[]): Promise<ResultOfExecution> => {
    try {
        const fileExists = await MainPlugin.instance.app.vault.adapter.exists(`${DB_PATH}/${file}.json`);
        if(!fileExists) { return { status: 'error', error: new Error(`File not found: ${DB_PATH}/${file}.json`) }; }
        
        await MainPlugin.instance.app.vault.adapter.write(
            `${DB_PATH}/${file}.json`,
            JSON.stringify(data, null, 4)
        );

        return { status: 'success' };
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Error update data: ${String(error)}`) };
    }
}