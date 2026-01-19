import { Notice, setIcon } from "obsidian";
import MainPlugin from "../../main";
import { FinancialAccountingView } from "../../main";
import { addJsonToHistory, addJsonToPlan, addJsonToBills } from "../controllers/addData";
import { getDataArchiveFile, getDataFile, searchElementById } from "../controllers/searchData";
import { stateManager } from "../../main";
import { HistoryData, PlanData, BillData  } from "../../main";
import { getCurrencySymbol, fillMonthDates, getLocalTimeISO, selectRelativeDate, getCurrencyGroups, generateUUID } from "../middleware/otherFunc";

export const addHistory = async () => {
    const bills = await getDataArchiveFile<BillData>('Archive bills')
    if (bills.status === 'error') {
        new Notice(bills.error.message)
        console.error(bills.error)
        return
    }
    if(bills.jsonData === undefined) {
        new Notice('Bills is undefined')
        console.error('Bills is null or undefined')
        return
    }
    if(bills.jsonData === null) return new Notice('Add a bill')

    const expensePlan = await getDataFile<PlanData>('Expenditure plan')
    if (expensePlan.status === 'error') {
        new Notice(expensePlan.error.message)
        console.error(expensePlan.error)
        return
    }
    if(expensePlan.jsonData === undefined) {
        new Notice('Expenditure plan is undefined')
        console.error('Expenditure plan is undefined')
        return
    }
    if(expensePlan.jsonData === null) return new Notice('Add a expenditure plan')

    const incomePlan = await getDataFile<PlanData>('Income plan')
    if (incomePlan.status === 'error') {
        new Notice(incomePlan.error.message)
        console.error(incomePlan.error)
        return
    }
    if(incomePlan.jsonData === undefined) {
        new Notice('Income plan is undefined')
        console.error('Income plan is undefined')
        return
    }
    if(incomePlan.jsonData === null) return new Notice('Add a income plan')
    
    const history = await getDataFile<HistoryData>('History')
    if (history.status === 'error') {
        new Notice(history.error.message)
        console.error(history.error)
        return
    }
    if(history.jsonData === undefined) {
        new Notice('History is undefined')
        console.error('History is undefined')
        return
    }

    const { contentEl } = FinancialAccountingView.instance;
    const { selectedYear, selectedMonth } = stateManager();
    contentEl.empty()

    const header = contentEl.createEl('div', {
        cls: 'main-header'
    })
    header.createEl('h1', {
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
        FinancialAccountingView.instance.onOpen()
    })

    const mainAddForm = contentEl.createEl('form', {
        cls: 'main-add-form',
        attr: {
            id: 'main-add-form'
        }
    })

    // Form radio
    let resultRadio: 'expense' | 'income';
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
    if(radioExpense.dataset.radio === 'expense') {
        resultRadio = radioExpense.dataset.radio;
        radioExpense.addClass('main-radion-button--active')
    }
    
    const radioIncome = expenseOrIncome.createEl('button', {
        text: 'Income',
        cls: 'main-radio_income',
        attr: {
            'data-radio': 'income',
            type: 'button'
        }
    })
    
    radioIncome.addEventListener('click', () => {
        if(radioIncome.dataset.radio === 'income') {
            radioExpense.removeClass('main-radion-button--active')
            radioIncome.addClass('main-radion-button--active')
            resultRadio = radioIncome.dataset.radio
            createOptionCategory()
            inputSum.focus()
        }
    })
    radioExpense.addEventListener('click', () => {
        if(radioExpense.dataset.radio === 'expense') {
            radioIncome.removeClass('main-radion-button--active')
            radioExpense.addClass('main-radion-button--active')
            resultRadio = radioExpense.dataset.radio
            createOptionCategory()
            inputSum.focus()
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
    if(bills.jsonData.some(i => i.generalBalance === true)) {
        const mainGroup = document.createElement("optgroup");
        mainGroup.label = "Main";
        
        (bills.jsonData).forEach(bill => {
            if(bill.generalBalance) {
                const option = document.createElement("option");
                option.value = bill.id;
                option.textContent = `${bill.emoji} ${bill.name} • ${bill.balance} ${getCurrencySymbol(bill.currency)}`;
                mainGroup.appendChild(option);
            }
        })

        selectBills.appendChild(mainGroup);
    }

    // --- Additional ---
    if(bills.jsonData.some(i => i.generalBalance === false)) {
        const additionalGroup = document.createElement("optgroup");
        additionalGroup.label = "Additional";
        
        (bills.jsonData).forEach(bill => {
            if(!bill.generalBalance) {
                const option = document.createElement("option");
                option.value = bill.id;
                option.textContent = `${bill.emoji} ${bill.name} • ${bill.balance} ${getCurrencySymbol(bill.currency)}`;
                additionalGroup.appendChild(option);
            }
        })

        selectBills.appendChild(additionalGroup);
    }

    if(history.jsonData === null) {
        bills.jsonData.sort((a, b) => Number(b.balance) - Number(a.balance))
        selectBills.value = bills.jsonData[0].id;
    } else {
        const counts: any = {};
        history.jsonData.forEach(item => {
            const billId = item.bill.id;
            counts[billId] = (counts[billId] || 0) + 1;
        });
        let maxCount = 0;
        let mostFrequentBillId: any = null;
        for (const billId in counts) {
            if (counts[billId] > maxCount) {
                maxCount = counts[billId];
                mostFrequentBillId = billId;
            } else if (counts[billId] === maxCount) {
                bills.jsonData.sort((a, b) => Number(b.balance) - Number(a.balance))
                selectBills.value = bills.jsonData[0].id;
            }
        }

        const sorted = bills.jsonData.sort((a, b) => {
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

    function createOptionCategory() {
        if (expensePlan.status === 'error') {
            new Notice(expensePlan.error.message)
            console.error(expensePlan.error)
            return
        }
        if (incomePlan.status === 'error') {
            new Notice(incomePlan.error.message)
            console.error(incomePlan.error)
            return
        }

        if(resultRadio === 'expense'){
            selectCategory.empty()
            if(expensePlan.jsonData) {
                expensePlan.jsonData.sort((a, b) => Number(b.amount) - Number(a.amount))
                expensePlan.jsonData.forEach(plan => {
                    selectCategory.createEl('option', {
                        text: `${plan.emoji} ${plan.name} • ${plan.amount} ${getCurrencySymbol(MainPlugin.instance.settings.baseCurrency)}`,
                        attr: { 
                            value: plan.id
                        }
                    })
                })
            }
        } else {
            selectCategory.empty()
            if(incomePlan.jsonData) {
                incomePlan.jsonData.sort((a, b) => Number(b.amount) - Number(a.amount))
                incomePlan.jsonData.forEach(plan => {
                    selectCategory.createEl('option', {
                        text: `${plan.emoji} ${plan.name} • ${plan.amount} ${getCurrencySymbol(MainPlugin.instance.settings.baseCurrency)}`,
                        attr: { 
                            value: plan.id
                        }
                    })
                })
            }
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

    const beginningMonth_3day = Date.now() - new Date(new Date().getFullYear(), new Date().getMonth(), 0).getTime() > 3 * 24 * 60 * 60 * 1000;
    const beginningMonth_2day = Date.now() - new Date(new Date().getFullYear(), new Date().getMonth(), 0).getTime() > 2 * 24 * 60 * 60 * 1000;

    const selectDateButtonDiv = mainFormInput.createEl('div', {
        cls: 'form-selects-date-buttons'
    })

    if((selectedYear === null && selectedMonth === null) && beginningMonth_2day) {
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
    }
    if((selectedYear === null && selectedMonth === null) && beginningMonth_3day) {
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
        
        if(!(Number(inputSum.value) >= 1)) {
            inputSum.focus()
            return new Notice('Enter the amount')
        }

        const billOption = await searchElementById<BillData>(selectBills.value, 'Archive bills')
        if(billOption.status === 'error') {
            new Notice(billOption.error.message)
            console.error(billOption.error)
            return
        }
        if(billOption.item.currency !== MainPlugin.instance.settings.baseCurrency) {
            return new Notice('I apologize, but for now you can only add transactions to accounts in the base currency.')
        }

        const data: HistoryData = {
            id: String(generateUUID()),
            amount: String(inputSum.value),
            bill: {
                id: selectBills.value
            },
            category: {
                id: selectCategory.value
            }, 
            comment: commentInput.value.trim(),
            date: `${selectDate.value}T${getLocalTimeISO()}`,
            type: resultRadio,
        }
        const resultOfadd = await addJsonToHistory(data)
        if(resultOfadd.status === "success") {
            setTimeout(() => {
                FinancialAccountingView.instance.onOpen()
                new Notice('Operation added')
            }, 100)
        } else {
            new Notice(resultOfadd.error.message)
            console.error(resultOfadd.error)
        }
    })
}

export const addPlan = () => {
    const { contentEl } = FinancialAccountingView.instance;
    contentEl.empty()

    const exitButton = contentEl.createEl('div', {
        cls: 'exit-button',
        attr: {
            id: 'exit-button'
        }
    })
    setIcon(exitButton, 'arrow-left')
    exitButton.addEventListener('click', () => {
        FinancialAccountingView.instance.onOpen()
    })

    const header = contentEl.createEl('div', {
        cls: 'main-header'
    })
    header.createEl('h1', {
        text: 'Categories'
    })

    const mainAddForm = contentEl.createEl('form', {
        cls: 'main-add-form',
        attr: {
            id: 'main-add-form'
        }
    })

    // Form radio
    let resultRadio: 'expense' | 'income';
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

    if(radioExpense.dataset.radio === 'expense') {
        resultRadio = radioExpense.dataset.radio
        radioExpense.addClass('main-radion-button--active')
    }
    
    const radioIncome = expenseOrIncome.createEl('button', {
        text: 'Income',
        cls: 'main-radio_income',
        attr: {
            'data-radio': 'income',
            type: 'button'
        }
    })
    
    radioIncome.addEventListener('click', () => {
        if(radioIncome.dataset.radio === 'income') {
            radioExpense.removeClass('main-radion-button--active')
            radioIncome.addClass('main-radion-button--active')
            resultRadio = radioIncome.dataset.radio
            inputName.focus()
        }
    })
    radioExpense.addEventListener('click', () => {
        if(radioExpense.dataset.radio === 'expense') {
            radioIncome.removeClass('main-radion-button--active')
            radioExpense.addClass('main-radion-button--active')
            resultRadio = radioExpense.dataset.radio
            inputName.focus()
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

    const inputEmoji = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Emoji',
            id: 'input-emoji',
            type: 'text'
        }
    })
    inputEmoji.addEventListener('input', () => {
        const value = inputEmoji.value;
        const chars = Array.from(value);
        const emojiOnly = chars.filter(ch =>
            /\p{Extended_Pictographic}/u.test(ch)
        );
        inputEmoji.value = emojiOnly.slice(0, 1).join('');
    });

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

        if(!inputName.value) {
            inputName.focus()
            return new Notice('Enter the name')
        }

        const data: PlanData = {
            id: String(generateUUID()),
            name: inputName.value.trim(),
            emoji: inputEmoji.value,
            amount: '0',
            comment: commentInput.value.trim(),
            type: resultRadio,
        }
        const resultOfadd = await addJsonToPlan(data)
        if(resultOfadd.status === "success") {
            setTimeout(() => {
                FinancialAccountingView.instance.onOpen()
                new Notice('The plan has been added.')
            }, 100)
        } else {
            new Notice(resultOfadd.error.message)
            console.error(resultOfadd.error)
        }
    })
}

export const addBills = () => {
    const { contentEl } = FinancialAccountingView.instance;
    contentEl.empty()

    const exitButton = contentEl.createEl('div', {
        cls: 'exit-button',
        attr: {
            id: 'exit-button'
        }
    })
    setIcon(exitButton, 'arrow-left')
    exitButton.addEventListener('click', () => {
        FinancialAccountingView.instance.onOpen()
    })

    const header = contentEl.createEl('div', {
        cls: 'main-header'
    })
    header.createEl('h1', {
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

    const inputEmoji = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Emoji',
            id: 'input-emoji',
            type: 'text'
        }
    })
    inputEmoji.addEventListener('input', () => {
        const value = inputEmoji.value;
        const chars = Array.from(value);
        const emojiOnly = chars.filter(ch =>
            /\p{Extended_Pictographic}/u.test(ch)
        );
        inputEmoji.value = emojiOnly.slice(0, 1).join('');
    });

    const currencySelect = mainFormInput.createEl('select', {
        cls: 'form-selects',
        attr: {
            name: 'select-currency',
            id: 'select-currency'
        }
    })

    const { popularCurrencies, otherCurrencies } = getCurrencyGroups();

    // --- Popular ---
    const popularGroup = document.createElement("optgroup");
    popularGroup.label = "Popular";

    popularCurrencies.forEach(cur => {
        const option = document.createElement("option");
        option.value = cur.code;
        option.textContent = `${cur.code} • ${cur.name} • ${cur.symbol}`;
        popularGroup.appendChild(option);
    });

    // --- Other ---
    const otherGroup = document.createElement("optgroup");
    otherGroup.label = "All currencies";

    otherCurrencies.forEach(cur => {
        const option = document.createElement("option");
        option.value = cur.code;
        option.textContent = `${cur.code} ${cur.name} • ${cur.symbol}`;
        otherGroup.appendChild(option);
    });

    currencySelect.appendChild(popularGroup);
    currencySelect.appendChild(otherGroup);

    currencySelect.value = MainPlugin.instance.settings.baseCurrency;

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

    const checboxDiv = mainFormInput.createEl('div', {
        cls: 'form-checkbox-div'
    })

    const checkboxInput = checboxDiv.createEl('input', {
        cls: 'form-checkbox',
        attr: {
            id: 'input-checkbox',
            type: 'checkbox',
            checked: true
        }
    })

    checboxDiv.createEl('span', {
        text: 'Take into account in the general balance',
        cls: 'form-text',
    })

    currencySelect.addEventListener('change', () => {
        if(currencySelect.value !== MainPlugin.instance.settings.baseCurrency) {
            checkboxInput.checked = false
            checboxDiv.style.display = 'none'
        } else {
            checboxDiv.style.display = 'flex'
            checkboxInput.checked = true
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

        if(!inputName.value) {
            inputName.focus()
            return new Notice('Enter the name')
        }

        const data: BillData = {
            id: String(generateUUID()),
            name: inputName.value.trim(),
            emoji: inputEmoji.value,
            balance: String(currentBalance.value).trim(),
            currency: currencySelect.value,
            generalBalance: checkboxInput.checked,
            comment: commentInput.value.trim(),
        }
        const resultOfadd = await addJsonToBills(data)
        if(resultOfadd.status === "success") {
            setTimeout(() => {
                FinancialAccountingView.instance.onOpen()
                new Notice('The bill has been added.')
            }, 100)
        } else {
            new Notice(resultOfadd.error.message)
            console.error(resultOfadd.error)
        }
    })
}