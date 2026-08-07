import Big from "big.js";
import { Notice } from "obsidian";
import { stateManager, HistoryData, PlanData, BillData, DataFileResult } from "../../main";
import { getMainData, getAdditionalData, searchElementById, searchHistory } from "../controllers/searchData";
import { addHistory, addPlan, addBills } from '../view/addView';
import { editingHistory, editingPlan, editingBill } from '../view/editingView';
import { humanizeDate, SummarizingDataForTheDay, checkExpenceOrIncome, SummarizingDataForTheFalseBills, SummarizingDataForTheTrueBills, SummarizingData, getCurrencySymbol } from "../middleware/otherFunc";

export const showHistory = async (mainContentBody: HTMLDivElement, mainContentButton: HTMLDivElement) => {
    stateManager({ openPageNow: "History" });

    const history = await getMainData();
    if(history.status === 'error') {
        new Notice(history.error.message)
        console.error(history.error)
        return
    }

    if(!history.jsonData.length) {
        const undefinedContent = mainContentBody.createEl('div', {
            cls: 'undefined-content'
        })
        mainContentBody.addClass('main-content-body--undefined')

        undefinedContent.createEl('span', {
            text: '🍕 🎮 👕'
        })

        undefinedContent.createEl('p', {
            text: 'Enter any income and expenses to see how much money is actually left.'
        })
    } else {
        mainContentBody.removeClass('main-content-body--undefined')
        const searchInput = mainContentBody.createEl('input', {
            cls: 'input-search',
            attr: {
                id: 'input-search',
                type: 'search',
                placeholder: "Search by operations"
            }
        })
        searchInput.addEventListener('input', (e: Event) => { void handleSearchInput(e, historyContent, mainContentBody); });
    }
    const historyContent = mainContentBody.createEl('div', {
        cls: 'history-content'
    })

    generationHistoryContent(historyContent, history, mainContentBody, mainContentButton).catch(err => { console.error('generationHistoryContent failed', err); });
}

async function handleSearchInput(e: Event, historyContent: HTMLDivElement, mainContentBody: HTMLDivElement) {
    const target = e.target as HTMLInputElement;
    const searchValue = target.value;

    const result = await searchHistory(searchValue);

    if (result.status === 'error') {
        new Notice(result.error.message);
        console.error(result.error);
        return;
    }

    historyContent.empty();

    if (!result.jsonData.length) {
        const undefinedContent = historyContent.createEl('div', {
            cls: 'undefined-content'
        });
        historyContent.addClass('main-content-body--undefined');

        undefinedContent.createEl('span', { text: '🍕 🎮 👕' });
        undefinedContent.createEl('p', { text: 'No matching operations found.' });
    } else if (result.jsonData.length >= 1) {
        historyContent.removeClass('main-content-body--undefined');
        void generationHistoryContent(historyContent, result, mainContentBody);
    } else {
        historyContent.removeClass('main-content-body--undefined');
        void generationHistoryContent(historyContent, result, mainContentBody);
    }
}

export async function generationHistoryContent(historyContent: HTMLDivElement,  historyData: DataFileResult<HistoryData>, mainContentBody?: HTMLDivElement, mainContentButton?: HTMLDivElement) {
    mainContentBody?.removeClass('main-content-body--padding')
    if(historyData.status === 'error') return historyData.error;
    if(historyData.jsonData.length) {
        const now = new Date().getTime();

        const groupedByDay = Object.values(
        historyData.jsonData.reduce<Record<string, HistoryData[]>>(
                (acc, item) => {
                    const day = item.date.split('T')[0];

                    if (!acc[day]) {
                        acc[day] = [];
                    }

                    acc[day].push(item);
                    return acc;
                },
                {}
            )
        )
        .map(group => group.flat())
        .sort(
            (a, b) =>
                new Date(b[0].date).getTime() -
                new Date(a[0].date).getTime()
        );

        const result = groupedByDay.map(dayGroup =>
            dayGroup.sort(
                (a, b) =>
                    Math.abs(new Date(a.date).getTime() - now) -
                    Math.abs(new Date(b.date).getTime() - now)
            )
        );

        for (const historyElement of result) {
            const historyBlock = historyContent.createEl('div', {
                cls: 'history-block'
            })
            
            const headerBlock = historyBlock.createEl('div', {
                cls: 'header-block'
            })
            const dateBlock = headerBlock.createEl('div', {
                cls: 'header-date-block'
            })
            dateBlock.createEl('p', {
                text: humanizeDate(historyElement[0].date.split("T")[0])
            })
            const amountBlock = headerBlock.createEl('div', {
                cls: 'header-amount-block'
            })
            amountBlock.createEl('span', {
                text: `${SummarizingDataForTheDay(historyElement)}`
            })
            const dataList = historyBlock.createEl('ul', {
                cls: 'data-list'
            })
            for (const element of historyElement) {
                const dataItem = dataList.createEl('li', {
                    cls: 'data-item',
                    attr: {
                        'data-id': element.id
                    }
                })
                dataItem.onclick = (e: MouseEvent) => {
                    void editingHistory(e);
                };
                
                const searchCategory = await searchElementById<PlanData>(element.category.id, element.type)
                if (searchCategory.status === 'error') return new Notice(searchCategory.error.message)
                const searchBill = await searchElementById<BillData>(element.bill.id, 'accounts')
                if (searchBill.status === 'error') return new Notice(searchBill.error.message)
                    
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
                    text: `${searchCategory.item.emoji}`
                })
                divEmoji.createEl('span', {
                    text: `${searchBill.item.emoji}`
                })

                if(element.comment === '') {
                    divText.createEl('p', {
                        text: `${searchCategory.item.name}`
                    })
                    divText.createEl('span', {
                        text: `${searchBill.item.name}`
                    })
                } else {
                    divText.createEl('p', {
                        text: `${element.comment}`
                    })
                    divText.createEl('span', {
                        text: `${searchBill.item.name} • ${searchCategory.item.name}`
                    })
                }

                const dataAmount = dataItem.createEl('div', {
                    cls: 'data-link-amount'
                })
                dataAmount.createEl('p', {
                    text: `${checkExpenceOrIncome(element.amount, element.type)} ${getCurrencySymbol(searchBill.item.currency)}`
                })
                if(element.type === 'income') {
                    dataAmount.addClass('data-link-amount-income')
                }
            }
        }
    }

    const addHistoryButton = mainContentButton?.createEl('button', {
        text: 'Add an expense or income',
        cls: 'add-button'
    })
    addHistoryButton?.addEventListener('click', () => {
        void addHistory();
    })
}

export const showPlans = async (mainContentBody: HTMLDivElement, mainContentButton: HTMLDivElement) => {
    mainContentBody.removeClass('main-content-body--padding')
    stateManager({ openPageNow: "Plans" });
    const expensePlan = await getAdditionalData<PlanData>('categories', 'expenditure_plan');
    if(expensePlan.status === 'error') {
        new Notice(expensePlan.error.message)
        console.error(expensePlan.error)
        return
    }

    const incomePlan = await getAdditionalData<PlanData>('categories', 'income_plan');
    if(incomePlan.status === 'error') {
        new Notice(incomePlan.error.message)
        console.error(incomePlan.error)
        return
    }

    const arcivedExpensePlan = expensePlan.jsonData.filter((e: PlanData) => e.archived)
    const arcivedIncomePlan = incomePlan.jsonData.filter((e: PlanData) => e.archived)

    const notArcivedExpensePlan = expensePlan.jsonData.filter((e: PlanData) => !e.archived)
    const notArcivedIncomePlan = incomePlan.jsonData.filter((e: PlanData) => !e.archived)

    if(!expensePlan.jsonData.length && !incomePlan.jsonData.length) {
        const undefinedContent = mainContentBody.createEl('div', {
            cls: 'undefined-content'
        })
        mainContentBody.addClass('main-content-body--undefined')

        undefinedContent.createEl('span', {
            text: '🍕 🎮 👕'
        })

        undefinedContent.createEl('p', {
            text: 'Enter any income and expenses to see how much money is actually left.'
        })
    } else {
        if(notArcivedExpensePlan.length) {
            mainContentBody.removeClass('main-content-body--undefined')
            const resultExpense = notArcivedExpensePlan.slice().sort((a: PlanData, b: PlanData) => new Big(b.amount).cmp(new Big(a.amount)))
            const expensePlanBlock = mainContentBody.createEl('div', {
                cls: 'plan-block'
            })
            const expenseDateBlock = expensePlanBlock.createEl('div', {
                cls: 'header-block'
            })
            const typeBlock = expenseDateBlock.createEl('div', {
                cls: 'header-type-block'
            })
            typeBlock.createEl('span', {
                text: 'Expense'
            })
            const amountBlock = expenseDateBlock.createEl('div', {
                cls: 'header-amount-block'
            })
            amountBlock.createEl('span', {
                text: String(SummarizingData(resultExpense)),
                cls: 'expense-plan-amount'
            })
            const expenseDataList = expensePlanBlock.createEl('ul', {
                cls: 'data-list'
            })
            resultExpense.forEach((e: PlanData) => {
                const dataItem = expenseDataList.createEl('li', {
                    cls: 'data-item',
                    attr: {
                            'data-id': e.id,
                            'data-type': e.type
                        }
                })
                dataItem.onclick = (e: MouseEvent) => {
                    void editingPlan(e);
                };
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
                    text: `${e.emoji}`
                })
                divText.createEl('p', {
                    text: `${e.name}`
                })
                dataItem.createEl('p', {
                    text: String(e.amount),
                    cls: 'expense-plan-amount'
                })
            })
        }
        if(arcivedExpensePlan.length) {
            mainContentBody.removeClass('main-content-body--undefined')
            const resultExpense = arcivedExpensePlan.slice().sort((a: PlanData, b: PlanData) => new Big(b.amount).cmp(new Big(a.amount)))
            const expensePlanBlock = mainContentBody.createEl('div', {
                cls: 'plan-block'
            })
            const expenseDateBlock = expensePlanBlock.createEl('div', {
                cls: 'header-block'
            })
            const typeBlock = expenseDateBlock.createEl('div', {
                cls: 'header-type-block'
            })
            typeBlock.createEl('span', {
                text: 'Archived expense'
            })
            const amountBlock = expenseDateBlock.createEl('div', {
                cls: 'header-amount-block'
            })
            amountBlock.createEl('span', {
                text: String(SummarizingData(resultExpense)),
                cls: 'expense-plan-amount'
            })
            const expenseDataList = expensePlanBlock.createEl('ul', {
                cls: 'data-list'
            })
            const showButton = expenseDataList.createEl('li', {
                cls: 'data-item archived-button'
            })
            const showDivEmoji = showButton.createEl('div', {
                cls: 'data-link-emoji'
            })
            const showDivText = showButton.createEl('div', {
                cls: 'data-link-text'
            })
            showDivEmoji.createEl('p', {
                text: '🗃️'
            })
            showDivText.createEl('p', {
                text: `${arcivedExpensePlan.length} archived`,
            })
            showButton.onclick = () => {
                showButton.remove()
                resultExpense.forEach((e: PlanData) => {
                    const dataItem = expenseDataList.createEl('li', {
                        cls: 'data-item archived-item',
                        attr: {
                                'data-id': e.id,
                                'data-type': e.type
                            }
                    })
                    dataItem.onclick = (e: MouseEvent) => {
                        void editingPlan(e);
                    };
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
                        text: `${e.emoji}`
                    })
                    divText.createEl('p', {
                        text: `${e.name}`
                    })
                    dataItem.createEl('p', {
                        text: String(e.amount),
                        cls: 'expense-plan-amount'
                    })
                })
            }
        }
        if(notArcivedIncomePlan.length) {
            mainContentBody.removeClass('main-content-body--undefined')
            const resultIncome = notArcivedIncomePlan.slice().sort((a: PlanData, b: PlanData) => new Big(b.amount).cmp(new Big(a.amount)))
            const incomePlanBlock = mainContentBody.createEl('div', {
                cls: 'plan-block'
            })
            const incomeDateBlock = incomePlanBlock.createEl('div', {
                cls: 'header-block'
            })
            const typeBlock = incomeDateBlock.createEl('div', {
                cls: 'header-type-block'
            })
            typeBlock.createEl('span', {
                text: 'Income'
            })
            const amountBlock = incomeDateBlock.createEl('div', {
                cls: 'header-amount-block'
            })
            amountBlock.createEl('span', {
                text: String(SummarizingData(resultIncome)),
                cls: 'income-plan-amount'
            })
            const incomeDataList = incomePlanBlock.createEl('ul', {
                cls: 'data-list'
            })
            resultIncome.forEach((e: PlanData) => {
                const dataItem = incomeDataList.createEl('li', {
                    cls: 'data-item',
                    attr: {
                            'data-id': e.id,
                            'data-type': e.type
                        }
                })
                dataItem.onclick = (e: MouseEvent) => {
                    void editingPlan(e);
                };
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
                    text: `${e.emoji}`
                })
                divText.createEl('p', {
                    text: `${e.name}`
                })
                dataItem.createEl('p', {
                    text: String(e.amount),
                    cls: 'income-plan-amount'
                })
            })
        }
        if(arcivedIncomePlan.length) {
            mainContentBody.removeClass('main-content-body--undefined')
            const resultIncome = arcivedIncomePlan.slice().sort((a: PlanData, b: PlanData) => new Big(b.amount).cmp(new Big(a.amount)))
            const incomePlanBlock = mainContentBody.createEl('div', {
                cls: 'plan-block'
            })
            const incomeDateBlock = incomePlanBlock.createEl('div', {
                cls: 'header-block'
            })
            const typeBlock = incomeDateBlock.createEl('div', {
                cls: 'header-type-block'
            })
            typeBlock.createEl('span', {
                text: 'Archived income'
            })
            const amountBlock = incomeDateBlock.createEl('div', {
                cls: 'header-amount-block'
            })
            amountBlock.createEl('span', {
                text: String(SummarizingData(resultIncome)),
                cls: 'income-plan-amount'
            })
            const incomeDataList = incomePlanBlock.createEl('ul', {
                cls: 'data-list'
            })
            const showButton = incomeDataList.createEl('li', {
                cls: 'data-item archived-button'
            })
            const showDivEmoji = showButton.createEl('div', {
                cls: 'data-link-emoji'
            })
            const showDivText = showButton.createEl('div', {
                cls: 'data-link-text'
            })
            showDivEmoji.createEl('p', {
                text: '🗃️'
            })
            showDivText.createEl('p', {
                text: `${arcivedIncomePlan.length} archived`,
            })
            showButton.onclick = () => {
                showButton.remove()
                resultIncome.forEach((e: PlanData) => {
                    const dataItem = incomeDataList.createEl('li', {
                        cls: 'data-item archived-item',
                        attr: {
                                'data-id': e.id,
                                'data-type': e.type
                            }
                    })
                    dataItem.onclick = (e: MouseEvent) => {
                        void editingPlan(e);
                    };
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
                        text: `${e.emoji}`
                    })
                    divText.createEl('p', {
                        text: `${e.name}`
                    })
                    dataItem.createEl('p', {
                        text: String(e.amount),
                        cls: 'income-plan-amount'
                    })
                })
            }
        }
    }

    const addPlanButton = mainContentButton.createEl('button', {
        text: 'Create a category',
        cls: 'add-button'
    })
    addPlanButton.addEventListener('click', (): void => {
        addPlan();
    })
}

export const showBills = async (mainContentBody: HTMLDivElement, mainContentButton: HTMLDivElement) => {
    mainContentBody.removeClass('main-content-body--padding')
    stateManager({ openPageNow: "Bills" });
    const bills = await getAdditionalData<BillData>('accounts');
    if(bills.status === 'error') {
        new Notice(bills.error.message)
        console.error(bills.error)
        return
    }

    const notArcivedMainBills = bills.jsonData.filter((e: BillData) => !e.archived && e.generalBalance)
    const notArcivedAdditionalBills = bills.jsonData.filter((e: BillData) => !e.archived && !e.generalBalance)
    const arcivedMainBills = bills.jsonData.filter((e: BillData) => e.archived && e.generalBalance)
    const arcivedAdditionalBills = bills.jsonData.filter((e: BillData) => e.archived && !e.generalBalance)

    if(!bills.jsonData.length) {
        const undefinedContent = mainContentBody.createEl('div', {
            cls: 'undefined-content'
        })
        mainContentBody.addClass('main-content-body--undefined')

        undefinedContent.createEl('span', {
            text: '🍕 🎮 👕'
        })

        undefinedContent.createEl('p', {
            text: 'Enter any income and expenses to see how much money is actually left.'
        })
    } else {
        if(notArcivedMainBills.length >= 1) {
            mainContentBody.removeClass('main-content-body--undefined')
            const trueBillBlock = mainContentBody.createEl('div', {
                cls: 'bill-block'
            })
            const trueDateBlock = trueBillBlock.createEl('div', {
                cls: 'header-block'
            })
            const typeBlock = trueDateBlock.createEl('div', {
                cls: 'header-type-block'
            })
            typeBlock.createEl('span', {
                text: 'Main'
            })
            const amountBlock = trueDateBlock.createEl('div', {
                cls: 'header-amount-block'
            })
            amountBlock.createEl('span', {
                text: String(SummarizingDataForTheTrueBills(notArcivedMainBills))
            })
            const trueDataList = trueBillBlock.createEl('ul', {
                cls: 'data-list'
            })

            notArcivedMainBills.forEach((e: BillData) => {
                const dataItem = trueDataList.createEl('li', {
                    cls: 'data-item',
                    attr: {
                            'data-id': e.id
                        }
                })
                dataItem.onclick = async (e: MouseEvent) => {
                    await editingBill(e);
                }
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
                    text: `${e.emoji}`
                })
                divText.createEl('p', {
                    text: `${e.name}`
                })
                dataItem.createEl('p', {
                    text: `${String(e.balance)} ${getCurrencySymbol(e.currency)}`
                })
            })
        }

        if(arcivedMainBills.length >= 1) {
            mainContentBody.removeClass('main-content-body--undefined')
            const trueBillBlock = mainContentBody.createEl('div', {
                cls: 'bill-block'
            })
            const trueDateBlock = trueBillBlock.createEl('div', {
                cls: 'header-block'
            })
            const typeBlock = trueDateBlock.createEl('div', {
                cls: 'header-type-block'
            })
            typeBlock.createEl('span', {
                text: 'Archived main'
            })
            const amountBlock = trueDateBlock.createEl('div', {
                cls: 'header-amount-block'
            })
            amountBlock.createEl('span', {
                text: String(SummarizingDataForTheTrueBills(arcivedMainBills))
            })
            const trueDataList = trueBillBlock.createEl('ul', {
                cls: 'data-list'
            })

            const showButton = trueDataList.createEl('li', {
                cls: 'data-item archived-button'
            })
            const showDivEmoji = showButton.createEl('div', {
                cls: 'data-link-emoji'
            })
            const showDivText = showButton.createEl('div', {
                cls: 'data-link-text'
            })
            showDivEmoji.createEl('p', {
                text: '🗃️'
            })
            showDivText.createEl('p', {
                text: `${arcivedMainBills.length} archived`,
            })

            showButton.onclick = () => {
                showButton.remove()
                arcivedMainBills.forEach((e: BillData) => {
                    const dataItem = trueDataList.createEl('li', {
                        cls: 'data-item archived-item',
                        attr: {
                                'data-id': e.id
                            }
                    })
                    dataItem.onclick = async (e: MouseEvent) => {
                        await editingBill(e);
                    }
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
                        text: `${e.emoji}`
                    })
                    divText.createEl('p', {
                        text: `${e.name}`
                    })
                    dataItem.createEl('p', {
                        text: `${String(e.balance)} ${getCurrencySymbol(e.currency)}`
                    })
                })
            }
        }
        
        if(notArcivedAdditionalBills.length >= 1) {
            mainContentBody.removeClass('main-content-body--undefined')
            const falseBillBlock = mainContentBody.createEl('div', {
                cls: 'bill-block'
            })
            const falseDateBlock = falseBillBlock.createEl('div', {
                cls: 'header-block'
            })
            const typeBlock = falseDateBlock.createEl('div', {
                cls: 'header-type-block'
            })
            typeBlock.createEl('span', {
                text: 'Additional'
            })
            const amountBlock = falseDateBlock.createEl('div', {
                cls: 'header-amount-block'
            })
            amountBlock.createEl('span', {
                text: String(SummarizingDataForTheFalseBills(notArcivedAdditionalBills))
            })
            const falseDataList = falseBillBlock.createEl('ul', {
                cls: 'data-list'
            })
            
            notArcivedAdditionalBills.forEach((e: BillData) => {
                const dataItem = falseDataList.createEl('li', {
                    cls: 'data-item',
                    attr: {
                            'data-id': e.id
                        }
                })
                dataItem.onclick = async (e: MouseEvent) => {
                    await editingBill(e);
                }
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
                    text: `${e.emoji}`
                })
                divText.createEl('p', {
                    text: `${e.name}`
                })
                dataItem.createEl('p', {
                    text: `${String(e.balance)} ${getCurrencySymbol(e.currency)}`
                })
            })
        }

        if(arcivedAdditionalBills.length >= 1) {
            mainContentBody.removeClass('main-content-body--undefined')
            const trueBillBlock = mainContentBody.createEl('div', {
                cls: 'bill-block'
            })
            const trueDateBlock = trueBillBlock.createEl('div', {
                cls: 'header-block'
            })
            const typeBlock = trueDateBlock.createEl('div', {
                cls: 'header-type-block'
            })
            typeBlock.createEl('span', {
                text: 'Archived main'
            })
            const amountBlock = trueDateBlock.createEl('div', {
                cls: 'header-amount-block'
            })
            amountBlock.createEl('span', {
                text: String(SummarizingDataForTheTrueBills(arcivedAdditionalBills))
            })
            const trueDataList = trueBillBlock.createEl('ul', {
                cls: 'data-list'
            })

            const showButton = trueDataList.createEl('li', {
                cls: 'data-item archived-button'
            })
            const showDivEmoji = showButton.createEl('div', {
                cls: 'data-link-emoji'
            })
            const showDivText = showButton.createEl('div', {
                cls: 'data-link-text'
            })
            showDivEmoji.createEl('p', {
                text: '🗃️'
            })
            showDivText.createEl('p', {
                text: `${arcivedMainBills.length} archived`,
            })

            showButton.onclick = () => {
                showButton.remove()
                arcivedAdditionalBills.forEach((e: BillData) => {
                    const dataItem = trueDataList.createEl('li', {
                        cls: 'data-item archived-item',
                        attr: {
                                'data-id': e.id
                            }
                    })
                    dataItem.onclick = async (e: MouseEvent) => {
                        await editingBill(e);
                    }
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
                        text: `${e.emoji}`
                    })
                    divText.createEl('p', {
                        text: `${e.name}`
                    })
                    dataItem.createEl('p', {
                        text: `${String(e.balance)} ${getCurrencySymbol(e.currency)}`
                    })
                })
            }
        }
    }

    const addBillButton = mainContentButton.createEl('button', {
        text: 'Add a bill',
        cls: 'add-button'
    })
    addBillButton.addEventListener('click', (): void => {
        addBills();
    })
}