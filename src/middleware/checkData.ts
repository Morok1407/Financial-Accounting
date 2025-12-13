import { getDataArchiveFile } from "src/controllers/searchData";
import { pluginInstance } from "../../main";

export const checkBill = async (data: object, oldData?: object) => {
    const { jsonData } = await getDataArchiveFile("Archive bills")
    const bill = jsonData.find(b => b.id === data.bill.id);

    if (!bill) {
        return `Bill ${data.bill.id} not found`;
    }

    const currentBalance = oldData
        ? bill.balance + oldData.amount
        : bill.balance;

    if (data.amount > currentBalance) {
        return `On bill ${bill.name} insufficient funds`;
    }

    return "success";
}

export const checkForDeletionData = async (id: string, modifier: string) => {
    const financeFolder = app.vault.getAbstractFileByPath(pluginInstance.settings.targetFolder);
    let allFiles = [];

    let yearFolders = [];
    for (const child of financeFolder.children) {
        yearFolders.push(child);
    }
    yearFolders.pop(); // Remove "Archive" folder

    let monthFolders = [];
    for (let i = 0; i < yearFolders.length; i++) {
        for (const child of yearFolders[i].children) {
            monthFolders.push(child);
        }
    }

    for (let i = 0; i < monthFolders.length; i++) {
        for (const child of monthFolders[i].children) {
            allFiles.push(child);
        }
    }

    const historyFiles = allFiles.filter(f => f.name === "History.md");

    for (const file of historyFiles) {
        try {
            const content = await app.vault.read(file);
            const jsonMatch = content.match(/```json([\s\S]*?)```/);
            if (jsonMatch[1].length <= 2) {
                return false;
            }
            const jsonData = JSON.parse(jsonMatch[1].trim());
            if (Array.isArray(jsonData)) {
                let found;
                if(modifier === 'plan') {
                    found = jsonData.some(item => item.category.id === id);
                } else if (modifier === 'bill') {
                    found = jsonData.some(item => item.bill.id === id);
                }
                return found
            }
        } catch (e) {
            console.error("Error reading/parsing file:", file.path, e);
        }
    }

    return false;
}