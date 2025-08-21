// @ts-ignore
const { Plugin, ItemView, Notice, setIcon, Platform } = require("obsidian");

const FINANCIAL_ACCOUNTING_VIEW = "financial-accounting-view";
let pluginInstance;
let viewInstance;

module.exports = class mainPlugin extends Plugin {
    async onload() {
        this.registerView(
            FINANCIAL_ACCOUNTING_VIEW,
            (leaf) => new FinancialAccountingView(leaf)
        );
        pluginInstance = this;

        this.addRibbonIcon("badge-dollar-sign", "Add operation", async () => {
            this.activateView()

            await this.createDirectory();
        });

        this.addCommand({
            id: "financial-accounting-view",
            name: "Открыть панель финансов",
            callback: () => this.activateView(),
        });
    }

    async activateView() {
    const { workspace } = this.app;

    let leaf = workspace.getLeavesOfType(FINANCIAL_ACCOUNTING_VIEW)[0];
        if (!leaf) {
            if (Platform.isDesktop) {
                leaf = workspace.getRightLeaf(false);
            } else {
                leaf = workspace.getLeaf(true);
            }
            await leaf.setViewState({
                type: FINANCIAL_ACCOUNTING_VIEW,
                active: true,
            });
        }
        workspace.revealLeaf(leaf);
    }

    async createDirectory() {
        defCreateDirectory(this)
    }

    // search data
    async searchHistory() {
        return defSearchHistory(this)
    }

    async searchPlan() {
        return defSearchPlan(this)
    }

    async searchBills() {
        return defSearchBills(this)
    }

    //add data
    async addHistory() {
        defAddHistory(this)
    }
    
    async addPlan() {
        defAddPlan(this)
    }

    async addBills() {
        defAddBills(this)
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(FINANCIAL_ACCOUNTING_VIEW);
    }
};

class FinancialAccountingView extends ItemView {
    constructor(leaf) {
        super(leaf);
    }

    getViewType() {
        return FINANCIAL_ACCOUNTING_VIEW;
    }

    getDisplayText() {
        return "Financial accounting view";
    }

    onOpen() {
        viewInstance = this;
        showInitialView()
    }

    onClose() {
        const { containerEl } = this;
        containerEl.empty();
    }
}

//====================================== Create directory ======================================

async function defCreateDirectory() {
    const { now, year, month } = getDate()

    const baseFolder = "My Life/My Finances";
    const yearFolder = `${baseFolder}/${year}`;
    const monthFolder = `${yearFolder}/${month}`;
    const historyPath = `${monthFolder}/History.md`;
    const planPath = `${monthFolder}/Plan.md`;
    const billsPath = `${monthFolder}/Bills.md`;

    if (!await this.app.vault.adapter.exists(baseFolder)) {
        await this.app.vault.createFolder(baseFolder);
    }

    if (!await this.app.vault.adapter.exists(yearFolder)) {
        await this.app.vault.createFolder(yearFolder);
    }

    if (!await this.app.vault.adapter.exists(monthFolder)) {
        await this.app.vault.createFolder(monthFolder);
    }

    if (!await this.app.vault.adapter.exists(historyPath)) {
        await this.app.vault.create(historyPath);
    }

    if (!await this.app.vault.adapter.exists(planPath)) {
        await this.app.vault.create(planPath);
    }

    if (!await this.app.vault.adapter.exists(billsPath)) {
        await this.app.vault.create(billsPath);
    }
}

//====================================== Search data ======================================

async function defSearchHistory() {
    const { now, year, month } = getDate()

    const filePath = `My Life/My Finances/${year}/${month}/History.md`;
    const fileContent = await this.app.vault.adapter.read(filePath);
    const jsonMatch = fileContent.match(/```json([\s\S]*?)```/);
    if(jsonMatch[1].length >= 2) {
        const jsonData = JSON.parse(jsonMatch[1].trim());
        return jsonData
    } else {
        return 'Undefined'
    }
}

async function defSearchPlan() {
    const { now, year, month } = getDate()

    const filePath = `My Life/My Finances/${year}/${month}/Plan.md`;
    const fileContent = await this.app.vault.adapter.read(filePath);
    const jsonMatch = fileContent.match(/```json([\s\S]*?)```/);
    if(jsonMatch[1].length >= 2) {
        const jsonData = JSON.parse(jsonMatch[1].trim());
        return jsonData
    } else {
        return 'Undefined'
    }
}

async function defSearchBills() {
    const { now, year, month } = getDate()

    const filePath = `My Life/My Finances/${year}/${month}/Bills.md`;
    const fileContent = await this.app.vault.adapter.read(filePath);
    const jsonMatch = fileContent.match(/```json([\s\S]*?)```/);
    if(jsonMatch[1].length >= 2) {
        const jsonData = JSON.parse(jsonMatch[1].trim());
        return jsonData
    } else {
        return 'Undefined'
    }
}

//====================================== Add Data ======================================

let resultRadio;
async function defAddHistory(params) {
    const { now, year, month } = getDate()

    const filePath = `My Life/My Finances/${year}/${month}/History.md`;
    const fileContent = await this.app.vault.adapter.read(filePath);
    
    const { contentEl, titleEl, headerEl } = viewInstance;
    titleEl.empty()
    contentEl.empty()

    const exitButton = contentEl.createEl('div', {
        cls: 'exit-button',
        attr: {
            id: 'exit-button'
        }
    })
    setIcon(exitButton, 'arrow-left')
    exitButton.addEventListener('click', () => {
        viewInstance.onOpen()
    })
    
    const titleText = titleEl.createEl('h1', {
        text: 'Операция'
    })

    const mainAddForm = contentEl.createEl('form', {
        cls: 'main-add-form',
        attr: {
            id: 'main-add-form'
        }
    })

    // Form radio
    const expenseOrIncome = mainAddForm.createEl('div', {
        cls: 'main-form_radio'
    })

    const radioExpense = expenseOrIncome.createEl('button', {
        text: "Расход",
        cls: 'main-radio_exprense',
        attr: {
            'data-radio': 'expense',
            type: 'button'
        }
    })

    resultRadio = radioExpense.dataset.radio
    radioExpense.addClass('main-radion-button--active')

    const radioIncome = expenseOrIncome.createEl('button', {
        text: 'Доход',
        cls: 'main-radio_income',
        attr: {
            'data-radio': 'income',
            type: 'button'
        }
    })

    radioIncome.addEventListener('click', () => {
        radioExpense.removeClass('main-radion-button--active')
        radioIncome.addClass('main-radion-button--active')
        resultRadio = radioIncome.dataset.radio
    })
    radioExpense.addEventListener('click', () => {
        radioIncome.removeClass('main-radion-button--active')
        radioExpense.addClass('main-radion-button--active')
        resultRadio = radioExpense.dataset.radio
    })

    // Form input
    const mainFormInput = mainAddForm.createEl('div', {
        cls: 'main-form-input'
    })
    const inputSum = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Сумма',
            type: 'number'
        }
    })
    inputSum.focus()
    const inputDataList = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Счёт',
            list: 'datalist-biils'
        }
    })
    const dataListBills = mainFormInput.createEl('datalist', {
        cls: 'form-input-datalist',
        attr: {
            id: 'datalist-biils'
        }
    })
    
    const resultBills = await pluginInstance.searchBills()
    
    resultBills.forEach(bill => {
        dataListBills.createEl('option', {
            value: `${bill.name} ● ${bill.balance}`
        })
    })
}

async function defAddPlan(params) {
    const { now, year, month } = getDate()

    const filePath = `My Life/My Finances/${year}/${month}/Plan.md`;
    const fileContent = await this.app.vault.adapter.read(filePath);
    
    if(viewInstance) {
        addPlanPage()
    }
}

function addPlanPage() {
    const { contentEl, headerEl, titleEl } = viewInstance;
    titleEl.empty()
    contentEl.empty()
}

async function defAddBills(params) {
    const { now, year, month } = getDate()

    const filePath = `My Life/My Finances/${year}/${month}/Bills.md`;
    const fileContent = await this.app.vault.adapter.read(filePath);
    
    if(viewInstance) {
        addBillsPage()
    }
}

function addBillsPage() {
    const { contentEl, headerEl, titleEl } = viewInstance;
    titleEl.empty()
    contentEl.empty()
}

//====================================== View ======================================

async function showInitialView() {
    const { contentEl, containerEl } = viewInstance
    const { now, year, month } = getDate()

    contentEl.addClass('finance-content')
    containerEl.addClass('finance-container')

    contentEl.empty()

    const financeHeader = contentEl.createEl('div', {
        cls: 'finance-header'
    })

    const showAllMonthsButton = financeHeader.createEl("button", {
        text: `🗓️ ${month}`,
        attr: {
            id: 'showAllMonths'
        }
    });

    showAllMonthsButton.addEventListener('click', async () => {
        if(contentEl.dataset.page === 'home') {
            contentEl.setAttribute('data-page', 'months')
            showAllMonths(contentEl)
        } else {
            contentEl.setAttribute('data-page', 'home')
            showInitialView(contentEl)
        }
    })

    contentEl.setAttribute('data-page', 'home')
    
    const balance = contentEl.createEl("div", {
        cls: "balance"
    });

    const balanceTop = balance.createEl('div', {
        cls: 'balance-top'
    })

    balanceTop.createEl('span', {
        text: 'Баланс'
    })

    balanceTop.createEl('p', {
        text: '20000 ₸'
    })

    balanceTop.createEl('span', {
        text: '~3000 на день'
    })

    const balanceLine = balance.createEl('div', {
        cls: 'balance-line'
    })

    const balanceBody = balance.createEl('div', {
        cls: 'balance-body'
    })

    const balanceExpenses = balanceBody.createEl('div', {
        cls: 'balance_body-expenses'
    })

    balanceExpenses.createEl('span', {
        text: 'Расход'
    })

    const balanceExpensesСheck = balanceExpenses.createEl('div', {
        cls: 'balance_expenses-check'
    })

    setIcon(balanceExpensesСheck, 'upload')
    balanceExpensesСheck.createEl('p', {
        text: `17000`
    })

    const balanceIncome = balanceBody.createEl('div', {
        cls: 'balance_body-income'
    })

    balanceIncome.createEl('span', {
        text: 'Доход'
    })

    const balanceIncomeCheck = balanceIncome.createEl('div', {
        cls: 'balance_income-check'
    })

    setIcon(balanceIncomeCheck, 'download')
    balanceIncomeCheck.createEl('p', {
        text: '20000'
    })

    homeButtons(contentEl)
}

async function amountOfMoney() {

}

//====================================== Month ======================================

async function showAllMonths(contentEl) {
    contentEl.empty()

    const { now, year, month } = getDate()

    const financeHeader = contentEl.createEl('div', {
        cls: 'finance-header'
    })

    const showAllMonthsButton = financeHeader.createEl("button", {
        text: `🗓️ ${month}`,
        attr: {
            id: 'showAllMonths'
        }
    });

    showAllMonthsButton.addEventListener('click', async () => {
        if(contentEl.dataset.page === 'home') {
            contentEl.setAttribute('data-page', 'months')
            showAllMonths(contentEl)
        } else {
            contentEl.setAttribute('data-page', 'home')
            showInitialView(contentEl)
        }
    })
}

//====================================== Home page ======================================

async function homeButtons(contentEl) {
    const homeNav = contentEl.createEl('div', {
        cls: 'main-nav'
    })
    const mainContent = contentEl.createEl('div', {
        cls: 'main-content'
    })
    const mainContentBody = mainContent.createEl('div', {
        cls: 'main-content-body'
    })
    const mainContentButton = mainContent.createEl('div', {
        cls: 'main-content-button'
    })

    const historyButton = homeNav.createEl('a', {
        text: 'History',
        cls: 'home_button--active',
        attr: {
            id: 'history-button',
            href: '#'
        }
    })
    historyButton.addEventListener('click', async () => {
        planButton.removeClass('home_button--active')
        billsButton.removeClass('home_button--active')
        historyButton.addClass('home_button--active')
        mainContentBody.empty()
        mainContentButton.empty()
        showHistory(mainContentBody, mainContentButton)
    })

    const planButton = homeNav.createEl('a', {
        text: 'Plan',
        attr: {
            id: 'plan-button',
            href: '#'
        }
    })
    planButton.addEventListener('click', async () => {
        historyButton.removeClass('home_button--active')
        billsButton.removeClass('home_button--active')
        planButton.addClass('home_button--active')
        mainContentBody.empty()
        mainContentButton.empty()
        showPlan(mainContentBody, mainContentButton)
    })
    
    const billsButton = homeNav.createEl('a', {
        text: 'Bills',
        attr: {
            id: 'bills-button',
            href: '#'   
        }
    })
    billsButton.addEventListener('click', async () => {
        historyButton.removeClass('home_button--active')
        planButton.removeClass('home_button--active')
        billsButton.addClass('home_button--active')
        mainContentBody.empty()
        mainContentButton.empty()
        showBills(mainContentBody, mainContentButton)
    })

    showHistory(mainContentBody, mainContentButton)
}

//====================================== ShowInfo ======================================

async function showHistory(mainContentBody, mainContentButton) {
    let historyInfo = await pluginInstance.searchHistory();

    if(historyInfo === 'Undefined') {
        const undefinedContent = mainContentBody.createEl('div', {
            cls: 'undefined-content'
        })

        const undefinedContentSmiles = undefinedContent.createEl('span', {
            text: '🍕 🎮 👕'
        })

        const undefinedContentText = undefinedContent.createEl('p', {
            text: 'Вносите любые доходы и расходы, чтобы видеть, сколько средств остаётся на самом деле'
        })
    } else {
        const searchInput = mainContentBody.createEl('input', {
            cls: 'input-search',
            attr: {
                id: 'input-search',
                type: 'search',
                placeholder: '🔎 Поиск по операциям'
            }
        })

        historyInfo.forEach(e => {
            e.date
        });
    }

    const addHistoryButton = mainContentButton.createEl('button', {
        text: 'Добавить расход или доход',
        cls: 'add-button'
    })
    addHistoryButton.addEventListener('click', async () => {
        if (pluginInstance) {
            pluginInstance.addHistory();
        }
    })
}

async function showPlan(mainContentBody, mainContentButton) {
    let planInfo = await pluginInstance.searchPlan();

    if(planInfo === 'Undefined') {
        const undefinedContent = mainContentBody.createEl('div', {
            cls: 'undefined-content'
        })

        const undefinedContentSmiles = undefinedContent.createEl('span', {
            text: '🍕 🎮 👕'
        })

        const undefinedContentText = undefinedContent.createEl('p', {
            text: 'Вносите любые доходы и расходы, чтобы видеть, сколько средств остаётся на самом деле'
        })
    }

    const addPlanButton = mainContentButton.createEl('button', {
        text: 'Создать категорию',
        cls: 'add-button'
    })
}

async function showBills(mainContentBody, mainContentButton) {
    let billsInfo = await pluginInstance.searchBills();

    if(billsInfo === 'Undefined') {
        const undefinedContent = mainContentBody.createEl('div', {
            cls: 'undefined-content'
        })

        const undefinedContentSmiles = undefinedContent.createEl('span', {
            text: '🍕 🎮 👕'
        })

        const undefinedContentText = undefinedContent.createEl('p', {
            text: 'Вносите любые доходы и расходы, чтобы видеть, сколько средств остаётся на самом деле'
        })
    }

    const addBillButton = mainContentButton.createEl('button', {
        text: 'Добавить счёт',
        cls: 'add-button'
    })
}

//====================================== Other Function ======================================

function getDate() {
    moment.locale('en');
    const now = moment();
    const year = now.format('YYYY');
    const month = now.format('MMMM');
    return { now, year, month }
}