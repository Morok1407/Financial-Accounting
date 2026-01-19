import MainPlugin from "../../main";
import { getDate } from "../middleware/otherFunc";
import { newMonthExpenditurePlan, checkingExpensePlanForCompliance, newMonthIncomePlan, checkingIncomePlanForCompliance } from "../middleware/duplicating";

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

    const fileContent = `---\ntags:\n  - ${MainPlugin.instance.settings.defaultTag}\n---\n\`\`\`json\n\`\`\``;
    const archiveFolder = `${MainPlugin.instance.settings.targetFolder}/Archive`;
    const archiveExpenditurePlan = `${archiveFolder}/Archive expenditure plan.md`;
    const archiveIncomePlan = `${archiveFolder}/Archive income plan.md`;
    const archiveBills = `${archiveFolder}/Archive bills.md`;
    const yearFolder = `${MainPlugin.instance.settings.targetFolder}/${year}`;
    const monthFolder = `${yearFolder}/${month}`;
    const historyPath = `${monthFolder}/History.md`;
    const expenditurePlanPath = `${monthFolder}/Expenditure plan.md`;
    const incomePlanPath = `${monthFolder}/Income plan.md`;

    try {
        if (!(await MainPlugin.instance.app.vault.adapter.exists(MainPlugin.instance.settings.targetFolder))) {
            await MainPlugin.instance.app.vault.createFolder(MainPlugin.instance.settings.targetFolder);
        }

        if (!(await MainPlugin.instance.app.vault.adapter.exists(yearFolder))) {
            await MainPlugin.instance.app.vault.createFolder(yearFolder);
        }

        if (!(await MainPlugin.instance.app.vault.adapter.exists(monthFolder))) {
            await MainPlugin.instance.app.vault.createFolder(monthFolder);
        }

        if (!(await MainPlugin.instance.app.vault.adapter.exists(historyPath))) {
            await MainPlugin.instance.app.vault.create(historyPath, fileContent);
        }

        if (!(await MainPlugin.instance.app.vault.adapter.exists(expenditurePlanPath))) {
            await MainPlugin.instance.app.vault.create(expenditurePlanPath, fileContent);
            await newMonthExpenditurePlan();
        } else {
            await checkingExpensePlanForCompliance();
        }

        if (!(await MainPlugin.instance.app.vault.adapter.exists(incomePlanPath))) {
            await MainPlugin.instance.app.vault.create(incomePlanPath, fileContent);
            await newMonthIncomePlan();
        } else {
            await checkingIncomePlanForCompliance();
        }
        
        if (!(await MainPlugin.instance.app.vault.adapter.exists(archiveFolder))) {
            await MainPlugin.instance.app.vault.createFolder(archiveFolder);
        }

        if (!(await MainPlugin.instance.app.vault.adapter.exists(archiveExpenditurePlan))) {
            await MainPlugin.instance.app.vault.create(archiveExpenditurePlan, fileContent);
            // await archiveExpenditurePlan();
        }

        if (!(await MainPlugin.instance.app.vault.adapter.exists(archiveIncomePlan))) {
            await MainPlugin.instance.app.vault.create(archiveIncomePlan, fileContent);
            // await archiveIncomePlan();
        }

        if (!(await MainPlugin.instance.app.vault.adapter.exists(archiveBills))) {
            await MainPlugin.instance.app.vault.create(archiveBills, fileContent);
        }

        result = true;
        return result;
    } catch (err) {
        console.error("createDirectory error", err);
        throw err;
    }
}

export const createOtherMonthDirectory = async (numMonth: number, year: string) => {
    const fileContent = `---\ntags:\n  - ${MainPlugin.instance.settings.defaultTag}\n---\n\`\`\`json\n\`\`\``;
    const yearFolder = `${MainPlugin.instance.settings.targetFolder}/${year}`;
    const monthFolder = `${yearFolder}/${months[numMonth]}`;
    const historyPath = `${monthFolder}/History.md`;
    const expenditurePlanPath = `${monthFolder}/Expenditure plan.md`;
    const incomePlanPath = `${monthFolder}/Income plan.md`;

    try {
        if (!(await MainPlugin.instance.app.vault.adapter.exists(MainPlugin.instance.settings.targetFolder))) {
            await MainPlugin.instance.app.vault.createFolder(MainPlugin.instance.settings.targetFolder);
        }

        if (!(await MainPlugin.instance.app.vault.adapter.exists(yearFolder))) {
            await MainPlugin.instance.app.vault.createFolder(yearFolder);
        }

        if (!(await MainPlugin.instance.app.vault.adapter.exists(monthFolder))) {
            await MainPlugin.instance.app.vault.createFolder(monthFolder);
        }

        if (!(await MainPlugin.instance.app.vault.adapter.exists(historyPath))) {
            await MainPlugin.instance.app.vault.create(historyPath, fileContent);
        }

        if (!(await MainPlugin.instance.app.vault.adapter.exists(expenditurePlanPath))) {
            await MainPlugin.instance.app.vault.create(expenditurePlanPath, fileContent);
            await newMonthExpenditurePlan();
        } else {
            await checkingExpensePlanForCompliance();
        }

        if (!(await MainPlugin.instance.app.vault.adapter.exists(incomePlanPath))) {
            await MainPlugin.instance.app.vault.create(incomePlanPath, fileContent);
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