import currencies from '../../currencies.json'
import { getSpecificFile } from '../controllers/searchData';
import { months } from '../controllers/createDirectory';
import { stateManager, PlanData, BillData } from "../../main";

export const popularCodes : string[] = ["USD", "EUR", "RUB", "KZT", "UZS"];

declare const moment: any;

export const generateUUID = (): string => {
    return crypto.randomUUID()
}
export const getDate = () => {
    if (typeof moment !== "undefined") {
        moment.locale("en");
        const now = moment();
        const year = now.format("YYYY");
        const month = now.format("MMMM");
        return { now, year, month };
    } else {
        const now = new Date();
        const year = String(now.getFullYear());
        const month = months[now.getMonth()];
        return { now, year, month };
    }
}

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

export function fillMonthDates(selectEl: any, oldDate?: string) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const { selectedYear, selectedMonth } = stateManager();

    if(selectedYear === null && selectedMonth === null) {
        const today: any = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        const daysInMonth = new Date(year, month + 1, 0).getDate();
    
        for (let d = daysInMonth; d >= 1; d--) {
            const date: any = new Date(year, month, d);
    
            const day = date.getDate();
            const weekday = dayNames[date.getDay()];
            const monthName = monthNames[month];
    
            let label = `${day} ${monthName}, ${weekday}`;
    
            const diff = Math.floor((date - today) / (1000 * 60 * 60 * 24));
    
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
        const convertMonth: any = new Date(`${selectedMonth} 1, ${selectedYear}`);
        const selectedMonthNumber = isNaN(convertMonth) ? null : convertMonth.getMonth();

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

export function selectRelativeDate(selectEl: any, offset: number) {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const targetValue = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
    const option = Array.from(selectEl.options).find((opt: any) => opt.value === targetValue);
    if (option) {
        selectEl.value = targetValue;
    }
}

export function checkExpenceOrIncome(amount: number, type: 'expense' | 'income') {
    if(type === 'expense') {
        return `- ${amount}`
    } else if(type === 'income') {
        return `+ ${amount}`
    } else {
        return "Error"
    }
}

export function SummarizingDataForTheDay(obj: PlanData[] | null) {
    const expense = SummarizingDataForTheDayExpense(obj)
    const income = SummarizingDataForTheDayIncome(obj)
    if(expense === 0) {
        return `+${income}`
    } else if (income === 0) {
        return `-${expense}`
    } else {
        return `-${expense} +${income}`
    }
}
export function SummarizingDataForTheDayExpense(obj: PlanData[] | null) {
    if(!obj) {
        return 0
    }
    let expense = 0;
    obj.forEach((e, i) => {
        if(e.type === 'expense'){
            expense += Number(e.amount)
        } 
    })
    return expense
}
export function SummarizingDataForTheDayIncome(obj: PlanData[] | null) {
    if(!obj) {
        return 0
    }
    let income = 0;
    obj.forEach((e, i) => {
        if(e.type === 'income'){
            income += Number(e.amount)
        } 
    })
    return income
}
export function SummarizingDataForTheTrueBills(obj: BillData[] | null) {
    if(!obj || obj === null) {
        return 0
    }
    let balance = 0;
    obj.forEach((e, i) => {
        if(e.generalBalance) {
            balance += Number(e.balance)
        }
    })
    return balance
}
export function SummarizingDataForTheFalseBills(obj: BillData[]| null) {
    if(!obj || obj === null) {
        return 0
    }
    let balance = 0;
    obj.forEach((e, i) => {
        if(!e.generalBalance) {
            balance += Number(e.balance)
        }
    })
    return balance
}
export function divideByRemainingDays(amount: number) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const currentDay = today.getDate();
    const remainingDays = daysInMonth - currentDay + 1;

    return Math.trunc(amount / remainingDays);
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
export async function IncomeAndExpensesForTheMonth(month: string, year: string, div: any) {
    const expensePlan = await getSpecificFile<PlanData>('Expenditure plan', year, month)
    if(expensePlan.status === 'error') return expensePlan.error
    if(expensePlan.jsonData === undefined) throw new Error('Expesnse plan is undefined')

    const incomePlan = await getSpecificFile<PlanData>('Income plan', year, month)
    if(incomePlan.status === 'error') return incomePlan.error
    if(incomePlan.jsonData === undefined) throw new Error('Expesnse plan is undefined')

    const totalExpense = SummarizingDataForTheDayExpense(expensePlan.jsonData)
    const totalIncome = SummarizingDataForTheDayIncome(incomePlan.jsonData)

    if (totalIncome >= totalExpense) {
        div.createEl('span', {
            text: `-${totalExpense}`,
            cls: 'expense-all-month-success'
        });

        div.createEl('span', {
            text: `+${totalIncome}`,
            cls: 'income-all-month'
        });
    } else {
        div.createEl('span', {
            text: `-${totalExpense}`,
            cls: 'expense-all-month-failure'
        });

        div.createEl('span', {
            text: `+${totalIncome}`,
            cls: 'income-all-month'
        });
    }
}
export async function TheSumOfExpensesAndIncomeForTheYear(year: string) {
    let totalExpense = 0
    let totalIncome = 0

    for(let m = 1; m <= 12; m++) {
        const expensePlan = await getSpecificFile<PlanData>('Expenditure plan', year, months[m])
        if(expensePlan.status === 'error') return 
        if(expensePlan.jsonData === undefined) throw new Error('Expesnse plan is undefined')
        
        const incomePlan = await getSpecificFile<PlanData>('Income plan', year, months[m])
        if(incomePlan.status === 'error') return 
        if(incomePlan.jsonData === undefined) throw new Error('Expesnse plan is undefined')
        
        totalExpense += SummarizingDataForTheDayExpense(expensePlan.jsonData)
        totalIncome += SummarizingDataForTheDayIncome(incomePlan.jsonData)
    }

    return `-${totalExpense} +${totalIncome}`
}
export function getLocalTimeISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[1].split('.')[0];
}