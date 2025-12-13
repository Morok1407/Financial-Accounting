import { Notice, setIcon } from "obsidian";
import { HistoryData, PlanData, BillData  } from "../../main";
import { addJsonToHistory, addJsonToPlan, addJsonToBills } from "../controllers/addData";
import { getDataArchiveFile, getDataFile } from "src/controllers/searchData";
import { pluginInstance, viewInstance, stateManager } from "../../main";
import { getCurrencySymbol, fillMonthDates, getLocalTimeISO, selectRelativeDate, getCurrencyGroups, generateUUID } from "../middleware/otherFunc";

export const addHistory = async () => {
    const { jsonData: resultBills, status: archiveStatus } = await getDataArchiveFile('Archive bills')
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }
    if(resultBills === null) {
        return new Notice('Add bills')
    } 
    const { jsonData: resultExpenditurePlan, status: statusExpenditurePlan } = await getDataFile('Expenditure plan')
    if(!(statusExpenditurePlan === 'success')) {
        return statusExpenditurePlan
    }
    if(resultExpenditurePlan === null) {
        return new Notice('Add expenditure plan')
    } 
    const { jsonData: resultIncomePlan, status: statusIncomePlan } = await getDataFile('Income plan')
    if(!(statusIncomePlan === 'success')) {
        return statusExpenditurePlan
    }
    if(resultIncomePlan === null) {
        return new Notice('Add income plan')
    }
    const { jsonData: resultHistory, status: statusHistory } = await getDataFile('History')
    if(!(statusHistory === 'success')) {
        return statusHistory
    }

    const { contentEl } = viewInstance;
    const { selectedYear, selectedMonth } = stateManager();
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
            const { jsonData: resultExpenseCategory, status: expenseStatus } = await getDataFile('Expenditure plan')
            if(!(expenseStatus === 'success')) {
                return expenseStatus
            }
            resultExpenseCategory.sort((a, b) => b.amount - a.amount)
            resultExpenseCategory.forEach(plan => {
                selectCategory.createEl('option', {
                    text: `${plan.name} • ${plan.amount} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`,
                    attr: { 
                        value: plan.id
                    }
                })
            })
        } else {
            selectCategory.empty()
            const { jsonData: resultIncomeCategory, status: incomeStatus } = await getDataFile('Income plan')
            if(!(incomeStatus === 'success')) {
                return incomeStatus
            }
            resultIncomeCategory.sort((a, b) => b.amount - a.amount)
            resultIncomeCategory.forEach(plan => {
                selectCategory.createEl('option', {
                    text: `${plan.name} • ${plan.amount} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`,
                    attr: { 
                        value: plan.id
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
        
        if(!(Number(inputSum.value) >= 1)) {
            inputSum.focus()
            return new Notice('Enter the amount')
        }

        const data: HistoryData = {
            id: String(generateUUID()),
            amount: Number(inputSum.value),
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

export const addPlan = () => {
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

        const data: PlanData = {
            id: String(generateUUID()),
            name: inputName.value.trim(),
            amount: 0,
            comment: commentInput.value.trim(),
            type: resultRadio,
        }
        const resultOfadd = await addJsonToPlan(data)
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

export const addBills = () => {
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

    currencyInput.appendChild(popularGroup);
    currencyInput.appendChild(otherGroup);

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

        const data: BillData = {
            id: String(generateUUID()),
            name: inputName.value.trim(),
            balance: Number(currentBalance.value),
            currency: currencyInput.value,
            generalBalance: checkboxInput.checked,
            comment: commentInput.value.trim(),
        }
        const resultOfadd = await addJsonToBills(data)
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