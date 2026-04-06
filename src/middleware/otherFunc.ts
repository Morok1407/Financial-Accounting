import Big from 'big.js';
import currencies from '../../currencies.json'
import { stateManager, PlanData, BillData, HistoryData } from "../../main";
import { moment, Notice } from "obsidian";
import { getAllFile } from '../controllers/searchData'

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
        month: now.format("M"),
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
        const monthIndex = Number(selectedMonth) - 1;
        if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
            throw new Error("Invalid month");
        }

        const year = Number(selectedYear);
        const month = monthIndex;
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

        selectEl.createEl('option', {
        text: 'Select a date',
        attr: {
            value: '',
            selected: '',
            disabled: '',
            hidden: '',
        },
    })
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
    const expense = SummarizingData(obj);
    const income = SummarizingData(obj);

    if (expense.eq(0)) {
        return `+${income.toString()}`;
    } else if (income.eq(0)) {
        return `-${expense.toString()}`;
    } else {
        return `-${expense.toString()} +${income.toString()}`;
    }
}

export function SummarizingData(obj: PlanData[] | HistoryData[] | null): Big {
    if (!obj) return new Big(0);

    if ((obj as PlanData[])) {
        const arr = obj as (PlanData | HistoryData)[];
        return arr.reduce((sum: Big, e) => {
            return sum.plus(new Big(e.amount));
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
    const fullSum = Number(SummarizingDataForTheTrueBills(billsInfo)) + Number(SummarizingData(expenditurePlanInfo))
    const percent = Number(SummarizingData(expenditurePlanInfo)) / fullSum * 100
    if(Number(SummarizingData(expenditurePlanInfo)) <= fullSum) {
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
    const allData = await getAllFile(year);
    if (allData.status === "error") {
        new Notice(allData.error.message);
        console.error(allData.error);
        return
    }

    const totalExpense = SummarizingData(allData.months[month].expenditure_plan);
    const totalIncome = SummarizingData(allData.months[month].income_plan);

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
    const allData = await getAllFile(year);
    if (allData.status === "error") {
        new Notice(allData.error.message);
        console.error(allData.error);
        return
    }

    let totalExpense = new Big(0);
    let totalIncome = new Big(0);
    for (const month in allData.months) {
        totalExpense = totalExpense.plus(SummarizingData(allData.months[month].expenditure_plan));
        totalIncome = totalIncome.plus(SummarizingData(allData.months[month].income_plan));
    }

    return `-${totalExpense.toString()} +${totalIncome.toString()}`;
}

export function getLocalTimeISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[1].split('.')[0];
}

export const mergeCategoriesData = (
    additionPlan: PlanData[],
    mainPlan: PlanData[]
): PlanData[] => {
    if (!additionPlan || !mainPlan) return [];
    return mainPlan.map((item: PlanData) => {
        const category = additionPlan.find((c: PlanData) => c.id === item.id);
        if (!category) return item;
        return {
            ...category,
            amount: item.amount,
        };
    });
};