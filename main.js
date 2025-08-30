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

    async searchExpenditurePlan() {
        return defSearchExpenditurePlan(this)
    }

    async searchIncomePlan() {
        return defSearchIncomePlan(this)
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
    const expenditurePlanPath = `${monthFolder}/Expenditure plan.md`;
    const incomePlanPath = `${monthFolder}/Income plan.md`;
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
        await this.app.vault.create(historyPath, '');
    }

    if (!await this.app.vault.adapter.exists(expenditurePlanPath)) {
        await this.app.vault.create(expenditurePlanPath, '');
    }

    if (!await this.app.vault.adapter.exists(incomePlanPath)) {
        await this.app.vault.create(incomePlanPath, '');
    }

    if (!await this.app.vault.adapter.exists(billsPath)) {
        await this.app.vault.create(billsPath, '');
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
        return null
    }
}

async function defSearchExpenditurePlan() {
    const { now, year, month } = getDate()

    const ExpenditurePlanFilePath = `My Life/My Finances/${year}/${month}/Expenditure plan.md`;
    const ExpenditurePlanFileContent = await this.app.vault.adapter.read(ExpenditurePlanFilePath);
    const ExpenditurePlanJsonMatch = ExpenditurePlanFileContent.match(/```json([\s\S]*?)```/);
    if(ExpenditurePlanJsonMatch[1].length >= 2) {
        const ExpenditurePlanJsonData = JSON.parse(ExpenditurePlanJsonMatch[1].trim())
        return ExpenditurePlanJsonData
    } else {
        return null
    }
}

async function defSearchIncomePlan() {
    const { now, year, month } = getDate()

    const IncomePlanFilePath = `My Life/My Finances/${year}/${month}/Income plan.md`;
    const IncomePlanFileContent = await this.app.vault.adapter.read(IncomePlanFilePath);
    const IncomePlanJsonMatch = IncomePlanFileContent.match(/```json([\s\S]*?)```/);
    if(IncomePlanJsonMatch[1].length >= 2) {
        const IncomePlanJsonData = JSON.parse(IncomePlanJsonMatch[1].trim());
        return IncomePlanJsonData 
    } else {
        return null
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
        return null
    }
}

//====================================== Add Data ======================================

async function defAddHistory() {
    const { now, year, month } = getDate()

    const fileBillsPath = `My Life/My Finances/${year}/${month}/Bills.md`;
    const fileBillsContent = await this.app.vault.adapter.read(fileBillsPath);
    const fileBillsJson = fileBillsContent.match(/```json([\s\S]*?)```/);
    if(fileBillsJson[1].length < 3) {
        return new Notice('Добавьте счета')
    }
    
    const fileIncomePlanPath = `My Life/My Finances/${year}/${month}/Income plan.md`;
    const fileIncomePlanContent = await this.app.vault.adapter.read(fileIncomePlanPath);
    const fileIncomePlanJson = fileIncomePlanContent.match(/```json([\s\S]*?)```/);
    if(fileIncomePlanJson[1].length < 3) {
        return new Notice('Добавьте категорию доходов')
    }
    
    const fileExpenditurePlanPath = `My Life/My Finances/${year}/${month}/Expenditure plan.md`;
    const fileExpenditurePlanContent = await this.app.vault.adapter.read(fileExpenditurePlanPath);
    const fileExpenditurePlanJson = fileExpenditurePlanContent.match(/```json([\s\S]*?)```/);
    if(fileExpenditurePlanJson[1].length < 3) {
        return new Notice('Добавьте категорию расходов')
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
        createOptionCategory()
    })
    radioExpense.addEventListener('click', () => {
        radioIncome.removeClass('main-radion-button--active')
        radioExpense.addClass('main-radion-button--active')
        resultRadio = radioExpense.dataset.radio
        createOptionCategory()
    })
    
    // Form input
    const mainFormInput = mainAddForm.createEl('div', {
        cls: 'main-form-input'
    })
    const inputSum = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Сумма',
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
    const resultBills = await pluginInstance.searchBills()
    resultBills.sort((a, b) => b.balance - a.balance)
    resultBills.forEach(bill => {
        selectBills.createEl('option', {
            text: `${bill.name} • ${bill.balance} ₸`,
            attr: { value: bill.name }
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
            const resultCategory = await pluginInstance.searchExpenditurePlan()
            resultCategory.sort((a, b) => b.amount - a.amount)
            resultCategory.forEach(plan => {
                selectCategory.createEl('option', {
                    text: `${plan.name} • ${plan.amount} ₸`,
                    attr: { value: plan.name }
                })
            })
        } else {
            selectCategory.empty()
            const resultCategory = await pluginInstance.searchIncomePlan()
            resultCategory.sort((a, b) => b.amount - a.amount)
            resultCategory.forEach(plan => {
                selectCategory.createEl('option', {
                    text: `${plan.name} • ${plan.amount} ₸`,
                    attr: { value: plan.name }
                })
            })
        }
    }

    const commentInput = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Примечание',
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
        text: 'Сегодня',
        attr: {
            type: 'button'
        }
    })
    selectDateToday.addEventListener('click', () => {
        selectRelativeDate(selectDate, 0)
    })
    const selectDateYesterday = selectDateButtonDiv.createEl('button', {
        text: 'Вчера',
        attr: {
            type: 'button'
        }
    })
    selectDateYesterday.addEventListener('click', () => {
        selectRelativeDate(selectDate, -1)
    })
    const selectDateTheDayBefotreYesterday = selectDateButtonDiv.createEl('button', {
        text: 'Позавчера',
        attr: {
            type: 'button'
        }
    })
    selectDateTheDayBefotreYesterday.addEventListener('click', () => {
        selectRelativeDate(selectDate, -2)
    })

    const addButton = mainFormInput.createEl('button', {
        text: 'Добавить',
        cls: 'add-button',
        attr: {
            type: 'submit'
        }
    })

    addButton.addEventListener('click', async (e) => {
        e.preventDefault();

        if(!inputSum.value >= 1) {
            inputSum.focus()
            return new Notice('Введите сумму')
        }

        const data = {
            amount: inputSum.value,
            bill: selectBills.value,
            category: selectCategory.value,
            comment: commentInput.value,
            date: selectDate.value,
            type: resultRadio,
        }
        const resultOfadd = await pluginInstance.addJsonToHistory(data)
        if(resultOfadd === "success") {
            viewInstance.onOpen()
            new Notice('Операция добавленна')
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
        text: 'Категории'
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
    const inputName = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Название',
            id: 'input-name',
            type: 'text'
        }
    })
    inputName.focus()

    const commentInput = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Примечание',
            id: 'input-comment',
            type: 'text'
        }
    })

    const addButton = mainFormInput.createEl('button', {
        text: 'Добавить',
        cls: 'add-button',
        attr: {
            type: 'submit'
        }
    })

    addButton.addEventListener('click', async (e) => {
        e.preventDefault();

        if(!inputName.value >= 1) {
            inputName.focus()
            return new Notice('Введите название')
        }

        const data = {
            name: inputName.value,
            comment: commentInput.value,
            type: resultRadio,
        }
        const resultOfadd = await pluginInstance.addJsonToPlan(data)
        if(resultOfadd === "success") {
            viewInstance.onOpen()
            new Notice('Операция добавленна')
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
        text: 'Категории'
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
            placeholder: 'Название',
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

    const currentBalance = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Текущий баланс',
            id: 'input-current-balance',
            type: 'number'
        }
    })

    const commentInput = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Примечание',
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
        text: 'Учитывать в общем балансе',
        cls: 'form-text',
    })

    const addButton = mainFormInput.createEl('button', {
        text: 'Добавить',
        cls: 'add-button',
        attr: {
            type: 'submit'
        }
    })

    addButton.addEventListener('click', async (e) => {
        e.preventDefault();

        if(!inputName.value >= 1) {
            inputName.focus()
            return new Notice('Введите название')
        }

        const data = {
            name: inputName.value,
            balance: currentBalance.value,
            generalBalance: checkboxInput.checked,
            comment: commentInput.value,
        }
        const resultOfadd = await pluginInstance.addJsonToBills(data)
        if(resultOfadd === "success") {
            viewInstance.onOpen()
            new Notice('Операция добавленна')
        } else {
            new Notice(resultOfadd)
        }
    })
}

//====================================== Add JSON to file ======================================

async function defAddJsonToHistory(data) {
    const { now, year, month } = getDate()

    const filePath = `My Life/My Finances/${year}/${month}/History.md`
    const file = app.vault.getAbstractFileByPath(filePath);
    const content = await app.vault.read(file);
    const jsonMatch = content.match(/```json([\s\S]*?)```/);

    try {
        if(jsonMatch[1].length >= 2) {
            const jsonData = JSON.parse(jsonMatch[1].trim());
            const lastElementId = jsonData[jsonData.length - 1].id
            const dataJson = {id: lastElementId + 1, ...data}
            const dataStr = JSON.stringify([dataJson], null, 4) + "]\n```";

            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await this.app.vault.modify(file, newContent);

            return "success"
        } else {
            const dataJson = {id: 1, ...data}
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
    const { now, year, month } = getDate()

    const filePath = `My Life/My Finances/${year}/${month}/Expenditure plan.md`
    const file = app.vault.getAbstractFileByPath(filePath);
    const content = await app.vault.read(file);
    const jsonMatch = content.match(/```json([\s\S]*?)```/);

    try {
        if(jsonMatch[1].length >= 2) {
            const { name, comment, type } = data
            const dataJson = {name, amount: 0, comment, type}
            const dataStr = JSON.stringify([dataJson], null, 4) + "]\n```";

            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await this.app.vault.modify(file, newContent);

            return "success"
        } else {
            const { name, comment, type } = data
            const dataJson = {name, amount: 0, comment, type}
            const dataStr = JSON.stringify([dataJson], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await this.app.vault.modify(file, newContent)

            return "success"
        }
    } catch (err) {
        return err
    }
}

async function defAddJsonToIncomePlan(data) {
    const { now, year, month } = getDate()

    const filePath = `My Life/My Finances/${year}/${month}/Income plan.md`
    const file = app.vault.getAbstractFileByPath(filePath);
    const content = await app.vault.read(file);
    const jsonMatch = content.match(/```json([\s\S]*?)```/);

    try {
        if(jsonMatch[1].length >= 2) {
            const { name, comment, type } = data
            const dataJson = {name, amount: 0, comment, type}
            const dataStr = JSON.stringify([dataJson], null, 4) + "]\n```";

            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await this.app.vault.modify(file, newContent);

            return "success"
        } else {
            const { name, comment, type } = data
            const dataJson = {name, amount: 0, comment, type}
            const dataStr = JSON.stringify([dataJson], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await this.app.vault.modify(file, newContent)

            return "success"
        }
    } catch (err) {
        return err
    }
}

async function defAddJsonToBills(data) {
    const { now, year, month } = getDate()

    const filePath = `My Life/My Finances/${year}/${month}/Bills.md`
    const file = app.vault.getAbstractFileByPath(filePath);
    const content = await app.vault.read(file);
    const jsonMatch = content.match(/```json([\s\S]*?)```/);
    
    if(!data.balance) {
        data.balance = 0
    }

    try {
        if(jsonMatch[1].length >= 2) {
            const { name, balance, generalBalance, comment } = data
            const dataJson = {name, balance, generalBalance, comment}
            const dataStr = JSON.stringify([dataJson], null, 4) + "]\n```";

            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await this.app.vault.modify(file, newContent);

            return "success"
        } else {
            const { name, balance, generalBalance, comment } = data
            const dataJson = {name, balance, generalBalance, comment}
            const dataStr = JSON.stringify([dataJson], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await this.app.vault.modify(file, newContent)

            return "success"
        }
    } catch (err) {
        return err
    }
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

    if(historyInfo === null) {
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

        // historyInfo.forEach(e => {
        //     e.date
        // });
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
    let expenditurePlanInfo = await pluginInstance.searchExpenditurePlan();
    let incomePlanInfo = await pluginInstance.searchIncomePlan();

    if(expenditurePlanInfo === null || incomePlanInfo === null) {
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
    addPlanButton.addEventListener('click', async () => {
        if (pluginInstance) {
            pluginInstance.addPlan();
        }
    })
}

async function showBills(mainContentBody, mainContentButton) {
    let billsInfo = await pluginInstance.searchBills();

    if(billsInfo === null) {
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
    addBillButton.addEventListener('click', async () => {
        if (pluginInstance) {
            pluginInstance.addBills();
        }
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

function fillMonthDates(selectEl) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayNames = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
    const monthNames = [
        "января","февраля","марта","апреля","мая","июня",
        "июля","августа","сентября","октября","ноября","декабря"
    ];

    for (let d = daysInMonth; d >= 1; d--) {
        const date = new Date(year, month, d);

        const day = date.getDate();
        const weekday = dayNames[date.getDay()];
        const monthName = monthNames[month];

        let label = `${day} ${monthName}, ${weekday}`;

        const diff = Math.floor((date - today) / (1000 * 60 * 60 * 24));

        if (diff === -1) label = `Сегодня, ${label}`;
        else if (diff === 0) label = `Завтра, ${label}`;
        else if (diff === 1) label = `Послезавтра, ${label}`;
        else if (diff === -2) label = `Вчера, ${label}`;
        else if (diff === -3) label = `Позавчера, ${label}`;

        const value = `${String(d).padStart(2, "0")}-${String(month + 1).padStart(2, "0")}-${year}`;
        const option = selectEl.createEl("option", {
            text: label,
            attr: { value }
        });

        if (diff === -1) option.selected = true;
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