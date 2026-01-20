import MainPlugin from '../../main';
import { PlanData, ResultOfExecution } from "../../main";
import { getDataFile, getDataArchiveFile } from "../controllers/searchData";

export const newMonthExpenditurePlan = async (): Promise<ResultOfExecution> => {
    const archivePlan = await getDataArchiveFile<PlanData>("Archive expenditure plan");
    if (archivePlan.status === "error") return { status: 'error', error: archivePlan.error };
    if(archivePlan.jsonData === undefined) return { status: 'error', error: new Error("Archive expenditure plan data is undefined") };
    if(archivePlan.jsonData === null) return { status: 'success' };
    if(archivePlan.content === undefined) return { status: 'error', error: new Error("Archive expenditure plan content is undefined") };
    
    const expensePlan = await getDataFile<PlanData>("Expenditure plan");
    if (expensePlan.status === "error") return { status: 'error', error: expensePlan.error };
    if(expensePlan.file === undefined) return { status: 'error', error: new Error("Expenditure plan file is undefined") };
    
    if (archivePlan.jsonData.length > 0) {
        try {
            const data = archivePlan.jsonData.map((obj: PlanData) => ({ ...obj, amount: 0 }));
            const dataStr = JSON.stringify(data, null, 4);
            const newContent = archivePlan.content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await MainPlugin.instance.app.vault.modify(expensePlan.file, newContent);

            return { status: 'success' };
        } catch (error) {
            return { status: 'error', error: error instanceof Error ? error : new Error(`Failed to create new month expenditure plan: ${String(error)}`) }
        }
    } else {
        return { status: 'success' };
    }
}

export const newMonthIncomePlan = async (): Promise<ResultOfExecution> => {
    const archivePlan = await getDataArchiveFile<PlanData>("Archive income plan");
    if (archivePlan.status === "error") return { status: 'error', error: archivePlan.error };
    if(archivePlan.jsonData === undefined) return { status: 'error', error: new Error("Archive income plan data is undefined") };
    if(archivePlan.jsonData === null) return { status: 'success' };
    if(archivePlan.content === undefined) return { status: 'error', error: new Error("Archive income plan content is undefined") };

    const incomePlan = await getDataFile<PlanData>("Income plan");
    if (incomePlan.status === "error") return { status: 'error', error: incomePlan.error };
    if(incomePlan.file === undefined) return { status: 'error', error: new Error("Income plan file is undefined") };

    if (archivePlan.jsonData.length > 0) {
        try {
            const data = archivePlan.jsonData.map((obj: PlanData) => ({ ...obj, amount: 0 }));
            const dataStr = JSON.stringify(data, null, 4);
            const newContent = archivePlan.content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await MainPlugin.instance.app.vault.modify(incomePlan.file, newContent);
            
            return { status: 'success' };
        } catch (error) {
            return { status: 'error', error: error instanceof Error ? error : new Error(`Failed to create new month income plan: ${String(error)}`) }
        }
    } else {
        return { status: 'success' };
    }
}

export const checkingExpensePlanForCompliance = async (): Promise<ResultOfExecution> => {
    const expensePlan = await getDataFile<PlanData>("Expenditure plan");
    if (expensePlan.status === "error") return { status: 'error', error: expensePlan.error };
    if(expensePlan.jsonData === undefined) return { status: 'error', error: new Error("Expenditure plan info is undefined") };
    if(expensePlan.content === undefined) return { status: 'error', error: new Error("Expenditure plan content is undefined") };
    if(expensePlan.file === undefined) return { status: 'error', error: new Error("Expenditure plan file is undefined") };
    const expensePlanJsonData = expensePlan.jsonData;

    const archivePlan = await getDataArchiveFile<PlanData>("Archive expenditure plan");
    if (archivePlan.status === "error") return { status: 'error', error: archivePlan.error };
    if(archivePlan.jsonData === undefined) return { status: 'error', error: new Error("Archive expenditure plan info is undefined") };
    if(archivePlan.jsonData === null) return { status: 'success' };

    if (expensePlanJsonData === null) {
        return await newMonthExpenditurePlan();
    } else if (expensePlanJsonData.length < archivePlan.jsonData.length) {
        try {
            const missingItems = archivePlan.jsonData.filter((archiveItem: PlanData) => !expensePlanJsonData.some((currentItem: PlanData) => currentItem.id === archiveItem.id)).map((obj: PlanData) => ({ ...obj, amount: 0 }));
            const updatedData = [...expensePlanJsonData, ...missingItems];
            const dataStr = JSON.stringify(updatedData, null, 4);
            const newContent = expensePlan.content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await MainPlugin.instance.app.vault.modify(expensePlan.file, newContent);

            return { status: 'success' };
        } catch (error) {
            return { status: 'error', error: error instanceof Error ? error : new Error(`Failed to check expense plan for compliance: ${String(error)}`)}
        }
    } else if (expensePlanJsonData.length > archivePlan.jsonData.length) {
        try {
            const updatedArchiveData = archivePlan.jsonData
                .filter((archiveItem: PlanData) => expensePlanJsonData.some((currentItem: PlanData) => currentItem.id === archiveItem.id))
                .map((obj: PlanData) => ({ ...obj, amount: 0 }));
            const dataStr = JSON.stringify(updatedArchiveData, null, 4);
            const newContent = expensePlan.content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await MainPlugin.instance.app.vault.modify(expensePlan.file, newContent);

            return { status: 'success' };
        } catch (error) {
            return { status: 'error', error: error instanceof Error ? error : new Error(`Failed to check expense plan for compliance: ${String(error)}`)}
        }
    } else {
        return { status: 'success' };
    }
}

export const checkingIncomePlanForCompliance = async(): Promise<ResultOfExecution> => {
    const incomePlan = await getDataFile<PlanData>("Income plan");
    if (incomePlan.status === "error") return { status: 'error', error: incomePlan.error };
    if(incomePlan.jsonData === undefined) return { status: 'error', error: new Error("Income plan info is undefined") };
    if(incomePlan.content === undefined) return { status: 'error', error: new Error("Income plan content is undefined") };
    if(incomePlan.file === undefined) return { status: 'error', error: new Error("Income plan file is undefined") };
    const incomePlanInfo = incomePlan.jsonData;

    const archivePlan = await getDataArchiveFile<PlanData>("Archive income plan");
    if (archivePlan.status === "error") return { status: 'error', error: archivePlan.error };
    if(archivePlan.jsonData === undefined) return { status: 'error', error: new Error("Archive income plan info is undefined") };
    if(archivePlan.jsonData === null) return { status: 'success' }

    if (incomePlanInfo === null) {
        return await newMonthIncomePlan();
    } else if (incomePlanInfo.length < archivePlan.jsonData.length) {
        try {
            const missingItems = archivePlan.jsonData
                .filter((archiveItem: PlanData) => !incomePlanInfo.some((currentItem: PlanData) => currentItem.id === archiveItem.id))
                .map((obj: PlanData) => ({ ...obj, amount: 0 }));
            const updatedData = [...incomePlanInfo, ...missingItems];
            const dataStr = JSON.stringify(updatedData, null, 4);
            const newContent = incomePlan.content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await MainPlugin.instance.app.vault.modify(incomePlan.file, newContent);

            return { status: 'success' };
        } catch (error) {
            return { status: 'error', error: error instanceof Error ? error : new Error(`Failed to check income plan for compliance: ${String(error)}`) }
        }
    } else if (incomePlanInfo.length > archivePlan.jsonData.length) {
        try {
            const updatedArchiveData = archivePlan.jsonData
                .filter((archiveItem: PlanData) => incomePlanInfo.some((currentItem: PlanData) => currentItem.id === archiveItem.id))
                .map((obj: PlanData) => ({ ...obj, amount: 0 }));
            const dataStr = JSON.stringify(updatedArchiveData, null, 4);
            const newContent = incomePlan.content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await MainPlugin.instance.app.vault.modify(incomePlan.file, newContent);

            return { status: 'success' };
        } catch (error) {
            return { status: 'error', error: error instanceof Error ? error : new Error(`Failed to check income plan for compliance: ${String(error)}`) }
        }
    } else {
        return { status: 'success' };
    }
}

export const archiveExpenditurePlan = async (): Promise<ResultOfExecution> => {
    const expensePlan = await getDataFile<PlanData>('Expenditure plan')
    if (expensePlan.status === 'error') return { status: 'error', error: expensePlan.error }
    if(expensePlan.jsonData === undefined || expensePlan.jsonData === null) return { status: 'error', error: new Error("Expenditure plan data is undefined") };
    if(expensePlan.file === undefined) return { status: 'error', error: new Error("Expenditure plan file is undefined") };
    if(expensePlan.content === undefined) return { status: 'error', error: new Error("Expenditure plan content is undefined") };
    
    const archivePlan = await getDataArchiveFile<PlanData>('Archive expenditure plan')
    if (archivePlan.status === 'error') return { status: 'error', error: archivePlan.error }
    if(archivePlan.file === undefined) return { status: 'error', error: new Error("Archive expenditure plan file is undefined") };

    if(expensePlan.jsonData.length <= 1) {
        try {
            await MainPlugin.instance.app.vault.modify(archivePlan.file, expensePlan.content);

            return { status: 'success' };
        } catch (error) {
            return { status: 'error', error: error instanceof Error ? error : new Error(`Failed to archive expenditure plan: ${String(error)}`)}
        }
    } else {
        try {
            const data = (expensePlan.jsonData).map(({ amount, ...rest }) => rest)
            const dataStr = JSON.stringify(data, null, 4);
            const newContent = expensePlan.content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await MainPlugin.instance.app.vault.modify(archivePlan.file, newContent);

            return { status: 'success' };
        } catch (error) {
            return { status: 'error', error: error instanceof Error ? error : new Error(`Failed to archive expenditure plan: ${String(error)}`)}
        }
    }
}

export const archiveIncomePlan = async (): Promise<ResultOfExecution> => {
    const incomePlan = await getDataFile<PlanData>('Income plan')
    if (incomePlan.status === 'error') return { status: 'error', error: incomePlan.error }
    if(incomePlan.jsonData === undefined || incomePlan.jsonData === null) return { status: 'error', error: new Error("Income plan data is undefined") };
    if(incomePlan.file === undefined) return { status: 'error', error: new Error("Income plan file is undefined") };
    if(incomePlan.content === undefined) return { status: 'error', error: new Error("Income plan content is undefined") };

    const archivePlan = await getDataArchiveFile<PlanData>('Archive income plan')
    if (archivePlan.status === 'error') return { status: 'error', error: archivePlan.error }
    if(archivePlan.file === undefined) return { status: 'error', error: new Error("Archive income plan file is undefined") };

    if(incomePlan.jsonData.length <= 1) {
        try {
            await MainPlugin.instance.app.vault.modify(archivePlan.file, incomePlan.content);

            return { status: 'success' };
        } catch (error) {
            return { status: 'error', error: error instanceof Error ? error : new Error(`Failed to archive income plan: ${String(error)}`)}
        }
    } else {
        try {
            const data = (incomePlan.jsonData).map(({ amount, ...rest }) => rest)
            const dataStr = JSON.stringify(data, null, 4);
            const newContent = incomePlan.content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await MainPlugin.instance.app.vault.modify(archivePlan.file, newContent);

            return { status: 'success' };
        } catch (error) {
            return { status: 'error', error: error instanceof Error ? error : new Error(`Failed to archive income plan: ${String(error)}`)}
        }
    }
}