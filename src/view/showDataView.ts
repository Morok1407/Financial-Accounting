import Big from "big.js";
import { Notice } from "obsidian";
import { stateManager, HistoryData, PlanData, BillData, DataFileResult } from "../../main";
import { getMainData, getAdditionalData, searchElementById, searchHistory } from "../controllers/searchData";
import { addHistory, addPlan, addBills } from '../view/addView';
import { editingHistory, editingPlan, editingBill } from '../view/editingView';
import { humanizeDate, SummarizingDataForTheDay, checkExpenceOrIncome, SummarizingDataForTheFalseBills, SummarizingDataForTheTrueBills, SummarizingData, getCurrencySymbol, mergeCategoriesData } from "../middleware/otherFunc";

export const showHistory = async (mainContentBody: HTMLDivElement, mainContentButton: HTMLDivElement) => {
    stateManager({ openPageNow: "History" });

    const history = await getMainData<HistoryData>('history');
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

        if(historyData.jsonData.length >= 5) {
            mainContentBody?.addClass('main-content-body--padding')
        }
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
                    cls: 'data-link'
                })
                dataAmount.createEl('p', {
                    text: `${checkExpenceOrIncome(element.amount, element.type)} ${getCurrencySymbol(searchBill.item.currency)}`
                })
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
    const additionalExpensePlan = await getAdditionalData<PlanData>('categories', 'expenditure_plan');
    if(additionalExpensePlan.status === 'error') {
        new Notice(additionalExpensePlan.error.message)
        console.error(additionalExpensePlan.error)
        return
    }
    const mainExpensePlan = await getMainData<PlanData>('expenditure_plan')
    if(mainExpensePlan.status === 'error') {
        new Notice(mainExpensePlan.error.message)
        console.error(mainExpensePlan.error)
        return
    }

    const additionalIncomePlan = await getAdditionalData<PlanData>('categories', 'income_plan');
    if(additionalIncomePlan.status === 'error') {
        new Notice(additionalIncomePlan.error.message)
        console.error(additionalIncomePlan.error)
        return
    }
    const mainIncomePlan = await getMainData<PlanData>('income_plan')
    if(mainIncomePlan.status === 'error') {
        new Notice(mainIncomePlan.error.message)
        console.error(mainIncomePlan.error)
        return
    }

    const expensePlan = mergeCategoriesData(additionalExpensePlan.jsonData, mainExpensePlan.jsonData)
    const incomePlan = mergeCategoriesData(additionalIncomePlan.jsonData, mainIncomePlan.jsonData)

    const allResult = [];
    if(!expensePlan.length && !incomePlan.length) {
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
        if(expensePlan.length) {
            mainContentBody.removeClass('main-content-body--undefined')
            const resultExpense = expensePlan.slice().sort((a: PlanData, b: PlanData) => new Big(b.amount).cmp(new Big(a.amount)))
            resultExpense.forEach((e: PlanData) => allResult.push(e))
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
                text: String(SummarizingData(resultExpense))
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
                dataText.createEl('span', {
                    text: `${e.emoji}`
                })
                dataText.createEl('p', {
                    text: `${e.name}`
                })
                dataItem.createEl('p', {
                    text: String(e.amount)
                })
            })
        }
        if(incomePlan.length) {
            mainContentBody.removeClass('main-content-body--undefined')
            const resultIncome = incomePlan.slice().sort((a: PlanData, b: PlanData) => new Big(b.amount).cmp(new Big(a.amount)))
            resultIncome.forEach((e: PlanData) => allResult.push(e))
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
                text: String(SummarizingData(resultIncome))
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
                dataText.createEl('span', {
                    text: `${e.emoji}`
                })
                dataText.createEl('p', {
                    text: `${e.name}`
                })
                dataItem.createEl('p', {
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
        if(bills.jsonData.length > 5) {
            mainContentBody.addClass('main-content-body--padding')
        }
        if(bills.jsonData.filter((e: BillData) => e.generalBalance).length >= 1) {
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
                text: String(SummarizingDataForTheTrueBills(bills.jsonData))
            })
            const trueDataList = trueBillBlock.createEl('ul', {
                cls: 'data-list'
            })

            bills.jsonData.forEach((e: BillData) => {
                if(e.generalBalance) {
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
                    dataText.createEl('span', {
                        text: `${e.emoji}`
                    })
                    dataText.createEl('p', {
                        text: `${e.name}`
                    })
                    dataItem.createEl('p', {
                        text: `${String(e.balance)} ${getCurrencySymbol(e.currency)}`
                    })
                }
            })
        }
        
        if(bills.jsonData.filter((e: BillData) => !e.generalBalance).length >= 1) {
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
                text: String(SummarizingDataForTheFalseBills(bills.jsonData))
            })
            const falseDataList = falseBillBlock.createEl('ul', {
                cls: 'data-list'
            })
            
            bills.jsonData.forEach((e: BillData) => {
                if(!e.generalBalance) {
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
                    dataText.createEl('span', {
                        text: `${e.emoji}`
                    })
                    dataText.createEl('p', {
                        text: `${e.name}`
                    })
                    dataItem.createEl('p', {
                        text: `${String(e.balance)} ${getCurrencySymbol(e.currency)}`
                    })
                }
            })
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