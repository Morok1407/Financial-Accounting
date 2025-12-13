import { pluginInstance } from "../../main";
import { getDataFile, getDataArchiveFile } from "../controllers/searchData";

export const newMonthExpenditurePlan = async () => {
    const { content, jsonMatch, status: archiveStatus } = await getDataArchiveFile("Archive expenditure plan");
    if (!(archiveStatus === "success")) {
        return archiveStatus;
    }
    const { file, status } = await getDataFile("Expenditure plan");
    if (!(status === "success")) {
        return status;
    }
    if (jsonMatch[1].length > 1) {
        try {
            const jsonData = JSON.parse(jsonMatch[1].trim());
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
    const { content, jsonMatch, status: archStatus } = await getDataArchiveFile("Archive income plan");
    if (!(archStatus === "success")) {
        return archStatus;
    }
    const { file, status } = await getDataFile("Income plan");
    if (!(status === "success")) {
        return status;
    }

    if (jsonMatch[1].length > 1) {
        try {
            const jsonData = JSON.parse(jsonMatch[1].trim());
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
    const { jsonData: expenditurePlanInfo, file, content, status: expenditurePlanStatus } = await getDataFile("Expenditure plan");
    if (!(expenditurePlanStatus === "success")) {
        return expenditurePlanStatus;
    }
    const { jsonData: archiveExpenditurePlanInfo, status: archiveExpenditurePlanStatus } = await getDataArchiveFile("Archive expenditure plan");
    if (!(archiveExpenditurePlanStatus === "success")) {
        return archiveExpenditurePlanStatus;
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
            await plugin.app.vault.modify(file, newContent);
            return "success";
        } catch (error) {
            return error;
        }
    }
}

export const checkingIncomePlanForCompliance = async() => {
    const { jsonData: incomePlanInfo, file, content, status: incomePlanStatus } = await getDataFile("Income plan");
    if (!(incomePlanStatus === "success")) {
        return incomePlanStatus;
    }
    const { jsonData: archiveIncomePlanInfo, status: archiveIncomePlanStatus } = await getDataArchiveFile("Archive income plan");
    if (!(archiveIncomePlanStatus === "success")) {
        return archiveIncomePlanStatus;
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
    const { file, jsonMatch, content, status } = await getDataFile('Expenditure plan')
    if(!(status === 'success')) {
        return status
    }
    const { file: archiveFile, status: archiveStatus } = await getDataArchiveFile('Archive expenditure plan')
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }

    if(jsonMatch[1].length <= 1) {
        try {
            const content = await app.vault.read(file);
            await pluginInstance.app.vault.modify(archiveFile, content);

            return 'success'
        } catch (error) {
            return error
        }
    } else {
        try {
            const jsonData = JSON.parse(jsonMatch[1].trim())
            const data = jsonData.map(({ amount, ...rest }) => rest)
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
    const { file, jsonMatch, content, status } = await getDataFile('Income plan')
    if(!(status === 'success')) {
        return status
    }
    const { file: archiveFile, status: archiveStatus } = await getDataArchiveFile('Archive income plan')
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }

    if(jsonMatch[1].length <= 1) {
        try {
            const content = await app.vault.read(file);
            await pluginInstance.app.vault.modify(archiveFile, content);

            return 'success'
        } catch (error) {
            return error
        }
    } else {
        try {
            const jsonData = JSON.parse(jsonMatch[1].trim())
            const data = jsonData.map(({ amount, ...rest }) => rest)
            const dataStr = JSON.stringify(data, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await pluginInstance.app.vault.modify(archiveFile, newContent);

            return 'success'
        } catch (error) {
            return error
        }
    }
}