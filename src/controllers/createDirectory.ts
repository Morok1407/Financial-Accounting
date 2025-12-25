import { pluginInstance } from "../../main";
import { getDate } from "../middleware/otherFunc";
import { newMonthExpenditurePlan, checkingExpensePlanForCompliance, newMonthIncomePlan, checkingIncomePlanForCompliance, archiveExpenditurePlan, archiveIncomePlan } from "../middleware/duplicating";

export const months: string[] = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

export const createDirectory = async () => {
    const { year, month } = getDate();

    let result = false

    const fileContent = `---\ntags:\n  - ${pluginInstance.settings.defaultTag}\n---\n\`\`\`json\n\`\`\``;
    const archiveFolder = `${pluginInstance.settings.targetFolder}/Archive`;
    const archiveExpenditurePlan = `${archiveFolder}/Archive expenditure plan.md`;
    const archiveIncomePlan = `${archiveFolder}/Archive income plan.md`;
    const archiveBills = `${archiveFolder}/Archive bills.md`;
    const yearFolder = `${pluginInstance.settings.targetFolder}/${year}`;
    const monthFolder = `${yearFolder}/${month}`;
    const historyPath = `${monthFolder}/History.md`;
    const expenditurePlanPath = `${monthFolder}/Expenditure plan.md`;
    const incomePlanPath = `${monthFolder}/Income plan.md`;

    try {
        if (!(await pluginInstance.app.vault.adapter.exists(pluginInstance.settings.targetFolder))) {
            await pluginInstance.app.vault.createFolder(pluginInstance.settings.targetFolder);
        }

        if (!(await pluginInstance.app.vault.adapter.exists(yearFolder))) {
            await pluginInstance.app.vault.createFolder(yearFolder);
        }

        if (!(await pluginInstance.app.vault.adapter.exists(monthFolder))) {
            await pluginInstance.app.vault.createFolder(monthFolder);
        }

        if (!(await pluginInstance.app.vault.adapter.exists(historyPath))) {
            await pluginInstance.app.vault.create(historyPath, fileContent);
        }

        if (!(await pluginInstance.app.vault.adapter.exists(expenditurePlanPath))) {
            await pluginInstance.app.vault.create(expenditurePlanPath, fileContent);
            await newMonthExpenditurePlan();
        } else {
            await checkingExpensePlanForCompliance();
        }

        if (!(await pluginInstance.app.vault.adapter.exists(incomePlanPath))) {
            await pluginInstance.app.vault.create(incomePlanPath, fileContent);
            await newMonthIncomePlan();
        } else {
            await checkingIncomePlanForCompliance();
        }
        
        if (!(await pluginInstance.app.vault.adapter.exists(archiveFolder))) {
            await pluginInstance.app.vault.createFolder(archiveFolder);
        }

        if (!(await pluginInstance.app.vault.adapter.exists(archiveExpenditurePlan))) {
            await pluginInstance.app.vault.create(archiveExpenditurePlan, fileContent);
            // await archiveExpenditurePlan();
        }

        if (!(await pluginInstance.app.vault.adapter.exists(archiveIncomePlan))) {
            await pluginInstance.app.vault.create(archiveIncomePlan, fileContent);
            // await archiveIncomePlan();
        }

        if (!(await pluginInstance.app.vault.adapter.exists(archiveBills))) {
            await pluginInstance.app.vault.create(archiveBills, fileContent);
        }

        result = true;
        return result;
    } catch (err) {
        console.error("createDirectory error", err);
        throw err;
    }
}

export const createOtherMonthDirectory = async (numMonth: number, year: string) => {
    const fileContent = `---\ntags:\n  - ${pluginInstance.settings.defaultTag}\n---\n\`\`\`json\n\`\`\``;
    const yearFolder = `${pluginInstance.settings.targetFolder}/${year}`;
    const monthFolder = `${yearFolder}/${months[numMonth]}`;
    const historyPath = `${monthFolder}/History.md`;
    const expenditurePlanPath = `${monthFolder}/Expenditure plan.md`;
    const incomePlanPath = `${monthFolder}/Income plan.md`;

    try {
        if (!(await pluginInstance.app.vault.adapter.exists(pluginInstance.settings.targetFolder))) {
            await pluginInstance.app.vault.createFolder(pluginInstance.settings.targetFolder);
        }

        if (!(await pluginInstance.app.vault.adapter.exists(yearFolder))) {
            await pluginInstance.app.vault.createFolder(yearFolder);
        }

        if (!(await pluginInstance.app.vault.adapter.exists(monthFolder))) {
            await pluginInstance.app.vault.createFolder(monthFolder);
        }

        if (!(await pluginInstance.app.vault.adapter.exists(historyPath))) {
            await pluginInstance.app.vault.create(historyPath, fileContent);
        }

        if (!(await pluginInstance.app.vault.adapter.exists(expenditurePlanPath))) {
            await pluginInstance.app.vault.create(expenditurePlanPath, fileContent);
            await newMonthExpenditurePlan();
        } else {
            await checkingExpensePlanForCompliance();
        }

        if (!(await pluginInstance.app.vault.adapter.exists(incomePlanPath))) {
            await pluginInstance.app.vault.create(incomePlanPath, fileContent);
            await newMonthIncomePlan();
        } else {
            await checkingIncomePlanForCompliance();
        }

        return "success";
    } catch (error) {
        console.error("defCreateOtherMonthDirectory error", error);
        return "Error creating directory";
    }
}