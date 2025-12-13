import { getDataFile, getDataArchiveFile } from "./searchData";
import { expenditureTransaction, incomeTransaction } from "../middleware/transferring"
import { checkForDeletionData } from "../middleware/checkData";
import { archiveExpenditurePlan, archiveIncomePlan } from "../middleware/duplicating";
import { pluginInstance } from "../../main";

export const deleteHistory = async (element: any) => {
    if(!element) {
        return 'Element not found'
    }

    const { jsonData: data, content, file, status } = await getDataFile('History')
    if(status !== 'success') {
        return status
    }

    if(element.type === 'expense') {
        const result = await expenditureTransaction(element, 'remove')
        if(result !== 'success') {
            return result
        }
    } else if (element.type === 'income') {
        const result = await incomeTransaction(element, 'remove')
        if(result !== 'success') {
            return result
        }
    } else {
        return 'Error'
    }

    if(data.length <= 1) {
        try {
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n```");
            await pluginInstance.app.vault.modify(file, newContent);        
            
            return "success"
        } catch (error) {
            return (`Error deleting item: ${error}`)
        }
    } else {
        try {
            const newData = data.filter(item => item.id !== element.id);
            const dataStr = JSON.stringify(newData, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await pluginInstance.app.vault.modify(file, newContent);
        
            return "success"
        } catch (error) {
            return (`Error deleting item: ${error}`)
        }
    }
}

export const deletePlan = async (item: any) => {
    const { id, type } = item;
    if(!id) {
        return 'Element not found'
    }

    let modifier;

    if(type === 'expense') {
        modifier = 'Expenditure plan'
    } else if (type === 'income') {
        modifier = 'Income plan'
    } else {
        return 'Error'
    }
    
    const { jsonData: data, content, file, status } = await getDataFile(modifier)
    if(status !== 'success') {
        return status
    }
    if(data.length <= 1) {
        try {
            if(await checkForDeletionData(id, 'plan')) {
                return 'The category cannot be deleted because it is used in history.'
            }
            
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n```");
            await pluginInstance.app.vault.modify(file, newContent);
            if(type === 'expense') {
                const resultArchive = await archiveExpenditurePlan()
                if(!(resultArchive === 'success')) {
                    return 'Error archiving expense plan'
                }
            } else if (type === 'income') {
                const resultArchive = await archiveIncomePlan()
                if(!(resultArchive === 'success')) {
                    return 'Error archiving income plan'
                }
            } else {
                return 'Error'
            }
            
            return "success"
        } catch (error) {
            return (`Error deleting item: ${error}`)
        }
    } else {
        try {
            if(await checkForDeletionData(id, 'plan')) {
                return 'The category cannot be deleted because it is used in history.'
            }
            
            const newData = data.filter(item => item.id !== id);
            const dataStr = JSON.stringify(newData, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await pluginInstance.app.vault.modify(file, newContent);
            if(type === 'expense') {
                archiveExpenditurePlan()
            } else if (type === 'income') {
                archiveIncomePlan()
            } else {
                return 'Error'
            }
            
            return "success"
    
        } catch (error) {
            return (`Error deleting item: ${error}`)
        }
    }
}

export const deleteBill = async (item) => {
    const { id } = item;
    if(!id) {
        return 'Element not found'
    }

    const { jsonData: data, content, file, status: archiveStatus } = await getDataArchiveFile('Archive bills')
    if(archiveStatus !== 'success') {
        return archiveStatus
    }

    if(data.length <= 1) {
        try {
            if(await checkForDeletionData(id, 'bill')) {
                return 'The bill cannot be deleted because it is in use in history.'
            }
            
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n```");
            await pluginInstance.app.vault.modify(file, newContent);

            return "success"
        } catch (error) {
            return (`Error deleting item: ${error}`)
        }
    } else {
        try {
            if(await checkForDeletionData(id, 'bill')) {
                return 'The bill cannot be deleted because it is in use in history.'
            }

            const newData = data.filter(item => item.id !== id);
            const dataStr = JSON.stringify(newData, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await pluginInstance.app.vault.modify(file, newContent);
        
            return "success"
        } catch (error) {
            return (`Error deleting item: ${error}`)
        }
    }
}