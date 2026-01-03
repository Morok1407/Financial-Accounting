import Big from 'big.js';
import { pluginInstance, TransferBetweenBills, BillData, PlanData, HistoryData } from "../../main";
import { getDataArchiveFile, getDataFile } from "../controllers/searchData";
import { updateFile } from "../controllers/editingData";

Big.DP = 2;
Big.RM = Big.roundHalfUp;

export const expenditureTransaction = async (
    data: HistoryData,
    modifier: 'add' | 'remove' | 'edit',
    oldData?: HistoryData
) => {
    const amount = new Big(data.amount);

    const billsRes = await getDataArchiveFile<BillData>('Archive bills');
    if (billsRes.status !== 'success') return billsRes.status;
    if (!billsRes.jsonData || !billsRes.file || !billsRes.content) {
        return 'Bills data error';
    }

    const plansRes = await getDataFile<PlanData>('Expenditure plan');
    if (plansRes.status !== 'success') return plansRes.status;
    if (!plansRes.jsonData || !plansRes.file || !plansRes.content) {
        return 'Plans data error';
    }

    let bills = billsRes.jsonData;
    let plans = plansRes.jsonData;

    const update = async () => {
        const billUpdate = await updateFile(bills, billsRes.file, billsRes.content);
        if (billUpdate !== 'success') return billUpdate;

        const planUpdate = await updateFile(plans, plansRes.file, plansRes.content);
        if (planUpdate !== 'success') return planUpdate;

        return 'success';
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
            if (!oldData) return 'Old data is required for edit';

            const oldAmount = new Big(oldData.amount)

            updateBill(oldData.bill.id, oldAmount);
            updatePlan(oldData.category.id, oldAmount.times(-1));
            await update();

            const newBillsRes = await getDataArchiveFile<BillData>('Archive bills');
            const newPlansRes = await getDataFile<PlanData>('Expenditure plan');

            if (!newBillsRes.jsonData || !newPlansRes.jsonData) {
                return 'Reload data error';
            }

            bills = newBillsRes.jsonData;
            plans = newPlansRes.jsonData;

            updateBill(data.bill.id, amount.times(-1));
            updatePlan(data.category.id, amount);
            return await update();

        default:
            return 'Invalid modifier';
    }
};

export const incomeTransaction = async (
    data: HistoryData,
    modifier: 'add' | 'remove' | 'edit',
    oldData?: HistoryData
) => {
    const amount = new Big(data.amount);

    const billsRes = await getDataArchiveFile<BillData>('Archive bills');
    if (billsRes.status !== 'success') return billsRes.status;
    if (!billsRes.jsonData || !billsRes.file || !billsRes.content) {
        return 'Bills data error';
    }

    const plansRes = await getDataFile<PlanData>('Income plan');
    if (plansRes.status !== 'success') return plansRes.status;
    if (!plansRes.jsonData || !plansRes.file || !plansRes.content) {
        return 'Plans data error';
    }

    let bills = billsRes.jsonData;
    let plans = plansRes.jsonData;

    const update = async () => {
        const billRes = await updateFile(bills, billsRes.file, billsRes.content);
        if (billRes !== 'success') return billRes;

        const planRes = await updateFile(plans, plansRes.file, plansRes.content);
        if (planRes !== 'success') return planRes;

        return 'success';
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
            if (!oldData) return 'Old data is required for edit';

            const oldAmount = new Big(oldData.amount)

            updateBill(oldData.bill.id, oldAmount.times(-1));
            updatePlan(oldData.category.id, oldAmount.times(-1));
            await update();

            const newBillsRes = await getDataArchiveFile<BillData>('Archive bills');
            const newPlansRes = await getDataFile<PlanData>('Income plan');

            if (!newBillsRes.jsonData || !newPlansRes.jsonData) {
                return 'Reload data error';
            }

            bills = newBillsRes.jsonData;
            plans = newPlansRes.jsonData;

            updateBill(data.bill.id, amount);
            updatePlan(data.category.id, amount);
            return await update();

        default:
            return 'Invalid modifier';
    }
};

export const transferJsonToBills = async (data: TransferBetweenBills) => {
    if (data.fromBillId === data.toBillId) {
        return 'Cannot transfer to the same bill';
    }

    const { jsonData: resultBills, file, content, status } =
        await getDataArchiveFile<BillData>('Archive bills');

    if (status !== 'success') return status;
    if (!resultBills) return 'Bills is null or undefined';
    if (!content) return 'Bill content is null or undefined';
    if (!file) return 'Bill file is null or undefined';

    const fromBill = resultBills.find(b => b.id === data.fromBillId);
    const toBill = resultBills.find(b => b.id === data.toBillId);

    if (!fromBill || !toBill) {
        return 'One of the bills was not found';
    }

    const amount = new Big(data.amount);
    const fromBalance = new Big(fromBill.balance);

    if (amount.gt(fromBalance)) {
        return `Insufficient funds in the ${fromBill.name}`;
    }

    const newFromBalance = fromBalance.minus(amount);
    const newToBalance = new Big(toBill.balance).plus(amount);

    try {
        const newData = resultBills.map(item => {
            if (item.id === data.fromBillId) {
                return {
                    ...item,
                    balance: newFromBalance.toFixed(2),
                };
            }

            if (item.id === data.toBillId) {
                return {
                    ...item,
                    balance: newToBalance.toFixed(2),
                };
            }

            return item;
        });

        const dataStr = JSON.stringify(newData, null, 4);
        const newContent = content.replace(
            /```json[\s\S]*?```/,
            "```json\n" + dataStr + "\n```"
        );

        await pluginInstance.app.vault.modify(file, newContent);

        return 'success';
    } catch (error) {
        return error;
    }
};
