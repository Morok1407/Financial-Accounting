import Big from 'big.js';
import currencies from '../../currencies.json'
import { getSpecificFile } from '../controllers/searchData';
import { months } from '../controllers/createDirectory';
import { stateManager, PlanData, BillData, HistoryData } from "../../main";
import { moment } from "obsidian";

type Moment = ReturnType<typeof moment>;

export const popularCodes : string[] = ["USD", "EUR", "RUB", "KZT", "UZS"];

export const generateUUID = (): string => {
    return crypto.randomUUID()
}

export const getDate = (): {
    now: Moment;
    year: string;
    month: string;
} => {
    moment.locale("en");

    const now = moment();
    return {
        now,
        year: now.format("YYYY"),
        month: now.format("MMMM"),
    };
};

export const getCurrencyGroups = () => {
    const all = Object.entries(currencies).map(([code, info]) => ({
        code,
        name: info.name || code,
        symbol: info.symbol || info.symbolNative
    }));

    const popularCurrencies = all.filter(cur => popularCodes.includes(cur.code));
	const otherCurrencies = all.filter(cur => !popularCodes.includes(cur.code));

    return { popularCurrencies, otherCurrencies };
}

export function fillMonthDates(selectEl: HTMLSelectElement, oldDate?: string) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const { selectedYear, selectedMonth } = stateManager();

    if(selectedYear === null && selectedMonth === null) {
        const today: Date = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        const daysInMonth = new Date(year, month + 1, 0).getDate();
    
        for (let d = daysInMonth; d >= 1; d--) {
            const date: Date = new Date(year, month, d);
    
            const day = date.getDate();
            const weekday = dayNames[date.getDay()];
            const monthName = monthNames[month];
    
            let label = `${day} ${monthName}, ${weekday}`;
    
            const diff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    
            if (diff === -1) label = `Today, ${label}`;
            else if (diff === 0) label = `Tomorrow, ${label}`;
            else if (diff === 1) label = `The day after tomorrow, ${label}`;
            else if (diff === -2) label = `Yesterday, ${label}`;
            else if (diff === -3) label = `The day before yesterday, ${label}`;
    
            const value = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const option = selectEl.createEl("option", {
                text: label,
                attr: { value }
            });
    
            if (value === oldDate) option.selected = true;
            else if (diff === -1) option.selected = true;
        }
    } else {
        const convertMonth = new Date(`${selectedMonth} 1, ${selectedYear}`);
        const selectedMonthNumber = isNaN(convertMonth.getTime()) ? null : convertMonth.getMonth();

        if (selectedMonthNumber === null) {
            throw new Error("Invalid month or year");
        }

        const year = Number(selectedYear);
        const month = selectedMonthNumber;

        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let d = daysInMonth; d >= 1; d--) {
            const date = new Date(year, month, d);

            const day = date.getDate();
            const weekday = dayNames[date.getDay()];
            const monthName = monthNames[month];

            const label = `${day} ${monthName}, ${weekday}`;

            const value = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            selectEl.createEl("option", {
                text: label,
                attr: { value }
            });
        }
    }
}

export function selectRelativeDate(selectEl: HTMLSelectElement, offset: number) {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const targetValue = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
    const option = Array.from(selectEl.options).find((opt: HTMLOptionElement) => opt.value === targetValue);
    if (option) {
        selectEl.value = targetValue;
    }
}

export function checkExpenceOrIncome(amount: string, type: 'expense' | 'income'): string {
    const bigAmount = new Big(amount);

    if (type === 'expense') {
        return `- ${bigAmount.toString()}`;
    } else if (type === 'income') {
        return `+ ${bigAmount.toString()}`;
    } else {
        return "Error";
    }
}

export function SummarizingDataForTheDay(obj: PlanData[] | HistoryData[] | null): string {
    const expense = SummarizingDataForTheDayExpense(obj);
    const income = SummarizingDataForTheDayIncome(obj);

    if (expense.eq(0)) {
        return `+${income.toString()}`;
    } else if (income.eq(0)) {
        return `-${expense.toString()}`;
    } else {
        return `-${expense.toString()} +${income.toString()}`;
    }
}

export function SummarizingDataForTheDayExpense(obj: PlanData[] | HistoryData[] | null): Big {
    if (!obj) return new Big(0);

    if ((obj as HistoryData[])[0]?.type !== undefined) {
        const arr = obj as (PlanData | HistoryData)[];
        return arr.reduce((sum: Big, e) => {
        if (e.type === 'expense') {
            return sum.plus(new Big(e.amount));
        }
        return sum;
        }, new Big(0));
    }

    return new Big(0);
}

export function SummarizingDataForTheDayIncome(obj: PlanData[] | HistoryData[] | null): Big {
    if (!obj) return new Big(0);

    if ((obj as PlanData[])[0]?.type !== undefined) {
        const arr = obj as (PlanData | HistoryData)[];
        return arr.reduce((sum: Big, e) => {
        if (e.type === 'income') {
            return sum.plus(new Big(e.amount));
        }
        return sum;
        }, new Big(0));
    }

    return new Big(0);
}

export function SummarizingDataForTheTrueBills(obj: BillData[] | null): Big {
    if (!obj) return new Big(0);

    return obj.reduce((sum, e) => {
        if (e.generalBalance) {
            return sum.plus(new Big(e.balance));
        }
        return sum;
    }, new Big(0));
}

export function SummarizingDataForTheFalseBills(obj: BillData[] | null): Big {
    if (!obj) return new Big(0);

    return obj.reduce((sum, e) => {
        if (!e.generalBalance) {
            return sum.plus(new Big(e.balance));
        }
        return sum;
    }, new Big(0));
}

export function divideByRemainingDays(amount: Big): number {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const currentDay = today.getDate();
    const remainingDays = daysInMonth - currentDay + 1;

    const result = new Big(amount).div(remainingDays);
    return result.round(0, 0).toNumber();
}
export function getCurrencySymbol(code: string) {
    type CurrencyCode = keyof typeof currencies;
    const currency = currencies[code as CurrencyCode];
    return currency ? (currency.symbol || currency.symbolNative || code) : code;
}
export function switchBalanceLine(billsInfo: BillData[] | null, expenditurePlanInfo: PlanData[] | null) {
    const fullSum = Number(SummarizingDataForTheTrueBills(billsInfo)) + Number(SummarizingDataForTheDayExpense(expenditurePlanInfo))
    const percent = Number(SummarizingDataForTheDayExpense(expenditurePlanInfo)) / fullSum * 100
    if(Number(SummarizingDataForTheDayExpense(expenditurePlanInfo)) <= fullSum) {
        return 100 - percent
    } else if(percent === 0) {
        return 100
    } else {
        return percent
    }
}
export function humanizeDate(dateStr: string) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.round(
        (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    const weekdays = [
        "Sunday", "Monday", "Tuesday", "Wednesday",
        "Thursday", "Friday", "Saturday"
    ];

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    let prefix = "";
    if (diffDays === 0) prefix = "Today";
    else if (diffDays === 1) prefix = "Yesterday";
    else if (diffDays === -1) prefix = "Tomorrow";
    else if (diffDays === 2) prefix = "The day before yesterday";
    else if (diffDays === -2) prefix = "The day after tomorrow";

    const currentYear = today.getFullYear();
    const showYear = date.getFullYear() !== currentYear;

    const formattedDate = showYear
        ? `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}, ${weekdays[date.getDay()]}`
        : `${months[date.getMonth()]} ${date.getDate()}, ${weekdays[date.getDay()]}`;

    return prefix ? `${prefix}, ${formattedDate}` : formattedDate;
}
export async function IncomeAndExpensesForTheMonth(month: string, year: string, div: HTMLDivElement) {
    const expensePlan = await getSpecificFile<PlanData>('Expenditure plan', year, month)
    if(expensePlan.status === 'error') return expensePlan.error
    if(expensePlan.jsonData === undefined) throw new Error('Expesnse plan is undefined')

    const incomePlan = await getSpecificFile<PlanData>('Income plan', year, month)
    if(incomePlan.status === 'error') return incomePlan.error
    if(incomePlan.jsonData === undefined) throw new Error('Expesnse plan is undefined')

    const totalExpense = SummarizingDataForTheDayExpense(expensePlan.jsonData);
    const totalIncome = SummarizingDataForTheDayIncome(incomePlan.jsonData);

    if (totalIncome.gte(totalExpense)) {
        div.createEl("span", {
            text: `-${totalExpense.toString()}`,
            cls: "expense-all-month-success",
        });

        div.createEl("span", {
            text: `+${totalIncome.toString()}`,
            cls: "income-all-month",
        });
    } else {
        div.createEl("span", {
            text: `-${totalExpense.toString()}`,
            cls: "expense-all-month-failure",
        });

        div.createEl("span", {
            text: `+${totalIncome.toString()}`,
            cls: "income-all-month",
        });
    }
}
export async function TheSumOfExpensesAndIncomeForTheYear(year: string): Promise<string | undefined> {
    let totalExpense = new Big(0);
    let totalIncome = new Big(0);

    for (let m = 0; m < 12; m++) { // исправил на 0..11 для массива months
        const expensePlan = await getSpecificFile<PlanData>('Expenditure plan', year, months[m]);
        if (expensePlan.status === 'error') return;
        if (!expensePlan.jsonData) throw new Error('Expense plan is undefined');

        const incomePlan = await getSpecificFile<PlanData>('Income plan', year, months[m]);
        if (incomePlan.status === 'error') return;
        if (!incomePlan.jsonData) throw new Error('Income plan is undefined');

        totalExpense = totalExpense.plus(SummarizingDataForTheDayExpense(expensePlan.jsonData));
        totalIncome = totalIncome.plus(SummarizingDataForTheDayIncome(incomePlan.jsonData));
    }

    return `-${totalExpense.toString()} +${totalIncome.toString()}`;
}
export function getLocalTimeISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[1].split('.')[0];
}