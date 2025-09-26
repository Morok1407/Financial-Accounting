// @ts-ignore
const { Plugin, ItemView, Notice, setIcon, Platform } = require("obsidian");

const FINANCIAL_ACCOUNTING_VIEW = "financial-accounting-view";
let pluginInstance;
let viewInstance;
let selectedMonth;
let selectedYear;

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

    // Create directory
    async createDirectory() {
        defCreateDirectory(this)
    }

    async createOtherMonthDirectory(numMonth, year) {
        return await defCreateOtherMonthDirectory(numMonth, year, this)
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

    // editing data to file
    async editingJsonToHistory(data) {
        return defEditingJsonToHistory(data, this)
    }
    
    // Duplicating data to archive
    async archiveExpenditurePlan() {
        defArchiveExpenditurePlan(this)
    }
    
    async archiveIncomePlan() {
        defArchiveIncomePlan(this)
    }

    async archiveBills() {
        defArchiveBills(this)
    }

    // Transferring data to a new month

    async newMonthExpenditurePlan() {
        defNewMonthExpenditurePlan(this)
    }

    async newMonthIncomePlan() {
        defNewMonthIncomePlan(this)
    }

    async newMonthBills() {
        defNewMonthBills(this)
    }

    // Middleware function

    async getDataFile(fileName) {
        return defGetDataFile(fileName, this)
    }

    async getDataArchiveFile(fileName) {
        return defGetDataArchiveFile(fileName, this)
    }

    async expenditureTransaction(data) {
        return defExpenditureTransaction(data, this)
    }

    async incomeTransaction(data) {
        return defIncomeTransaction(data, this)
    }

    async updateData(fileName, accountName, targetE, newTargetE) {
        return defUpdateData(fileName, accountName, targetE, newTargetE, this)
    }

    async checkBill(data) {
        return defCheckBill(data, this)
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

//====================================== Create directory ======================================

async function defCreateDirectory() {
    const { now, year, month } = getDate()

    const baseFolder = "My Life/My Finances";
    const archiveFolder = `${baseFolder}/Archive`
    const archiveExpenditurePlan = `${archiveFolder}/Archive expenditure plan.md`
    const archiveIncomePlan = `${archiveFolder}/Archive income plan.md`
    const archiveBills = `${archiveFolder}/Archive bills.md`
    const yearFolder = `${baseFolder}/${year}`;
    const monthFolder = `${yearFolder}/${month}`;
    const historyPath = `${monthFolder}/History.md`;
    const expenditurePlanPath = `${monthFolder}/Expenditure plan.md`;
    const incomePlanPath = `${monthFolder}/Income plan.md`;
    const billsPath = `${monthFolder}/Bills.md`;
    
    if (!await this.app.vault.adapter.exists(baseFolder)) {
        await this.app.vault.createFolder(baseFolder);
    }

    if (!await this.app.vault.adapter.exists(archiveFolder)) {
        await this.app.vault.createFolder(archiveFolder);
    }

    if (!await this.app.vault.adapter.exists(archiveExpenditurePlan)) {
        await this.app.vault.create(archiveExpenditurePlan, '');
        pluginInstance.archiveExpenditurePlan()
    }

    if (!await this.app.vault.adapter.exists(archiveIncomePlan)) {
        await this.app.vault.create(archiveIncomePlan, '');
        pluginInstance.archiveIncomePlan()
    }

    if (!await this.app.vault.adapter.exists(archiveBills)) {
        await this.app.vault.create(archiveBills, '');
        pluginInstance.archiveBills()
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
        pluginInstance.newMonthExpenditurePlan()
    }
    
    if (!await this.app.vault.adapter.exists(incomePlanPath)) {
        await this.app.vault.create(incomePlanPath, '');
        pluginInstance.newMonthIncomePlan()
    }
    
    if (!await this.app.vault.adapter.exists(billsPath)) {
        await this.app.vault.create(billsPath, '');
        pluginInstance.newMonthBills()
    }
}

async function defCreateOtherMonthDirectory(numMonth, year) {
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

    const baseFolder = "My Life/My Finances";
    // const archiveFolder = `${baseFolder}/Archive`
    // const archiveExpenditurePlan = `${archiveFolder}/Archive expenditure plan.md`
    // const archiveIncomePlan = `${archiveFolder}/Archive income plan.md`
    // const archiveBills = `${archiveFolder}/Archive bills.md`
    const yearFolder = `${baseFolder}/${year}`;
    const monthFolder = `${yearFolder}/${months[numMonth]}`;
    const historyPath = `${monthFolder}/History.md`;
    const expenditurePlanPath = `${monthFolder}/Expenditure plan.md`;
    const incomePlanPath = `${monthFolder}/Income plan.md`;
    const billsPath = `${monthFolder}/Bills.md`;

    try {
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

        return 'success'
    } catch (error) {
        return 'Ошибка создания директории'
    }
}

//====================================== Search data ======================================

async function defSearchHistory() {
    await pluginInstance.createDirectory()
    // Этот пидор на getDataFile запускается раньше чем успевает завершиться createDirectory
    const { jsonMatch } = await pluginInstance.getDataFile('History')
    if(jsonMatch[1].length >= 2) {
        const jsonData = JSON.parse(jsonMatch[1].trim());
        return jsonData
    } else {
        return null
    }
}

async function defSearchExpenditurePlan() {
    await pluginInstance.createDirectory()
    const { jsonMatch } = await pluginInstance.getDataFile('Expenditure plan')
    if(jsonMatch[1].length >= 2) {
        const jsonData = JSON.parse(jsonMatch[1].trim())
        return jsonData
    } else {
        return null
    }
}

async function defSearchIncomePlan() {
    await pluginInstance.createDirectory()
    const { jsonMatch } = await pluginInstance.getDataFile('Income plan')
    if(jsonMatch[1].length >= 2) {
        const jsonData = JSON.parse(jsonMatch[1].trim());
        return jsonData 
    } else {
        return null
    }
}


async function defSearchBills() {
    await pluginInstance.createDirectory()
    const { jsonMatch } = await pluginInstance.getDataFile('Bills')
    if(jsonMatch[1].length >= 2) {
        const jsonData = JSON.parse(jsonMatch[1].trim());
        return jsonData
    } else {
        return null
    }
}

//====================================== Add Data ======================================

async function defAddHistory() {
    const { jsonMatch: billsJsonMatch } = await pluginInstance.getDataFile('Bills')
    if(billsJsonMatch[1].length < 3) {
        return new Notice('Добавьте счета')
    }
    
    const { jsonMatch: incomePlanJsonMatch } = await pluginInstance.getDataFile('Income plan')
    if(incomePlanJsonMatch[1].length < 3) {
        return new Notice('Добавьте категорию доходов')
    }
    
    const { jsonMatch: ExpenditurePlanJsonMatch } = await pluginInstance.getDataFile('Expenditure plan')
    if(ExpenditurePlanJsonMatch[1].length < 3) {
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
    // selectDateToday.addClass('button-selects-date--active')
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
            amount: Number(inputSum.value),
            bill: selectBills.value,
            category: selectCategory.value,
            comment: commentInput.value,
            date: selectDate.value,
            type: resultRadio,
        }
        const resultOfadd = await pluginInstance.addJsonToHistory(data)
        if(resultOfadd === "success") {
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('Операция добавленна')
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
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('План добавлен')
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
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('Счёт добавлен')
            }, 100)
        } else {
            new Notice(resultOfadd)
        }
    })
}

//====================================== Add JSON to file ======================================

async function defAddJsonToHistory(data) {
    if(data.amount === 0) {
        return 'Нельзя добавить 0'
    }
    
    const resultCheckBill  = await pluginInstance.checkBill(data)
    if(data.type === 'expense') {
        if(!(resultCheckBill === 'success')) {
            return resultCheckBill
        }
    }
    
    const { jsonMatch, content, file } = await pluginInstance.getDataFile('History')
    try {
        if(jsonMatch[1].length >= 2) {
            const jsonData = JSON.parse(jsonMatch[1].trim());
            const lastElementId = jsonData[jsonData.length - 1].id
            const dataJson = {id: lastElementId + 1, ...data}
            const dataStr = JSON.stringify([dataJson], null, 4) + "]\n```";

            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await this.app.vault.modify(file, newContent);
            if(data.type === 'expense') {
                pluginInstance.expenditureTransaction(data)
            } else if (data.type === 'income') {
                pluginInstance.incomeTransaction(data)
            } else {
                return 'Error'
            }
            
            return "success"
        } else {
            const dataJson = {id: 1, ...data}
            const dataStr = JSON.stringify([dataJson], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await this.app.vault.modify(file, newContent)
            if(data.type === 'expense') {
                pluginInstance.expenditureTransaction(data)
            } else if (data.type === 'income') {
                pluginInstance.incomeTransaction(data)
            } else {
                return 'Error'
            }

            return "success"
        }
    } catch (err) {
        return err
    }
}

async function defAddJsonToExpenditurePlan(data) {
    const { jsonMatch, content, file } = await pluginInstance.getDataFile('Expenditure plan')
    try {
        if(jsonMatch[1].length >= 2) {
            const { name, comment, type } = data
            const dataJson = {name, amount: 0, comment, type}
            const dataStr = JSON.stringify([dataJson], null, 4) + "]\n```";

            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await this.app.vault.modify(file, newContent);
            pluginInstance.archiveExpenditurePlan()

            return "success"
        } else {
            const { name, comment, type } = data
            const dataJson = {name, amount: 0, comment, type}
            const dataStr = JSON.stringify([dataJson], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await this.app.vault.modify(file, newContent)
            pluginInstance.archiveExpenditurePlan()

            return "success"
        }
    } catch (err) {
        return err
    }
}

async function defAddJsonToIncomePlan(data) {
    const { jsonMatch, content, file } = await pluginInstance.getDataFile('Income plan')
    try {
        if(jsonMatch[1].length >= 2) {
            const { name, comment, type } = data
            const dataJson = {name, amount: 0, comment, type}
            const dataStr = JSON.stringify([dataJson], null, 4) + "]\n```";

            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await this.app.vault.modify(file, newContent);
            pluginInstance.archiveIncomePlan()
            
            return "success"
        } else {
            const { name, comment, type } = data
            const dataJson = {name, amount: 0, comment, type}
            const dataStr = JSON.stringify([dataJson], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await this.app.vault.modify(file, newContent)
            pluginInstance.archiveIncomePlan()

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

    const { jsonMatch, content, file } = await pluginInstance.getDataFile('Bills')
    try {
        if(jsonMatch[1].length >= 2) {
            const { name, balance, generalBalance, comment } = data
            const dataJson = {name, balance, generalBalance, comment}
            const dataStr = JSON.stringify([dataJson], null, 4) + "]\n```";

            const index = content.lastIndexOf("}");
            const newContent = content.slice(0, index + 1) + ",\n" + dataStr.replace(/\[/, '').replace(/\]/, '');
            await this.app.vault.modify(file, newContent);
            pluginInstance.archiveBills()
            
            return "success"
        } else {
            const { name, balance, generalBalance, comment } = data
            const dataJson = {name, balance, generalBalance, comment}
            const dataStr = JSON.stringify([dataJson], null, 4) + "\n```";
            const newContent = content.replace(/\```$/, dataStr);
            await this.app.vault.modify(file, newContent)
            pluginInstance.archiveBills()

            return "success"
        }
    } catch (err) {
        return err
    }
}

//====================================== Editing data to file ======================================

async function defEditingJsonToHistory(data) {
    console.log(data)
}

//====================================== View ======================================

async function showInitialView() {
    const { contentEl } = viewInstance
    const { now, year, month } = getDate()

    let billsInfo = await pluginInstance.searchBills();
    let expenditurePlanInfo = await pluginInstance.searchExpenditurePlan();
    let incomePlanInfo = await pluginInstance.searchIncomePlan();

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
        text: 'Баланс'
    })

    balanceTop.createEl('p', {
        text: `${SummarizingDataForTheTrueBills(billsInfo)} ₸`
    })

    balanceTop.createEl('span', {
        text: `~${divideByRemainingDays(SummarizingDataForTheTrueBills(billsInfo))} на день`
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
        text: 'Расход'
    })

    const balanceExpensesСheck = balanceExpenses.createEl('div', {
        cls: 'balance_expenses-check'
    })

    setIcon(balanceExpensesСheck, 'upload')
    balanceExpensesСheck.createEl('p', {
        text: SummarizingDataForTheDayExpense(expenditurePlanInfo)
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
        text: SummarizingDataForTheDayIncome(incomePlanInfo)
    })

    homeButtons(contentEl)
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
        '☃️ Январь',
        '🌨️ Февраль',
        '🌷 Март',
        '🌱 Апрель',
        '☀️ Май',
        '🌳 Июнь',
        '🏖️ Июль',
        '🌾 Август',
        '🍁 Сентябрь',
        '🍂 Октябрь',
        '☔ Ноябрь',
        '❄️ Декабрь'
    ];

    for (let i = Number(year); i >= 2020; i--) {
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
        text: 'Расход'
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
        text: 'Доход'
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
        // showPlan(mainContentBody, mainContentButton)
    })

    historyButton.addClass('home_button--active')
    // showHistory(mainContentBody, mainContentButton)
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
        mainContentBody.addClass('main-content-body--undefined')

        const undefinedContentSmiles = undefinedContent.createEl('span', {
            text: '🍕 🎮 👕'
        })

        const undefinedContentText = undefinedContent.createEl('p', {
            text: 'Вносите любые доходы и расходы, чтобы видеть, сколько средств остаётся на самом деле'
        })
    } else {
        mainContentBody.removeClass('main-content-body--undefined')
        const searchInput = mainContentBody.createEl('input', {
            cls: 'input-search',
            attr: {
                id: 'input-search',
                type: 'search',
                placeholder: '🔎 Поиск по операциям'
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
                        'data-id': e.id,
                        'data-amount': e.amount,
                        'data-bill': e.bill,
                        'data-category': e.category,
                        'data-type': e.type,
                        'data-comment': e.comment,
                        'data-date': e.date,
                    }
                })
                dataItem.onclick = async (e) => {
                    await editingHistory(e);
                };
                const itemCategory = dataItem.createEl('p', {
                    text: `${e.category}`
                })
                const itemBill = dataItem.createEl('span', {
                    text: e.bill
                })
                const itemAmount = dataItem.createEl('p', {
                    text: checkExpenceOrIncome(e.amount, e.type)
                })
            })
        })
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
        mainContentBody.addClass('main-content-body--undefined')

        const undefinedContentSmiles = undefinedContent.createEl('span', {
            text: '🍕 🎮 👕'
        })

        const undefinedContentText = undefinedContent.createEl('p', {
            text: 'Вносите любые доходы и расходы, чтобы видеть, сколько средств остаётся на самом деле'
        })
    } else {
        mainContentBody.removeClass('main-content-body--undefined')
        const resultExpense = expenditurePlanInfo.sort((a, b) => b.amount - a.amount)
        const expensePlanBlock = mainContentBody.createEl('div', {
            cls: 'plan-block'
        })
        const expenseDateBlock = expensePlanBlock.createEl('div', {
            cls: 'full-data-block'
        })
        const expenseDateSpan = expenseDateBlock.createEl('span', {
            text: 'Расходы'
        })
        const expenseMatchSpan = expenseDateBlock.createEl('span', {
            text: SummarizingDataForTheDayExpense(resultExpense)
        })
        const expenseDataList = expensePlanBlock.createEl('ul', {
            cls: 'data-list'
        })
        resultExpense.forEach((e, i) => {
            const dataItem = expenseDataList.createEl('li', {
                cls: 'data-item'
            })
            const itemCategory = dataItem.createEl('p', {
                text: e.name
            })
            const itemAmount = dataItem.createEl('p', {
                text: e.amount
            })
        })

        const resultIncome = incomePlanInfo.sort((a, b) => b.amount - a.amount)
        const incomePlanBlock = mainContentBody.createEl('div', {
            cls: 'plan-block'
        })
        const incomeDateBlock = incomePlanBlock.createEl('div', {
            cls: 'full-data-block'
        })
        const incomeDateSpan = incomeDateBlock.createEl('span', {
            text: 'Доходы'
        })
        const incomeMatchSpan = incomeDateBlock.createEl('span', {
            text: SummarizingDataForTheDayIncome(resultIncome)
        })
        const incomeDataList = incomePlanBlock.createEl('ul', {
            cls: 'data-list'
        })
        resultIncome.forEach((e, i) => {
            const dataItem = incomeDataList.createEl('li', {
                cls: 'data-item'
            })
            const itemCategory = dataItem.createEl('p', {
                text: e.name
            })
            const itemAmount = dataItem.createEl('p', {
                text: e.amount
            })
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
        mainContentBody.addClass('main-content-body--undefined')

        const undefinedContentSmiles = undefinedContent.createEl('span', {
            text: '🍕 🎮 👕'
        })

        const undefinedContentText = undefinedContent.createEl('p', {
            text: 'Вносите любые доходы и расходы, чтобы видеть, сколько средств остаётся на самом деле'
        })
    } else {
        mainContentBody.removeClass('main-content-body--undefined')
        const trueBillBlock = mainContentBody.createEl('div', {
            cls: 'bill-block'
        })
        const trueDateBlock = trueBillBlock.createEl('div', {
            cls: 'full-data-block'
        })
        const trueDateSpan = trueDateBlock.createEl('span', {
            text: 'Основные'
        })
        const trueMatchSpan = trueDateBlock.createEl('span', {
            text: SummarizingDataForTheTrueBills(billsInfo)
        })
        const trueDataList = trueBillBlock.createEl('ul', {
            cls: 'data-list'
        })

        const falseBillBlock = mainContentBody.createEl('div', {
            cls: 'bill-block'
        })
        const falseDateBlock = falseBillBlock.createEl('div', {
            cls: 'full-data-block'
        })
        const falseDateSpan = falseDateBlock.createEl('span', {
            text: 'Дополнительные'
        })
        const falseMatchSpan = falseDateBlock.createEl('span', {
            text: SummarizingDataForTheFalseBills(billsInfo)
        })
        const falseDataList = falseBillBlock.createEl('ul', {
            cls: 'data-list'
        })
        
        billsInfo.forEach((e, i) => {
            if(e.generalBalance) {
                const dataItem = trueDataList.createEl('li', {
                    cls: 'data-item'
                })
                const itemCategory = dataItem.createEl('p', {
                    text: e.name
                })
                const itemAmount = dataItem.createEl('p', {
                    text: e.balance
                })
            } else {
                const dataItem = falseDataList.createEl('li', {
                    cls: 'data-item'
                })
                const itemCategory = dataItem.createEl('p', {
                    text: e.name
                })
                const itemAmount = dataItem.createEl('p', {
                    text: e.balance
                })
            }
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

//====================================== Duplicating data to archive ======================================

async function defArchiveExpenditurePlan() {
    const { jsonMatch } = await pluginInstance.getDataFile('Expenditure plan')
    const { file: archiveFile } = await pluginInstance.getDataArchiveFile('Archive expenditure plan')

    jsonData = JSON.parse(jsonMatch[1].trim())
    const data = jsonData.map(({ amount, ...rest }) => rest);
    const content = `---\ntags:\n- Finances\n---\n\`\`\`json\n${JSON.stringify(data, null, 4)}\n\`\`\``

    await this.app.vault.modify(archiveFile, content);
}

async function defArchiveIncomePlan() {
    const { jsonMatch } = await pluginInstance.getDataFile('Income plan')
    const { file: archiveFile } = await pluginInstance.getDataArchiveFile('Archive income plan')

    jsonData = JSON.parse(jsonMatch[1].trim())
    const data = jsonData.map(({ amount, ...rest }) => rest);
    const content = `---\ntags:\n- Finances\n---\n\`\`\`json\n${JSON.stringify(data, null, 4)}\n\`\`\``

    await this.app.vault.modify(archiveFile, content);
}

async function defArchiveBills() {
    const { file } = await pluginInstance.getDataFile('Bills')

    const { file: archiveFile } = await pluginInstance.getDataArchiveFile('Archive bills')

    const content = await app.vault.read(file);
    await this.app.vault.modify(archiveFile, content);
}

//====================================== Transferring data to a new month ======================================

async function defNewMonthExpenditurePlan() {
    const { jsonMatch } = await pluginInstance.getDataArchiveFile('Archive expenditure plan')
    const { file } = await pluginInstance.getDataFile('Expenditure plan')

    jsonData = JSON.parse(jsonMatch[1].trim())
    const data = jsonData.map(obj => ({ ...obj, amount: 0 }));
    const content = `---\ntags:\n- Finances\n---\n\`\`\`json\n${JSON.stringify(data, null, 4)}\n\`\`\``

    await this.app.vault.modify(file, content);
}

async function defNewMonthIncomePlan() {
    const { jsonMatch } = await pluginInstance.getDataArchiveFile('Archive income plan')
    const { file } = await pluginInstance.getDataFile('Income plan')
    
    jsonData = JSON.parse(jsonMatch[1].trim())
    const data = jsonData.map(obj => ({ ...obj, amount: 0 }));
    const content = `---\ntags:\n- Finances\n---\n\`\`\`json\n${JSON.stringify(data, null, 4)}\n\`\`\``

    await this.app.vault.modify(file, content);
}

async function defNewMonthBills() {
    const { file: archiveFile } = await pluginInstance.getDataArchiveFile('Archive bills')
    
    const { file } = await pluginInstance.getDataFile('Bills')

    const content = await app.vault.read(archiveFile);
    await this.app.vault.modify(file, content);
}

//====================================== Middleware Function ======================================

async function defExpenditureTransaction(data) {
    let billName;
    let billBalace;

    let planName;
    let planAmount;

    const { jsonMatch: billsJsonMatch } = await pluginInstance.getDataFile("Bills")
    const billsJsonData = JSON.parse(billsJsonMatch[1].trim());
    
    billsJsonData.forEach((e, i) => {
        if(e.name === data.bill) {
            billBalace = billsJsonData[i].balance;
            billName = billsJsonData[i].name
        }
    })

    const { jsonMatch: planJsonMatch } = await pluginInstance.getDataFile("Expenditure plan")
    const planJsonData = JSON.parse(planJsonMatch[1].trim());
    planJsonData.forEach((e, i) => {
        if(e.name === data.category) {
            planAmount = planJsonData[i].amount
            planName = planJsonData[i].name
        }
    })

    billBalace -= data.amount
    planAmount += data.amount

    await pluginInstance.updateData('Bills', billName, 'balance', billBalace)
    await pluginInstance.updateData('Expenditure plan', planName, 'amount', planAmount)
    await pluginInstance.archiveBills()
}

async function defIncomeTransaction(data) {
    let billName;
    let billBalace;

    let planName;
    let planAmount;

    const { jsonMatch: billsJsonMatch } = await pluginInstance.getDataFile("Bills")
    const billsJsonData = JSON.parse(billsJsonMatch[1].trim());
    
    billsJsonData.forEach((e, i) => {
        if(e.name === data.bill) {
            billBalace = billsJsonData[i].balance;
            billName = billsJsonData[i].name
        }
    })

    const { jsonMatch: planJsonMatch } = await pluginInstance.getDataFile("Income plan")
    const planJsonData = JSON.parse(planJsonMatch[1].trim());
    planJsonData.forEach((e, i) => {
        if(e.name === data.category) {
            planAmount = planJsonData[i].amount
            planName = planJsonData[i].name
        }
    })

    billBalace += data.amount
    planAmount += data.amount

    await pluginInstance.updateData('Bills', billName, 'balance', billBalace)
    await pluginInstance.updateData('Income plan', planName, 'amount', planAmount)
    await pluginInstance.archiveBills()
}

async function defUpdateData(fileName, accountName, targetE, newTargetE) {
    const { jsonMatch, content, file } = await pluginInstance.getDataFile(fileName)

    let data = JSON.parse(jsonMatch[1]);
    const target = data.find(acc => acc.name === accountName);
    if (target) {
        target[targetE] = newTargetE;
    } else {
        console.warn("Аккаунт не найден:", accountName);
    }

    data =`---\ntags:\n- Finances\n---\n\`\`\`json\n${JSON.stringify(data, null, 4)}\n\`\`\``

    await app.vault.modify(file, data); 
}


async function defCheckBill(data) {
    const { year, month } = getDate()
    const filePath = `My Life/My Finances/${year}/${month}/Bills.md`
    const file = app.vault.getAbstractFileByPath(filePath);

    const content = await app.vault.read(file);
    const jsonMatch = content.match(/```json([\s\S]*?)```/);
    const jsonData = JSON.parse(jsonMatch[1].trim());

    let result;

    jsonData.forEach((e, i) => {
        if(e.name === data.bill) {
            if(data.amount > jsonData[i].balance) {
                result = `На счету ${jsonData[i].name} недостаточно средств`
            } else {
                result = "success"
            }
        }
    })

    return result
}

async function defGetDataFile(fileName) {
    const { year, month } = getDate()
    const filePath = `My Life/My Finances/${year}/${month}/${fileName}.md`
    const file = app.vault.getAbstractFileByPath(filePath);
    const content = await app.vault.read(file);
    const jsonMatch = content.match(/```json([\s\S]*?)```/);
    const dataFile = { jsonMatch, content, file }
    return dataFile
}

async function defGetDataArchiveFile(fileName) {
    const { year, month } = getDate()
    const filePath = `My Life/My Finances/Archive/${fileName}.md`
    const file = app.vault.getAbstractFileByPath(filePath);
    const content = await app.vault.read(file);
    const jsonMatch = content.match(/```json([\s\S]*?)```/);
    const dataFile = { jsonMatch, content, file }
    return dataFile
}

//====================================== Editing data ======================================

async function editingHistory(e) {
    const { amount, bill, category, comment, date, type, id } = e.target.closest('li').dataset;
    if(!type && !id) {
        return 'Element not found'
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
        await deleteData(e)
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
            placeholder: 'Сумма',
            id: 'input-sum',
            type: 'number',
            value: amount,
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
    const resultBills = await pluginInstance.searchBills()
    resultBills.sort((a, b) => b.balance - a.balance)
    resultBills.forEach(arr => {
        if(arr.name === bill) {
            selectBills.createEl('option', {
                text: `${arr.name} • ${arr.balance} ₸`,
                attr: { value: arr.name, selected: 'selected' }
            })
            return
        }
        selectBills.createEl('option', {
            text: `${arr.name} • ${arr.balance} ₸`,
            attr: { value: arr.name }
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
        if(type === 'expense'){
            selectCategory.empty()
            const resultCategory = await pluginInstance.searchExpenditurePlan()
            resultCategory.sort((a, b) => b.amount - a.amount)
            resultCategory.forEach(arr => {
                if(arr.name === category) {
                    selectCategory.createEl('option', {
                        text: `${arr.name} • ${arr.amount} ₸`,
                        attr: { value: arr.name, selected: 'selected' }
                    })
                    return
                }
                selectCategory.createEl('option', {
                    text: `${arr.name} • ${arr.amount} ₸`,
                    attr: { value: arr.name }
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
            type: 'text',
            value: comment,
        }
    })

    const selectDate = mainFormInput.createEl('select', {
        cls: 'form-selects',
        attr: {
            name: 'select-date',
            id: 'select-date'
        }
    })
    fillMonthDates(selectDate, date)

    const selectDateButtonDiv = mainFormInput.createEl('div', {
        cls: 'form-selects-date-buttons'
    })

    const selectDateToday = selectDateButtonDiv.createEl('button', {
        text: 'Сегодня',
        attr: {
            type: 'button'
        }
    })
    // selectDateToday.addClass('button-selects-date--active')
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
            return new Notice('Введите сумму')
        }

        const data = {
            amount: Number(inputSum.value),
            bill: selectBills.value,
            category: selectCategory.value,
            comment: commentInput.value,
            date: selectDate.value,
            type: type,
        }
        const resultOfadd = await pluginInstance.editingJsonToHistory(data)
        if(resultOfadd === "success") {
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('Операция изменена')
            }, 100)
        } else {
            new Notice(resultOfadd)
        }
    })
}

async function deleteData() {
    console.log('delete')
}

//====================================== Other Function ======================================

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
    let expense = 0;
    obj.forEach((e, i) => {
        if(e.type === 'expense'){
            expense += e.amount
        } 
    })
    return expense
}
function SummarizingDataForTheDayIncome(obj) {
    let income = 0;
    obj.forEach((e, i) => {
        if(e.type === 'income'){
            income += e.amount
        } 
    })
    return income
}
function SummarizingDataForTheTrueBills(obj) {
    let balance = 0;
    obj.forEach((e, i) => {
        if(e.generalBalance) {
            balance += e.balance
        }
    })
    return balance
}
function SummarizingDataForTheFalseBills(obj) {
    let balance = 0;
    obj.forEach((e, i) => {
        if(!e.generalBalance) {
            balance += e.balance
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