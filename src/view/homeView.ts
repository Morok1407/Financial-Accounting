import { setIcon, Notice } from "obsidian";
import MainPlugin from "../../main";
import { FinancialAccountingView } from '../../main'
import { stateManager, BillData, PlanData } from "../../main";
import { getDate } from "../middleware/otherFunc";
import { initDB, generateYearlyFile } from "../controllers/DB";
import { showHistory, showPlans, showBills } from "./showDataView";
import { getAdditionalData, getMainData } from "../controllers/searchData";
import { SummarizingDataForTheTrueBills, divideByRemainingDays, switchBalanceLine, SummarizingData, getCurrencySymbol, TheSumOfExpensesAndIncomeForTheYear, IncomeAndExpensesForTheMonth } from "../middleware/otherFunc";

export const showInitialView = async (): Promise<void> => {
    const initDBResult = await initDB();
    if (initDBResult.status === "error") {
        new Notice(initDBResult.error.message);
        console.error(initDBResult.error);
        return;
    }

    const generateYearlyFileResult = await generateYearlyFile();
    if (generateYearlyFileResult.status === "error") {
        new Notice(generateYearlyFileResult.error.message);
        console.error(generateYearlyFileResult.error);
        return;
    }

    if (!FinancialAccountingView.instance || !MainPlugin.instance) return;

    stateManager({ selectedMonth: null, selectedYear: null });

    const { contentEl } = FinancialAccountingView.instance;
    const { month } = getDate();

    const bills = await getAdditionalData<BillData>('accounts');
    if (bills.status === "error") {
        new Notice(bills.error.message);
        console.error(bills.error);
        return
    }

    const expensePlan = await getMainData<PlanData>('expenditure_plan');
    if (expensePlan.status === "error") {
        new Notice(expensePlan.error.message);
        console.error(expensePlan.error);
        return
    }

    const incomePlan = await getMainData<PlanData>('income_plan');
    if (incomePlan.status === "error") {
        new Notice(incomePlan.error.message);
        console.error(incomePlan.error);
        return
    }

    contentEl.empty();
    contentEl.addClass("finance-content");

    const financeHeader = contentEl.createEl("div", {
        cls: "finance-header",
    });

    const allMonths = [
        "☃️ January",
        "🌨️ February",
        "🌷 March",
        "🌱 April",
        "☀️ May",
        "🌳 June",
        "🏖️ July",
        "🌾 August",
        "🍁 September",
        "🍂 October",
        "☔ November",
        "❄️ December",
    ];
    const showAllMonthsButton = financeHeader.createEl("button", {
        attr: {
        id: "showAllMonths",
        },
    });
    showAllMonthsButton.createEl("span", {
        text: allMonths[Number(month) - 1],
    });

    showAllMonthsButton.addEventListener("click", () => {
        if (contentEl.dataset.page === "home") {
            contentEl.setAttribute("data-page", "months");
            void showAllMonths();
        }
    });

    contentEl.setAttribute("data-page", "home");

    const balance = contentEl.createEl("div", {
        cls: "balance",
    });

    const balanceTop = balance.createEl("div", {
        cls: "balance-top",
    });

    balanceTop.createEl("span", {
        text: "Balance",
    });

    balanceTop.createEl("p", {
        text: `${SummarizingDataForTheTrueBills(bills.jsonData).toString()} ${getCurrencySymbol(MainPlugin.instance.settings.baseCurrency)}`,
    });

    balanceTop.createEl("span", {
        text: `~${divideByRemainingDays(SummarizingDataForTheTrueBills(bills.jsonData))} for a day`,
    });

    const balanceLine = balance.createEl("div", {
        cls: "balance-line",
    });
    balanceLine.style.setProperty("--after-width", `${switchBalanceLine(bills.jsonData, expensePlan.jsonData)}%`);

    const balanceBody = balance.createEl("div", {
        cls: "balance-body",
    });

    const balanceExpenses = balanceBody.createEl("div", {
        cls: "balance_body-expenses",
    });

    balanceExpenses.createEl("span", {
        text: "Expense",
    });

    const balanceExpensesCheck = balanceExpenses.createEl("div", {
        cls: "balance_expenses-check",
    });

    setIcon(balanceExpensesCheck, "upload");
    balanceExpensesCheck.createEl("p", {
        text: `${SummarizingData(expensePlan.jsonData).toString()}`,
    });

    const balanceIncome = balanceBody.createEl("div", {
        cls: "balance_body-income",
    });

    balanceIncome.createEl("span", {
        text: "Income",
    });

    const balanceIncomeCheck = balanceIncome.createEl("div", {
        cls: "balance_income-check",
    });

    setIcon(balanceIncomeCheck, "download");
    balanceIncomeCheck.createEl("p", {
        text: `${SummarizingData(incomePlan.jsonData).toString()}`,
    });

    await homeButtons();
}

const homeButtons = async (): Promise<void> => {
    const { contentEl } = FinancialAccountingView.instance;
    const { openPageNow } = stateManager()

    const homeNav = contentEl.createEl("div", {
        cls: "main-nav",
    });
    const mainContent = contentEl.createEl("div", {
        cls: "main-content",
    });
    const mainContentBody = mainContent.createEl("div", {
        cls: "main-content-body",
    });
    const mainContentButton = contentEl.createEl("div", {
        cls: "main-content-button",
    });

    const historyButton = homeNav.createEl("a", {
        text: "History",
        cls: "home_button--active",
        attr: {
        id: "history-button",
        href: "#",
        },
    });
    historyButton.addEventListener("click", () => {
        planButton.removeClass("home_button--active");
        billsButton.removeClass("home_button--active");
        historyButton.addClass("home_button--active");
        mainContentBody.empty();
        mainContentButton.empty();
        void showHistory(mainContentBody, mainContentButton);
    });

    const planButton = homeNav.createEl("a", {
        text: "Plan",
        attr: {
        id: "plan-button",
        href: "#",
        },
    });
    planButton.addEventListener("click", () => {
        historyButton.removeClass("home_button--active");
        billsButton.removeClass("home_button--active");
        planButton.addClass("home_button--active");
        mainContentBody.empty();
        mainContentButton.empty();
        void showPlans(mainContentBody, mainContentButton);
    });

    const billsButton = homeNav.createEl("a", {
        text: "Bills",
        attr: {
        id: "bills-button",
        href: "#",
        },
    });
    billsButton.addEventListener("click", () => {
        historyButton.removeClass("home_button--active");
        planButton.removeClass("home_button--active");
        billsButton.addClass("home_button--active");
        mainContentBody.empty();
        mainContentButton.empty();
        void showBills(mainContentBody, mainContentButton);
    });

    if (!openPageNow || openPageNow === "History" || openPageNow === null) {
        await showHistory(mainContentBody, mainContentButton);
        historyButton.addClass("home_button--active");
        billsButton.removeClass("home_button--active");
        planButton.removeClass("home_button--active");
    } else if (openPageNow === "Plans") {
        await showPlans(mainContentBody, mainContentButton);
        historyButton.removeClass("home_button--active");
        planButton.addClass("home_button--active");
        billsButton.removeClass("home_button--active");
    } else if (openPageNow === "Bills") {
        await showBills(mainContentBody, mainContentButton);
        historyButton.removeClass("home_button--active");
        planButton.removeClass("home_button--active");
        billsButton.addClass("home_button--active");
    } else {
        await showHistory(mainContentBody, mainContentButton);  
        historyButton.addClass("home_button--active");
        billsButton.removeClass("home_button--active");
        planButton.removeClass("home_button--active");
    }
}

const showAllMonths = async (): Promise<void> => {
    const { contentEl } = FinancialAccountingView.instance;
    contentEl.empty();

    const { year } = getDate();

    const exitButton = contentEl.createEl("div", {
        cls: "exit-button",
        attr: {
        id: "exit-button",
        },
    });
    setIcon(exitButton, "arrow-left");
    exitButton.addEventListener("click", () => {
        FinancialAccountingView.instance?.onOpen().catch(console.error);
    });

    const calendarHead = contentEl.createEl("div", {
        cls: "calendar-header",
    });
    calendarHead.createEl("h1", { text: "Calendar" });

    const calendarMain = contentEl.createEl("div", {
        cls: "calendar-main",
    });

    const allMonths = [
        "☃️ January",
        "🌨️ February",
        "🌷 March",
        "🌱 April",
        "☀️ May",
        "🌳 June",
        "🏖️ July",
        "🌾 August",
        "🍁 September",
        "🍂 October",
        "☔ November",
        "❄️ December",
    ];

    for (let i = Number(year); i >= MainPlugin.instance.settings.startYear; i--) {
        const calendarUlTitle = calendarMain.createEl("div", {
        cls: "calendar-list-title",
        });
        calendarUlTitle.createEl("span", { text: String(i) });
        calendarUlTitle.createEl("span", {
            text: await TheSumOfExpensesAndIncomeForTheYear(String(i)),
        });

        const calendarUl = calendarMain.createEl("ul", {
            cls: "calendar-list",
            attr: {
                "data-year": i,
            },
        });

        for (let k = allMonths.length - 1; k >= 0; k--) {
            const calendarItem = calendarUl.createEl("li", {
                attr: {
                "data-month": `${k + 1}`,
                "data-year": `${i}`,
                },
            });
            calendarItem.onclick = async (ev: MouseEvent) => {
                await initOtherMonth(ev);
            };
            calendarItem.createEl("p", {
                text: allMonths[k],
            });
            const storyMonth = calendarItem.createEl("div", {
                cls: "story-month",
            });
            await IncomeAndExpensesForTheMonth(`${k + 1}`, String(i), storyMonth);
        }
    }
}

export const initOtherMonth = async (e: MouseEvent): Promise<void> => {
    const { year, month } = getDate();

    const target = (e.target as HTMLElement)?.closest<HTMLElement>("[data-month]") ?? (e.target as HTMLElement);
    const dataMonth = target?.dataset?.month;
    const dataYear = String(target?.dataset?.year);

    if (dataMonth === month && dataYear === year) {
        return FinancialAccountingView.instance?.onOpen();
    }

    stateManager({ selectedMonth: dataMonth, selectedYear: dataYear });

    await showAnotherInitialView();
}

export const showAnotherInitialView = async (): Promise<void> => {
    if (!FinancialAccountingView.instance || !MainPlugin.instance) return;

    const nowYear: number = new Date().getFullYear()

    const { selectedMonth, selectedYear } = stateManager();

    const expensePlan = await getMainData<PlanData>("expenditure_plan");
    if (expensePlan.status === "error") {
        new Notice(expensePlan.error.message);
        console.error(expensePlan.error);
        return
    }

    const incomePlan = await getMainData<PlanData>("income_plan");
    if (incomePlan.status === "error") {
        new Notice(incomePlan.error.message);
        console.error(incomePlan.error);
        return
    }

    const { contentEl } = FinancialAccountingView.instance;
    contentEl.empty();

    const exitButton = contentEl.createEl("div", {
        cls: "exit-button",
        attr: {
        id: "exit-button",
        },
    });
    setIcon(exitButton, "arrow-left");
    exitButton.addEventListener("click", () => {
        stateManager({ selectedMonth: null, selectedYear: null });
        FinancialAccountingView.instance?.onOpen().catch(console.error);
    });

    const financeHeader = contentEl.createEl("div", {
        cls: "finance-header",
    });

    const allMonths = [
        "☃️ January",
        "🌨️ February",
        "🌷 March",
        "🌱 April",
        "☀️ May",
        "🌳 June",
        "🏖️ July",
        "🌾 August",
        "🍁 September",
        "🍂 October",
        "☔ November",
        "❄️ December",
    ];
    const showAllMonthsButton = financeHeader.createEl("button", {
        attr: {
        id: "showAllMonths",
        },
    });
    if(Number(selectedYear) === nowYear) {
        showAllMonthsButton.createEl("span", {
            text: allMonths[Number(selectedMonth) - 1],
            attr: {
            id: "showAllMonths",
            },
        });
    } else {
        showAllMonthsButton.createEl("span", {
            text: `${allMonths[Number(selectedMonth) - 1]} ${selectedYear}`,
            attr: {
            id: "showAllMonths",
            },
        });
    }

    showAllMonthsButton.addEventListener("click", () => {
        if (contentEl.dataset.page === "home") {
        contentEl.setAttribute("data-page", "months");
        void showAllMonths();
        }
    });
    contentEl.setAttribute("data-page", "home");

    const balance = contentEl.createEl("div", {
        cls: "balance",
    });
    balance.addClass("balance-other");

    const balanceBody = balance.createEl("div", {
        cls: "balance-body",
    });

    const balanceExpenses = balanceBody.createEl("div", {
        cls: "balance_body-expenses",
    });

    balanceExpenses.createEl("span", {
        text: "Expense",
    });

    const balanceExpensesCheck = balanceExpenses.createEl("div", {
        cls: "balance_expenses-check",
    });

    setIcon(balanceExpensesCheck, "upload");
    balanceExpensesCheck.createEl("p", {
        text: `${SummarizingData(expensePlan.jsonData).toString()}`,
    });

    const balanceIncome = balanceBody.createEl("div", {
        cls: "balance_body-income",
    });

    balanceIncome.createEl("span", {
        text: "Income",
    });

    const balanceIncomeCheck = balanceIncome.createEl("div", {
        cls: "balance_income-check",
    });

    setIcon(balanceIncomeCheck, "download");
    balanceIncomeCheck.createEl("p", {
        text: `${SummarizingData(incomePlan.jsonData).toString()}`,
    });

    await otherMonthHomeButtons();
}

const otherMonthHomeButtons = async (): Promise<void> => {
    const { contentEl } = FinancialAccountingView.instance;

    const homeNav = contentEl.createEl("div", { cls: "main-nav" });
    const mainContent = contentEl.createEl("div", { cls: "main-content" });
    const mainContentBody = mainContent.createEl("div", { cls: "main-content-body" });
    const mainContentButton = contentEl.createEl("div", { cls: "main-content-button" });

    const historyButton = homeNav.createEl("a", {
        text: "History",
        cls: "home_button--active",
        attr: { id: "history-button", href: "#" },
    });

    historyButton.addEventListener("click", () => {
        planButton.removeClass("home_button--active");
        historyButton.addClass("home_button--active");
        mainContentBody.empty();
        mainContentButton.empty();
        void showHistory(mainContentBody, mainContentButton);
    });

    const planButton = homeNav.createEl("a", {
        text: "Plan",
        attr: { id: "plan-button", href: "#" },
    });
    planButton.addEventListener("click", () => {
        historyButton.removeClass("home_button--active");
        planButton.addClass("home_button--active");
        mainContentBody.empty();
        mainContentButton.empty();
        void showPlans(mainContentBody, mainContentButton);
    });

    const { openPageNow } = stateManager()

    if (!openPageNow || openPageNow === "History" || openPageNow === null) {
        await showHistory(mainContentBody, mainContentButton);
        historyButton.addClass("home_button--active");
        planButton.removeClass("home_button--active");
    } else if (openPageNow === "Plans") {
        await showPlans(mainContentBody, mainContentButton);
        historyButton.removeClass("home_button--active");
        planButton.addClass("home_button--active");
    } else {
        await showHistory(mainContentBody, mainContentButton);
        historyButton.addClass("home_button--active");
        planButton.removeClass("home_button--active");
    }
}