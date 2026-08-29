import { Notice } from "obsidian";
import Big from "big.js";
import { stateManager, DataFileResult, HistoryData, PlanData, BillData, DataItemResult, ResultOfAllData } from "../../main";
import { getDate } from "../middleware/otherFunc";
import MainPlugin from "../../main";

export const getMainData = async (): Promise<DataFileResult<HistoryData>> => {
	const { selectedYear, selectedMonth } = stateManager();
	const { year, month } =
		selectedYear && selectedMonth
			? { year: selectedYear, month: selectedMonth }
			: getDate();

	const filePath = `${MainPlugin.instance.dbPath}/${year}.json`;

	try {
		const file = await MainPlugin.instance.app.vault.adapter.read(filePath);
		const jsonData: HistoryData[] = JSON.parse(file).months[month].history;
		const data: DataFileResult<HistoryData> = {
			jsonData, status: 'success'
		}
		return data;
	} catch (error) {
		return { status: 'error', error: error instanceof Error ? error : new Error(String(error)) };
	}
}

export const getAdditionalData = async <T extends { id: string }>(option: 'accounts' | 'categories', categoriName?: 'income_plan' | 'expenditure_plan'): Promise<DataFileResult<T>> => {
	const filePath = `${MainPlugin.instance.dbPath}/${option}.json`;

	try {
		const mainData = await getMainData();
		if (mainData.status === "error") {
			new Notice(mainData.error.message);
			console.error(mainData.error);
			return { status: 'error', error: mainData.error };
		}

		const categoryMap = new Map<string, Big>();

		mainData.jsonData
			.forEach(item => {
				const categoryId = item.category.id;

				const currentAmount = categoryMap.get(categoryId) ?? new Big(0);

				categoryMap.set(
					categoryId,
					currentAmount.plus(item.amount)
				);
			});

		const amountData = Array.from(categoryMap, ([id, amount]) => ({
			id,
			amount: amount.toString()
		}));

		const file = await MainPlugin.instance.app.vault.adapter.read(filePath);
		if (categoriName === 'income_plan' || categoriName === 'expenditure_plan') {
			const metaData: T[] = JSON.parse(file)[option][categoriName];
			const amountMap = new Map(
				amountData.map(item => [item.id, item.amount])
			);

			const jsonData = metaData.map(item => ({
				...item,
				amount: amountMap.get(item.id) ?? "0",
			}));

			const data: DataFileResult<T> = {
				jsonData, status: 'success'
			}
			return data;
		} else if (option === 'accounts') {
			const jsonData: T[] = JSON.parse(file)[option];
			const data: DataFileResult<T> = {
				jsonData, status: 'success'
			}
			return data;
		} else {
			return { status: 'error', error: new Error('Invalid option provided') };
		}
	} catch (error) {
		return { status: 'error', error: error instanceof Error ? error : new Error(String(error)) };
	}
}

export const getAllFile = async <T>(option: string): Promise<ResultOfAllData<T>> => {
	const filePath = `${MainPlugin.instance.dbPath}/${option}.json`;

	try {
		const file = await MainPlugin.instance.app.vault.adapter.read(filePath);
		const jsonData = JSON.parse(file);
		return { status: 'success', json: jsonData };
	} catch (error) {
		return { status: 'error', error: error instanceof Error ? error : new Error(String(error)) };
	}
}

export const searchElementById = async <T extends HistoryData | PlanData | BillData>(
	id: string,
	modifier: 'history' | 'expense' | 'income' | 'accounts'
): Promise<DataItemResult<T | BillData>> => {
	const sourceMap = {
		history: () => getMainData(),
		accounts: () => getAdditionalData<T>('accounts'),
		expense: () => getAdditionalData<T>('categories', 'expenditure_plan'),
		income: () => getAdditionalData<T>('categories', 'income_plan'),
	} as const;

	try {
		const loader = sourceMap[modifier];
		if (!loader) return { status: 'error', error: new Error('Element not found') };

		const result = await loader();
		if (result.status === 'error') return { status: 'error', error: result.error };

		const items = result.jsonData as unknown as (T | BillData)[];
		const item = items.find(item => item.id === id);

		if (item === undefined) return { status: 'error', error: new Error('Item is undefined') };

		const dataItem: DataItemResult<T | BillData> = {
			item,
			status: 'success',
		};
		return dataItem;

	} catch (err) {
		return { status: 'error', error: err instanceof Error ? err : new Error(String(err)) };
	}
};

export const searchHistory = async (
	inputValue: string
): Promise<DataFileResult<HistoryData>> => {
	try {
		const search = inputValue.toLowerCase();

		const [
			history,
			expenditure,
			income,
			bills
		] = await Promise.all([
			getMainData(),
			getAdditionalData<PlanData>('categories', 'expenditure_plan'),
			getAdditionalData<PlanData>('categories', 'income_plan'),
			getAdditionalData<BillData>('accounts')
		]);

		if (expenditure.status === 'error' || income.status === 'error' || bills.status === 'error' || history.status === 'error') {
			return { status: 'error', error: new Error('Failed to load data for search') };
		}

		const additionalData = [
			...expenditure.jsonData,
			...income.jsonData,
			...bills.jsonData
		];

		const matchedAdditionalIds = additionalData
			.filter(item => 'name' in item && item.name.toLowerCase().includes(search))
			.map(item => item.id);

		const filteredHistory = history.jsonData.filter(item => {
			const baseMatch =
				item.type?.toLowerCase().includes(search) ||
				item.amount.toString().includes(inputValue) ||
				item.comment?.toLowerCase().includes(search);

			if (matchedAdditionalIds.length === 0) {
				return baseMatch;
			}

			return (
				baseMatch ||
				item.bill?.id && matchedAdditionalIds.includes(item.bill.id) ||
				item.category?.id && matchedAdditionalIds.includes(item.category.id)
			);
		});

		return {
			status: 'success',
			jsonData: filteredHistory.length ? filteredHistory : []
		};

	} catch (err) {
		return { status: 'error', error: err instanceof Error ? err : new Error(String(err)) };
	}
};
