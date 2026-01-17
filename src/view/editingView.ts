import { Notice, setIcon } from 'obsidian';
import { deleteBill, deletePlan, deleteHistory } from '../controllers/deleteData';
import { searchElementById, getDataArchiveFile, getDataFile } from '../controllers/searchData';
import { viewInstance, pluginInstance, HistoryData, PlanData, BillData, TransferData } from '../../main';
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
    header.createEl('h1', {
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
    
    const { jsonData: resultBills, status: archiveStatus } = await getDataArchiveFile<BillData>('Archive bills')
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }
    if(resultBills === null || resultBills === undefined) throw new Error('Bill is null or undefined')

    // --- Main ---
    if(resultBills.some(i => i.generalBalance === true)) {
        const mainGroup = document.createElement("optgroup");
        mainGroup.label = "Main";
        
        resultBills.forEach(bill => {
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
    if(resultBills.some(i => i.generalBalance === false)) {
        const additionalGroup = document.createElement("optgroup");
        additionalGroup.label = "Additional";
    
        resultBills.forEach(bill => {
            if(!bill.generalBalance) {
                const option = document.createElement("option");
                option.value = bill.id;
                option.textContent = `${bill.emoji} ${bill.name} • ${bill.balance} ${getCurrencySymbol(bill.currency)}`;
                additionalGroup.appendChild(option);
            }
        })

        selectBills.appendChild(additionalGroup);
    }

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
            
            const { jsonData: resultCategory, status } = await getDataFile<PlanData>('Expenditure plan');
            if(!(status === 'success')) {
                return status
            }
            if(resultCategory === null || resultCategory === undefined) throw new Error('Expenditure plan is null or undefined') 

            resultCategory.sort((a, b) => Number(b.amount) - Number(a.amount))
            resultCategory.forEach(plan => {
                if(plan.id === item.category.id) {
                    selectCategory.createEl('option', {
                        text: `${plan.emoji} ${plan.name} • ${plan.amount} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`,
                        attr: { value: plan.id, selected: 'selected' }
                    })
                    return
                }
                selectCategory.createEl('option', {
                    text: `${plan.emoji} ${plan.name} • ${plan.amount} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`,
                    attr: { value: plan.id }
                })
            })
        } else if (item.type === 'income') {
            selectCategory.empty()
            const { jsonData: resultCategory, status } = await getDataFile<PlanData>('Income plan');
            if(!(status === 'success')) {
                return status
            }
            if(resultCategory === null || resultCategory === undefined) throw new Error('Expenditure plan is null or undefined') 

            resultCategory.sort((a, b) => Number(b.amount) - Number(a.amount))
            resultCategory.forEach(plan => {
                if(plan.id === item.category.id) {
                    selectCategory.createEl('option', {
                        text: `${plan.emoji} ${plan.name} • ${plan.amount} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`,
                        attr: { value: plan.id, selected: 'selected' }
                    })
                    return
                }
                selectCategory.createEl('option', {
                    text: `${plan.emoji} ${plan.name} • ${plan.amount} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`,
                    attr: { value: plan.id }
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

        if(!(Number(inputSum.value) >= 1)) {
            inputSum.focus()
            return new Notice('Enter the amount')
        }

        const { item: billOption } = await searchElementById(selectBills.value, 'Archive bills')
        if(billOption.currency !== pluginInstance.settings.baseCurrency) {
            return new Notice('I apologize, but for now you can only add transactions to accounts in the base currency.')
        }

        const data: HistoryData = {
            id: item.id,
            amount: String(inputSum.value),
            bill: {
                id: selectBills.value
            },
            category: {
                id: selectCategory.value
            },
            comment: commentInput.value,
            date: `${selectDate.value}T${item.date.split('T')[1]}`,
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
            type: 'text',
            value: item.name,
        }
    })

    const inputEmoji = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Emoji',
            id: 'input-emoji',
            type: 'text',
            value: item.emoji
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

        if(!inputName.value) {
            inputName.focus()
            return new Notice('Enter the name')
        }

        const data: PlanData = {
            id: item.id,
            name: inputName.value.trim(),
            emoji: inputEmoji.value,
            amount: item.amount,
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

    let { jsonData: historyInfo } = await getDataFile<HistoryData>('History');
    if(historyInfo === undefined) throw new Error('History is undefined')
    if(historyInfo !== null) {
        const filterHistoryInfo = historyInfo.filter(item => item.category.id === id)
        if(filterHistoryInfo.length < 1) {
            return
        }
        const now: any = new Date();
        const groupedByDay = Object.values(
            filterHistoryInfo.reduce((acc: any, item: any) => {
                const day = item.date.split('T')[0]; 
                if (!acc[day]) acc[day] = [];
                acc[day].push(item);
                return acc;
            }, {})
        ).sort((a: any, b: any) => new Date(b[0].date).getTime() - new Date(a[0].date).getTime());
        const result = groupedByDay.map((dayGroup: any) => 
            dayGroup.sort((a: any, b: any) => Math.abs(new Date(a.date).getTime() - now) - Math.abs(new Date(b.date).getTime() - now))
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
            e.forEach(async (e: any, i: any) => {
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
                const { item: itemBill, status: statusBill } = await searchElementById(e.bill.id, 'Archive bills')
                if(statusPlan !== 'success') return new Notice(statusPlan)
                if(statusBill !== 'success') return new Notice(statusBill)

                const dataText = dataItem.createEl('div', {
                    cls: 'data-link'
                })

                const divEmoji = dataText.createEl('div', {
                    cls: 'data-link-emoji'
                })
                const divText = dataText.createEl('div', {
                    cls: 'data-link-text'
                })

                divEmoji.createEl('p', {
                    text: `${itemCategory.emoji}`
                })
                divEmoji.createEl('span', {
                    text: `${itemBill.emoji}`
                })

                if(e.comment === '') {
                    divText.createEl('p', {
                        text: `${itemCategory.name}`
                    })
                    divText.createEl('span', {
                        text: `${itemBill.name}`
                    })
                } else {
                    divText.createEl('p', {
                        text: `${e.comment}`
                    })
                    divText.createEl('span', {
                        text: `${itemCategory.name} • ${itemBill.name}`
                    })
                }

                const dataAmount = dataItem.createEl('div', {
                    cls: 'data-link'
                })
                dataAmount.createEl('p', {
                    text: `${checkExpenceOrIncome(e.amount, e.type)} ${getCurrencySymbol(itemBill.currency)}`
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

    const inputEmoji = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Emoji',
            id: 'input-emoji',
            type: 'text',
            value: item.emoji
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
    if(fullDataBills === null || fullDataBills === undefined) throw new Error('Bills is null or undefined')

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
            await transferBetweenBillsView(item.id)
        })
    }

    const chechboxDiv = mainFormInput.createEl('div', {
        cls: 'form-checkbox-div'
    })

    if(item.currency !== pluginInstance.settings.baseCurrency) {
        chechboxDiv.style.display = 'none'
    }
    
    const checkboxInput = chechboxDiv.createEl('input', {
        cls: 'form-checkbox',
        attr: {
            id: 'input-checkbox',
            type: 'checkbox',
            checked: item.generalBalance ? 'checked' : null,
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

        if(!inputName.value) {
            inputName.focus()
            return new Notice('Enter the name')
        }
        const data: BillData = {
            id: item.id,
            name: inputName.value.trim(),
            emoji: inputEmoji.value,
            balance: String(currentBalance.value.trim()),
            currency: item.currency,
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

export const transferBetweenBillsView = async (billId: string) => {
    if(!billId) {
        return 'Element not found'
    }

    const { jsonData: resultBills, status } = await getDataArchiveFile<BillData>('Archive bills')
    if(!status) return status
    if(!resultBills) return 'Bill is null or undifined'

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
    if(resultBills.some(i => i.generalBalance === true)) {
        const fromBillMainGroup = document.createElement("optgroup");
        fromBillMainGroup.label = "Main";
        
        resultBills.forEach(bill => {
            if(bill.generalBalance) {
                const option = document.createElement("option");
                option.value = bill.id;
                option.textContent = `${bill.name} • ${bill.balance} ${getCurrencySymbol(bill.currency)}`;
                option.dataset.currency = bill.currency;
                fromBillMainGroup.appendChild(option);
            }
        })

        selectFromBill.appendChild(fromBillMainGroup);
    }

    // --- Additional ---
    if(resultBills.some(i => i.generalBalance === false)) {
        const fromBillAdditionalGroup = document.createElement("optgroup");
        fromBillAdditionalGroup.label = "Additional";
    
        resultBills.forEach(bill => {
            if(!bill.generalBalance) {
                const option = document.createElement("option");
                option.value = bill.id;
                option.textContent = `${bill.name} • ${bill.balance} ${getCurrencySymbol(bill.currency)}`;
                option.dataset.currency = bill.currency;
                fromBillAdditionalGroup.appendChild(option);
            }
        })
    
        selectFromBill.appendChild(fromBillAdditionalGroup);
    }
    selectFromBill.value = billId;

    const sourceAmount = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Source amount',
            id: 'input-source-amount',
            type: 'number',
            inputmode: "decimal",
            style: 'display: none;'
        }
    })

    const selectToBill = mainFormInput.createEl('select', {
        cls: 'form-selects',
        attr: {
            name: 'select-to-bill',
            id: 'select-to-bill'
        }
    })
    selectToBill.createEl('option', {
        text: 'Select an account',
        attr: {
            value: '',
            selected: '',
            disabled: '',
            hidden: '',
        },
    })

    // --- Main ---
    if(resultBills.some(i => i.generalBalance === true)) {
        const toBillmainGroup = document.createElement("optgroup");
        toBillmainGroup.label = "Main";
        
        resultBills.forEach(bill => {
            if(bill.generalBalance) {
                const option = document.createElement("option");
                option.value = bill.id;
                option.textContent = `${bill.name} • ${bill.balance} ${getCurrencySymbol(bill.currency)}`;
                option.dataset.currency = bill.currency;
                toBillmainGroup.appendChild(option);
            }
        })

        selectToBill.appendChild(toBillmainGroup);
    }

    // --- Additional ---
    if(resultBills.some(i => i.generalBalance === false)) {
        const toBilladditionalGroup = document.createElement("optgroup");
        toBilladditionalGroup.label = "Additional";
    
        resultBills.forEach(bill => {
            if(!bill.generalBalance) {
                const option = document.createElement("option");
                option.value = bill.id;
                option.textContent = `${bill.name} • ${bill.balance} ${getCurrencySymbol(bill.currency)}`;
                option.dataset.currency = bill.currency;
                toBilladditionalGroup.appendChild(option);
            }
        })
    
        selectToBill.appendChild(toBilladditionalGroup);
    }

    const targetAmount = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Target amount',
            id: 'input-target-amount',
            type: 'number',
            inputmode: "decimal",
            style: 'display: none;'
        }
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

    selectFromBill.addEventListener('change', () => {
        const selectedOptionFrom = selectFromBill.options[selectFromBill.selectedIndex];
        const selectedOptionTo = selectToBill.options[selectToBill.selectedIndex];

        if(selectedOptionTo.value === '') {
            sourceAmount.style.display = 'none';
            targetAmount.style.display = 'none';
            inputSum.style.display = 'block';
            return
        }

        if(selectedOptionFrom.dataset.currency === selectedOptionTo.dataset.currency) {
            sourceAmount.style.display = 'none';
            targetAmount.style.display = 'none';
            inputSum.style.display = 'block';
        } else {
            sourceAmount.style.display = 'block';
            targetAmount.style.display = 'block';
            inputSum.style.display = 'none';
        }
    })
    selectToBill.addEventListener('change', () => {
        const selectedOptionFrom = selectFromBill.options[selectFromBill.selectedIndex];
        const selectedOptionTo = selectToBill.options[selectToBill.selectedIndex];

        if(selectedOptionTo.dataset.currency === selectedOptionFrom.dataset.currency) {
            sourceAmount.style.display = 'none';
            targetAmount.style.display = 'none';
            inputSum.style.display = 'block';
        } else {
            sourceAmount.style.display = 'block';
            targetAmount.style.display = 'block';
            inputSum.style.display = 'none';
        }
    })

    const addButton = mainFormInput.createEl('button', {
        text: 'Transfer',
        cls: 'add-button',
        attr: {
            type: 'submit'
        }
    })
    addButton.addEventListener('click', async e => {
        e.preventDefault();

        if (!selectToBill.value) {
            return new Notice('Select an account');
        }

        const fromOption = selectFromBill.options[selectFromBill.selectedIndex];
        const toOption = selectToBill.options[selectToBill.selectedIndex];

        const isSameCurrency =
            fromOption.dataset.currency === toOption.dataset.currency;

        let transferData: TransferData;

        if (isSameCurrency) {
            if (!inputSum.value) {
                inputSum.focus();
                return new Notice('Enter the amount');
            }

            transferData = {
                type: 'same-currency',
                fromBillId: selectFromBill.value,
                toBillId: selectToBill.value,
                amount: Number(inputSum.value),
            };
        } else {
            if (!sourceAmount.value || !targetAmount.value) {
                (!sourceAmount.value ? sourceAmount : targetAmount).focus();
                return new Notice('Enter both amounts');
            }

            transferData = {
                type: 'cross-currency',
                fromBillId: selectFromBill.value,
                toBillId: selectToBill.value,
                sourceAmount: Number(sourceAmount.value),
                targetAmount: Number(targetAmount.value),
            };
        }

        const result = await transferBetweenBills(transferData);

        if (result === 'success') {
            setTimeout(() => {
                viewInstance.onOpen();
                new Notice('Transfer completed');
            }, 100);
        } else {
            new Notice(result);
        }
    });
}