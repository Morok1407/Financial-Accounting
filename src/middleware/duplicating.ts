import { App } from 'obsidian'
import { pluginInstance, PlanData } from "../../main";
import { getDataFile, getDataArchiveFile } from "../controllers/searchData";

declare const app: App;

export const newMonthExpenditurePlan = async () => {
    const { jsonData, content, status: archiveStatus } = await getDataArchiveFile<PlanData>("Archive expenditure plan");
    if (!(archiveStatus === "success")) {
        return archiveStatus;
    }
    if(jsonData === undefined) throw new Error("Archive expenditure plan data is undefined");
    if(jsonData === null) {
        return "success";
    }
    if(content === undefined) throw new Error("Archive expenditure plan content is undefined");
    
    const { file, status } = await getDataFile<PlanData>("Expenditure plan");
    if (!(status === "success")) {
        return status;
    }
    if(file === undefined) throw new Error("Expenditure plan file is undefined");
    
    if (jsonData.length > 1) {
        try {
            const data = jsonData.map((obj: any) => ({ ...obj, amount: 0 }));
            const dataStr = JSON.stringify(data, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await pluginInstance.app.vault.modify(file, newContent);

            return "success";
        } catch (error) {
            return error;
        }
    }
}

export const newMonthIncomePlan = async () => {
    const { jsonData, content, status: archStatus } = await getDataArchiveFile<PlanData>("Archive income plan");
    if (!(archStatus === "success")) {
        return archStatus;
    }
    if(jsonData === undefined) throw new Error("Archive expenditure plan data is null");
    if(jsonData === null) {
        return "success";
    }
    if(content === undefined) throw new Error("Archive expenditure plan content is undefined");

    const { file, status } = await getDataFile<PlanData>("Income plan");
    if (!(status === "success")) {
        return status;
    }
    if(file === undefined) throw new Error("Income plan file is undefined");

    if (jsonData.length > 1) {
        try {
            const data = jsonData.map((obj: any) => ({ ...obj, amount: 0 }));
            const dataStr = JSON.stringify(data, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await pluginInstance.app.vault.modify(file, newContent);
            return "success";
        } catch (error) {
            return error;
        }
    }
}

export const checkingExpensePlanForCompliance = async () => {
    const { jsonData: expenditurePlanInfo, file, content, status: expenditurePlanStatus } = await getDataFile<PlanData>("Expenditure plan");
    if (!(expenditurePlanStatus === "success")) {
        return expenditurePlanStatus;
    }
    if(expenditurePlanInfo === undefined) throw new Error("Expenditure plan info is undefined");
    if(content === undefined) throw new Error("Expenditure plan content is undefined");
    if(file === undefined) throw new Error("Expenditure plan file is undefined");

    const { jsonData: archiveExpenditurePlanInfo, status: archiveExpenditurePlanStatus } = await getDataArchiveFile<PlanData>("Archive expenditure plan");
    if (!(archiveExpenditurePlanStatus === "success")) {
        return archiveExpenditurePlanStatus;
    }
    if(archiveExpenditurePlanInfo === undefined) throw new Error("Archive expenditure plan info is undefined");
    if(archiveExpenditurePlanInfo === null) {
        return "success";
    }
    
    if (expenditurePlanInfo === null) {
        await newMonthExpenditurePlan();
    } else if (expenditurePlanInfo.length < archiveExpenditurePlanInfo.length) {
        try {
            const missingItems = archiveExpenditurePlanInfo
                .filter((archiveItem: any) => !expenditurePlanInfo.some((currentItem: any) => currentItem.id === archiveItem.id))
                .map((obj: any) => ({ ...obj, amount: 0 }));
            const updatedData = [...expenditurePlanInfo, ...missingItems];
            const dataStr = JSON.stringify(updatedData, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await pluginInstance.app.vault.modify(file, newContent);
            return "success";
        } catch (error) {
            return error;
        }
    } else if (expenditurePlanInfo.length > archiveExpenditurePlanInfo.length) {
        try {
            const updatedArchiveData = archiveExpenditurePlanInfo
                .filter((archiveItem: any) => expenditurePlanInfo.some((currentItem: any) => currentItem.id === archiveItem.id))
                .map((obj: any) => ({ ...obj, amount: 0 }));
            const dataStr = JSON.stringify(updatedArchiveData, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await pluginInstance.app.vault.modify(file, newContent);
            return "success";
        } catch (error) {
            return error;
        }
    }
}

export const checkingIncomePlanForCompliance = async() => {
    const { jsonData: incomePlanInfo, file, content, status: incomePlanStatus } = await getDataFile<PlanData>("Income plan");
    if (!(incomePlanStatus === "success")) {
        return incomePlanStatus;
    }
    if(incomePlanInfo === undefined) throw new Error("Income plan info is undefined");
    if(content === undefined) throw new Error("Income plan content is undefined");
    if(file === undefined) throw new Error("Income plan file is undefined");


    const { jsonData: archiveIncomePlanInfo, status: archiveIncomePlanStatus } = await getDataArchiveFile<PlanData>("Archive income plan");
    if (!(archiveIncomePlanStatus === "success")) {
        return archiveIncomePlanStatus;
    }
    if(archiveIncomePlanInfo === undefined) throw new Error("Archive income plan info is undefined");
    if(archiveIncomePlanInfo === null) {
        return "success";
    }

    if (incomePlanInfo === null) {
        await newMonthIncomePlan();
    } else if (incomePlanInfo.length < archiveIncomePlanInfo.length) {
        try {
            const missingItems = archiveIncomePlanInfo
                .filter((archiveItem: any) => !incomePlanInfo.some((currentItem: any) => currentItem.id === archiveItem.id))
                .map((obj: any) => ({ ...obj, amount: 0 }));
            const updatedData = [...incomePlanInfo, ...missingItems];
            const dataStr = JSON.stringify(updatedData, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await pluginInstance.app.vault.modify(file, newContent);
            return "success";
        } catch (error) {
            return error;
        }
    } else if (incomePlanInfo.length > archiveIncomePlanInfo.length) {
        try {
            const updatedArchiveData = archiveIncomePlanInfo
                .filter((archiveItem: any) => incomePlanInfo.some((currentItem: any) => currentItem.id === archiveItem.id))
                .map((obj: any) => ({ ...obj, amount: 0 }));
            const dataStr = JSON.stringify(updatedArchiveData, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await pluginInstance.app.vault.modify(file, newContent);
            return "success";
        } catch (error) {
            return error;
        }
    }
}

export const archiveExpenditurePlan = async () => {
    const { jsonData, file, content, status } = await getDataFile<PlanData>('Expenditure plan')
    if(!(status === 'success')) {
        return status
    }
    if(jsonData === undefined || jsonData === null) throw new Error("Expenditure plan data is undefined");
    if(file === undefined) throw new Error("Expenditure plan file is undefined");
    if(content === undefined) throw new Error("Expenditure plan content is undefined");
    
    const { file: archiveFile, status: archiveStatus } = await getDataArchiveFile<PlanData>('Archive expenditure plan')
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }
    if(archiveFile === undefined) throw new Error("Archive expenditure plan file is undefined");

    if(jsonData.length <= 1) {
        try {
            const content = await app.vault.read(file);
            await pluginInstance.app.vault.modify(archiveFile, content);

            return 'success'
        } catch (error) {
            return error
        }
    } else {
        try {
            const data = (jsonData).map(({ amount, ...rest }) => rest)
            const dataStr = JSON.stringify(data, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await pluginInstance.app.vault.modify(archiveFile, newContent);

            return 'success'
        } catch (error) {
            return error
        }
    }
}

export const archiveIncomePlan = async () => {
    const { jsonData, file, content, status } = await getDataFile<PlanData>('Income plan')
    if(!(status === 'success')) {
        return status
    }
    if(jsonData === undefined || jsonData === null) throw new Error("Income plan data is undefined");
    if(file === undefined) throw new Error("Income plan file is undefined");
    if(content === undefined) throw new Error("Income plan content is undefined");

    const { file: archiveFile, status: archiveStatus } = await getDataArchiveFile<PlanData>('Archive income plan')
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }
    if(archiveFile === undefined) throw new Error("Archive income plan file is undefined");

    if(jsonData.length <= 1) {
        try {
            const content = await app.vault.read(file);
            await pluginInstance.app.vault.modify(archiveFile, content);

            return 'success'
        } catch (error) {
            return error
        }
    } else {
        try {
            const data = (jsonData).map(({ amount, ...rest }) => rest)
            const dataStr = JSON.stringify(data, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await pluginInstance.app.vault.modify(archiveFile, newContent);

            return 'success'
        } catch (error) {
            return error
        }
    }
}