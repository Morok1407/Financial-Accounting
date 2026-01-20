import { setIcon, Notice } from "obsidian";
import MainPlugin from "../../main";
import { FinancialAccountingView } from '../../main'
import { stateManager, BillData, PlanData } from "../../main";
import { getDate } from "../middleware/otherFunc";
import { createDirectory, createOtherMonthDirectory, months } from "../controllers/createDirectory";
import { showHistory, showPlans, showBills } from "./showDataView";
import { getDataFile, getDataArchiveFile } from "../controllers/searchData";
import { SummarizingDataForTheDayExpense, SummarizingDataForTheTrueBills, divideByRemainingDays, switchBalanceLine, SummarizingDataForTheDayIncome, getCurrencySymbol, TheSumOfExpensesAndIncomeForTheYear, IncomeAndExpensesForTheMonth } from "../middleware/otherFunc";

export const showInitialView = async (): Promise<void> => {
    if (!FinancialAccountingView.instance || !MainPlugin.instance) return;

    stateManager({ selectedMonth: null, selectedYear: null });

    const result = await createDirectory();
    if(!result) {
        return showInitialView();
    }

    const { contentEl } = FinancialAccountingView.instance;
    const { month } = getDate();

    const bills = await getDataArchiveFile<BillData>("Archive bills");
    if (bills.status === "error") {
        new Notice(bills.error.message);
        console.error(bills.error);
        return
    }
    if (bills.jsonData === undefined) throw new Error('billsInfo is undefined');

    const expensePlan = await getDataFile<PlanData>("Expenditure plan");
    if (expensePlan.status === "error") {
        new Notice(expensePlan.error.message);
        console.error(expensePlan.error);
        return
    }
    if (expensePlan.jsonData === undefined) throw new Error('expenditurePlanInfo is undefined');

    const incomePlan = await getDataFile<PlanData>("Income plan");
    if (incomePlan.status === "error") {
        new Notice(incomePlan.error.message);
        console.error(incomePlan.error);
        return
    }
    if (incomePlan.jsonData === undefined) throw new Error('incomePlanInfo is undefined');

    contentEl.empty();
    contentEl.addClass("finance-content");

    const financeHeader = contentEl.createEl("div", {
        cls: "finance-header",
    });

    const showAllMonthsButton = financeHeader.createEl("button", {
        attr: {
        id: "showAllMonths",
        },
    });
    setIcon(showAllMonthsButton, "calendar-days");
    showAllMonthsButton.createEl("span", {
        text: month,
    });

    showAllMonthsButton.addEventListener("click", async () => {
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
        text: `${SummarizingDataForTheTrueBills(bills.jsonData)} ${getCurrencySymbol(MainPlugin.instance.settings.baseCurrency)}`,
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
        text: String(SummarizingDataForTheDayExpense(expensePlan.jsonData)),
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
        text: String(SummarizingDataForTheDayIncome(incomePlan.jsonData)),
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
    historyButton.addEventListener("click", async () => {
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
    planButton.addEventListener("click", async () => {
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
    billsButton.addEventListener("click", async () => {
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
            await IncomeAndExpensesForTheMonth(months[k], String(i), storyMonth);
        }
    }
}

export const initOtherMonth = async (e: MouseEvent): Promise<void> => {
    const { year, month } = getDate();

    const target = (e.target as HTMLElement)?.closest<HTMLElement>("[data-month]") ?? (e.target as HTMLElement);
    const dataMonth = Number(target?.dataset?.month);
    const dataYear = String(target?.dataset?.year);

    if (months[dataMonth - 1] === month && dataYear === year) {
        return FinancialAccountingView.instance?.onOpen();
    }

    stateManager({ selectedMonth: months[dataMonth - 1], selectedYear: dataYear });

    const resultCreat = await createOtherMonthDirectory(dataMonth - 1, dataYear);
    if (resultCreat !== "success") {
        new Notice(resultCreat);
    }

    await showAnotherInitialView();
}

export const showAnotherInitialView = async (): Promise<void> => {
    if (!FinancialAccountingView.instance || !MainPlugin.instance) return;

    const { selectedMonth } = stateManager();

    const expensePlan = await getDataFile<PlanData>("Expenditure plan");
    if (expensePlan.status === "error") {
        new Notice(expensePlan.error.message);
        console.error(expensePlan.error);
        return
    }
    if (expensePlan.jsonData == null) throw new Error('expenditurePlanInfo is null or undefined');

    const incomePlan = await getDataFile<PlanData>("Income plan");
    if (incomePlan.status === "error") {
        new Notice(incomePlan.error.message);
        console.error(incomePlan.error);
        return
    }
    if (incomePlan.jsonData == null) throw new Error('incomePlanInfo is null or undefined');

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

    const showAllMonthsButton = financeHeader.createEl("button", {
        text: `🗓️ ${selectedMonth}`,
        attr: {
        id: "showAllMonths",
        },
    });

    showAllMonthsButton.addEventListener("click", async () => {
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
        text: String(SummarizingDataForTheDayExpense(expensePlan.jsonData)),
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
        text: String(SummarizingDataForTheDayIncome(expensePlan.jsonData)),
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

    historyButton.addEventListener("click", async () => {
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
    planButton.addEventListener("click", async () => {
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