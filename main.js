// @ts-ignore
const { Plugin, ItemView, Notice, setIcon, Platform, PluginSettingTab, TFolder, Setting } = require("obsidian");

const FINANCIAL_ACCOUNTING_VIEW = "financial-accounting-view";
let pluginInstance;
let viewInstance;

let selectedYear = null;
let selectedMonth = null;

let openPageNow;

const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];

const popularCodes = ["USD", "EUR", "RUB", "KZT", "UZS"];

module.exports = class mainPlugin extends Plugin {
    currenciesData = null;

    async onload() {
        await this.loadSettings();
        await this.loadCurrenciesData();

        this.registerView(
            FINANCIAL_ACCOUNTING_VIEW,
            (leaf) => new FinancialAccountingView(leaf)
        );
        pluginInstance = this;

        this.app.workspace.onLayoutReady(async () => {
            this.addSettingTab(new SettingsTab(this.app, this));

            this.addRibbonIcon("badge-dollar-sign", "Add operation", async () => {
                this.activateView();
                await this.createDirectory();
            });

            this.addCommand({
                id: "financial-accounting-view",
                name: "Open the finance panel",
                callback: () => this.activateView(),
            });
        });
    }

    async loadCurrenciesData() {
        const pluginPath = this.app.vault.configDir + "/plugins/" + this.manifest.id;
        const filePath = pluginPath + "/currencies.json";

        try {
            const fileContent = await this.app.vault.adapter.read(filePath);
            this.currenciesData = JSON.parse(fileContent);

        } catch (error) {
            console.error("Error reading file currencies.json:", error);
        }
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

    async loadSettings() {
        const loaded = await this.loadData();
        const defaults = new DefaultSettings();
        this.settings = Object.assign({}, defaults, loaded || {});
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // Create directory
    async createDirectory() {
        defCreateDirectory(this)
    }

    async createOtherMonthDirectory(numMonth, year) {
        return await defCreateOtherMonthDirectory(numMonth, year, this)
    }

    // search data
    async searchElementById(id, modifier) {
        return defSearchElementById(id, modifier, this)
    }

    async getDataFile(fileName) {
        return defGetDataFile(fileName, this)
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

    // add data to file
    async addJsonToHistory(data) {
        return defAddJsonToHistory(data, this)
    }

    async addJsonToPlan(data) {
        if(data.type === 'expense') {
            return defAddJsonToExpenditurePlan(data, this)
        } else if (data.type === 'income') {
            return defAddJsonToIncomePlan(data, this)
        } else {
            return "Error radio result"
        }
    }
    
    async addJsonToBills(data) {
        return defAddJsonToBills(data, this)
    }

    // editing data to file
    async editingJsonToHistory(data, oldData) {
        return defEditingJsonToHistory(data, oldData, this)
    }

    async editingJsonToPlan(data) {
        return defEditingJsonToPlan(data, this)
    }

    async editingJsonToBill(data) {
        return defEditingJsonToBill(data, this)
    }
    
    // Check for deletion data
    async checkForDeletionData(id, modifier) {
        return defCheckForDeletionData(id, modifier, this)
    }

    async changeAllRelatedFiles(data, modifier) {
        return defChangeAllRelatedFiles(data, modifier, this)
    }
    
    // Duplicating data to archive
    async archiveExpenditurePlan() {
        return defArchiveExpenditurePlan(this)
    }
    
    async archiveIncomePlan() {
        return defArchiveIncomePlan(this)
    }

    // Transferring data to a new month

    async newMonthExpenditurePlan() {
        return defNewMonthExpenditurePlan(this)
    }

    async newMonthIncomePlan() {
        return defNewMonthIncomePlan(this)
    }

    // Middleware function
    async getDataArchiveFile(fileName) {
        return defGetDataArchiveFile(fileName, this)
    }

    async expenditureTransaction(data, modifier, oldData) {
        return defExpenditureTransaction(data, modifier, oldData, this)
    }

    async incomeTransaction(data, modifier, oldData) {
        return defIncomeTransaction(data, modifier, oldData, this)
    }

    async updateData(fileName, accountName, targetE, newTargetE) {
        return defUpdateData(fileName, accountName, targetE, newTargetE, this)
    }

    async checkBill(data, oldData) {
        return defCheckBill(data, oldData, this)
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

    getIcon() {
        return "chart-pie";
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

class DefaultSettings {
    constructor() {
        this.targetFolder = 'Finances';
        this.startYear = 2020;
        this.baseCurrency = "USD";
    }
}

class SettingsTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h1', { text: 'Plugin settings' });

        const folders = this.app.vault.getAllLoadedFiles()
            .filter(f => f instanceof TFolder)
            .map(f => f.path);

        const defaultFolder = this.plugin.settings.targetFolder || 'Finances/';
        const hasDefault = folders.includes(defaultFolder);

        // Selecting a directory
        new Setting(containerEl)
            .setName('Working directory')
            .setDesc('Select the folder the plugin will work with.')
            .addDropdown(drop => {
            for (const path of folders) {
                drop.addOption(path, path);
            }

            if (!hasDefault) {
                drop.addOption(defaultFolder, `${defaultFolder} (does not exist)`);
            }

            drop.setValue(defaultFolder);

            drop.onChange(async (value) => {
                this.plugin.settings.targetFolder = value;
                await this.plugin.saveSettings();
                new Notice(`Folder selected: ${value}`);
            });
        });

        // Selecting the initial year of accounting
        new Setting(containerEl)
        .setName('Initial year of accounting')
        .setDesc('Select the year from which financial accounting has been conducted')
        .addDropdown(drop => {
            const currentYear = new Date().getFullYear();
            for (let year = currentYear - 100; year <= currentYear; year++) {
                drop.addOption(String(year), String(year));
            }

            drop.setValue(String(this.plugin.settings.startYear));

            drop.onChange(async (value) => {
                this.plugin.settings.startYear = Number(value);
                await this.plugin.saveSettings();
                new Notice(`The starting year has been changed to ${value}`);
            });
        });

        // Selecting the base currency
        const settingEl = new Setting(containerEl)
			.setName("Main currency")
			.setDesc("Select the currency from which the conversion will be performed")
			.settingEl;

		const selectEl = settingEl.createEl("select", { cls: "currency-select" });

        const { popularCurrencies, allCurrencies } = getCurrencyGroups();

		// --- Popular ---
		const popularGroup = document.createElement("optgroup");
        popularGroup.label = "Popular";

        popularCurrencies.forEach(cur => {
            const option = document.createElement("option");
            option.value = cur.code;
            option.textContent = `${cur.code} • ${cur.name} • ${cur.symbol}`;
            popularGroup.appendChild(option);
        });

        // --- All ---
        const allGroup = document.createElement("optgroup");
        allGroup.label = "All currencies";

        allCurrencies.forEach(cur => {
            const option = document.createElement("option");
            option.value = cur.code;
            option.textContent = `${cur.code} ${cur.name} • ${cur.symbol}`;
            allGroup.appendChild(option);
        });

        selectEl.appendChild(popularGroup);
        selectEl.appendChild(allGroup);

		selectEl.value = this.plugin.settings.baseCurrency;

		selectEl.addEventListener("change", async (event) => {
			this.plugin.settings.baseCurrency = event.target.value;
			await this.plugin.saveSettings();
			new Notice(`The main currency has been changed to ${event.target.value}`);
		});
    }
}

//====================================== Create directory ======================================

async function defCreateDirectory() {
    const { now, year, month } = getDate()

    const archiveFolder = `${pluginInstance.settings.targetFolder}/Archive`
    const archiveExpenditurePlan = `${archiveFolder}/Archive expenditure plan.md`
    const archiveIncomePlan = `${archiveFolder}/Archive income plan.md`
    const archiveBills = `${archiveFolder}/Archive bills.md`
    const yearFolder = `${pluginInstance.settings.targetFolder}/${year}`;
    const monthFolder = `${yearFolder}/${month}`;
    const historyPath = `${monthFolder}/History.md`;
    const expenditurePlanPath = `${monthFolder}/Expenditure plan.md`;
    const incomePlanPath = `${monthFolder}/Income plan.md`;
    
    if (!await this.app.vault.adapter.exists(pluginInstance.settings.targetFolder)) {
        await this.app.vault.createFolder(pluginInstance.settings.targetFolder);
    }

    if (!await this.app.vault.adapter.exists(archiveFolder)) {
        await this.app.vault.createFolder(archiveFolder);
    }

    if (!await this.app.vault.adapter.exists(archiveExpenditurePlan)) {
        await this.app.vault.create(archiveExpenditurePlan, '');
        await pluginInstance.archiveExpenditurePlan()
    }

    if (!await this.app.vault.adapter.exists(archiveIncomePlan)) {
        await this.app.vault.create(archiveIncomePlan, '');
        await pluginInstance.archiveIncomePlan()
    }

    if (!await this.app.vault.adapter.exists(archiveBills)) {
        await this.app.vault.create(archiveBills, '');
    }

    if (!await this.app.vault.adapter.exists(yearFolder)) {
        await this.app.vault.createFolder(yearFolder);
    }

    if (!await this.app.vault.adapter.exists(monthFolder)) {
        await this.app.vault.createFolder(monthFolder);
    }
    
    if (!await this.app.vault.adapter.exists(historyPath)) {
        await this.app.vault.create(historyPath, '');
    }

    if (!await this.app.vault.adapter.exists(expenditurePlanPath)) {
        await this.app.vault.create(expenditurePlanPath, '');
        await pluginInstance.newMonthExpenditurePlan()
    }
    
    if (!await this.app.vault.adapter.exists(incomePlanPath)) {
        await this.app.vault.create(incomePlanPath, '');
        await pluginInstance.newMonthIncomePlan()
    }
}

async function defCreateOtherMonthDirectory(numMonth, year) {
    const yearFolder = `${pluginInstance.settings.targetFolder}/${year}`;
    const monthFolder = `${yearFolder}/${months[numMonth]}`;
    const historyPath = `${monthFolder}/History.md`;
    const expenditurePlanPath = `${monthFolder}/Expenditure plan.md`;
    const incomePlanPath = `${monthFolder}/Income plan.md`;

    try {
        if (!await this.app.vault.adapter.exists(pluginInstance.settings.targetFolder)) {
            await this.app.vault.createFolder(pluginInstance.settings.targetFolder);
        }
    
        if (!await this.app.vault.adapter.exists(yearFolder)) {
            await this.app.vault.createFolder(yearFolder);
        }
    
        if (!await this.app.vault.adapter.exists(monthFolder)) {
            await this.app.vault.createFolder(monthFolder);
        }
        
        if (!await this.app.vault.adapter.exists(historyPath)) {
            await this.app.vault.create(historyPath, '');
        }
    
        if (!await this.app.vault.adapter.exists(expenditurePlanPath)) {
            await this.app.vault.create(expenditurePlanPath, '');
        }
        
        if (!await this.app.vault.adapter.exists(incomePlanPath)) {
            await this.app.vault.create(incomePlanPath, '');
        }

        return 'success'
    } catch (error) {
        return 'Error creating directory'
    }
}

//====================================== View ======================================

async function showInitialView() {
    const { contentEl } = viewInstance
    const { now, year, month } = getDate()

    selectedYear = null
    selectedMonth = null

    const { jsonData: billsInfo, status: billStatus } = await pluginInstance.getDataArchiveFile('Archive bills');
    if(billStatus !== 'success') {
        new Notice(billStatus)
        console.error(billStatus)
    }

    const { jsonData: expenditurePlanInfo, status: expenditurePlanStatus } = await pluginInstance.getDataFile('Expenditure plan');
    if(expenditurePlanStatus !== 'success') {
        new Notice(expenditurePlanStatus)
        console.error(expenditurePlanStatus)
    }

    const { jsonData: incomePlanInfo, status: incomePlanStatus } = await pluginInstance.getDataFile('Income plan');
    if(incomePlanStatus !== 'success') {
        new Notice(incomePlanStatus)
        console.error(incomePlanStatus)
    }

    contentEl.empty()
    contentEl.addClass('finance-content')

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
            await showAllMonths(contentEl)
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
        text: 'Balance'
    })

    balanceTop.createEl('p', {
        text: `${SummarizingDataForTheTrueBills(billsInfo)} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`
    })

    balanceTop.createEl('span', {
        text: `~${divideByRemainingDays(SummarizingDataForTheTrueBills(billsInfo))} for a day`
    })

    const balanceLine = balance.createEl('div', {
        cls: 'balance-line'
    })
    balanceLine.style.setProperty('--after-width', `${switchBalanceLine(billsInfo, expenditurePlanInfo)}%`);

    const balanceBody = balance.createEl('div', {
        cls: 'balance-body'
    })

    const balanceExpenses = balanceBody.createEl('div', {
        cls: 'balance_body-expenses'
    })

    balanceExpenses.createEl('span', {
        text: 'Expense'
    })

    const balanceExpensesСheck = balanceExpenses.createEl('div', {
        cls: 'balance_expenses-check'
    })

    setIcon(balanceExpensesСheck, 'upload')
    balanceExpensesСheck.createEl('p', {
        text: String(SummarizingDataForTheDayExpense(expenditurePlanInfo))
    })

    const balanceIncome = balanceBody.createEl('div', {
        cls: 'balance_body-income'
    })

    balanceIncome.createEl('span', {
        text: 'Income'
    })

    const balanceIncomeCheck = balanceIncome.createEl('div', {
        cls: 'balance_income-check'
    })

    setIcon(balanceIncomeCheck, 'download')
    balanceIncomeCheck.createEl('p', {
        text: String(SummarizingDataForTheDayIncome(incomePlanInfo))
    })

    homeButtons(contentEl)
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
    const mainContentButton = contentEl.createEl('div', {
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
        showPlans(mainContentBody, mainContentButton)
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

    if(!openPageNow || openPageNow === 'History') {
        showHistory(mainContentBody, mainContentButton)
        historyButton.addClass('home_button--active')
        billsButton.removeClass('home_button--active')
        planButton.removeClass('home_button--active')
    } else if(openPageNow === 'Plans') {
        showPlans(mainContentBody, mainContentButton)
        historyButton.removeClass('home_button--active')
        planButton.addClass('home_button--active')
        billsButton.removeClass('home_button--active')
    } else if(openPageNow === 'Bills') {
        showBills(mainContentBody, mainContentButton)
        historyButton.removeClass('home_button--active')
        planButton.removeClass('home_button--active')
        billsButton.addClass('home_button--active')
    } else {
        showHistory(mainContentBody, mainContentButton)
        historyButton.addClass('home_button--active')
        billsButton.removeClass('home_button--active')
        planButton.removeClass('home_button--active')
    }
}

//====================================== Month ======================================

async function showAllMonths(contentEl) {
    contentEl.empty()

    const { now, year, month } = getDate()

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

    const calendarHead = contentEl.createEl('div', {
        cls: 'calendar-header'
    })
    const calendarTitle = calendarHead.createEl('h1', {
        text: 'Calendar'
    })

    const scheduleEl = contentEl.createEl('div', {
        cls: 'schedule-main'
    })

    const calendarMain = contentEl.createEl('div', {
        cls: 'calendar-main'
    })

    const allMonths = [
        '☃️ January',
        '🌨️ February',
        '🌷 March',
        '🌱 April',
        '☀️ May',
        '🌳 June',
        '🏖️ July',
        '🌾 August',
        '🍁 September',
        '🍂 October',
        '☔ November',
        '❄️ December'
    ];

    for (let i = Number(year); i >= pluginInstance.settings.startYear; i--) {
        const calendarUlTitle = calendarMain.createEl('div', {
            cls: 'calendar-list-title'
        })
        calendarUlTitle.createEl('span', {
            text: i
        })
        calendarUlTitle.createEl('span', {
            text: '-900 000 +900 0000'
        })

        const calendarUl = calendarMain.createEl('ul', {
            cls: 'calendar-list',
            attr: {
                'data-year': i,
            }
        })

        for(let k = allMonths.length - 1; k >= 0; k--) {
            const calendarItem = calendarUl.createEl('li', {
                attr: {
                    'data-month': `${k + 1}`,
                    'data-year': `${i}`,
                },
            })
            calendarItem.onclick = async (e) => {
                await initOtherMonth(e);
            };
            calendarItem.createEl('p', {
                text: allMonths[k],
            })
            const storyMonth = calendarItem.createEl('div', {
                cls: 'story-month'
            })
            storyMonth.createEl('span', {
                text: '-50 000',
                cls: 'expense-all-month'
            })
            storyMonth.createEl('span', {
                text: '+900 000',
                cls: 'income-all-month'
            })
        }
    }
}

async function initOtherMonth(e) {
    const { now, year, month } = getDate()

    if(months[e.target.dataset.month - 1] === month && e.target.dataset.year === year) {
        return viewInstance.onOpen()
    }

    const resultCreat = await pluginInstance.createOtherMonthDirectory(e.target.dataset.month - 1, e.target.dataset.year);
    if(!resultCreat === 'success') {
        new Notice(resultCreat)
    }

    await showAnotherMonthView(e)
}

async function showAnotherMonthView(e) {
    selectedYear = Number(e.target.dataset.year)
    selectedMonth = Number(e.target.dataset.month)
    
    await pluginInstance.newMonthExpenditurePlan()
    await pluginInstance.newMonthIncomePlan()

    const { contentEl } = viewInstance
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

    const financeHeader = contentEl.createEl('div', {
        cls: 'finance-header'
    })

    const showAllMonthsButton = financeHeader.createEl("button", {
        text: `🗓️ ${months[e.target.dataset.month - 1]}`,
        attr: {
            id: 'showAllMonths'
        }
    });

    showAllMonthsButton.addEventListener('click', async () => {
        if(contentEl.dataset.page === 'home') {
            contentEl.setAttribute('data-page', 'months')
            showAllMonths(contentEl)
        }
    })
    contentEl.setAttribute('data-page', 'home')

    const balance = contentEl.createEl("div", {
        cls: "balance"
    });

    const balanceBody = balance.createEl('div', {
        cls: 'balance-body'
    })

    const balanceExpenses = balanceBody.createEl('div', {
        cls: 'balance_body-expenses'
    })

    balanceExpenses.createEl('span', {
        text: 'Expense'
    })

    const balanceExpensesСheck = balanceExpenses.createEl('div', {
        cls: 'balance_expenses-check'
    })

    setIcon(balanceExpensesСheck, 'upload')
    balanceExpensesСheck.createEl('p', {
        text: '0'
    })

    const balanceIncome = balanceBody.createEl('div', {
        cls: 'balance_body-income'
    })

    balanceIncome.createEl('span', {
        text: 'Income'
    })

    const balanceIncomeCheck = balanceIncome.createEl('div', {
        cls: 'balance_income-check'
    })

    setIcon(balanceIncomeCheck, 'download')
    balanceIncomeCheck.createEl('p', {
        text: '0'
    })

    // let billsInfo = await pluginInstance.searchBills();
    // let expenditurePlanInfo = await pluginInstance.searchExpenditurePlan();
    // let incomePlanInfo = await pluginInstance.searchIncomePlan();

    otherMonthHomeButtons(contentEl)
}

async function otherMonthHomeButtons(contentEl) {
    const homeNav = contentEl.createEl('div', {
        cls: 'main-nav'
    })
    const mainContent = contentEl.createEl('div', {
        cls: 'main-content'
    })
    const mainContentBody = mainContent.createEl('div', {
        cls: 'main-content-body'
    })
    const mainContentButton = contentEl.createEl('div', {
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
        historyButton.addClass('home_button--active')
        mainContentBody.empty()
        mainContentButton.empty()
        // showHistory(mainContentBody, mainContentButton)
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
        planButton.addClass('home_button--active')
        mainContentBody.empty()
        mainContentButton.empty()
        // showPlans(mainContentBody, mainContentButton)
    })

    historyButton.addClass('home_button--active')
    // showHistory(mainContentBody, mainContentButton)
}

//====================================== Transferring data to a new month ======================================

async function defNewMonthExpenditurePlan() {
    const { content, jsonMatch, status: archiveStatus } = await pluginInstance.getDataArchiveFile('Archive expenditure plan')
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }
    const { file, status } = await pluginInstance.getDataFile('Expenditure plan')
    if(!(status === 'success')) {
        return status
    }

    if(jsonMatch[1].length >= 1) {
        try {
            const jsonData = JSON.parse(jsonMatch[1].trim())
            const data = jsonData.map(obj => ({ ...obj, amount: 0 }))
            const dataStr = JSON.stringify(data, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await this.app.vault.modify(file, newContent);

            return 'success'
        } catch (error) {
            return error
        }
    } 
}

async function defNewMonthIncomePlan() {
    const { content, jsonMatch, status: achiveStatus } = await pluginInstance.getDataArchiveFile('Archive income plan')
    if(!(achiveStatus === 'success')) {
        return achiveStatus
    }
    const { file, status } = await pluginInstance.getDataFile('Income plan')
    if(!(status === 'success')) {
        return status
    }
    
    if(jsonMatch[1].length >= 1) {
        try {
            const jsonData = JSON.parse(jsonMatch[1].trim())
            const data = jsonData.map(obj => ({ ...obj, amount: 0 }))
            const dataStr = JSON.stringify(data, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await this.app.vault.modify(file, newContent);

            return 'success'
        } catch (error) {
            return error
        }
    }
}

//====================================== ShowInfo ======================================

async function showHistory(mainContentBody, mainContentButton) {
    openPageNow = 'History'
    const { jsonData: historyInfo, status } = await pluginInstance.getDataFile('History');
    if(status !== 'success') {
        new Notice(status)
        console.error(status)
    }

    if(historyInfo === null) {
        const undefinedContent = mainContentBody.createEl('div', {
            cls: 'undefined-content'
        })
        mainContentBody.addClass('main-content-body--undefined')

        const undefinedContentSmiles = undefinedContent.createEl('span', {
            text: '🍕 🎮 👕'
        })

        const undefinedContentText = undefinedContent.createEl('p', {
            text: 'Enter any income and expenses to see how much money is actually left.'
        })
    } else {
        mainContentBody.removeClass('main-content-body--undefined')
        const searchInput = mainContentBody.createEl('input', {
            cls: 'input-search',
            attr: {
                id: 'input-search',
                type: 'search',
                placeholder: '🔎 Search by operations'
            }
        })

        const grouped = Object.values(
            historyInfo.reduce((acc, item) => {
                if (!acc[item.date]) {
                    acc[item.date] = [];
                }
                acc[item.date].push(item);
                return acc;
            }, {})
        );
        const result = grouped.sort((a, b) => {
            const dateA = new Date(a[0].date.split("-").reverse().join("-"));
            const dateB = new Date(b[0].date.split("-").reverse().join("-"));
            return dateB - dateA;
        });
        if(result.length > 5) {
            mainContentBody.addClass('main-content-body--padding')
        }
        result.forEach((e, i) => {
            const historyBlock = mainContentBody.createEl('div', {
                cls: 'history-block'
            })
            
            const dateBlock = historyBlock.createEl('div', {
                cls: 'full-data-block'
            })
            const dateSpan = dateBlock.createEl('span', {
                text: `${e[0].date}`
            })
            const matchSpan = dateBlock.createEl('span', {
                text: `- ${SummarizingDataForTheDayExpense(e)} + ${SummarizingDataForTheDayIncome(e)}`
            })
            const dataList = historyBlock.createEl('ul', {
                cls: 'data-list'
            })
            e.forEach((e, i) => {
                const dataItem = dataList.createEl('li', {
                    cls: 'data-item',
                    attr: {
                        'data-id': e.id
                    }
                })
                dataItem.onclick = async (e) => {
                    await editingHistory(e);
                };
                const itemCategory = dataItem.createEl('p', {
                    text: `${e.category.name}`
                })
                const itemBill = dataItem.createEl('span', {
                    text: e.bill.name
                })
                const itemAmount = dataItem.createEl('p', {
                    text: checkExpenceOrIncome(e.amount, e.type)
                })
            })
        })
    }

    const addHistoryButton = mainContentButton.createEl('button', {
        text: 'Add an expense or income',
        cls: 'add-button'
    })
    addHistoryButton.addEventListener('click', async () => {
        if (pluginInstance) {
            pluginInstance.addHistory();
        }
    })
}

async function showPlans(mainContentBody, mainContentButton) {
    openPageNow = 'Plans'
    const { jsonData: expenditurePlanInfo, status: expenditurePlanStatus } = await pluginInstance.getDataFile('Expenditure plan');
    if(expenditurePlanStatus !== 'success') {
        new Notice(expenditurePlanStatus)
        console.error(expenditurePlanStatus)
    }

    const { jsonData: incomePlanInfo, status: incomePlanStatus } = await pluginInstance.getDataFile('Income plan');
    if(incomePlanStatus !== 'success') {
        new Notice(incomePlanStatus)
        console.error(incomePlanStatus)
    }

    let allResult = [];
    if(expenditurePlanInfo === null && incomePlanInfo === null) {
        const undefinedContent = mainContentBody.createEl('div', {
            cls: 'undefined-content'
        })
        mainContentBody.addClass('main-content-body--undefined')

        const undefinedContentSmiles = undefinedContent.createEl('span', {
            text: '🍕 🎮 👕'
        })

        const undefinedContentText = undefinedContent.createEl('p', {
            text: 'Enter any income and expenses to see how much money is actually left.'
        })
    } else {
        if(expenditurePlanInfo !== null) {
            mainContentBody.removeClass('main-content-body--undefined')
            const resultExpense = expenditurePlanInfo.sort((a, b) => b.amount - a.amount)
            resultExpense.forEach(e => allResult.push(e))
            const expensePlanBlock = mainContentBody.createEl('div', {
                cls: 'plan-block'
            })
            const expenseDateBlock = expensePlanBlock.createEl('div', {
                cls: 'full-data-block'
            })
            const expenseDateSpan = expenseDateBlock.createEl('span', {
                text: 'Expense'
            })
            const expenseMatchSpan = expenseDateBlock.createEl('span', {
                text: SummarizingDataForTheDayExpense(resultExpense)
            })
            const expenseDataList = expensePlanBlock.createEl('ul', {
                cls: 'data-list'
            })
            resultExpense.forEach((e, i) => {
                const dataItem = expenseDataList.createEl('li', {
                    cls: 'data-item',
                    attr: {
                            'data-id': e.id,
                            'data-type': e.type
                        }
                })
                dataItem.onclick = async (e) => {
                    await editingPlan(e);
                };
                const itemCategory = dataItem.createEl('p', {
                    text: e.name
                })
                const itemAmount = dataItem.createEl('p', {
                    text: String(e.amount)
                })
            })
        }
        if(incomePlanInfo !== null) {
            mainContentBody.removeClass('main-content-body--undefined')
            const resultIncome = incomePlanInfo.sort((a, b) => b.amount - a.amount)
            resultIncome.forEach(e => allResult.push(e))
            const incomePlanBlock = mainContentBody.createEl('div', {
                cls: 'plan-block'
            })
            const incomeDateBlock = incomePlanBlock.createEl('div', {
                cls: 'full-data-block'
            })
            const incomeDateSpan = incomeDateBlock.createEl('span', {
                text: 'Income'
            })
            const incomeMatchSpan = incomeDateBlock.createEl('span', {
                text: SummarizingDataForTheDayIncome(resultIncome)
            })
            const incomeDataList = incomePlanBlock.createEl('ul', {
                cls: 'data-list'
            })
            resultIncome.forEach((e, i) => {
                const dataItem = incomeDataList.createEl('li', {
                    cls: 'data-item',
                    attr: {
                            'data-id': e.id,
                            'data-type': e.type
                        }
                })
                dataItem.onclick = async (e) => {
                    await editingPlan(e);
                };
                const itemCategory = dataItem.createEl('p', {
                    text: e.name
                })
                const itemAmount = dataItem.createEl('p', {
                    text: String(e.amount)
                })
            })
        }
    }

    if(allResult.length > 5) {
        mainContentBody.addClass('main-content-body--padding')
    }

    const addPlanButton = mainContentButton.createEl('button', {
        text: 'Create a category',
        cls: 'add-button'
    })
    addPlanButton.addEventListener('click', async () => {
        if (pluginInstance) {
            pluginInstance.addPlan();
        }
    })
}

async function showBills(mainContentBody, mainContentButton) {
    openPageNow = 'Bills'
    const { jsonData: billsInfo, status } = await pluginInstance.getDataArchiveFile('Archive bills');
    if(status !== 'success') {
        new Notice(status)
        console.error(status)
    }

    if(billsInfo === null) {
        const undefinedContent = mainContentBody.createEl('div', {
            cls: 'undefined-content'
        })
        mainContentBody.addClass('main-content-body--undefined')

        const undefinedContentSmiles = undefinedContent.createEl('span', {
            text: '🍕 🎮 👕'
        })

        const undefinedContentText = undefinedContent.createEl('p', {
            text: 'Enter any income and expenses to see how much money is actually left.'
        })
    } else {
        if(billsInfo.length > 5) {
            mainContentBody.addClass('main-content-body--padding')
        }
        if(billsInfo.filter(e => e.generalBalance).length >= 1) {
            mainContentBody.removeClass('main-content-body--undefined')
            const trueBillBlock = mainContentBody.createEl('div', {
                cls: 'bill-block'
            })
            const trueDateBlock = trueBillBlock.createEl('div', {
                cls: 'full-data-block'
            })
            const trueDateSpan = trueDateBlock.createEl('span', {
                text: 'Main'
            })
            const trueMatchSpan = trueDateBlock.createEl('span', {
                text: SummarizingDataForTheTrueBills(billsInfo)
            })
            const trueDataList = trueBillBlock.createEl('ul', {
                cls: 'data-list'
            })

            billsInfo.forEach((e, i) => {
                if(e.generalBalance) {
                    const dataItem = trueDataList.createEl('li', {
                        cls: 'data-item',
                        attr: {
                                'data-id': e.id
                            }
                    })
                    dataItem.onclick = async (e) => {
                        await editingBill(e);
                    }
                    const itemCategory = dataItem.createEl('p', {
                        text: e.name
                    })
                    const itemAmount = dataItem.createEl('p', {
                        text: String(e.balance)
                    })
                }
            })
        }
        
        if(billsInfo.filter(e => !e.generalBalance).length >= 1) {
            mainContentBody.removeClass('main-content-body--undefined')
            const falseBillBlock = mainContentBody.createEl('div', {
                cls: 'bill-block'
            })
            const falseDateBlock = falseBillBlock.createEl('div', {
                cls: 'full-data-block'
            })
            const falseDateSpan = falseDateBlock.createEl('span', {
                text: 'Additional'
            })
            const falseMatchSpan = falseDateBlock.createEl('span', {
                text: SummarizingDataForTheFalseBills(billsInfo)
            })
            const falseDataList = falseBillBlock.createEl('ul', {
                cls: 'data-list'
            })
            
            billsInfo.forEach((e, i) => {
                if(!e.generalBalance) {
                    const dataItem = falseDataList.createEl('li', {
                        cls: 'data-item',
                        attr: {
                                'data-id': e.id
                            }
                    })
                    dataItem.onclick = async (e) => {
                        await editingBill(e);
                    }
                    const itemCategory = dataItem.createEl('p', {
                        text: e.name
                    })
                    const itemAmount = dataItem.createEl('p', {
                        text: String(e.balance)
                    })
                }
            })
        }
    }

    const addBillButton = mainContentButton.createEl('button', {
        text: 'Add a bill',
        cls: 'add-button'
    })
    addBillButton.addEventListener('click', async () => {
        if (pluginInstance) {
            pluginInstance.addBills();
        }
    })
}

//====================================== Add Data ======================================

async function defAddHistory() {
    const { jsonData: resultBills, status: archiveStatus } = await pluginInstance.getDataArchiveFile('Archive bills')
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }
    if(resultBills === null) {
        return new Notice('Add bills')
    } 

    const { contentEl } = viewInstance;
    contentEl.empty()

    const header = contentEl.createEl('div', {
        cls: 'main-header'
    })
    const headerTitle = header.createEl('h1', {
        text: 'Operation'
    })

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

    const mainAddForm = contentEl.createEl('form', {
        cls: 'main-add-form',
        attr: {
            id: 'main-add-form'
        }
    })

    // Form radio
    let resultRadio;
    const expenseOrIncome = mainAddForm.createEl('div', {
        cls: 'main-form_radio'
    })
    
    const radioExpense = expenseOrIncome.createEl('button', {
        text: "Expense",
        cls: 'main-radio_exprense',
        attr: {
            'data-radio': 'expense',
            type: 'button'
        }
    })

    resultRadio = radioExpense.dataset.radio
    radioExpense.addClass('main-radion-button--active')
    
    const radioIncome = expenseOrIncome.createEl('button', {
        text: 'Income',
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
        createOptionCategory()
        inputSum.focus()
    })
    radioExpense.addEventListener('click', () => {
        radioIncome.removeClass('main-radion-button--active')
        radioExpense.addClass('main-radion-button--active')
        resultRadio = radioExpense.dataset.radio
        createOptionCategory()
        inputSum.focus()
    })
    
    // Form input
    const mainFormInput = mainAddForm.createEl('div', {
        cls: 'main-form-input'
    })
    const inputSum = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Sum',
            id: 'input-sum',
            type: 'number'
        }
    })
    inputSum.focus()
    
    const selectBills = mainFormInput.createEl('select', {
        cls: 'form-selects',
        attr: {
            name: 'select-bills',
            id: 'select-bills'
        }
    })
    resultBills.sort((a, b) => b.balance - a.balance)
    resultBills.forEach(bill => {
        selectBills.createEl('option', {
            text: `${bill.name} • ${bill.balance} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`,
            attr: { 
                value: bill.name,
                'data-bill-id': bill.id
            }
        })
    })
    
    const selectCategory = mainFormInput.createEl('select', {
        cls: 'form-selects',
        attr: {
            name: 'select-category',
            id: 'select-category'
        }
    })
    createOptionCategory()
    
    async function createOptionCategory() {
        if(resultRadio === 'expense'){
            selectCategory.empty()
            const { jsonData: resultExpenseCategory, status: expenseStatus } = await pluginInstance.getDataFile('Expenditure plan')
            if(!(expenseStatus === 'success')) {
                return expenseStatus
            }
            resultExpenseCategory.sort((a, b) => b.amount - a.amount)
            resultExpenseCategory.forEach(plan => {
                selectCategory.createEl('option', {
                    text: `${plan.name} • ${plan.amount} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`,
                    attr: { 
                        value: plan.name,
                        'data-plan-id': plan.id
                    }
                })
            })
        } else {
            selectCategory.empty()
            const { jsonData: resultIncomeCategory, status: incomeStatus } = await pluginInstance.getDataFile('Income plan')
            if(!(incomeStatus === 'success')) {
                return incomeStatus
            }
            resultIncomeCategory.sort((a, b) => b.amount - a.amount)
            resultIncomeCategory.forEach(plan => {
                selectCategory.createEl('option', {
                    text: `${plan.name} • ${plan.amount} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`,
                    attr: { 
                        value: plan.name,
                        'data-plan-id': plan.id
                    }
                })
            })
        }
    }

    const commentInput = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Note',
            id: 'input-comment',
            type: 'text'
        }
    })

    const selectDate = mainFormInput.createEl('select', {
        cls: 'form-selects',
        attr: {
            name: 'select-date',
            id: 'select-date'
        }
    })
    fillMonthDates(selectDate)

    const selectDateButtonDiv = mainFormInput.createEl('div', {
        cls: 'form-selects-date-buttons'
    })

    const selectDateToday = selectDateButtonDiv.createEl('button', {
        text: 'Today',
        attr: {
            type: 'button'
        }
    })
    // selectDateToday.addClass('button-selects-date--active')
    selectDateToday.addEventListener('click', () => {
        selectRelativeDate(selectDate, 0)
    })
    const selectDateYesterday = selectDateButtonDiv.createEl('button', {
        text: 'Yesterday',
        attr: {
            type: 'button'
        }
    })
    selectDateYesterday.addEventListener('click', () => {
        selectRelativeDate(selectDate, -1)
    })
    const selectDateTheDayBefotreYesterday = selectDateButtonDiv.createEl('button', {
        text: 'The day before yesterday',
        attr: {
            type: 'button'
        }
    })
    selectDateTheDayBefotreYesterday.addEventListener('click', () => {
        selectRelativeDate(selectDate, -2)
    })

    const addButton = mainFormInput.createEl('button', {
        text: 'Add',
        cls: 'add-button',
        attr: {
            type: 'submit'
        }
    })

    addButton.addEventListener('click', async (e) => {
        e.preventDefault();

        if(!inputSum.value >= 1) {
            inputSum.focus()
            return new Notice('Enter the amount')
        }

        const data = {
            amount: Number(inputSum.value),
            bill: {
                name: selectBills.value,
                id: selectBills.selectedOptions[0].dataset.billId
            },
            category: {
                name: selectCategory.value,
                id: selectCategory.selectedOptions[0].dataset.planId
            }, 
            comment: commentInput.value.trim(),
            date: selectDate.value,
            type: resultRadio,
        }
        const resultOfadd = await pluginInstance.addJsonToHistory(data)
        if(resultOfadd === "success") {
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('Operation added')
            }, 100)
        } else {
            new Notice(resultOfadd)
        }
    })
}

async function defAddPlan() {
    const { contentEl } = viewInstance;
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

    const header = contentEl.createEl('div', {
        cls: 'main-header'
    })
    const headerTitle = header.createEl('h1', {
        text: 'Categories'
    })

    const mainAddForm = contentEl.createEl('form', {
        cls: 'main-add-form',
        attr: {
            id: 'main-add-form'
        }
    })

    // Form radio
    let resultRadio;
    const expenseOrIncome = mainAddForm.createEl('div', {
        cls: 'main-form_radio'
    })
    
    const radioExpense = expenseOrIncome.createEl('button', {
        text: "Expense",
        cls: 'main-radio_exprense',
        attr: {
            'data-radio': 'expense',
            type: 'button'
        }
    })

    resultRadio = radioExpense.dataset.radio
    radioExpense.addClass('main-radion-button--active')
    
    const radioIncome = expenseOrIncome.createEl('button', {
        text: 'Income',
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
        inputName.focus()
    })
    radioExpense.addEventListener('click', () => {
        radioIncome.removeClass('main-radion-button--active')
        radioExpense.addClass('main-radion-button--active')
        resultRadio = radioExpense.dataset.radio
        inputName.focus()
    })
    
    // Form input
    const mainFormInput = mainAddForm.createEl('div', {
        cls: 'main-form-input'
    })
    const inputName = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Name',
            id: 'input-name',
            type: 'text'
        }
    })
    inputName.focus()

    const commentInput = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Note',
            id: 'input-comment',
            type: 'text'
        }
    })

    const addButton = mainFormInput.createEl('button', {
        text: 'Add',
        cls: 'add-button',
        attr: {
            type: 'submit'
        }
    })

    addButton.addEventListener('click', async (e) => {
        e.preventDefault();

        if(!inputName.value >= 1) {
            inputName.focus()
            return new Notice('Enter the name')
        }

        const data = {
            name: inputName.value.trim(),
            comment: commentInput.value.trim(),
            type: resultRadio,
        }
        const resultOfadd = await pluginInstance.addJsonToPlan(data)
        if(resultOfadd === "success") {
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('The plan has been added.')
            }, 100)
        } else {
            new Notice(resultOfadd)
        }
    })
}

async function defAddBills() {
    const { contentEl } = viewInstance;
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

    const header = contentEl.createEl('div', {
        cls: 'main-header'
    })
    const headerTitle = header.createEl('h1', {
        text: 'Categories'
    })

    const mainAddForm = contentEl.createEl('form', {
        cls: 'main-add-form',
        attr: {
            id: 'main-add-form'
        }
    })

    // Form input
    const mainFormInput = mainAddForm.createEl('div', {
        cls: 'main-form-input'
    })
    const inputName = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Name',
            id: 'input-name',
            type: 'text'
        }
    })
    inputName.focus()

    const currencyInput = mainFormInput.createEl('select', {
        cls: 'form-selects',
        attr: {
            name: 'select-currency',
            id: 'select-currency'
        }
    })

    const { popularCurrencies, allCurrencies } = getCurrencyGroups();

    // --- Popular ---
    const popularGroup = document.createElement("optgroup");
    popularGroup.label = "Popular";

    popularCurrencies.forEach(cur => {
        const option = document.createElement("option");
        option.value = cur.code;
        option.textContent = `${cur.code} • ${cur.name} • ${cur.symbol}`;
        popularGroup.appendChild(option);
    });

    // --- All ---
    const allGroup = document.createElement("optgroup");
    allGroup.label = "All currencies";

    allCurrencies.forEach(cur => {
        const option = document.createElement("option");
        option.value = cur.code;
        option.textContent = `${cur.code} ${cur.name} • ${cur.symbol}`;
        allGroup.appendChild(option);
    });

    currencyInput.appendChild(popularGroup);
    currencyInput.appendChild(allGroup);

    currencyInput.value = pluginInstance.settings.baseCurrency;

    const currentBalance = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Current balance',
            id: 'input-current-balance',
            type: 'number'
        }
    })

    const commentInput = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Note',
            id: 'input-comment',
            type: 'text'
        }
    })

    const chechboxDiv = mainFormInput.createEl('div', {
        cls: 'form-checkbox-div'
    })

    const checkboxInput = chechboxDiv.createEl('input', {
        cls: 'form-checkbox',
        attr: {
            id: 'input-checkbox',
            type: 'checkbox',
            checked: true
        }
    })

    const chechboxText = chechboxDiv.createEl('span', {
        text: 'Take into account in the general balance',
        cls: 'form-text',
    })

    const addButton = mainFormInput.createEl('button', {
        text: 'Add',
        cls: 'add-button',
        attr: {
            type: 'submit'
        }
    })

    addButton.addEventListener('click', async (e) => {
        e.preventDefault();

        if(!inputName.value >= 1) {
            inputName.focus()
            return new Notice('Enter the name')
        }

        const data = {
            name: inputName.value.trim(),
            balance: Number(currentBalance.value),
            currency: currencyInput.value,
            generalBalance: checkboxInput.checked,
            comment: commentInput.value.trim(),
        }
        const resultOfadd = await pluginInstance.addJsonToBills(data)
        if(resultOfadd === "success") {
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('The bill has been added.')
            }, 100)
        } else {
            new Notice(resultOfadd)
        }
    })
}

//====================================== Add JSON to file ======================================

async function defAddJsonToHistory(data) {
    if(data.amount === 0) {
        return 'You cannot add 0'
    }
    
    const resultCheckBill  = await pluginInstance.checkBill(data)
    if(data.type === 'expense') {
        if(!(resultCheckBill === 'success')) {
            return resultCheckBill
        }
    }

    const { jsonMatch, content, file, status } = await pluginInstance.getDataFile('History')
    if(!(status === 'success')) {
        return status
    }

    if(data.type === 'expense') {
        const result = await pluginInstance.expenditureTransaction(data, 'add')
        if(!(result === 'success')) {
            return result
        }
    } else if (data.type === 'income') {
        const result = await pluginInstance.incomeTransaction(data, 'add')
        if(!(result === 'success')) {
            return result
        }
    } else {
        return 'Error'
    }  
    try {
        if(jsonMatch[1].length >= 2) {
            const dataJson = {id: String(generateUUID()), ...data}
            const dataStr = JSON.stringify([dataJson], null, 4) + "]\n```";
            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await this.app.vault.modify(file, newContent);

            return "success"
        } else {            
            const dataJson = {id: String(generateUUID()), ...data}
            const dataStr = JSON.stringify([dataJson], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await this.app.vault.modify(file, newContent)

            return "success"
        }
    } catch (err) {
        return err
    }
}

async function defAddJsonToExpenditurePlan(data) {
    const { jsonMatch, content, file, status } = await pluginInstance.getDataFile('Expenditure plan')
    if(!(status === 'success')) {
        return status
    }
    try {
        if(jsonMatch[1].length >= 2) {
            const { name, comment, type } = data
            const dataJson = {id: String(generateUUID()), name, amount: 0, comment, type}
            const dataStr = JSON.stringify([dataJson], null, 4) + "]\n```";

            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await this.app.vault.modify(file, newContent);

            const resultArchive = await pluginInstance.archiveExpenditurePlan()
            if(!(resultArchive === 'success')) {
                return 'Error archiving expenditure plan'
            }

            return "success"
        } else {
            const { name, comment, type } = data
            const dataJson = {id: String(generateUUID()), name, amount: 0, comment, type}
            const dataStr = JSON.stringify([dataJson], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await this.app.vault.modify(file, newContent)
            
            const resultArchive = await pluginInstance.archiveExpenditurePlan()
            if(!(resultArchive === 'success')) {
                return 'Error archiving expenditure plan'
            }

            return "success"
        }
    } catch (err) {
        return err
    }
}

async function defAddJsonToIncomePlan(data) {
    const { jsonMatch, content, file, status } = await pluginInstance.getDataFile('Income plan')
    if(!(status === 'success')) {
        return status
    }
    try {
        if(jsonMatch[1].length >= 2) {
            const { name, comment, type } = data
            const dataJson = {id: String(generateUUID()), name, amount: 0, comment, type}
            const dataStr = JSON.stringify([dataJson], null, 4) + "]\n```";

            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await this.app.vault.modify(file, newContent);

            const resultArchive = await pluginInstance.archiveIncomePlan()
            if(!(resultArchive === 'success')) {
                return 'Error archiving income plan'
            }

            return "success"
        } else {
            const { name, comment, type } = data
            const dataJson = {id: String(generateUUID()), name, amount: 0, comment, type}
            const dataStr = JSON.stringify([dataJson], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await this.app.vault.modify(file, newContent)

            const resultArchive = await pluginInstance.archiveIncomePlan()
            if(!(resultArchive === 'success')) {
                return 'Error archiving income plan'
            }

            return "success"
        }
    } catch (err) {
        return err
    }
}

async function defAddJsonToBills(data) {    
    if(!data.balance) {
        data.balance = 0
    }

    const { name, balance, currency, generalBalance, comment } = data
    
    const { jsonMatch, content, file, status } = await pluginInstance.getDataArchiveFile('Archive bills')
    if(!(status === 'success')) {
        return status
    }
    try {
        if(jsonMatch[1].length >= 2) {
            const dataJson = {id: String(generateUUID()), name, balance, currency, generalBalance, comment}
            const dataStr = JSON.stringify([dataJson], null, 4) + "]\n```";

            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await this.app.vault.modify(file, newContent);
            
            return "success"
        } else {
            const dataJson = {id: String(generateUUID()), name, balance, currency, generalBalance, comment}
            const dataStr = JSON.stringify([dataJson], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await this.app.vault.modify(file, newContent)

            return "success"
        }
    } catch (err) {
        return err
    }
}

//====================================== Editing data ======================================

async function editingHistory(e) {
    const { id } = e.target.closest('li').dataset;
    if(!id) {
        return 'Element not found'
    }

    const { item, status} = await pluginInstance.searchElementById(id, 'History')
    if(!(status === 'success')) {
        return status
    }

    const { contentEl } = viewInstance;
    contentEl.empty()

    const header = contentEl.createEl('div', {
        cls: 'main-header'
    })
    const headerTitle = header.createEl('h1', {
        text: 'Операция'
    })

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

    const deleteButton = contentEl.createEl('div', {
        cls: 'delete-button',
        attr: {
            id: 'delete-button'
        }
    })
    setIcon(deleteButton, 'trash-2')
    deleteButton.addEventListener('click', async () => {
        const redultOfDelete = await deleteHistory(item);
        if(redultOfDelete === "success") {
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('The operation is remote.')
            }, 100)
        } else {
            new Notice(redultOfDelete)
        }
    })

    const mainAddForm = contentEl.createEl('form', {
        cls: 'main-add-form',
        attr: {
            id: 'main-add-form'
        }
    })

    // Form input
    const mainFormInput = mainAddForm.createEl('div', {
        cls: 'main-form-input'
    })
    const inputSum = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Sum',
            id: 'input-sum',
            type: 'number',
            value: item.amount,
        }
    })
    
    // inputSum.focus()
    const selectBills = mainFormInput.createEl('select', {
        cls: 'form-selects',
        attr: {
            name: 'select-bills',
            id: 'select-bills'
        }
    })
    
    const { jsonData: resultBills, status: archiveStatus } = await pluginInstance.getDataArchiveFile('Archive bills')
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }

    resultBills.sort((a, b) => b.balance - a.balance)
    resultBills.forEach(arr => {
        if(arr.id === item.bill.id && arr.name === item.bill.name) {
            selectBills.createEl('option', {
                text: `${arr.name} • ${arr.balance} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`,
                attr: { value: arr.name, 'data-bill-id': arr.id, selected: 'selected' }
            })
            return
        }
        selectBills.createEl('option', {
            text: `${arr.name} • ${arr.balance} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`,
            attr: { value: arr.name, 'data-bill-id': arr.id }
        })
    })
    
    const selectCategory = mainFormInput.createEl('select', {
        cls: 'form-selects',
        attr: {
            name: 'select-category',
            id: 'select-category'
        }
    })
    createOptionCategory()
    
    async function createOptionCategory() {
        if(item.type === 'expense'){
            selectCategory.empty()
            
            const { jsonData: resultCategory, status } = await pluginInstance.getDataFile('Expenditure plan');
            if(!(status === 'success')) {
                return status
            }

            resultCategory.sort((a, b) => b.amount - a.amount)
            resultCategory.forEach(arr => {
                if(arr.id === item.category.id && arr.name === item.category.name) {
                    selectCategory.createEl('option', {
                        text: `${arr.name} • ${arr.amount} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`,
                        attr: { value: arr.name, 'data-plan-id': arr.id, selected: 'selected' }
                    })
                    return
                }
                selectCategory.createEl('option', {
                    text: `${arr.name} • ${arr.amount} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`,
                    attr: { value: arr.name, 'data-plan-id': arr.id }
                })
            })
        } else if (item.type === 'income') {
            selectCategory.empty()
            const { jsonData: resultCategory, status } = await pluginInstance.getDataFile('Income plan');
            if(!(status === 'success')) {
                return status
            }

            resultCategory.sort((a, b) => b.amount - a.amount)
            resultCategory.forEach(plan => {
                if(plan.id === item.category.id && plan.name === item.category.name) {
                    selectCategory.createEl('option', {
                        text: `${plan.name} • ${plan.amount} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`,
                        attr: { value: plan.name, 'data-plan-id': plan.id, selected: 'selected' }
                    })
                    return
                }
                selectCategory.createEl('option', {
                    text: `${plan.name} • ${plan.amount} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`,
                    attr: { value: plan.name, 'data-plan-id': plan.id }
                })
            })
        } else {
            return 'Error category type'
        }
    }

    const commentInput = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Note',
            id: 'input-comment',
            type: 'text',
            value: item.comment,
        }
    })

    const selectDate = mainFormInput.createEl('select', {
        cls: 'form-selects',
        attr: {
            name: 'select-date',
            id: 'select-date'
        }
    })
    fillMonthDates(selectDate, item.date)

    const selectDateButtonDiv = mainFormInput.createEl('div', {
        cls: 'form-selects-date-buttons'
    })

    const selectDateToday = selectDateButtonDiv.createEl('button', {
        text: 'Today',
        attr: {
            type: 'button'
        }
    })
    // selectDateToday.addClass('button-selects-date--active')
    selectDateToday.addEventListener('click', () => {
        selectRelativeDate(selectDate, 0)
    })
    const selectDateYesterday = selectDateButtonDiv.createEl('button', {
        text: 'Yesterday',
        attr: {
            type: 'button'
        }
    })
    selectDateYesterday.addEventListener('click', () => {
        selectRelativeDate(selectDate, -1)
    })
    const selectDateTheDayBefotreYesterday = selectDateButtonDiv.createEl('button', {
        text: 'The day before yesterday',
        attr: {
            type: 'button'
        }
    })
    selectDateTheDayBefotreYesterday.addEventListener('click', () => {
        selectRelativeDate(selectDate, -2)
    })

    const addButton = mainFormInput.createEl('button', {
        text: 'Safe',
        cls: 'add-button',
        attr: {
            type: 'submit'
        }
    })

    addButton.addEventListener('click', async (e) => {
        e.preventDefault();

        if(!inputSum.value >= 1) {
            inputSum.focus()
            return new Notice('Enter the amount')
        }

        const data = {
            id: item.id,
            amount: Number(inputSum.value),
            bill: {
                name: selectBills.value,
                id: selectBills.selectedOptions[0].dataset.billId
            },
            category: {
                name: selectCategory.value,
                id: selectCategory.selectedOptions[0].dataset.planId
            },
            comment: commentInput.value,
            date: selectDate.value,
            type: item.type,
        }
        const resultOfEditing = await pluginInstance.editingJsonToHistory(data, item)
        if(resultOfEditing === "success") {
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('Operation changed')
            }, 100)
        } else {
            new Notice(resultOfEditing)
        }
    })
}

async function editingPlan(e) {
    const { id, type } = e.target.closest('li').dataset;
    if(!id) {
        return 'Element not found'
    }
    
    const { item, status } = await pluginInstance.searchElementById(id, type)
    if(!(status === 'success')) {
        return status
    }
    
    const { contentEl } = viewInstance;
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

    const deleteButton = contentEl.createEl('div', {
        cls: 'delete-button',
        attr: {
            id: 'delete-button'
        }
    })
    setIcon(deleteButton, 'trash-2')
    deleteButton.addEventListener('click', async () => {
        const redultOfDelete = await deletePlan(item);
        if(redultOfDelete === "success") {
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('The plan has been removed.')
            }, 100)
        } else {
            new Notice(redultOfDelete)
        }
    })

    const header = contentEl.createEl('div', {
        cls: 'main-header'
    })
    const headerTitle = header.createEl('h1', {
        text: 'Categories'
    })

    const mainAddForm = contentEl.createEl('form', {
        cls: 'main-add-form',
        attr: {
            id: 'main-add-form'
        }
    })
    
    // Form input
    const mainFormInput = mainAddForm.createEl('div', {
        cls: 'main-form-input'
    })
    const inputName = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Name',
            id: 'input-name',
            type: 'text',
            value: item.name,
        }
    })

    const commentInput = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Note',
            id: 'input-comment',
            type: 'text',
            value: item.comment,
        }
    })

    const addButton = mainFormInput.createEl('button', {
        text: 'Add',
        cls: 'add-button',
        attr: {
            type: 'submit'
        }
    })

    addButton.addEventListener('click', async (e) => {
        e.preventDefault();

        if(!inputName.value >= 1) {
            inputName.focus()
            return new Notice('Enter the name')
        }

        const data = {
            name: inputName.value,
            comment: commentInput.value,
            type: item.type,
        }
        const resultOfadd = await pluginInstance.editingJsonToPlan(data)
        if(resultOfadd === "success") {
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('The plan has been added.')
            }, 100)
        } else {
            new Notice(resultOfadd)
        }
    })

    let { jsonData: historyInfo } = await pluginInstance.getDataFile('History');
    if(historyInfo !== null) {
        const filterHistoryInfo = historyInfo.filter(item => item.category.id === id)
        if(filterHistoryInfo.length < 1) {
            return
        }
        const grouped = Object.values(
            filterHistoryInfo.reduce((acc, item) => {
                if (!acc[item.date]) {
                    acc[item.date] = [];
                }
                acc[item.date].push(item);
                return acc;
            }, {})
        );
        const result = grouped.sort((a, b) => {
            const dateA = new Date(a[0].date.split("-").reverse().join("-"));
            const dateB = new Date(b[0].date.split("-").reverse().join("-"));
            return dateB - dateA;
        });

        const historyPlanTitle = contentEl.createEl('h1', {
            text: 'History of the plan'
        })

        const historyPlan = contentEl.createEl('div', {
            cls: 'history-plan'
        })

        result.forEach((e, i) => {
            const historyBlock = historyPlan.createEl('div', {
                cls: 'history-block'
            })
            
            const dateBlock = historyBlock.createEl('div', {
                cls: 'full-data-block'
            })
            const dateSpan = dateBlock.createEl('span', {
                text: `${e[0].date}`
            })
            const matchSpan = dateBlock.createEl('span', {
                text: `- ${SummarizingDataForTheDayExpense(e)} + ${SummarizingDataForTheDayIncome(e)}`
            })
            const dataList = historyBlock.createEl('ul', {
                cls: 'data-list'
            })
            e.forEach((e, i) => {
                const dataItem = dataList.createEl('li', {
                    cls: 'data-item',
                    attr: {
                        'data-id': e.id,
                        'data-amount': e.amount,
                        'data-bill': e.bill.name,
                        'data-category': e.category.name,
                        'data-type': e.type,
                        'data-comment': e.comment,
                        'data-date': e.date,
                    }
                })
                dataItem.onclick = async (e) => {
                    await editingHistory(e);
                };
                const itemCategory = dataItem.createEl('p', {
                    text: `${e.category.name}`
                })
                const itemBill = dataItem.createEl('span', {
                    text: e.bill.name
                })
                const itemAmount = dataItem.createEl('p', {
                    text: checkExpenceOrIncome(e.amount, e.type)
                })
            })
        })
    }
}

async function editingBill(e) {
    const { id } = e.target.closest('li').dataset;
    if(!id) {
        return 'Element not found'
    }

    const { item, status } = await pluginInstance.searchElementById(id, 'Archive bills')
    if(!status) {
        return status
    }

    const { contentEl } = viewInstance
    contentEl.empty()

    const exitButton = contentEl.createEl('div', {
        cls: 'exit-button',
        attr: {
            id: 'exit-button'
        }
    });
    setIcon(exitButton, 'arrow-left')
    exitButton.addEventListener('click', () => {
        viewInstance.onOpen()
    })

    const deleteButton = contentEl.createEl('div', {
        cls: 'delete-button',
        attr: {
            id: 'delete-button'
        }
    })
    setIcon(deleteButton, 'trash-2')
    deleteButton.addEventListener('click', async () => {
        const redultOfDelete = await deleteBill(item);
        if(redultOfDelete === "success") {
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('The bill has been removed.')
            }, 100)
        } else {
            new Notice(redultOfDelete)
        }
    })

    const header = contentEl.createEl('div', {
        cls: 'main-header'
    })
    const headerTitle = header.createEl('h1', {
        text: 'Categories'
    })
    const mainAddForm = contentEl.createEl('form', {
        cls: 'main-add-form',
        attr: {
            id: 'main-add-form'
        }
    })

    // Form input
    const mainFormInput = mainAddForm.createEl('div', {
        cls: 'main-form-input'
    })
    const inputName = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Name',
            id: 'input-name',
            type: 'text',
            value: item.name,
        }
    })

    const currentBalance = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Current balance',
            id: 'input-current-balance',
            type: 'number',
            value: item.balance,
        }
    })

    const commentInput = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Note',
            id: 'input-comment',
            type: 'text',
            value: item.comment,
        }
    })

    const chechboxDiv = mainFormInput.createEl('div', {
        cls: 'form-checkbox-div'
    })

    const checkboxInput = chechboxDiv.createEl('input', {
        cls: 'form-checkbox',
        attr: {
            id: 'input-checkbox',
            type: 'checkbox',
            checked: item.generalbalance
        }
    })
    const chechboxText = chechboxDiv.createEl('span', {
        text: 'Take into account in the general balance',
        cls: 'form-text',
    })

    const addButton = mainFormInput.createEl('button', {
        text: 'Добавить',
        cls: 'add-button',
        attr: {
            type: 'submit'
        }
    })
    addButton.addEventListener('click', async () => {
        e.preventDefault();

        if(!inputName.value >= 1) {
            inputName.focus()
            return new Notice('Enter the name')
        }
        const data = {
            id: item.id,
            name: inputName.value,
            balance: currentBalance.value,
            generalBalance: checkboxInput.checked,
            comment: commentInput.value,
        }
        const resultOfadd = await pluginInstance.editingJsonToBill(data)
        if(resultOfadd === "success") {
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('The bill has been added.')
            }, 100)
        } else {
            new Notice(resultOfadd)
        }
    })
}

//====================================== Editing data to file ======================================

async function defEditingJsonToHistory(data, oldData) {
    if(data.amount === 0) {
        return 'Cannot be corrected to 0'
    }

    const { jsonData, content, file, status } = await pluginInstance.getDataFile('History')
    if(!(status === 'success')) {
        return status
    }

    if(data.type === 'expense') {
        const resultCheckBill  = await pluginInstance.checkBill(data, oldData)
        if(!(resultCheckBill === 'success')) {
            return resultCheckBill
        }
    }

    if(data.type === 'expense') {
        const result = await pluginInstance.expenditureTransaction(data, 'edit', oldData)
        if(result !== 'success') {
            return result
        }
    } else if (data.type === 'income') {
        const result = await pluginInstance.incomeTransaction(data, 'edit', oldData)
        if(result !== 'success') {
            return result
        }
    } else {
        return 'Error'
    }
    try {
        const newData = jsonData.map(item => item.id === data.id ? {...item, ...data} : item)
        const dataStr = JSON.stringify(newData, null, 4) + "\n```";
        const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr);
        await this.app.vault.modify(file, newContent)

        return "success"
    } catch (err) {
        return err
    }
}

async function defEditingJsonToPlan(data) {
    pluginInstance.changeAllRelatedFiles(data, 'plan')
}

async function defEditingJsonToBill(data) {
    console.log(data)
}

//====================================== Delete data ======================================

async function deleteHistory(element) {
    if(!element) {
        return 'Element not found'
    }

    const { jsonData: data, content, file, status } = await pluginInstance.getDataFile('History')
    if(status !== 'success') {
        return status
    }

    if(element.type === 'expense') {
        const result = await pluginInstance.expenditureTransaction(element, 'remove')
        if(result !== 'success') {
            return result
        }
    } else if (element.type === 'income') {
        const result = await pluginInstance.incomeTransaction(element, 'remove')
        if(result !== 'success') {
            return result
        }
    } else {
        return 'Error'
    }

    if(data.length <= 1) {
        try {
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n```");
            await this.app.vault.modify(file, newContent);        
            
            return "success"
        } catch (error) {
            return (`Error deleting item: ${error}`)
        }
    } else {
        try {
            const newData = data.filter(item => item.id !== element.id);
            const dataStr = JSON.stringify(newData, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await this.app.vault.modify(file, newContent);
        
            return "success"
        } catch (error) {
            return (`Error deleting item: ${error}`)
        }
    }
}

async function deletePlan(item) {
    const { id, type } = item;
    if(!id) {
        return 'Element not found'
    }

    let modifier;

    if(type === 'expense') {
        modifier = 'Expenditure plan'
    } else if (type === 'income') {
        modifier = 'Income plan'
    } else {
        return 'Error'
    }
    
    const { jsonData: data, content, file, status } = await pluginInstance.getDataFile(modifier)
    if(status !== 'success') {
        return status
    }
    if(data.length <= 1) {
        try {
            if(await pluginInstance.checkForDeletionData(id, 'plan')) {
                return 'The category cannot be deleted because it is used in history.'
            }
            
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n```");
            await this.app.vault.modify(file, newContent);
            if(type === 'expense') {
                const resultArchive = await pluginInstance.archiveExpenditurePlan()
                if(!(resultArchive === 'success')) {
                    return 'Error archiving expense plan'
                }
            } else if (type === 'income') {
                const resultArchive = await pluginInstance.archiveIncomePlan()
                if(!(resultArchive === 'success')) {
                    return 'Error archiving income plan'
                }
            } else {
                return 'Error'
            }
            
            return "success"
        } catch (error) {
            return (`Error deleting item: ${error}`)
        }
    } else {
        try {
            if(await pluginInstance.checkForDeletionData(id, 'plan')) {
                return 'The category cannot be deleted because it is used in history.'
            }
            
            const newData = data.filter(item => item.id !== id);
            const dataStr = JSON.stringify(newData, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await this.app.vault.modify(file, newContent);
            if(type === 'expense') {
                pluginInstance.archiveExpenditurePlan()
            } else if (type === 'income') {
                pluginInstance.archiveIncomePlan()
            } else {
                return 'Error'
            }
            
            return "success"
    
        } catch (error) {
            return (`Error deleting item: ${error}`)
        }
    }
}

async function deleteBill(item) {
    const { id } = item;
    if(!id) {
        return 'Element not found'
    }

    const { jsonData: data, content, file, status: archiveStatus } = await pluginInstance.getDataArchiveFile('Archive bills')
    if(archiveStatus !== 'success') {
        return archiveStatus
    }

    if(data.length <= 1) {
        try {
            if(await pluginInstance.checkForDeletionData(id, 'bill')) {
                return 'The bill cannot be deleted because it is in use in history.'
            }
            
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n```");
            await this.app.vault.modify(file, newContent);

            return "success"
        } catch (error) {
            return (`Error deleting item: ${error}`)
        }
    } else {
        try {
            if(await pluginInstance.checkForDeletionData(id, 'bill')) {
                return 'The bill cannot be deleted because it is in use in history.'
            }

            const newData = data.filter(item => item.id !== id);
            const dataStr = JSON.stringify(newData, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await this.app.vault.modify(file, newContent);
        
            return "success"
        } catch (error) {
            return (`Error deleting item: ${error}`)
        }
    }
}

//====================================== Duplicating data to archive ======================================

async function defArchiveExpenditurePlan() {
    const { file, jsonMatch, content, status } = await pluginInstance.getDataFile('Expenditure plan')
    if(!(status === 'success')) {
        return status
    }
    const { file: archiveFile, status: archiveStatus } = await pluginInstance.getDataArchiveFile('Archive expenditure plan')
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }

    if(jsonMatch[1].length <= 1) {
        try {
            const content = await app.vault.read(file);
            await this.app.vault.modify(archiveFile, content);

            return 'success'
        } catch (error) {
            return error
        }
    } else {
        try {
            const jsonData = JSON.parse(jsonMatch[1].trim())
            const data = jsonData.map(({ amount, ...rest }) => rest)
            const dataStr = JSON.stringify(data, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await this.app.vault.modify(archiveFile, newContent);

            return 'success'
        } catch (error) {
            return error
        }
    }
}

async function defArchiveIncomePlan() {
    const { file, jsonMatch, content, status } = await pluginInstance.getDataFile('Income plan')
    if(!(status === 'success')) {
        return status
    }
    const { file: archiveFile, status: archiveStatus } = await pluginInstance.getDataArchiveFile('Archive income plan')
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }

    if(jsonMatch[1].length <= 1) {
        try {
            const content = await app.vault.read(file);
            await this.app.vault.modify(archiveFile, content);

            return 'success'
        } catch (error) {
            return error
        }
    } else {
        try {
            const jsonData = JSON.parse(jsonMatch[1].trim())
            const data = jsonData.map(({ amount, ...rest }) => rest)
            const dataStr = JSON.stringify(data, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await this.app.vault.modify(archiveFile, newContent);

            return 'success'
        } catch (error) {
            return error
        }
    }
}

//====================================== Middleware Function ======================================

async function defExpenditureTransaction(data, modifier, oldData) {
    let billName;
    let billBalace;

    let planName;
    let planAmount;

    const { jsonData: billsJsonData, status: archiveStatus } = await pluginInstance.getDataArchiveFile("Archive bills")
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }
    billsJsonData.forEach((e, i) => {
        if(e.name === data.bill.name && e.id === data.bill.id) {
            billBalace = billsJsonData[i].balance;
            billName = billsJsonData[i].name
        }
    })

    const { jsonData: planJsonData, status } = await pluginInstance.getDataFile("Expenditure plan")
    if(!(status === 'success')) {
        return status
    }
    planJsonData.forEach((e, i) => {
        if(e.name === data.category.name && e.id === data.category.id) {
            planAmount = planJsonData[i].amount
            planName = planJsonData[i].name
        }
    })

    if(modifier === 'add') {
        try {        
            billBalace -= Number(data.amount)
            planAmount += Number(data.amount)
        
            const resultBills = await pluginInstance.updateData('Archive bills', billName, 'balance', billBalace)
            const resultPlan = await pluginInstance.updateData('Expenditure plan', planName, 'amount', planAmount)
            if(!(resultBills === 'success') || !(resultPlan === 'success')) {
                return 'Error update data'
            }

            return 'success'
        } catch (error) {
            return error
        }
    } else if (modifier === 'remove') {
        try {
            billBalace += Number(data.amount)
            planAmount -= Number(data.amount)

            const resultBills = await pluginInstance.updateData('Archive bills', billName, 'balance', billBalace)
            const resultPlan = await pluginInstance.updateData('Expenditure plan', planName, 'amount', planAmount)
            if(!(resultBills === 'success') || !(resultPlan === 'success')) {
                return 'Error update data'
            }

            return 'success'
        } catch (error) {
            return error
        }
    } else if (modifier === 'edit') {
        try {
            billBalace += Number(oldData.amount)
            planAmount -= Number(oldData.amount)
            
            const resultBillsReset = await pluginInstance.updateData('Archive bills', billName, 'balance', billBalace)
            const resultPlanReset = await pluginInstance.updateData('Expenditure plan', planName, 'amount', planAmount)
            if(!(resultBillsReset === 'success') || !(resultPlanReset === 'success')) {
                return 'Error update data'
            }
            
            billBalace -= Number(data.amount)
            planAmount += Number(data.amount)

            const resultBills = await pluginInstance.updateData('Archive bills', billName, 'balance', billBalace)
            const resultPlan = await pluginInstance.updateData('Expenditure plan', planName, 'amount', planAmount)
            if(!(resultBills === 'success') || !(resultPlan === 'success')) {
                return 'Error update data'
            }

            return 'success'
        } catch (error) {
            return error
        }
    } else {
        return 'Error modifier'
    }
}

async function defIncomeTransaction(data, modifier, oldData) {
    let billName;
    let billBalace;

    let planName;
    let planAmount;

    const { jsonData: billsJsonData, status: archiveStatus } = await pluginInstance.getDataArchiveFile("Archive bills")
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }

    billsJsonData.forEach((e, i) => {
        if(e.name === data.bill.name && e.id === data.bill.id) {
            billBalace = billsJsonData[i].balance;
            billName = billsJsonData[i].name
        }
    })

    const { jsonData: planJsonData, status } = await pluginInstance.getDataFile("Income plan")
    if(!(status === 'success')) {
        return status
    }
    planJsonData.forEach((e, i) => {
        if(e.name === data.category.name && e.id === data.category.id) {
            planAmount = planJsonData[i].amount
            planName = planJsonData[i].name
        }
    })
    if(modifier === 'add') {
        try {
            billBalace += Number(data.amount)
            planAmount += Number(data.amount)
        
            const resultBills = await pluginInstance.updateData('Archive bills', billName, 'balance', billBalace)
            const resultPlan = await pluginInstance.updateData('Income plan', planName, 'amount', planAmount)
            if(!(resultBills === 'success') || !(resultPlan === 'success')) {
                return 'Error update data'
            }

            return 'success'
        } catch (error) {
            return error
        }
    } else if (modifier === 'remove') {
        try {
            billBalace -= data.amount
            planAmount -= data.amount

            if(billBalace < 0) {
                return `On bill ${billName} insufficient funds`
            }
        
            const resultBills = await pluginInstance.updateData('Archive bills', billName, 'balance', billBalace)
            const resultPlan = await pluginInstance.updateData('Income plan', planName, 'amount', planAmount)
            if(!(resultBills === 'success') || !(resultPlan === 'success')) {
                return 'Error update data'
            }

            return 'success'
        } catch (error) {
            return error
        }
    } else if (modifier === 'edit') {
        try {
            billBalace -= Number(oldData.amount)
            planAmount -= Number(oldData.amount)
            
            const resultBillsReset = await pluginInstance.updateData('Archive bills', billName, 'balance', billBalace)
            const resultPlanReset = await pluginInstance.updateData('Income plan', planName, 'amount', planAmount)
            if(!(resultBillsReset === 'success') || !(resultPlanReset === 'success')) {
                return 'Error update data'
            }
            
            billBalace += Number(data.amount)
            planAmount += Number(data.amount)

            const resultBills = await pluginInstance.updateData('Archive bills', billName, 'balance', billBalace)
            const resultPlan = await pluginInstance.updateData('Income plan', planName, 'amount', planAmount)
            if(!(resultBills === 'success') || !(resultPlan === 'success')) {
                return 'Error update data'
            }

            return 'success'
        } catch (error) {
            return error
        }
    } else {
        return 'Error modifier'
    }
}

async function defUpdateData(fileName, accountName, targetE, newTargetE) {
    if(fileName === 'Archive bills') {
        const { jsonData: data, content, file, status: archiveStatus } = await pluginInstance.getDataArchiveFile(fileName)
        if(!(archiveStatus === 'success')) {
            return archiveStatus
        }

        try {
            const target = data.find(acc => acc.name === accountName);
            if (target) {
                target[targetE] = newTargetE;
            } else {
                console.warn("Account not found:", accountName);
            }
            const dataStr = JSON.stringify(data, null, 4);
            const newData = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");

            await app.vault.modify(file, newData); 

            return 'success'
        } catch (error) {
            return error
        }
    } else {
        const { jsonData: data, content, file, status } = await pluginInstance.getDataFile(fileName)
        if(!(status === 'success')) {
            return status
        }

        try {
            const target = data.find(acc => acc.name === accountName);
            if (target) {
                target[targetE] = newTargetE;
            } else {
                console.warn("Account not found:", accountName);
            }
            const dataStr = JSON.stringify(data, null, 4);
            const newData = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");

            await app.vault.modify(file, newData); 

            return 'success'
        } catch (error) {
            return error
        }
    }
}

async function defCheckBill(data, oldData) {
    const { jsonData } = await pluginInstance.getDataArchiveFile("Archive bills")

    let result;

    if(oldData) {
        jsonData.forEach((e, i) => {
            if(e.name === data.bill.name && e.id === data.bill.id) {
                const oldBalance = jsonData[i].balance + oldData.amount
                if(data.amount > oldBalance) {
                    result = `On bill ${jsonData[i].name} insufficient funds`
                } else {
                    result = "success"
                }
            } else {
                result = `Bill ${data.bill} not found`
            }
        })
    } else {
        jsonData.forEach((e, i) => {
            if(e.name === data.bill.name && e.id === data.bill.id) {
                if(data.amount > jsonData[i].balance) {
                    result = `On bill ${jsonData[i].name} insufficient funds`
                } else {
                    result = "success"
                }
            } else {
                result = `Bill ${data.bill} not found`
            }
        })
    }

    return result
}

async function defGetDataFile(fileName) {
    await pluginInstance.createDirectory()

    if(selectedYear === null || selectedMonth === null) {
        const { year, month } = getDate()
        const filePath = `${pluginInstance.settings.targetFolder}/${year}/${month}/${fileName}.md`
        const file = app.vault.getAbstractFileByPath(filePath);
        if(!file) {
            return { status: `File not found: ${filePath}` }
        }
        const content = await app.vault.read(file);
        if(!content) {
            return { status: `File is empty: ${filePath}` }
        }
        const jsonMatch = content.match(/```json([\s\S]*?)```/);
        let jsonData;
        if(jsonMatch[1].length > 3) {
            jsonData = JSON.parse(jsonMatch[1].trim());
        } else {
            jsonData = null;
        }
        const dataFile = { jsonMatch, content, file, jsonData, status: 'success' }
        return dataFile
    } else {
        const filePath = `${pluginInstance.settings.targetFolder}/${selectedYear}/${months[selectedMonth - 1]}/${fileName}.md`
        const file = app.vault.getAbstractFileByPath(filePath);
        if(!file) {
            return { status: `File not found: ${filePath}` }
        }
        const content = await app.vault.read(file);
        if(!content) {
            return { status: `File is empty: ${filePath}` }
        }
        const jsonMatch = content.match(/```json([\s\S]*?)```/);
        let jsonData;
        if(jsonMatch[1].length > 3) {
            jsonData = JSON.parse(jsonMatch[1].trim());
        } else {
            jsonData = null;
        }
        const dataFile = { jsonMatch, content, file, jsonData, status: 'success' }
        return dataFile
    }
}

async function defGetDataArchiveFile(fileName) {
    const filePath = `${pluginInstance.settings.targetFolder}/Archive/${fileName}.md`
    const file = app.vault.getAbstractFileByPath(filePath);
    if(!file) {
        return { status: `File not found: ${filePath}` }
    }
    const content = await app.vault.read(file);
    if(!content) {
        return { status: `File is empty: ${filePath}` }
    }
    const jsonMatch = content.match(/```json([\s\S]*?)```/);
    let jsonData;
    if(jsonMatch[1].length > 3) {
        jsonData = JSON.parse(jsonMatch[1].trim());
    } else {
        jsonData = null;
    }
    const dataFile = { jsonMatch, content, file, jsonData, status: 'success' }
    return dataFile
}

async function defCheckForDeletionData(id, modifier) {
    const financeFolder = app.vault.getAbstractFileByPath(pluginInstance.settings.targetFolder);
    let allFiles = [];

    let yearFolders = [];
    for (const child of financeFolder.children) {
        yearFolders.push(child);
    }
    yearFolders.pop(); // Remove "Archive" folder

    let monthFolders = [];
    for (let i = 0; i < yearFolders.length; i++) {
        for (const child of yearFolders[i].children) {
            monthFolders.push(child);
        }
    }

    for (let i = 0; i < monthFolders.length; i++) {
        for (const child of monthFolders[i].children) {
            allFiles.push(child);
        }
    }

    const historyFiles = allFiles.filter(f => f.name === "History.md");

    for (const file of historyFiles) {
        try {
            const content = await app.vault.read(file);
            const jsonMatch = content.match(/```json([\s\S]*?)```/);
            if (jsonMatch[1].length <= 2) {
                return false;
            }
            const jsonData = JSON.parse(jsonMatch[1].trim());
            if (Array.isArray(jsonData)) {
                let found;
                if(modifier === 'plan') {
                    found = jsonData.some(item => item.category.id === id);
                } else if (modifier === 'bill') {
                    found = jsonData.some(item => item.bill.id === id);
                }
                return found
            }
        } catch (e) {
            console.error("Error reading/parsing file:", file.path, e);
        }
    }

    return false;
}

async function defChangeAllRelatedFiles(data, modifier) {
    const { name: categoryToFind } = data
    
    const financeFolder = app.vault.getAbstractFileByPath(pluginInstance.settings.targetFolder);
    let allFiles = [];

    let yearFolders = [];
    for (const child of financeFolder.children) {
        yearFolders.push(child);
    }
    yearFolders.pop(); // Remove "Archive" folder

    let monthFolders = [];
    for (let i = 0; i < yearFolders.length; i++) {
        for (const child of yearFolders[i].children) {
            monthFolders.push(child);
        }
    }

    for (let i = 0; i < monthFolders.length; i++) {
        for (const child of monthFolders[i].children) {
            allFiles.push(child);
        }
    }

    const historyFiles = allFiles.filter(f => f.name === "History.md");
    const expenditurePlanFiles = allFiles.filter(f => f.name === "Expenditure plan.md");
    const incomePlanFiles = allFiles.filter(f => f.name === "Income plan.md");

    const filesToCheck = modifier === 'plan' ? [...historyFiles, ...expenditurePlanFiles, ...incomePlanFiles] : historyFiles;
    filesToCheck.forEach(async (file) => {
        try {
            const content = await app.vault.read(file);
            const jsonMatch = content.match(/```json([\s\S]*?)```/);
            if (jsonMatch[1].length <= 2) {
                return;
            }
            const jsonData = JSON.parse(jsonMatch[1].trim());
            const newData = jsonData.map(item => item.name === categoryToFind ? {...item, ...data} : item)
            console.log(newData);
            // const dataStr = JSON.stringify(newData, null, 4) + "\n```";
            // const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr);
        } catch (e) {
            console.error("Error reading/parsing file:", file.path, e);
        }
    })
}

async function defSearchElementById(id, modifier) {
    if(modifier === 'History' || modifier === 'expense' || modifier === 'income') {
        const { jsonData, status } = await pluginInstance.getDataFile(modifier === 'History' ? 'History' : modifier === 'expense' ? 'Expenditure plan' : modifier === 'income' ? 'Income plan' : 'Error')
        if(!(status === 'success')) {
            return status
        }
        
        try {
            const foundItem = jsonData.find(item => item.id === id);
            if (foundItem) {
                return { status: 'success', item: foundItem }
            } else {
                return { status: 'Item not found' }
            }
        } catch (err) {
            return { status: err }
        } 
    } else if (modifier === 'Archive bills') {
        const { jsonData, status } = await pluginInstance.getDataArchiveFile(modifier)
        if(!(status === 'success')) {
            return status
        }
        
        try {
            const foundItem = jsonData.find(item => item.id === id);
            if (foundItem) {
                return { status: 'success', item: foundItem }
            } else {
                return { status: 'Item not found' }
            }
        } catch (err) {
            return { status: err }
        } 
    } else {
        return 'Element not found'
    }
}

//====================================== Other Function ======================================

function generateUUID() {
    return crypto.randomUUID()
}

function getDate() {
    moment.locale('en');
    const now = moment();
    const year = now.format('YYYY');
    const month = now.format('MMMM');
    return { now, year, month }
}

function fillMonthDates(selectEl, oldDate) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    for (let d = daysInMonth; d >= 1; d--) {
        const date = new Date(year, month, d);

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

        const value = `${String(d).padStart(2, "0")}-${String(month + 1).padStart(2, "0")}-${year}`;
        const option = selectEl.createEl("option", {
            text: label,
            attr: { value }
        });

        if (value === oldDate) option.selected = true;
        else if (diff === -1) option.selected = true;
    }
}

function selectRelativeDate(selectEl, offset) {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const targetValue = `${String(target.getDate()).padStart(2, "0")}-${String(target.getMonth() + 1).padStart(2, "0")}-${target.getFullYear()}`;
    const option = Array.from(selectEl.options).find(opt => opt.value === targetValue);
    if (option) {
        selectEl.value = targetValue;
    }
}

function checkExpenceOrIncome(amount, type) {
    if(type === 'expense') {
        return `- ${amount}`
    } else if(type === 'income') {
        return `+ ${amount}`
    } else {
        return "Error"
    }
}

function SummarizingDataForTheDayExpense(obj) {
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
function SummarizingDataForTheDayIncome(obj) {
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
function SummarizingDataForTheTrueBills(obj) {
    if(!obj) {
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
function SummarizingDataForTheFalseBills(obj) {
    let balance = 0;
    obj.forEach((e, i) => {
        if(!e.generalBalance) {
            balance += Number(e.balance)
        }
    })
    return balance
}
function divideByRemainingDays(amount) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const currentDay = today.getDate();
    const remainingDays = daysInMonth - currentDay + 1;

    return Math.trunc(amount / remainingDays);
}
function switchBalanceLine(billsInfo, expenditurePlanInfo) {
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
function getAllCurrencies() {
    return Object.entries(pluginInstance.currenciesData).map(([code, info]) => ({
        code,
        name: info.name || code,
        symbol: info.symbol || info.symbolNative
    }));
}
function getCurrencyGroups() {
	const all = getAllCurrencies();

	const popularCurrencies = all.filter(cur => popularCodes.includes(cur.code));
	const otherCurrencies = all.filter(cur => !popularCodes.includes(cur.code));

	return { popularCurrencies, allCurrencies: otherCurrencies };
}
function getCurrencySymbol(code) {
    const currency = pluginInstance.currenciesData[code];
    return currency ? (currency.symbol || currency.symbolNative || code) : code;
}