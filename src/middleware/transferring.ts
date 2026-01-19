import Big from 'big.js';
import MainPlugin from '../../main';
import { TransferData, BillData, PlanData, HistoryData, ResultOfExecution } from "../../main";
import { getDataArchiveFile, getDataFile } from "../controllers/searchData";
import { updateFile } from "../controllers/editingData";

Big.DP = 2;
Big.RM = Big.roundHalfUp;

export const expenditureTransaction = async (
    data: HistoryData,
    modifier: 'add' | 'remove' | 'edit',
    oldData?: HistoryData
): Promise<ResultOfExecution> => {
    const amount = new Big(data.amount);

    const billsRes = await getDataArchiveFile<BillData>('Archive bills');
    if (billsRes.status === 'error') return { status: 'error', error: billsRes.error };
    if(billsRes.jsonData === undefined || billsRes.jsonData === null) return { status: 'error', error: new Error('Bill jsonData is undefined') }
    

    const plansRes = await getDataFile<PlanData>('Expenditure plan');
    if (plansRes.status === 'error') return { status: 'error', error: plansRes.error };
    if(plansRes.jsonData === undefined || plansRes.jsonData === null) return { status: 'error', error: new Error('Plan jsonData is undefined') }
    

    let bills = billsRes.jsonData;
    let plans = plansRes.jsonData;

    const update = async (): Promise<ResultOfExecution> => {
        if(billsRes.file === undefined) return { status: 'error', error: new Error('Bill file is undefined') }
        if(billsRes.content === undefined) return { status: 'error', error: new Error('Bill content is undefined') }
        if(plansRes.file === undefined) return { status: 'error', error: new Error('Plan file is undefined') }
        if(plansRes.content === undefined) return { status: 'error', error: new Error('Plan content is undefined') }


        const billUpdate = await updateFile(bills, billsRes.file, billsRes.content);
        if (billUpdate.status === 'error') return { status: 'error', error: billUpdate.error };

        const planUpdate = await updateFile(plans, plansRes.file, plansRes.content);
        if (planUpdate.status === 'error') return { status: 'error', error: planUpdate.error };

        return { status: 'success'};
    };

    const updateBill = (billId: string, delta: Big) => {
        bills = bills.map((b: any) =>
            b.id === billId ? { ...b, balance: new Big(b.balance).plus(delta).toFixed(2) } : b
        );
    };

    const updatePlan = (planId: string, delta: Big) => {
        plans = plans.map((p: any) =>
            p.id === planId ? { ...p, amount: new Big(p.amount).plus(delta).toFixed(2) } : p
        );
    };

    const caseEdit = async (): Promise<ResultOfExecution> => {
        if (!oldData) return { status: 'error', error: new Error('Old data is required for edit') };
            
        const oldAmount = new Big(oldData.amount)

        updateBill(oldData.bill.id, oldAmount);
        updatePlan(oldData.category.id, oldAmount.times(-1));
        await update();

        const newBillsRes = await getDataArchiveFile<BillData>('Archive bills');
        const newPlansRes = await getDataFile<PlanData>('Expenditure plan');
        if(newBillsRes.status === 'error') return { status: 'error', error: newBillsRes.error };
        if(newPlansRes.status === 'error') return { status: 'error', error: newPlansRes.error };
        if (!newBillsRes.jsonData || !newPlansRes.jsonData) {
            return { status: 'error', error: new Error('Reload data error') };
        }

        bills = newBillsRes.jsonData;
        plans = newPlansRes.jsonData;

        updateBill(data.bill.id, amount.times(-1));
        updatePlan(data.category.id, amount);
        return await update();
    }

    switch (modifier) {
        case 'add':
            updateBill(data.bill.id, amount.times(-1));
            updatePlan(data.category.id, amount);
            return await update();

        case 'remove':
            updateBill(data.bill.id, amount);
            updatePlan(data.category.id, amount.times(-1));
            return await update();

        case 'edit':
            return await caseEdit();

        default:
            return { status: 'error', error: new Error('Invalid modifier') }
    }
};

export const incomeTransaction = async (
    data: HistoryData,
    modifier: 'add' | 'remove' | 'edit',
    oldData?: HistoryData
): Promise<ResultOfExecution> => {
    const amount = new Big(data.amount);

    const billsRes = await getDataArchiveFile<BillData>('Archive bills');
    if (billsRes.status === 'error') return { status: 'error', error: billsRes.error };
    if(billsRes.jsonData === undefined || billsRes.jsonData === null) return { status: 'error', error: new Error('Bill jsonData is undefined') }

    const plansRes = await getDataFile<PlanData>('Income plan');
    if (plansRes.status === 'error') return { status: 'error', error: plansRes.error };
    if(plansRes.jsonData === undefined || plansRes.jsonData === null) return { status: 'error', error: new Error('Plan jsonData is undefined') }

    let bills = billsRes.jsonData;
    let plans = plansRes.jsonData;

    const update = async (): Promise<ResultOfExecution> => {
        if(billsRes.file === undefined) return { status: 'error', error: new Error('Bill file is undefined') }
        if(billsRes.content === undefined) return { status: 'error', error: new Error('Bill content is undefined') }
        if(plansRes.file === undefined) return { status: 'error', error: new Error('Plan file is undefined') }
        if(plansRes.content === undefined) return { status: 'error', error: new Error('Plan content is undefined') }

        const billRes = await updateFile(bills, billsRes.file, billsRes.content);
        if (billRes.status === 'error') return { status: 'error', error: billRes.error };

        const planRes = await updateFile(plans, plansRes.file, plansRes.content);
        if (planRes.status === 'error') return { status: 'error', error: planRes.error };

        return { status: 'success' };
    };

    const updateBill = (billId: string, delta: Big) => {
        bills = bills.map((b: any) =>
            b.id === billId
                ? { ...b, balance: new Big(b.balance).plus(delta).toFixed(2) }
                : b
        );
    };

    const updatePlan = (planId: string, delta: Big) => {
        plans = plans.map((p: any) =>
            p.id === planId
                ? { ...p, amount: new Big(p.amount).plus(delta).toFixed(2) }
                : p
        );
    };

    const caseEdit = async (): Promise<ResultOfExecution> => {
        if (!oldData) return { status: 'error', error: new Error('Old data is required for edit') };

        const oldAmount = new Big(oldData.amount)

        updateBill(oldData.bill.id, oldAmount.times(-1));
        updatePlan(oldData.category.id, oldAmount.times(-1));
        await update();

        const newBillsRes = await getDataArchiveFile<BillData>('Archive bills');
        const newPlansRes = await getDataFile<PlanData>('Income plan');
        if(newBillsRes.status === 'error') return { status: 'error', error: newBillsRes.error };
        if(newPlansRes.status === 'error') return { status: 'error', error: newPlansRes.error };
        if (!newBillsRes.jsonData || !newPlansRes.jsonData) {
            return { status: 'error', error: new Error('Reload data error') };
        }

        bills = newBillsRes.jsonData;
        plans = newPlansRes.jsonData;

        updateBill(data.bill.id, amount);
        updatePlan(data.category.id, amount);
        return await update();
    }

    switch (modifier) {
        case 'add':
            updateBill(data.bill.id, amount);
            updatePlan(data.category.id, amount);
            return await update();

        case 'remove':
            updateBill(data.bill.id, amount.times(-1));
            updatePlan(data.category.id, amount.times(-1));
            return await update();

        case 'edit':
            return await caseEdit();

        default:
            return { status: 'error', error: new Error('Invalid modifier') };
    }
};

export const transferBetweenBills = async (data: TransferData): Promise<ResultOfExecution> => {
    if (data.fromBillId === data.toBillId) {
        return { status: 'error', error: new Error('Cannot transfer to the same bill') };
    }

    const archiveBills = await getDataArchiveFile<BillData>('Archive bills');

    if (archiveBills.status === 'error') return { status: 'error', error: archiveBills.error };
    if (!archiveBills.jsonData || !archiveBills.file || !archiveBills.content) {
        return { status: 'error', error: new Error('Archive bills data is incomplete') };
    }

    const fromBill = archiveBills.jsonData.find(b => b.id === data.fromBillId);
    const toBill = archiveBills.jsonData.find(b => b.id === data.toBillId);

    if (!fromBill || !toBill) {
        return { status: 'error', error: new Error('One or both bills not found') };
    }

    const fromBalance = new Big(fromBill.balance);
    const toBalance = new Big(toBill.balance);

    let debit: Big;
    let credit: Big;

    if (data.type === 'same-currency') {
        debit = new Big(data.amount);
        credit = debit;
    } else {
        debit = new Big(data.sourceAmount);
        credit = new Big(data.targetAmount);
    }

    if (debit.gt(fromBalance)) {
        return { status: 'error', error: new Error(`Insufficient funds in bill ${fromBill.name}`) };
    }

    const newFromBalance = fromBalance.minus(debit);
    const newToBalance = toBalance.plus(credit);

    const newBills = archiveBills.jsonData.map(bill => {
        if (bill.id === fromBill.id) {
            return { ...bill, balance: newFromBalance.toFixed(2) };
        }
        if (bill.id === toBill.id) {
            return { ...bill, balance: newToBalance.toFixed(2) };
        }
        return bill;
    });

    const newContent = archiveBills.content.replace(
        /```json[\s\S]*?```/,
        `\`\`\`json\n${JSON.stringify(newBills, null, 4)}\n\`\`\``
    );

    try {
        await MainPlugin.instance.app.vault.modify(archiveBills.file, newContent);
        return { status: 'success' };
    } catch (error) {
        return { status: 'error', error: new Error(`Error tranfer berween bills: ${error}`)}
    }
};