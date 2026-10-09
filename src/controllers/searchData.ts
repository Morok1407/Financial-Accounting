import { Notice } from "obsidian";
import Big from "big.js";
import { stateManager, DataFileResult, HistoryData, PlanData, BillData, DataItemResult, ResultOfAllData, categoriesData, accountsData, PlanDataWithoutAmount } from "../../main";
import { getDate, inActiveCurrency } from "../middleware/otherFunc";
import MainPlugin from "../../main";

export const getMainData = async (): Promise<DataFileResult<HistoryData>> => {
	const { selectedYear, selectedMonth } = stateManager();
	const { year, month } =
		selectedYear && selectedMonth
			? { year: selectedYear, month: selectedMonth }
			: getDate();

	const filePath = `${MainPlugin.instance.dbPath}/${year}.json`;

	try {
		const result = await getAllFile<import('../../main').YearData>(year);
        if (result.status === 'error') return result;
        const jsonData = result.json.months[month].history.filter(inActiveCurrency);
		const data: DataFileResult<HistoryData> = {
			jsonData, status: 'success'
		}
		return data;
	} catch (error) {
		return { status: 'error', error: error instanceof Error ? error : new Error(String(error)) };
	}
}

export const getAdditionalData = async <T extends { id: string }>(option: 'accounts' | 'categories', categoriName?: 'income_plan' | 'expenditure_plan', allCurrencies = false): Promise<DataFileResult<T>> => {
	const filePath = `${MainPlugin.instance.dbPath}/${option}.json`;

	try {
        if (option === 'accounts') {
            const result = await getAllFile<accountsData>('accounts');
            if (result.status === 'error') return result;
            return { status: 'success', jsonData: (allCurrencies ? result.json.accounts : result.json.accounts.filter(inActiveCurrency)) as unknown as T[] };
        }
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
        if (jsonData.months) {
            const accounts = await getAllFile<accountsData>('accounts');
            if (accounts.status === 'error') return accounts;
            const currencies = new Map(accounts.json.accounts.map(b => [b.id, b.currency]));
            for (const month of Object.values(jsonData.months) as { history: HistoryData[] }[]) {
                for (const tx of month.history) tx.currency ||= currencies.get(tx.bill.id) || MainPlugin.instance.settings.baseCurrency;
            }
        }
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
		accounts: () => getAdditionalData<T>('accounts', undefined, true),
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

export interface HistoryMetadata {
	categories: Map<string, PlanDataWithoutAmount>;
	bills: Map<string, BillData>;
}

export async function getHistoryMetadata(): Promise<ResultOfAllData<HistoryMetadata>> {
	const [categories, bills] = await Promise.all([
		getAllFile<categoriesData>('categories'),
		getAllFile<accountsData>('accounts'),
	]);
	if (categories.status === 'error') return categories;
	if (bills.status === 'error') return bills;
	return { status: 'success', json: {
		categories: new Map([...categories.json.categories.expenditure_plan, ...categories.json.categories.income_plan]
			.map(category => [`${category.type}:${category.id}`, category])),
		bills: new Map(bills.json.accounts.map(bill => [bill.id, bill])),
	} };
}

export function filterHistory(history: HistoryData[], inputValue: string, metadata: HistoryMetadata): HistoryData[] {
	const search = inputValue.trim().toLowerCase();
	if (!search) return history;
	return history.filter(item =>
		item.type.toLowerCase().includes(search) ||
		item.amount.toString().includes(search) ||
		item.comment?.toLowerCase().includes(search) ||
		metadata.bills.get(item.bill.id)?.name.toLowerCase().includes(search) ||
		metadata.categories.get(`${item.type}:${item.category.id}`)?.name.toLowerCase().includes(search)
	);
}

export const searchHistory = async (
	inputValue: string
): Promise<DataFileResult<HistoryData>> => {
	try {
		const [history, metadata] = await Promise.all([getMainData(), getHistoryMetadata()]);
		if (history.status === 'error') return history;
		if (metadata.status === 'error') return metadata;

		return {
			status: 'success',
			jsonData: filterHistory(history.jsonData, inputValue, metadata.json)
		};

	} catch (err) {
		return { status: 'error', error: err instanceof Error ? err : new Error(String(err)) };
	}
};
