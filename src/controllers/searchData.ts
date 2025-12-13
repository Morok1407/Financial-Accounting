import { pluginInstance, stateManager } from "../../main";
import { getDate } from "../middleware/otherFunc";
import { createDirectory } from "./createDirectory";

export const getDataFile = async (fileName: string) => {
    const { selectedYear, selectedMonth } = stateManager();
    if(selectedYear === null || selectedMonth === null) {
        const { year, month } = getDate()
        const filePath = `${pluginInstance.settings.targetFolder}/${year}/${month}/${fileName}.md`
        const file = app.vault.getAbstractFileByPath(filePath);
        if(!file) {
            await createDirectory()
            return { status: `File not found: ${filePath}. Please try again` }
        }
        const content = await app.vault.read(file);
        if(!content) {
            return { status: `File is empty: ${filePath}` }
        }
        const jsonMatch = content.match(/```json([\s\S]*?)```/);
        let jsonData;
        if(jsonMatch[1].length > 3) {
            jsonData = JSON.parse(jsonMatch[1].trim());
        } else {
            jsonData = null;
        }
        const dataFile = { jsonMatch, content, file, jsonData, status: 'success' }
        return dataFile
    } else {
        const filePath = `${pluginInstance.settings.targetFolder}/${selectedYear}/${selectedMonth}/${fileName}.md`
        const file = app.vault.getAbstractFileByPath(filePath);
        if(!file) {
            return { status: `File not found: ${filePath}` }
        }
        const content = await app.vault.read(file);
        if(!content) {
            return { status: `File is empty: ${filePath}` }
        }
        const jsonMatch = content.match(/```json([\s\S]*?)```/);
        let jsonData;
        if(jsonMatch[1].length > 3) {
            jsonData = JSON.parse(jsonMatch[1].trim());
        } else {
            jsonData = null;
        }
        const dataFile = { jsonMatch, content, file, jsonData, status: 'success' }
        return dataFile
    }
}

export const getSpecificFile = async (fileName: string, year: string, month: string) => {
    const filePath = `${pluginInstance.settings.targetFolder}/${year}/${month}/${fileName}.md`
    const file = app.vault.getAbstractFileByPath(filePath);
    if(!file) {
        return { status: `File not found` }
    }
    const content = await app.vault.read(file);
    if(!content) {
        return { status: `File is empty` }
    }
    const jsonMatch = content.match(/```json([\s\S]*?)```/);
    let jsonData;
    if(jsonMatch[1].length > 3) {
        jsonData = JSON.parse(jsonMatch[1].trim());
    } else {
        jsonData = null;
    }
    const dataFile = { jsonMatch, content, file, jsonData, status: 'success' }
    return dataFile
}

export const getDataArchiveFile = async (fileName: string) => {
    const filePath = `${pluginInstance.settings.targetFolder}/Archive/${fileName}.md`
    const file = app.vault.getAbstractFileByPath(filePath);
    if(!file) {
        await createDirectory()
        return { status: `File not found: ${filePath}. Please try again` }
    }
    const content = await app.vault.read(file);
    if(!content) {
        return { status: `File is empty: ${filePath}` }
    }
    const jsonMatch = content.match(/```json([\s\S]*?)```/);
    let jsonData;
    if(jsonMatch[1].length > 3) {
        jsonData = JSON.parse(jsonMatch[1].trim());
    } else {
        jsonData = null;
    }
    const dataFile = { jsonMatch, content, file, jsonData, status: 'success' }
    return dataFile
}

export const searchElementById = async (id: string, modifier: 'History' | 'expense' | 'income') => {
    if(modifier === 'History' || modifier === 'expense' || modifier === 'income') {
        const { jsonData, status } = await getDataFile(modifier === 'History' ? 'History' : modifier === 'expense' ? 'Expenditure plan' : modifier === 'income' ? 'Income plan' : 'Error')
        if(!(status === 'success')) {
            return status
        }
        
        try {
            const foundItem = jsonData.find(item => item.id === id);
            if (foundItem) {
                return { status: 'success', item: foundItem }
            } else {
                return { status: 'Item not found' }
            }
        } catch (err) {
            return { status: err }
        } 
    } else if (modifier === 'Archive bills') {
        const { jsonData, status } = await getDataArchiveFile(modifier)
        if(!(status === 'success')) {
            return status
        }
        
        try {
            const foundItem = jsonData.find(item => item.id === id);
            if (foundItem) {
                return { status: 'success', item: foundItem }
            } else {
                return { status: 'Item not found' }
            }
        } catch (err) {
            return { status: err }
        } 
    } else {
        return 'Element not found'
    }
}

export const searchHistory = async (inputValue: string) => {
    const { jsonData, status } = await getDataFile('History')
    if(!(status === 'success')) {
        return status
    }

    const { jsonData: expenditurePlanInfo } = await getDataFile('Expenditure plan')
    const { jsonData: incomePlanInfo } = await getDataFile('Income plan')
    const { jsonData: billsInfo } = await getDataArchiveFile('Archive bills')
    const allInfo = [...expenditurePlanInfo, ...incomePlanInfo, ...billsInfo]
    const additionalParameter = allInfo.filter(item => 
        item.name.toLowerCase().includes(inputValue.toLowerCase())
    )
    
    try {
        if(additionalParameter.length === 0) {
            const filteredData = jsonData.filter(item => 
                item.type.toLowerCase().includes(inputValue.toLowerCase()) ||
                item.amount.toString().includes(inputValue) ||
                (item.comment && item.comment.toLowerCase().includes(inputValue.toLowerCase()))
            );
    
            if(filteredData.length === 0) {
                return { status: 'success', jsonData: null }
            }
    
            return { status: 'success', jsonData: filteredData }
        } else {
            const filteredData = jsonData.filter(item => 
                item.type.toLowerCase().includes(inputValue.toLowerCase()) ||
                item.amount.toString().includes(inputValue) ||
                (item.comment && item.comment.toLowerCase().includes(inputValue.toLowerCase())) ||
                item.bill.id.includes(additionalParameter[0].id) ||
                item.category.id.includes(additionalParameter[0].id)
            );
    
            if(filteredData.length === 0) {
                return { status: 'success', jsonData: null }
            }
    
            return { status: 'success', jsonData: filteredData }
        }
    } catch (err) {
        return { status: err }
    }
}