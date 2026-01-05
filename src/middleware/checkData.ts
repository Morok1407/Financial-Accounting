import Big from 'big.js'
import { App, TFolder, TFile } from 'obsidian'
import { getDataArchiveFile } from "../controllers/searchData";
import { pluginInstance, BillData, HistoryData } from "../../main";

declare const app: App;

export const checkBill = async (data: HistoryData, oldData?: HistoryData ) => {
    const { jsonData } = await getDataArchiveFile<BillData>("Archive bills")
    if(jsonData === null || jsonData === undefined) throw new Error('Bill is null or undefined')
    const bill = jsonData.find(b => b.id === data.bill.id);

    if (!bill) {
        return `Bill ${data.bill.id} not found`;
    }

    const currentBalance = oldData
        ? new Big(bill.balance).plus(oldData.amount)
        : new Big(bill.balance);

    if (new Big(data.amount).gt(currentBalance)) {
        return `On bill ${bill.name} insufficient funds`;
    }

    return "success";
}

export const checkForDeletionData = async (
    id: string,
    modifier: 'plan' | 'bill'
): Promise<boolean> => {

    const financeFolder = app.vault.getAbstractFileByPath(
        pluginInstance.settings.targetFolder
    );

    if (!financeFolder || !(financeFolder instanceof TFolder)) {
        throw new Error('Finance folder not found or is not a folder');
    }

    const historyFiles: TFile[] = [];

    const collectFiles = (folder: TFolder) => {
        for (const child of folder.children) {
            if (child instanceof TFolder) {
                collectFiles(child);
            } else if (child instanceof TFile && child.name === 'History.md') {
                historyFiles.push(child);
            }
        }
    };

    collectFiles(financeFolder);

    for (const file of historyFiles) {
        try {
            const content = await app.vault.read(file);
            const jsonMatch = content.match(/```json([\s\S]*?)```/);

            if (!jsonMatch || jsonMatch[1].trim().length <= 2) continue;

            const jsonData = JSON.parse(jsonMatch[1].trim());

            if (!Array.isArray(jsonData)) continue;

            const found = jsonData.some(item => {
                if (modifier === 'plan') {
                    return item?.category?.id === id;
                }
                if (modifier === 'bill') {
                    return item?.bill?.id === id;
                }
                return false;
            });

            if (found) return true;

        } catch (e) {
            console.error(`Error processing file: ${file.path}`, e);
        }
    }

    return false;
};