import Big from "big.js";
import { Notice } from "obsidian";
import { stateManager, HistoryData, PlanData, BillData, DataFileResult } from "../../main";
import { getDataFile, getDataArchiveFile, searchElementById, searchHistory } from "../controllers/searchData";
import { addHistory, addPlan, addBills } from '../view/addView';
import { editingHistory, editingPlan, editingBill } from '../view/editingView';
import { humanizeDate, SummarizingDataForTheDay, checkExpenceOrIncome, SummarizingDataForTheDayExpense, SummarizingDataForTheFalseBills, SummarizingDataForTheTrueBills, SummarizingDataForTheDayIncome, getCurrencySymbol } from "../middleware/otherFunc";

export const showHistory = async (mainContentBody: HTMLDivElement, mainContentButton: HTMLDivElement) => {
    stateManager({ openPageNow: "History" });
    const history = await getDataFile<HistoryData>('History');
    if(history.status === 'error') {
        new Notice(history.error.message)
        console.error(history.error)
        return
    }

    if(history.jsonData === null) {
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
        searchInput.addEventListener('input', async (e: Event) => {
            const target = e.target as HTMLInputElement;
            const searchValue = target.value;

            const result = await searchHistory(searchValue);

            if (result.status === 'error') {
                new Notice(result.error.message);
                console.error(result.error);
                return;
            }

            if (result.jsonData === undefined) throw new Error('jsonData is null or undefined');

            historyContent.empty();

            if (result.jsonData === null) {
                const undefinedContent = historyContent.createEl('div', {
                    cls: 'undefined-content'
                });
                historyContent.addClass('main-content-body--undefined');

                undefinedContent.createEl('span', { text: '🍕 🎮 👕' });
                undefinedContent.createEl('p', { text: 'No matching operations found.' });
            } else if (result.jsonData.length >= 1) {
                historyContent.removeClass('main-content-body--undefined');
                void generationHistoryContent(historyContent, mainContentBody, result);
            } else {
                historyContent.removeClass('main-content-body--undefined');
                void generationHistoryContent(historyContent, mainContentBody, result);
            }
        });
    }
    const historyContent = mainContentBody.createEl('div', {
        cls: 'history-content'
    })

    generationHistoryContent(historyContent, mainContentBody, history, mainContentButton)
}

function generationHistoryContent(historyContent: HTMLDivElement, mainContentBody: HTMLDivElement, historyData: DataFileResult<HistoryData>, mainContentButton?: HTMLDivElement) {
    if(historyData.status === 'error') return historyData.error;
    if(historyData.jsonData !== null) {
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
        ).sort(
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
            mainContentBody.addClass('main-content-body--padding')
        }
        result.forEach((e: HistoryData[]) => {
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
                text: humanizeDate(e[0].date.split("T")[0])
            })
            const amountBlock = headerBlock.createEl('div', {
                cls: 'header-amount-block'
            })
            amountBlock.createEl('span', {
                text: `${SummarizingDataForTheDay(e)}`
            })
            const dataList = historyBlock.createEl('ul', {
                cls: 'data-list'
            })
            e.forEach(async (e: HistoryData) => {
                const dataItem = dataList.createEl('li', {
                    cls: 'data-item',
                    attr: {
                        'data-id': e.id
                    }
                })
                dataItem.onclick = async (e: MouseEvent) => {
                    void editingHistory(e);
                };

                const searchCategory = await searchElementById<PlanData>(e.category.id, e.type)
                if (searchCategory.status === 'error') return new Notice(searchCategory.error.message)
                
                const searchBill = await searchElementById<BillData>(e.bill.id, 'Archive bills')
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

                if(e.comment === '') {
                    divText.createEl('p', {
                        text: `${searchCategory.item.name}`
                    })
                    divText.createEl('span', {
                        text: `${searchBill.item.name}`
                    })
                } else {
                    divText.createEl('p', {
                        text: `${e.comment}`
                    })
                    divText.createEl('span', {
                        text: `${searchCategory.item.name} • ${searchBill.item.name}`
                    })
                }

                const dataAmount = dataItem.createEl('div', {
                    cls: 'data-link'
                })
                dataAmount.createEl('p', {
                    text: `${checkExpenceOrIncome(e.amount, e.type)} ${getCurrencySymbol(searchBill.item.currency)}`
                })
            })
        })
    }

    const addHistoryButton = mainContentButton?.createEl('button', {
        text: 'Add an expense or income',
        cls: 'add-button'
    })
    addHistoryButton?.addEventListener('click', async () => {
        void addHistory();
    })
}

export const showPlans = async (mainContentBody: HTMLDivElement, mainContentButton: HTMLDivElement) => {
    stateManager({ openPageNow: "Plans" });
    const expensePlan = await getDataFile<PlanData>('Expenditure plan');
    if(expensePlan.status === 'error') {
        new Notice(expensePlan.error.message)
        console.error(expensePlan.error)
        return
    }
    if(expensePlan.jsonData === undefined) throw new Error('jsonData is undefined');

    const incomePlan = await getDataFile<PlanData>('Income plan');
    if(incomePlan.status === 'error') {
        new Notice(incomePlan.error.message)
        console.error(incomePlan.error)
        return
    }

    const allResult = [];
    if(expensePlan.jsonData === null && incomePlan.jsonData === null) {
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
        if(expensePlan.jsonData !== null) {
            mainContentBody.removeClass('main-content-body--undefined')
            const resultExpense = expensePlan.jsonData.slice().sort((a: PlanData, b: PlanData) => new Big(b.amount).cmp(new Big(a.amount)))
            resultExpense.forEach(e => allResult.push(e))
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
                text: String(SummarizingDataForTheDayExpense(resultExpense))
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
                dataItem.onclick = async (e: MouseEvent) => {
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
        if(incomePlan.jsonData !== null) {
            if(incomePlan.jsonData === undefined) throw new Error('incomePlanInfo is undefined')
            mainContentBody.removeClass('main-content-body--undefined')
            const resultIncome = incomePlan.jsonData.slice().sort((a: PlanData, b: PlanData) => new Big(b.amount).cmp(new Big(a.amount)))
            resultIncome.forEach(e => allResult.push(e))
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
                text: String(SummarizingDataForTheDayIncome(resultIncome))
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
                dataItem.onclick = async (e: MouseEvent) => {
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
    stateManager({ openPageNow: "Bills" });
    const bills = await getDataArchiveFile<BillData>('Archive bills');
    if(bills.status === 'error') {
        new Notice(bills.error.message)
        console.error(bills.error)
        return
    }
    if(bills.jsonData === undefined) throw new Error('Bill is undefined')

    if(bills.jsonData === null) {
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