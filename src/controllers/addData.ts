import { getDataArchiveFile, getDataFile } from "src/controllers/searchData";
import { archiveExpenditurePlan, archiveIncomePlan } from "../middleware/duplicating";
import { checkBill } from "../middleware/checkData";
import { expenditureTransaction, incomeTransaction } from "../middleware/transferring";
import { pluginInstance } from "../../main";

export const addJsonToHistory = async (data: object) => {   
    const resultCheckBill  = await checkBill(data)
    if(data.type === 'expense') {
        if(!(resultCheckBill === 'success')) {
            return resultCheckBill
        }
    }

    const { jsonMatch, content, file, status } = await getDataFile('History')
    if(!(status === 'success')) {
        return status
    }

    if(data.type === 'expense') {
        const result = await expenditureTransaction(data, 'add')
        if(!(result === 'success')) {
            return result
        }
    } else if (data.type === 'income') {
        const result = await incomeTransaction(data, 'add')
        if(!(result === 'success')) {
            return result
        }
    } else {
        return 'Error'
    }  
    try {
        if(jsonMatch[1].length >= 2) {
            const dataStr = JSON.stringify([data], null, 4) + "]\n```";
            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await pluginInstance.app.vault.modify(file, newContent);

            return "success"
        } else {            
            const dataStr = JSON.stringify([data], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await pluginInstance.app.vault.modify(file, newContent)

            return "success"
        }
    } catch (err) {
        return err
    }
}

export const addJsonToPlan = async (data: object) => {
    if(data.type === 'expense') {
        const result = await addJsonToExpenditurePlan(data)
        return result
    } else if (data.type === 'income') {
        const result = await addJsonToIncomePlan(data)
        return result
    } else {
        return 'Error'
    }
}

async function addJsonToExpenditurePlan(data: object) {
    const { jsonMatch, content, file, status } = await getDataFile('Expenditure plan')
    if(!(status === 'success')) {
        return status
    }
    try {
        if(jsonMatch[1].length >= 2) {
            const dataStr = JSON.stringify([data], null, 4) + "]\n```";

            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await this.app.vault.modify(file, newContent);

            const resultArchive = await archiveExpenditurePlan()
            if(!(resultArchive === 'success')) {
                return 'Error archiving expenditure plan'
            }

            return "success"
        } else {
            const dataStr = JSON.stringify([data], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await this.app.vault.modify(file, newContent)
            
            const resultArchive = await archiveExpenditurePlan()
            if(!(resultArchive === 'success')) {
                return 'Error archiving expenditure plan'
            }

            return "success"
        }
    } catch (err) {
        return err
    }
}

async function addJsonToIncomePlan(data: object) {
    const { jsonMatch, content, file, status } = await getDataFile('Income plan')
    if(!(status === 'success')) {
        return status
    }
    try {
        if(jsonMatch[1].length >= 2) {
            const dataStr = JSON.stringify([data], null, 4) + "]\n```";

            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await this.app.vault.modify(file, newContent);

            const resultArchive = await archiveIncomePlan()
            if(!(resultArchive === 'success')) {
                return 'Error archiving income plan'
            }

            return "success"
        } else {
            const dataStr = JSON.stringify([data], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await this.app.vault.modify(file, newContent)

            const resultArchive = await archiveIncomePlan()
            if(!(resultArchive === 'success')) {
                return 'Error archiving income plan'
            }

            return "success"
        }
    } catch (err) {
        return err
    }
}

export const addJsonToBills = async (data: object) => {    
    const { jsonMatch, content, file, status } = await getDataArchiveFile('Archive bills')
    if(!(status === 'success')) {
        return status
    }
    try {
        if(jsonMatch[1].length >= 2) {
            const dataStr = JSON.stringify([data], null, 4) + "]\n```";

            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await pluginInstance.app.vault.modify(file, newContent);
            
            return "success"
        } else {
            const dataStr = JSON.stringify([data], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await pluginInstance.app.vault.modify(file, newContent)

            return "success"
        }
    } catch (err) {
        return err
    }
}