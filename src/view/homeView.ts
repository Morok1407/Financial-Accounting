import { setIcon, Notice } from "obsidian";
import { pluginInstance, viewInstance, stateManager, BillData, PlanData } from "../../main";
import { getDate } from "../middleware/otherFunc";
import { createDirectory, createOtherMonthDirectory, months } from "../controllers/createDirectory";
import { showHistory, showPlans, showBills } from "./showDataView";
import { getDataFile, getDataArchiveFile } from "../controllers/searchData";
import { SummarizingDataForTheDayExpense, SummarizingDataForTheTrueBills, divideByRemainingDays, switchBalanceLine, SummarizingDataForTheDayIncome, getCurrencySymbol, TheSumOfExpensesAndIncomeForTheYear, IncomeAndExpensesForTheMonth } from "../middleware/otherFunc";

export const showInitialView = async (): Promise<void> => {
    if (!viewInstance || !pluginInstance) return;

    stateManager({ selectedMonth: null, selectedYear: null });

    const result = await createDirectory();
    if(!result) {
        return showInitialView();
    }

    const { contentEl } = viewInstance;
    const { month } = getDate();

    const { jsonData: billsInfo, status: billStatus } = await getDataArchiveFile<BillData>("Archive bills");
    if (billStatus !== "success") {
        new Notice(billStatus);
        console.error(billStatus);
    }
    if (billsInfo === undefined) throw new Error('billsInfo is undefined');

    const { jsonData: expenditurePlanInfo, status: expenditurePlanStatus } = await getDataFile<PlanData>("Expenditure plan");
    if (expenditurePlanStatus !== "success") {
        new Notice(expenditurePlanStatus);
        console.error(expenditurePlanStatus);
    }
    if (expenditurePlanInfo === undefined) throw new Error('expenditurePlanInfo is undefined');

    const { jsonData: incomePlanInfo, status: incomePlanStatus } = await getDataFile<PlanData>("Income plan");
    if (incomePlanStatus !== "success") {
        new Notice(incomePlanStatus);
        console.error(incomePlanStatus);
    }
    if (incomePlanInfo === undefined) throw new Error('incomePlanInfo is undefined');

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
        await showAllMonths();
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
        text: `${SummarizingDataForTheTrueBills(billsInfo)} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`,
    });

    balanceTop.createEl("span", {
        text: `~${divideByRemainingDays(SummarizingDataForTheTrueBills(billsInfo))} for a day`,
    });

    const balanceLine = balance.createEl("div", {
        cls: "balance-line",
    });
    balanceLine.style.setProperty("--after-width", `${switchBalanceLine(billsInfo, expenditurePlanInfo)}%`);

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
        text: String(SummarizingDataForTheDayExpense(expenditurePlanInfo)),
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
        text: String(SummarizingDataForTheDayIncome(incomePlanInfo)),
    });

    homeButtons();
}

const homeButtons = async () => {
    const { contentEl } = viewInstance;
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
        await showHistory(mainContentBody, mainContentButton);
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
        await showPlans(mainContentBody, mainContentButton);
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
        await showBills(mainContentBody, mainContentButton);
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

const showAllMonths = async () => {
    const { contentEl } = viewInstance;
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
        viewInstance?.onOpen();
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

    for (let i = Number(year); i >= pluginInstance.settings.startYear; i--) {
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
            calendarItem.onclick = async (ev: object) => {
                await initOtherMonth(ev);
            };
            calendarItem.createEl("p", {
                text: allMonths[k],
            });
            const storyMonth = calendarItem.createEl("div", {
                cls: "story-month",
            });
            IncomeAndExpensesForTheMonth(months[k], String(i), storyMonth);
        }
    }
}

export const initOtherMonth = async (e: any): Promise<void> => {
    const { year, month } = getDate();

    const target = e.target?.closest?.("[data-month]") || e.target;
    const dataMonth = Number(target?.dataset?.month);
    const dataYear = String(target?.dataset?.year);

    if (months[dataMonth - 1] === month && dataYear === year) {
        return viewInstance?.onOpen();
    }

    stateManager({ selectedMonth: months[dataMonth - 1], selectedYear: dataYear });

    const resultCreat = await createOtherMonthDirectory(dataMonth - 1, dataYear);
    if (resultCreat !== "success") {
        new Notice(resultCreat);
    }

    await showAnotherInitialView();
}

export const showAnotherInitialView = async (): Promise<void> => {
    if (!viewInstance || !pluginInstance) return;

    const { selectedMonth } = stateManager();

    const { jsonData: expenditurePlanInfo, status: expenditurePlanStatus } = await getDataFile<PlanData>("Expenditure plan");
    if (expenditurePlanStatus !== "success") {
        new Notice(expenditurePlanStatus);
        console.error(expenditurePlanStatus);
    }
    if (expenditurePlanInfo == null) throw new Error('expenditurePlanInfo is null or undefined');

    const { jsonData: incomePlanInfo, status: incomePlanStatus } = await getDataFile<PlanData>("Income plan");
    if (incomePlanStatus !== "success") {
        new Notice(incomePlanStatus);
        console.error(incomePlanStatus);
    }
    if (incomePlanInfo == null) throw new Error('incomePlanInfo is null or undefined');

    const { contentEl } = viewInstance;
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
        viewInstance?.onOpen();
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
        await showAllMonths();
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
        text: String(SummarizingDataForTheDayExpense(expenditurePlanInfo)),
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
        text: String(SummarizingDataForTheDayIncome(incomePlanInfo)),
    });

    otherMonthHomeButtons();
}

const otherMonthHomeButtons = async () => {
    const { contentEl } = viewInstance;

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
        await showHistory(mainContentBody, mainContentButton);
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
        await showPlans(mainContentBody, mainContentButton);
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