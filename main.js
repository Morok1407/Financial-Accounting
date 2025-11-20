// @ts-ignore
const { Plugin, ItemView, Notice, setIcon, Platform, PluginSettingTab, TFolder, Setting } = require("obsidian");

const FINANCIAL_ACCOUNTING_VIEW = "financial-accounting-view";
let pluginInstance;
let viewInstance;

let selectedYear = null;
let selectedMonth = null;

let openPageNow;
let resultCreatDirectory = false;
let resultCreatOtherDirectory = false;

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

    async getSpecificFile(fileName, year, month) {
        return defGetSpecificFile(fileName, year, month, this)
    }

    async searchHistory(inputValue) {
        return defSearchHistory(inputValue, this)
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

    // Transfer between bills
    async transferBetweenBills(billId) {
        return defTransferBetweenBills(billId, this)
    }

    async transferJsonToBills(data) {
        return defTransferJsonToBills(data, this)
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

    async checkingExpensePlanForCompliance() {
        return defCheckingExpensePlanForCompliance(this)
    }

    async checkingIncomePlanForCompliance() {
        return defCheckingIncomePlanForCompliance(this)
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

    async updateFile(newData, file, content) {
        return defUpdateFile(newData, file, content, this)
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
        if(selectedMonth === null && selectedYear === null) {
            awaitCreatDirectory()
        } else {
            showAnotherInitialView()
        }
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
        this.defaultTag = 'Finances';
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

        new Setting(containerEl)
        .setName("Default tag for Obsidian")
        .setDesc("Enter one word to use as a tag (no spaces).")
        .addText(text => {
            text
                .setPlaceholder("For example: Finances")
                .setValue(this.plugin.settings.defaultTag || "");

            text.inputEl.addEventListener("keydown", async (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    text.inputEl.blur();
                }
            });

            text.inputEl.addEventListener("blur", async () => {
                let value = text.getValue().trim();

                if (/\s/.test(value)) {
                    new Notice("Error: Tag must not contain spaces.");
                    return;
                }

                if (!/^[\w\-а-яА-ЯёЁ]+$/.test(value)) {
                    new Notice("The tag can only contain letters, numbers, underscores and hyphens.");
                    return;
                }

                this.plugin.settings.defaultTag = value;
                await this.plugin.saveSettings();
                new Notice(`The tag "${value}" has been saved.`);
            });
        });
    }
}

//====================================== Create directory ======================================

async function defCreateDirectory() {
    resultCreatDirectory = false;
    const { now, year, month } = getDate()

    const fileContent = `---\ntags:\n  - ${pluginInstance.settings.defaultTag}\n---\n\`\`\`json\n\`\`\``;
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
        await this.app.vault.create(archiveExpenditurePlan, fileContent);
        await pluginInstance.archiveExpenditurePlan()
    }

    if (!await this.app.vault.adapter.exists(archiveIncomePlan)) {
        await this.app.vault.create(archiveIncomePlan, fileContent);
        await pluginInstance.archiveIncomePlan()
    }

    if (!await this.app.vault.adapter.exists(archiveBills)) {
        await this.app.vault.create(archiveBills, fileContent);
    }

    if (!await this.app.vault.adapter.exists(yearFolder)) {
        await this.app.vault.createFolder(yearFolder);
    }

    if (!await this.app.vault.adapter.exists(monthFolder)) {
        await this.app.vault.createFolder(monthFolder);
    }
    
    if (!await this.app.vault.adapter.exists(historyPath)) {
        await this.app.vault.create(historyPath, fileContent);
    }

    if (!await this.app.vault.adapter.exists(expenditurePlanPath)) {
        await this.app.vault.create(expenditurePlanPath, fileContent);
        await pluginInstance.newMonthExpenditurePlan()
    } else {
        await pluginInstance.checkingExpensePlanForCompliance()
    }
    
    if (!await this.app.vault.adapter.exists(incomePlanPath)) {
        await this.app.vault.create(incomePlanPath, fileContent);
        await pluginInstance.newMonthIncomePlan()
    } else {
        await pluginInstance.checkingIncomePlanForCompliance()
    }

    resultCreatDirectory = true;
}

async function defCreateOtherMonthDirectory(numMonth, year) {
    resultCreatOtherDirectory = false;

    const fileContent = `---\ntags:\n  - ${pluginInstance.settings.defaultTag}\n---\n\`\`\`json\n\`\`\``;
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
            await this.app.vault.create(historyPath, fileContent);
        }
    
        if (!await this.app.vault.adapter.exists(expenditurePlanPath)) {
            await this.app.vault.create(expenditurePlanPath, fileContent);
            await pluginInstance.newMonthExpenditurePlan()
        } else {
            await pluginInstance.checkingExpensePlanForCompliance()
        }
        
        if (!await this.app.vault.adapter.exists(incomePlanPath)) {
            await this.app.vault.create(incomePlanPath, fileContent);
            await pluginInstance.newMonthIncomePlan()
        } else {
            await pluginInstance.checkingIncomePlanForCompliance()
        }

        resultCreatOtherDirectory = true;
        return 'success'
    } catch (error) {
        return 'Error creating directory'
    }
}

//====================================== View ======================================

async function awaitCreatDirectory() {
    await pluginInstance.createDirectory()
    
    const intercalId = setInterval(() => {
        if(resultCreatDirectory) {
            clearInterval(intercalId)
            showInitialView()
        }
    }, 100)
}

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
            text: await TheSumOfExpensesAndIncomeForTheYear(i)
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
            IncomeAndExpensesForTheMonth(months[k], i, storyMonth);
        }
    }
}

async function initOtherMonth(e) {
    const { now, year, month } = getDate()

    if(months[Number(e.target.dataset.month) - 1] === month && e.target.dataset.year === year) {
        return viewInstance.onOpen()
    }
    
    selectedYear = e.target.dataset.year
    selectedMonth = months[Number(e.target.dataset.month) - 1]

    const resultCreat = await pluginInstance.createOtherMonthDirectory(e.target.dataset.month - 1, e.target.dataset.year);
    if(!resultCreat === 'success') {
        new Notice(resultCreat)
    }

    awaitCreatOtherDirectory()
}

async function awaitCreatOtherDirectory() {
    const intercalId = setInterval(() => {
        if(resultCreatDirectory) {
            clearInterval(intercalId)
            showAnotherInitialView()
        }
    }, 100)
}

async function showAnotherInitialView() {
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
        selectedMonth = null;
        selectedYear = null;
        viewInstance.onOpen()
    })

    const financeHeader = contentEl.createEl('div', {
        cls: 'finance-header'
    })

    const showAllMonthsButton = financeHeader.createEl("button", {
        text: `🗓️ ${selectedMonth}`,
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
    balance.addClass('balance-other')

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
        planButton.addClass('home_button--active')
        mainContentBody.empty()
        mainContentButton.empty()
        showPlans(mainContentBody, mainContentButton)
    })

    if(!openPageNow || openPageNow === 'History') {
        showHistory(mainContentBody, mainContentButton)
        historyButton.addClass('home_button--active')
        planButton.removeClass('home_button--active')
    } else if(openPageNow === 'Plans') {
        showPlans(mainContentBody, mainContentButton)
        historyButton.removeClass('home_button--active')
        planButton.addClass('home_button--active')
    } else {
        showHistory(mainContentBody, mainContentButton)
        historyButton.addClass('home_button--active')
        planButton.removeClass('home_button--active')
    }
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
    if(jsonMatch[1].length > 1) {
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
    
    if(jsonMatch[1].length > 1) {
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

async function defCheckingExpensePlanForCompliance() {
    const { jsonData: expenditurePlanInfo, file, content, status: expenditurePlanStatus } = await pluginInstance.getDataFile('Expenditure plan');
    if(!(expenditurePlanStatus === 'success')) {
        return expenditurePlanStatus
    }
    const { jsonData: archiveExpenditurePlanInfo, status: archiveExpenditurePlanStatus } = await pluginInstance.getDataArchiveFile('Archive expenditure plan');
    if(!(archiveExpenditurePlanStatus === 'success')) {
        return archiveExpenditurePlanStatus
    }
    if(expenditurePlanInfo === null) {
        await pluginInstance.newMonthExpenditurePlan()
    } else if(expenditurePlanInfo.length < archiveExpenditurePlanInfo.length) {
        try {
            const missingItems = archiveExpenditurePlanInfo.filter(archiveItem =>
                !expenditurePlanInfo.some(currentItem => currentItem.id === archiveItem.id)
            ).map(obj => ({ ...obj, amount: 0 }));
            const updatedData = [...expenditurePlanInfo, ...missingItems];
            const dataStr = JSON.stringify(updatedData, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await this.app.vault.modify(file, newContent);
            return 'success'
        } catch (error) {
            return error
        }
    } else if (expenditurePlanInfo.length > archiveExpenditurePlanInfo.length) {
        try {
            const updatedArchiveData = archiveExpenditurePlanInfo.filter(archiveItem =>
                expenditurePlanInfo.some(currentItem => currentItem.id === archiveItem.id)
            ).map(obj => ({ ...obj, amount: 0 }));;
            const dataStr = JSON.stringify(updatedArchiveData, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await this.app.vault.modify(file, newContent);
            return 'success'
        } catch (error) {
            return error
        }
    }
}

async function defCheckingIncomePlanForCompliance() {
    const { jsonData: incomePlanInfo, file, content, status: incomePlanStatus } = await pluginInstance.getDataFile('Income plan');
    if(!(incomePlanStatus === 'success')) {
        return incomePlanStatus
    }
    const { jsonData: archiveIncomePlanInfo, status: archiveIncomePlanStatus } = await pluginInstance.getDataArchiveFile('Archive income plan');
    if(!(archiveIncomePlanStatus === 'success')) {
        return archiveIncomePlanStatus
    }
    if(incomePlanInfo === null) {
        await pluginInstance.newMonthIncomePlan()
    } else if(incomePlanInfo.length < archiveIncomePlanInfo.length) {
        try {
            const missingItems = archiveIncomePlanInfo.filter(archiveItem =>
                !incomePlanInfo.some(currentItem => currentItem.id === archiveItem.id)
            ).map(obj => ({ ...obj, amount: 0 }));
            const updatedData = [...incomePlanInfo, ...missingItems];
            const dataStr = JSON.stringify(updatedData, null, 4);
            const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
            await this.app.vault.modify(file, newContent);
            return 'success'
        } catch (error) {
            return error
        }
    } else if (incomePlanInfo.length > archiveIncomePlanInfo.length) {
        try {
            const updatedArchiveData = archiveIncomePlanInfo.filter(archiveItem =>
                incomePlanInfo.some(currentItem => currentItem.id === archiveItem.id)
            ).map(obj => ({ ...obj, amount: 0 }));;
            const dataStr = JSON.stringify(updatedArchiveData, null, 4);
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
        searchInput.addEventListener('input', async (e) => {
            const searchValue = e.target.value;
            const { jsonData: searchHistoryData, status: searchStatus } = await pluginInstance.searchHistory(searchValue);
            if(searchStatus !== 'success') {
                new Notice(searchStatus)
                console.error(searchStatus)
            }
            historyContent.empty()
            if(searchHistoryData === null) {
                const undefinedContent = historyContent.createEl('div', {
                    cls: 'undefined-content'
                })
                historyContent.addClass('main-content-body--undefined')
                const undefinedContentSmiles = undefinedContent.createEl('span', {
                    text: '🍕 🎮 👕'
                })

                const undefinedContentText = undefinedContent.createEl('p', {
                    text: 'No matching operations found.'
                })
            } else if(searchHistoryData.length >= 1) {
                historyContent.removeClass('main-content-body--undefined')
                await generationHistoryContent(historyContent, mainContentBody, searchHistoryData)
            } else {
                historyContent.removeClass('main-content-body--undefined')
                await generationHistoryContent(historyContent, mainContentBody, historyInfo)
            }
        });

        const historyContent = mainContentBody.createEl('div', {
            cls: 'history-content'
        })

        await generationHistoryContent(historyContent, mainContentBody, historyInfo)
}

async function generationHistoryContent(historyContent, mainContentBody, historyInfo) {
        const now = new Date();
        const groupedByDay = Object.values(
            historyInfo.reduce((acc, item) => {
                const day = item.date.split('T')[0]; 
                if (!acc[day]) acc[day] = [];
                acc[day].push(item);
                return acc;
            }, {})
        ).sort((a, b) => new Date(b[0].date) - new Date(a[0].date));
        const result = groupedByDay.map(dayGroup => 
            dayGroup.sort((a, b) => Math.abs(new Date(a.date) - now) - Math.abs(new Date(b.date) - now))
        );
        if(historyInfo.length >= 5) {
            mainContentBody.addClass('main-content-body--padding')
        }
        result.forEach((e, i) => {
            const historyBlock = historyContent.createEl('div', {
                cls: 'history-block'
            })
            
            const dateBlock = historyBlock.createEl('div', {
                cls: 'full-data-block'
            })
            const dateSpan = dateBlock.createEl('span', {
                text: humanizeDate(e[0].date.split("T")[0])
            })
            const matchSpan = dateBlock.createEl('span', {
                text: `${SummarizingDataForTheDay(e)}`
            })
            const dataList = historyBlock.createEl('ul', {
                cls: 'data-list'
            })
            e.forEach(async (e, i) => {
                const dataItem = dataList.createEl('li', {
                    cls: 'data-item',
                    attr: {
                        'data-id': e.id
                    }
                })
                dataItem.onclick = async (e) => {
                    await editingHistory(e);
                };
                const { item: itemCategory, status: statusPlan } = await pluginInstance.searchElementById(e.category.id, e.type)
                if(statusPlan === 'success') {
                    dataItem.createEl('p', {
                        text: `${itemCategory.name}`
                    })
                } else {
                    dataItem.createEl('p', {
                        text: `Error: Plan not found by id`
                    })
                }
                const { item: itemBill, status: statusBill } = await pluginInstance.searchElementById(e.bill.id, 'Archive bills')
                if(statusBill === 'success') {
                    dataItem.createEl('span', {
                        text: itemBill.name
                    })
                } else {
                    dataItem.createEl('span', {
                        text: 'Error: Bill not found by id'
                    })
                }
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
                text: String(SummarizingDataForTheDayExpense(resultExpense))
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
                text: String(SummarizingDataForTheDayIncome(resultIncome))
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
                text: String(SummarizingDataForTheTrueBills(billsInfo))
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
                text: String(SummarizingDataForTheFalseBills(billsInfo))
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
    const { jsonData: resultExpenditurePlan, status: statusExpenditurePlan } = await pluginInstance.getDataFile('Expenditure plan')
    if(!(statusExpenditurePlan === 'success')) {
        return statusExpenditurePlan
    }
    if(resultExpenditurePlan === null) {
        return new Notice('Add expenditure plan')
    } 
    const { jsonData: resultIncomePlan, status: statusIncomePlan } = await pluginInstance.getDataFile('Income plan')
    if(!(statusIncomePlan === 'success')) {
        return statusExpenditurePlan
    }
    if(resultIncomePlan === null) {
        return new Notice('Add income plan')
    }
    const { jsonData: resultHistory, status: statusHistory } = await pluginInstance.getDataFile('History')
    if(!(statusHistory === 'success')) {
        return statusHistory
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
            type: 'number',
            inputmode: "decimal"
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

    // --- Main ---
    const mainGroup = document.createElement("optgroup");
    mainGroup.label = "Main";
    
    resultBills.forEach(bill => {
        if(bill.generalBalance) {
            const option = document.createElement("option");
            option.value = bill.id;
            option.textContent = `${bill.name} • ${bill.balance} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`;
            mainGroup.appendChild(option);
        }
    })

    // --- Additional ---
    const additionalGroup = document.createElement("optgroup");
    additionalGroup.label = "Additional";

    resultBills.forEach(bill => {
        if(!bill.generalBalance) {
            const option = document.createElement("option");
            option.value = bill.id;
            option.textContent = `${bill.name} • ${bill.balance} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`;
            additionalGroup.appendChild(option);
        }
    })

    selectBills.appendChild(mainGroup);
    selectBills.appendChild(additionalGroup);

    if(resultHistory === null) {
        resultBills.sort((a, b) => b.balance - a.balance)
        selectBills.value = resultBills[0].id;
    } else {
        // Sort by number of uses
        let counts = {};
        resultHistory.forEach(item => {
            const billId = item.bill.id;
            counts[billId] = (counts[billId] || 0) + 1;
        });
        let maxCount = 0;
        let mostFrequentBillId = null;
        for (const billId in counts) {
            if (counts[billId] > maxCount) {
                maxCount = counts[billId];
                mostFrequentBillId = billId;
            } else if (counts[billId] === maxCount) {
                resultBills.sort((a, b) => b.balance - a.balance)
                selectBills.value = resultBills[0].id;
            }
        }

        const sorted = resultBills.sort((a, b) => {
            if (a.id === mostFrequentBillId) return -1;
            if (b.id === mostFrequentBillId) return 1;
            return 0;
        });
        selectBills.value = sorted[0].id;
    }
    
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

    if(selectedYear === null && selectedMonth === null) {
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
    }

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
                id: selectBills.value
            },
            category: {
                id: selectCategory.selectedOptions[0].dataset.planId
            }, 
            comment: commentInput.value.trim(),
            date: `${selectDate.value}T${getLocalTimeISO()}`,
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
            type: 'number',
            inputmode: "decimal"
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

    const { item, status } = await pluginInstance.searchElementById(id, 'History')
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
            inputmode: "decimal"
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

    // --- Main ---
    const mainGroup = document.createElement("optgroup");
    mainGroup.label = "Main";
    
    resultBills.forEach(bill => {
        if(bill.generalBalance) {
            const option = document.createElement("option");
            option.value = bill.id;
            option.textContent = `${bill.name} • ${bill.balance} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`;
            mainGroup.appendChild(option);
        }
    })

    // --- Additional ---
    const additionalGroup = document.createElement("optgroup");
    additionalGroup.label = "Additional";

    resultBills.forEach(bill => {
        if(!bill.generalBalance) {
            const option = document.createElement("option");
            option.value = bill.id;
            option.textContent = `${bill.name} • ${bill.balance} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`;
            additionalGroup.appendChild(option);
        }
    })

    selectBills.appendChild(mainGroup);
    selectBills.appendChild(additionalGroup);
    selectBills.value = item.bill.id;
    
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
                if(arr.id === item.category.id) {
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
                if(plan.id === item.category.id) {
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
    selectDate.value = item.date.split('T')[0]

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
                id: selectBills.value
            },
            category: {
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
            id: item.id,
            name: inputName.value.trim(),
            comment: commentInput.value.trim(),
            type: item.type,
        }
        const resultOfadd = await pluginInstance.editingJsonToPlan(data)
        if(resultOfadd === "success") {
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('The plan has been edited.')
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
        const now = new Date();
        const groupedByDay = Object.values(
            filterHistoryInfo.reduce((acc, item) => {
                const day = item.date.split('T')[0]; 
                if (!acc[day]) acc[day] = [];
                acc[day].push(item);
                return acc;
            }, {})
        );
        const result = groupedByDay.map(dayGroup => 
            dayGroup.sort((a, b) => Math.abs(new Date(a.date) - now) - Math.abs(new Date(b.date) - now))
        );

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
                text: humanizeDate(e[0].date.split("T")[0])
            })
            const matchSpan = dateBlock.createEl('span', {
                text: SummarizingDataForTheDay(e)
            })
            const dataList = historyBlock.createEl('ul', {
                cls: 'data-list'
            })
            e.forEach(async (e, i) => {
                const dataItem = dataList.createEl('li', {
                    cls: 'data-item',
                    attr: {
                        'data-id': e.id,
                    }
                })
                dataItem.onclick = async (e) => {
                    await editingHistory(e);
                };
                const { item: itemCategory, status: statusPlan } = await pluginInstance.searchElementById(e.category.id, e.type)
                if(statusPlan === 'success') {
                    dataItem.createEl('p', {
                        text: `${itemCategory.name}`
                    })
                } else {
                    dataItem.createEl('p', {
                        text: `Error: Plan not found by id`
                    })
                }
                const { item: itemBill, status: statusBill } = await pluginInstance.searchElementById(e.bill.id, 'Archive bills')
                if(statusBill === 'success') {
                    dataItem.createEl('span', {
                        text: itemBill.name
                    })
                } else {
                    dataItem.createEl('span', {
                        text: 'Error: Bill not found by id'
                    })
                }
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
            inputmode: "decimal"
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

    const transferUploadDiv = mainFormInput.createEl('div', {
        cls: 'form-transfer-expense-div'
    })
    setIcon(transferUploadDiv, 'upload')
    const transferUploadText = transferUploadDiv.createEl('span', {
        text: 'Transactions between bills',
        cls: 'form-text-transfer',
    })
    transferUploadDiv.addEventListener('click', async () => {
        await pluginInstance.transferBetweenBills(item.id)
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
        text: 'Add',
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
            name: inputName.value.trim(),
            balance: Number(currentBalance.value.trim()),
            generalBalance: checkboxInput.checked,
            comment: commentInput.value.trim(),
        }
        const resultOfadd = await pluginInstance.editingJsonToBill(data)
        if(resultOfadd === "success") {
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('The bill has been edited.')
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
        const dataStr = JSON.stringify(newData, null, 4);
        const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
        await this.app.vault.modify(file, newContent)

        return "success"
    } catch (err) {
        return err
    }
}

async function defEditingJsonToPlan(data) {
    const { jsonData, content, file, status } = await pluginInstance.getDataFile(data.type === 'expense' ? 'Expenditure plan' : data.type === 'income' ? 'Income plan' : 'Error')
    if(!(status === 'success')) {
        return status
    }
    
    try {
        const newData = jsonData.map(item => item.id === data.id ? {...item, ...data} : item)
        const dataStr = JSON.stringify(newData, null, 4) + "\n```";
        const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr);
        await this.app.vault.modify(file, newContent)

        if(data.type === 'expense') {
            await pluginInstance.archiveExpenditurePlan()
        } else if (data.type === 'income') {
            await pluginInstance.archiveIncomePlan()
        } else {
            return 'Error: Plan archiving error'
        }

        return "success"
    } catch (err) {
        return err
    }
}

async function defEditingJsonToBill(data) {
    const { jsonData, content, file, status } = await pluginInstance.getDataArchiveFile('Archive bills')
    if(!(status === 'success')) {
        return status
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

//====================================== Transfer between bills ======================================

async function defTransferBetweenBills(billId) {
    if(!billId) {
        return 'Element not found'
    }

    const { jsonData: resultBills, status } = await pluginInstance.getDataArchiveFile('Archive bills')
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

    const header = contentEl.createEl('div', {
        cls: 'main-header'
    })
    const headerTitle = header.createEl('h1', {
        text: 'Transfer'
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

    const selectFromBill = mainFormInput.createEl('select', {
        cls: 'form-selects',
        attr: {
            name: 'select-from-bill',
            id: 'select-from-bill'
        }
    })

    // --- Main ---
    const fromBillMainGroup = document.createElement("optgroup");
    fromBillMainGroup.label = "Main";
    
    resultBills.forEach(bill => {
        if(bill.generalBalance) {
            const option = document.createElement("option");
            option.value = bill.id;
            option.textContent = `${bill.name} • ${bill.balance} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`;
            fromBillMainGroup.appendChild(option);
        }
    })

    // --- Additional ---
    const fromBillAdditionalGroup = document.createElement("optgroup");
    fromBillAdditionalGroup.label = "Additional";

    resultBills.forEach(bill => {
        if(!bill.generalBalance) {
            const option = document.createElement("option");
            option.value = bill.id;
            option.textContent = `${bill.name} • ${bill.balance} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`;
            fromBillAdditionalGroup.appendChild(option);
        }
    })

    selectFromBill.appendChild(fromBillMainGroup);
    selectFromBill.appendChild(fromBillAdditionalGroup);
    selectFromBill.value = billId;

    const selectToBill = mainFormInput.createEl('select', {
        cls: 'form-selects',
        attr: {
            name: 'select-to-bill',
            id: 'select-to-bill'
        }
    })

    // --- Main ---
    const toBillmainGroup = document.createElement("optgroup");
    toBillmainGroup.label = "Main";
    
    resultBills.forEach(bill => {
        if(bill.generalBalance) {
            const option = document.createElement("option");
            option.value = bill.id;
            option.textContent = `${bill.name} • ${bill.balance} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`;
            toBillmainGroup.appendChild(option);
        }
    })

    // --- Additional ---
    const toBilladditionalGroup = document.createElement("optgroup");
    toBilladditionalGroup.label = "Additional";

    resultBills.forEach(bill => {
        if(!bill.generalBalance) {
            const option = document.createElement("option");
            option.value = bill.id;
            option.textContent = `${bill.name} • ${bill.balance} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`;
            toBilladditionalGroup.appendChild(option);
        }
    })

    selectToBill.appendChild(toBillmainGroup);
    selectToBill.appendChild(toBilladditionalGroup);
    selectToBill.value = resultBills[1].id;

    const inputSum = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Sum',
            id: 'input-sum',
            type: 'number',
            inputmode: "decimal"
        }
    })
    const addButton = mainFormInput.createEl('button', {
        text: 'Transfer',
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
            fromBillId: selectFromBill.value,
            toBillId: selectToBill.value,
            amount: Number(inputSum.value),
        }
        const resultOfTransfer = await pluginInstance.transferJsonToBills(data)
        if(resultOfTransfer === "success") {
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('Transfer completed')
            }, 100)
        } else {
            new Notice(resultOfTransfer)
        }
    })
}

async function defTransferJsonToBills(data) {
    if(data.fromBillId === data.toBillId) {
        return 'Cannot transfer to the same bill'
    }

    const { jsonData: resultBills, file, content, status } = await pluginInstance.getDataArchiveFile('Archive bills')
    if(!status) {
        return status
    }
    const bill = resultBills.find(b => b.id === data.fromBillId);
    if(data.amount > bill.balance) {
        return `Insufficient funds in the ${bill.name}`
    }
    
    let fromBillBalance;
    let toBillBalance;
    resultBills.forEach((e, i) => {
        if(e.id === data.fromBillId) {
            fromBillBalance = resultBills[i].balance;
        }
        if(e.id === data.toBillId) {
            toBillBalance = resultBills[i].balance;
        }
    })

    try {
        fromBillBalance -= Number(data.amount)
        toBillBalance += Number(data.amount)

        const newData = resultBills.map(item => {
            if(item.id === data.fromBillId) {
                return { ...item, balance: fromBillBalance };
            } else if (item.id === data.toBillId) {
                return { ...item, balance: toBillBalance };
            } else {
                return item;
            }
        })

        const dataStr = JSON.stringify(newData, null, 4);
        const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
        await this.app.vault.modify(file, newContent);

        return 'success'
    } catch (error) {
        return error
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
    const { jsonData: billJsonData, file: billFile, content: billContent, status: archiveStatus } = await pluginInstance.getDataArchiveFile("Archive bills")
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }
    const bill = billJsonData.find(b => b.id === data.bill.id)

    const { jsonData: planJsonData, file: planFile, content: planContent, status } = await pluginInstance.getDataFile("Expenditure plan")
    if(!(status === 'success')) {
        return status
    }
    const plan = planJsonData.find(p => p.id === data.category.id)

    let billNewData = [];
    let planNewData = [];

    switch (modifier) {
        case 'add':
            billNewData = billJsonData.map(i => i.id === data.bill.id ? { ...i, balance: Number(bill.balance) - Number(data.amount)} : i)
            planNewData = planJsonData.map(i => i.id === data.category.id ? { ...i, amount: Number(plan.amount) + Number(data.amount)} : i)
            
            return await func()
        case 'remove':
            billNewData = billJsonData.map(i => i.id === data.bill.id ? { ...i, balance: Number(bill.balance) + Number(data.amount)} : i)
            planNewData = planJsonData.map(i => i.id === data.category.id ? { ...i, amount: Number(plan.amount) - Number(data.amount)} : i)

            return await func()
        case 'edit':
            const oldBill = billJsonData.find(b => b.id === oldData.bill.id)
            const oldPlan = planJsonData.find(p => p.id === oldData.category.id)

            billNewData = billJsonData.map(i => i.id === oldData.bill.id ? { ...i, balance: Number(oldBill.balance) + Number(oldData.amount)} : i)
            planNewData = planJsonData.map(i => i.id === oldData.category.id ? { ...i, amount: Number(oldPlan.amount) - Number(oldData.amount)} : i)
            
            await func()

            const { jsonData: newBillJsonData } = await pluginInstance.getDataArchiveFile("Archive bills")
            const { jsonData: newpPlanJsonData } = await pluginInstance.getDataFile("Expenditure plan")

            const newBill = newBillJsonData.find(b => b.id === data.bill.id)
            const newPlan = newpPlanJsonData.find(p => p.id === data.category.id)

            billNewData = newBillJsonData.map(i => i.id === data.bill.id ? { ...i, balance: Number(newBill.balance) - Number(data.amount)} : i)
            planNewData = newpPlanJsonData.map(i => i.id === data.category.id ? { ...i, amount: Number(newPlan.amount) + Number(data.amount)} : i)

            return await func()
        default:
            return 'Error modifier'
    }

    async function func()  {
        try {
            const { status: billStatus } = await pluginInstance.updateFile(billNewData, billFile, billContent)
            if(!(status === 'success')) {
                return billStatus
            }
            const { status: planStatus } = await pluginInstance.updateFile(planNewData, planFile, planContent)
            if(!(planStatus === 'success')) {
                return planStatus
            }

            return 'success'
        } catch (error) {
            return error
        }
    }
}

async function defIncomeTransaction(data, modifier, oldData) {
    const { jsonData: billJsonData, file: billFile, content: billContent, status: archiveStatus } = await pluginInstance.getDataArchiveFile("Archive bills")
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }
    const bill = billJsonData.find(b => b.id === data.bill.id)

    const { jsonData: planJsonData, file: planFile, content: planContent, status } = await pluginInstance.getDataFile("Income plan")
    if(!(status === 'success')) {
        return status
    }
    const plan = planJsonData.find(p => p.id === data.category.id)

    let billNewData = [];
    let planNewData = [];

    switch (modifier) {
        case 'add':
            billNewData = billJsonData.map(i => i.id === data.bill.id ? { ...i, balance: Number(bill.balance) + Number(data.amount)} : i)
            planNewData = planJsonData.map(i => i.id === data.category.id ? { ...i, amount: Number(plan.amount) + Number(data.amount)} : i)
            
            return await func()
        case 'remove':
            billNewData = billJsonData.map(i => i.id === data.bill.id ? { ...i, balance: Number(bill.balance) - Number(data.amount)} : i)
            planNewData = planJsonData.map(i => i.id === data.category.id ? { ...i, amount: Number(plan.amount) - Number(data.amount)} : i)

            return await func()
        case 'edit':
            const oldBill = billJsonData.find(b => b.id === oldData.bill.id)
            const oldPlan = planJsonData.find(p => p.id === oldData.category.id)

            billNewData = billJsonData.map(i => i.id === oldData.bill.id ? { ...i, balance: Number(oldBill.balance) - Number(oldData.amount)} : i)
            planNewData = planJsonData.map(i => i.id === oldData.category.id ? { ...i, amount: Number(oldPlan.amount) - Number(oldData.amount)} : i)
            
            await func()

            const { jsonData: newBillJsonData } = await pluginInstance.getDataArchiveFile("Archive bills")
            const { jsonData: newpPlanJsonData } = await pluginInstance.getDataFile("Income plan")

            const newBill = newBillJsonData.find(b => b.id === data.bill.id)
            const newPlan = newpPlanJsonData.find(p => p.id === data.category.id)

            billNewData = newBillJsonData.map(i => i.id === data.bill.id ? { ...i, balance: Number(newBill.balance) + Number(data.amount)} : i)
            planNewData = newpPlanJsonData.map(i => i.id === data.category.id ? { ...i, amount: Number(newPlan.amount) + Number(data.amount)} : i)

            return await func()
        default:
            return 'Error modifier'
    }

    async function func()  {
        try {
            const { status: billStatus } = await pluginInstance.updateFile(billNewData, billFile, billContent)
            if(!(status === 'success')) {
                return billStatus
            }
            const { status: planStatus } = await pluginInstance.updateFile(planNewData, planFile, planContent)
            if(!(planStatus === 'success')) {
                return planStatus
            }

            return 'success'
        } catch (error) {
            return error
        }
    }
}

async function defUpdateFile(newData, file, content) {
    try {
        const dataStr = JSON.stringify(newData, null, 4);
        const newContent = content.replace(/```json[\s\S]*?```/, "```json\n" + dataStr + "\n```");
        await this.app.vault.modify(file, newContent);

        return { status: 'success' }
    } catch (error) {
        return `Error update ${file.name}: ${error}`
    }
}

async function defCheckBill(data, oldData) {
    const { jsonData } = await pluginInstance.getDataArchiveFile("Archive bills")
    const bill = jsonData.find(b => b.id === data.bill.id);

    if (!bill) {
        return `Bill ${data.bill.id} not found`;
    }

    const currentBalance = oldData
        ? bill.balance + oldData.amount
        : bill.balance;

    if (data.amount > currentBalance) {
        return `On bill ${bill.name} insufficient funds`;
    }

    return "success";
}

async function defGetDataFile(fileName) {
    if(selectedYear === null || selectedMonth === null) {
        const { year, month } = getDate()
        const filePath = `${pluginInstance.settings.targetFolder}/${year}/${month}/${fileName}.md`
        const file = app.vault.getAbstractFileByPath(filePath);
        if(!file) {
            await pluginInstance.createDirectory()
            return { status: `File not found: ${filePath}. Please try again` }
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
        const filePath = `${pluginInstance.settings.targetFolder}/${selectedYear}/${selectedMonth}/${fileName}.md`
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

async function defGetSpecificFile(fileName, year, month) {
    const filePath = `${pluginInstance.settings.targetFolder}/${year}/${month}/${fileName}.md`
    const file = app.vault.getAbstractFileByPath(filePath);
    if(!file) {
        return { status: `File not found` }
    }
    const content = await app.vault.read(file);
    if(!content) {
        return { status: `File is empty` }
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

async function defGetDataArchiveFile(fileName) {
    const filePath = `${pluginInstance.settings.targetFolder}/Archive/${fileName}.md`
    const file = app.vault.getAbstractFileByPath(filePath);
    if(!file) {
        await pluginInstance.createDirectory()
        return { status: `File not found: ${filePath}. Please try again` }
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

async function defSearchHistory(inputValue) {
    const { jsonData, status } = await pluginInstance.getDataFile('History')
    if(!(status === 'success')) {
        return status
    }

    const { jsonData: expenditurePlanInfo } = await pluginInstance.getDataFile('Expenditure plan')
    const { jsonData: incomePlanInfo } = await pluginInstance.getDataFile('Income plan')
    const { jsonData: billsInfo } = await pluginInstance.getDataArchiveFile('Archive bills')
    const allInfo = [...expenditurePlanInfo, ...incomePlanInfo, ...billsInfo]
    const additionalParameter = allInfo.filter(item => 
        item.name.toLowerCase().includes(inputValue.toLowerCase())
    )
    
    try {
        if(additionalParameter.length === 0) {
            const filteredData = jsonData.filter(item => 
                item.type.toLowerCase().includes(inputValue.toLowerCase()) ||
                item.amount.toString().includes(inputValue) ||
                (item.comment && item.comment.toLowerCase().includes(inputValue.toLowerCase()))
            );
    
            if(filteredData.length === 0) {
                return { status: 'success', jsonData: null }
            }
    
            return { status: 'success', jsonData: filteredData }
        } else {
            const filteredData = jsonData.filter(item => 
                item.type.toLowerCase().includes(inputValue.toLowerCase()) ||
                item.amount.toString().includes(inputValue) ||
                (item.comment && item.comment.toLowerCase().includes(inputValue.toLowerCase())) ||
                item.bill.id.includes(additionalParameter[0].id) ||
                item.category.id.includes(additionalParameter[0].id)
            );
    
            if(filteredData.length === 0) {
                return { status: 'success', jsonData: null }
            }
    
            return { status: 'success', jsonData: filteredData }
        }
    } catch (err) {
        return { status: err }
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
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    if(selectedYear === null && selectedMonth === null) {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        const daysInMonth = new Date(year, month + 1, 0).getDate();
    
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
        const selectedMonthNumber = isNaN(convertMonth) ? null : convertMonth.getMonth();

        const today = new Date();
        const year = Number(selectedYear);
        const month = selectedMonthNumber;

        const daysInMonth = new Date(year, month + 1, 0).getDate();
    
        for (let d = daysInMonth; d >= 1; d--) {
            const date = new Date(year, month, d);
    
            const day = date.getDate();
            const weekday = dayNames[date.getDay()];
            const monthName = monthNames[month];
    
            let label = `${day} ${monthName}, ${weekday}`;

            const value = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const option = selectEl.createEl("option", {
                text: label,
                attr: { value }
            });
        }
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

function SummarizingDataForTheDay(obj) {
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
function humanizeDate(dateStr) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.round((today - date) / (1000 * 60 * 60 * 24));

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

    const formatted = `${months[date.getMonth()]} ${date.getDate()}, ${weekdays[date.getDay()]}`;

    return prefix ? `${prefix}, ${formatted}` : formatted;
}
async function IncomeAndExpensesForTheMonth(month, year, div) {
    const { jsonData: expenseData, status: expenseStatus } = await pluginInstance.getSpecificFile('Expenditure plan', year, month)
    if(!(expenseStatus === 'success')) {
        return
    }
    const { jsonData: incomeData, status: incomeStatus } = await pluginInstance.getSpecificFile('Income plan', year, month)
    if(!(incomeStatus === 'success')) {
        return
    }

    const totalExpense = SummarizingDataForTheDayExpense(expenseData)
    const totalIncome = SummarizingDataForTheDayIncome(incomeData)

    if(totalIncome >= totalExpense) {
            div.createEl('span', {
                text: `-${totalExpense}`,
                cls: 'expense-all-month-success'
            }),
            div.createEl('span', {
                text: `+${totalIncome}`,
                cls: 'income-all-month'
            })
    } else {
            div.createEl('span', {
                text: `-${totalExpense}`,
                cls: 'expense-all-month-failure'
            }),
            div.createEl('span', {
                text: `+${totalIncome}`,
                cls: 'income-all-month'
            })
    }
}
async function TheSumOfExpensesAndIncomeForTheYear(year) {
    totalExpense = 0
    totalIncome = 0

    for(let m = 1; m <= 12; m++) {
        const { jsonData: expenseData, status: expenseStatus } = await pluginInstance.getSpecificFile('Expenditure plan', year, months[m])
        if(expenseStatus === 'File not found') {
            continue
        } else if (expenseStatus === 'File is empty') {
            continue
        }
        const { jsonData: incomeData, status: incomeStatus } = await pluginInstance.getSpecificFile('Income plan', year, months[m])
        if(incomeStatus === 'File not found') {
            continue
        } else if (incomeStatus === 'File is empty') {
            continue
        }
        totalExpense += SummarizingDataForTheDayExpense(expenseData)
        totalIncome += SummarizingDataForTheDayIncome(incomeData)
    }

    return `-${totalExpense} +${totalIncome}`
}
function getLocalTimeISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[1].split('.')[0];
}