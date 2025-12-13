import { Notice, setIcon } from 'obsidian';
import { deleteBill, deletePlan, deleteHistory } from '../controllers/deleteData';
import { searchElementById, getDataArchiveFile, getDataFile } from '../controllers/searchData';
import { viewInstance, pluginInstance } from '../../main';
import { fillMonthDates, humanizeDate, checkExpenceOrIncome, SummarizingDataForTheDay, getCurrencySymbol } from '../middleware/otherFunc';
import { editingJsonToHistory, editingJsonToPlan, editingJsonToBill } from '../controllers/editingData';
import { transferBetweenBills } from '../middleware/transferring'

export const editingHistory = async (e: any) => {
    const { id } = e.target.closest('li').dataset;
    if(!id) {
        return 'Element not found'
    }

    const { item, status } = await searchElementById(id, 'History')
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
    
    const { jsonData: resultBills, status: archiveStatus } = await getDataArchiveFile('Archive bills')
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
            
            const { jsonData: resultCategory, status } = await getDataFile('Expenditure plan');
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
            const { jsonData: resultCategory, status } = await getDataFile('Income plan');
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

    // const selectDateButtonDiv = mainFormInput.createEl('div', {
    //     cls: 'form-selects-date-buttons'
    // })

    // const selectDateToday = selectDateButtonDiv.createEl('button', {
    //     text: 'Today',
    //     attr: {
    //         type: 'button'
    //     }
    // })
    // selectDateToday.addClass('button-selects-date--active')
    // selectDateToday.addEventListener('click', () => {
    //     selectRelativeDate(selectDate, 0)
    // })
    // const selectDateYesterday = selectDateButtonDiv.createEl('button', {
    //     text: 'Yesterday',
    //     attr: {
    //         type: 'button'
    //     }
    // })
    // selectDateYesterday.addEventListener('click', () => {
    //     selectRelativeDate(selectDate, -1)
    // })
    // const selectDateTheDayBefotreYesterday = selectDateButtonDiv.createEl('button', {
    //     text: 'The day before yesterday',
    //     attr: {
    //         type: 'button'
    //     }
    // })
    // selectDateTheDayBefotreYesterday.addEventListener('click', () => {
    //     selectRelativeDate(selectDate, -2)
    // })

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
        const resultOfEditing = await editingJsonToHistory(data, item)
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

export const editingPlan = async (e: any) => {
    const { id, type } = e.target.closest('li').dataset;
    if(!id) {
        return 'Element not found'
    }
    
    const { item, status } = await searchElementById(id, type)
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
        const resultOfadd = await editingJsonToPlan(data)
        if(resultOfadd === "success") {
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('The plan has been edited.')
            }, 100)
        } else {
            new Notice(resultOfadd)
        }
    })

    let { jsonData: historyInfo } = await getDataFile('History');
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
        ).sort((a, b) => new Date(b[0].date) - new Date(a[0].date));
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
                const { item: itemCategory, status: statusPlan } = await searchElementById(e.category.id, e.type)
                if(statusPlan === 'success') {
                    dataItem.createEl('p', {
                        text: `${itemCategory.name}`
                    })
                } else {
                    dataItem.createEl('p', {
                        text: `Error: Plan not found by id`
                    })
                }
                const { item: itemBill, status: statusBill } = await searchElementById(e.bill.id, 'Archive bills')
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

export const editingBill = async (e: any) => {
    const { id } = e.target.closest('li').dataset;
    if(!id) {
        return 'Element not found'
    }

    const { item, status } = await searchElementById(id, 'Archive bills')
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

    const { jsonData: fullDataBills, status: archiveStatus } = await getDataArchiveFile('Archive bills')
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }

    if(fullDataBills.length > 1) {
        const transferUploadDiv = mainFormInput.createEl('div', {
            cls: 'form-transfer-expense-div'
        })
        setIcon(transferUploadDiv, 'upload')
        const transferUploadText = transferUploadDiv.createEl('span', {
            text: 'Transactions between bills',
            cls: 'form-text-transfer',
        })
        transferUploadDiv.addEventListener('click', async () => {
            await transferBetweenBills(item.id)
        })
    }

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
        const resultOfadd = await editingJsonToBill(data)
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