import Big from 'big.js';
import { BillData, HistoryData, ResultOfExecution, TransferData, accountsData } from "../../main";
import { getAllFile } from "../controllers/searchData";
import { updateFile } from "../controllers/editingData";

Big.DP = 2;
Big.RM = Big.roundHalfUp;

export const expenditureTransaction = async (
	data: HistoryData,
	modifier: 'add' | 'remove' | 'edit',
	oldData?: HistoryData
): Promise<ResultOfExecution> => {
	const amount = new Big(data.amount);

	const billsRes = await getAllFile<accountsData>('accounts');
	if (billsRes.status === 'error') return { status: 'error', error: billsRes.error };

	let bills: BillData[] = billsRes.json.accounts;

	const update = async (): Promise<ResultOfExecution> => {
		billsRes.json.accounts = bills;
		const billUpdate = await updateFile('accounts', billsRes.json);
		if (billUpdate.status === 'error') return { status: 'error', error: billUpdate.error };

		return { status: 'success' };
	};

	const updateBill = (billId: string, delta: Big) => {
		bills = bills.map((b: BillData) =>
			b.id === billId ? { ...b, balance: new Big(b.balance).plus(delta).toFixed(2) } : b
		);
	};

	const caseEdit = async (): Promise<ResultOfExecution> => {
		if (!oldData) return { status: 'error', error: new Error('Old data is required for edit') };

		const oldAmount = new Big(oldData.amount)

		updateBill(oldData.bill.id, oldAmount);
		await update();

		const newBillsRes = await getAllFile<accountsData>('accounts');
		if (newBillsRes.status === 'error') return { status: 'error', error: newBillsRes.error };

		bills = newBillsRes.json.accounts;

		updateBill(data.bill.id, amount.times(-1));
		return await update();
	}

	switch (modifier) {
		case 'add':
			updateBill(data.bill.id, amount.times(-1));
			return await update();

		case 'remove':
			updateBill(data.bill.id, amount);
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

	const billsRes = await getAllFile<accountsData>('accounts');
	if (billsRes.status === 'error') return { status: 'error', error: billsRes.error };

	let bills: BillData[] = billsRes.json.accounts;

	const update = async (): Promise<ResultOfExecution> => {
		billsRes.json.accounts = bills;
		const billUpdate = await updateFile('accounts', billsRes.json);
		if (billUpdate.status === 'error') return { status: 'error', error: billUpdate.error };

		return { status: 'success' };
	};

	const updateBill = (billId: string, delta: Big) => {
		bills = bills.map((b: BillData) =>
			b.id === billId
				? { ...b, balance: new Big(b.balance).plus(delta).toFixed(2) }
				: b
		);
	};

	const caseEdit = async (): Promise<ResultOfExecution> => {
		if (!oldData) return { status: 'error', error: new Error('Old data is required for edit') };

		const oldAmount = new Big(oldData.amount)

		updateBill(oldData.bill.id, oldAmount.times(-1));
		await update();

		const newBillsRes = await getAllFile<accountsData>('accounts');
		if (newBillsRes.status === 'error') return { status: 'error', error: newBillsRes.error };

		bills = newBillsRes.json.accounts;

		updateBill(data.bill.id, amount);
		return await update();
	}

	switch (modifier) {
		case 'add':
			updateBill(data.bill.id, amount);
			return await update();

		case 'remove':
			updateBill(data.bill.id, amount.times(-1));
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

	const bills = await getAllFile<accountsData>('accounts');
	if (bills.status === 'error') return { status: 'error', error: bills.error };

	const fromBill = bills.json.accounts.find((b: BillData) => b.id === data.fromBillId);
	const toBill = bills.json.accounts.find((b: BillData) => b.id === data.toBillId);

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

	const newBills = bills.json.accounts.map((bill: BillData) => {
		if (bill.id === fromBill.id) {
			return { ...bill, balance: newFromBalance.toFixed(2) };
		}
		if (bill.id === toBill.id) {
			return { ...bill, balance: newToBalance.toFixed(2) };
		}
		return bill;
	});

	bills.json.accounts = newBills;

	try {
		await updateFile('accounts', bills.json);

		return { status: 'success' };
	} catch (error) {
		return { status: 'error', error: error instanceof Error ? error : new Error(`Error tranfer berween bills: ${String(error)}`) }
	}
};
