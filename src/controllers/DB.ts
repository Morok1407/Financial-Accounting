import MainPlugin from "../../main";
import { ResultOfExecution, PlanData } from "../../main";
import { updateFile } from "./editingData";
import { getAllFile } from "./searchData";

export const initDB = async (): Promise<ResultOfExecution> => {
    const accountsFilePath = `${MainPlugin.instance.dbPath}/accounts.json`;
    const categoriesFilePath = `${MainPlugin.instance.dbPath}/categories.json`;

    const accountsFileTemplate = JSON.stringify({"accounts": []}, null, 4);
    const categoriesFileTemplate = JSON.stringify({"categories": {"income_plan": [], "expenditure_plan": [],}}, null, 4);

    try {
        if (!(await MainPlugin.instance.app.vault.adapter.exists(MainPlugin.instance.dbPath))) {
            await MainPlugin.instance.app.vault.createFolder(MainPlugin.instance.dbPath);
        }

        if (!(await MainPlugin.instance.app.vault.adapter.exists(accountsFilePath))) {
            await MainPlugin.instance.app.vault.create(accountsFilePath, accountsFileTemplate);
        }

        if (!(await MainPlugin.instance.app.vault.adapter.exists(categoriesFilePath))) {
            await MainPlugin.instance.app.vault.create(categoriesFilePath, categoriesFileTemplate);
        }

        return { status: 'success' };
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Error in initDB: ${String(error)}`)}
    }
}

export const generateYearlyFile = async (): Promise<ResultOfExecution> => {
    const { startYear } = await MainPlugin.instance.loadData();

    try {
        for(let year = startYear; year <= new Date().getFullYear(); year++) {
            const yearlyFilesPath = `${MainPlugin.instance.dbPath}/${year}.json`;

            const yearlyFileTemplate = JSON.stringify({
                "year": year,
                "months": {
                    "1":  { "income_plan": [], "expenditure_plan": [], "history": [] },
                    "2":  { "income_plan": [], "expenditure_plan": [], "history": [] },
                    "3":  { "income_plan": [], "expenditure_plan": [], "history": [] },
                    "4":  { "income_plan": [], "expenditure_plan": [], "history": [] },
                    "5":  { "income_plan": [], "expenditure_plan": [], "history": [] },
                    "6":  { "income_plan": [], "expenditure_plan": [], "history": [] },
                    "7":  { "income_plan": [], "expenditure_plan": [], "history": [] },
                    "8":  { "income_plan": [], "expenditure_plan": [], "history": [] },
                    "9":  { "income_plan": [], "expenditure_plan": [], "history": [] },
                    "10": { "income_plan": [], "expenditure_plan": [], "history": [] },
                    "11": { "income_plan": [], "expenditure_plan": [], "history": [] },
                    "12": { "income_plan": [], "expenditure_plan": [], "history": [] }
                }
            }, null, 4);

        if (!(await MainPlugin.instance.app.vault.adapter.exists(yearlyFilesPath))) {
            await MainPlugin.instance.app.vault.create(yearlyFilesPath, yearlyFileTemplate);
            const result = await dataDuplication(yearlyFilesPath)
            if(result.status === 'error') return { status: 'error', error: result.error };
        }
    }
    
        return { status: 'success' };
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Error in generateYearlyFile: ${String(error)}`)}
    }
}

const dataDuplication = async (filePath: string): Promise<ResultOfExecution> => {
    const additionalData = await getAllFile('categories');
    if(additionalData.status === 'error') return { status: 'error', error: additionalData.error };

    try {
        const file = await MainPlugin.instance.app.vault.adapter.read(filePath);
        const jsonData = JSON.parse(file);

        for (const month in jsonData.months) {
            additionalData.categories.income_plan.forEach((item: PlanData) => {
                jsonData.months[month].income_plan.push({id: item.id, amount: '0'});
            });

            additionalData.categories.expenditure_plan.forEach((item: PlanData) => {
                jsonData.months[month].expenditure_plan.push({id: item.id, amount: '0'});
            });
        }

        const result = await updateFile(`${jsonData.year}`, jsonData);
        if (result.status === 'error') return { status: 'error', error: result.error };

        return { status: 'success' };
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error : new Error(`Error in dataDuplication: ${String(error)}`)}
    }
}