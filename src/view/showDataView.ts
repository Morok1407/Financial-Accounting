import { Notice } from "obsidian";
import { stateManager, HistoryData, PlanData, BillData } from "../../main";
import { getDataFile, getDataArchiveFile, searchElementById, searchHistory } from "../controllers/searchData";
import { addHistory, addPlan, addBills } from '../view/addView';
import { editingHistory, editingPlan, editingBill } from '../view/editingView';
import { humanizeDate, SummarizingDataForTheDay, checkExpenceOrIncome, SummarizingDataForTheDayExpense, SummarizingDataForTheFalseBills, SummarizingDataForTheTrueBills, SummarizingDataForTheDayIncome } from "../middleware/otherFunc";

export const showHistory = async (mainContentBody: any, mainContentButton: any) => {
    stateManager({ openPageNow: "History" });
    const { jsonData: historyInfo, status } = await getDataFile<HistoryData>('History');
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
        searchInput.addEventListener('input', async (e: any) => {
            const searchValue = e.target.value;
            const { jsonData: searchHistoryData, status: searchStatus } = await searchHistory(searchValue);
            if (searchHistoryData === undefined) throw new Error('jsonData is null or undefined');
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
                await generationHistoryContent(historyContent, mainContentBody,  historyInfo)
            }
        });
    }
    const historyContent = mainContentBody.createEl('div', {
        cls: 'history-content'
    })

    await generationHistoryContent(historyContent, mainContentBody, historyInfo, mainContentButton)
}

async function generationHistoryContent(historyContent: any, mainContentBody: any, historyInfo: any, mainContentButton?: any) {
    if(historyInfo !== null) {
        const now: any = new Date();
        const groupedByDay: any = Object.values(
            historyInfo.reduce((acc: any, item: HistoryData) => {
                const day = item.date.split('T')[0]; 
                if (!acc[day]) acc[day] = [];
                acc[day].push(item);
                return acc;
            }, {})
        ).sort((a: any, b: any) => new Date(b[0].date).getTime() - new Date(a[0].date).getTime());
        const result = groupedByDay.map((dayGroup: any) => 
            dayGroup.sort((a: any, b: any) => Math.abs(new Date(a.date).getTime() - now) - Math.abs(new Date(b.date).getTime() - now))
        );
        if(historyInfo.length >= 5) {
            mainContentBody.addClass('main-content-body--padding')
        }
        result.forEach((e: any, i: any) => {
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
            e.forEach(async (e: any, i: any) => {
                const dataItem = dataList.createEl('li', {
                    cls: 'data-item',
                    attr: {
                        'data-id': e.id
                    }
                })
                dataItem.onclick = async (e: any) => {
                    await editingHistory(e);
                };
                const { item: itemCategory, status: statusPlan } = await searchElementById(e.category.id, e.type)
                if(statusPlan === 'success') {
                    dataItem.createEl('p', {
                        text: `${itemCategory.emoji} ${itemCategory.name}`
                    })
                } else {
                    dataItem.createEl('p', {
                        text: `Error: Plan not found by id`
                    })
                }
                const { item: itemBill, status: statusBill } = await searchElementById(e.bill.id, 'Archive bills')
                if(statusBill === 'success') {
                    dataItem.createEl('span', {
                        text: `${itemBill.emoji} ${itemBill.name}`
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
            addHistory();
    })
}

export const showPlans = async (mainContentBody: any, mainContentButton: any) => {
    stateManager({ openPageNow: "Plans" });
    const { jsonData: expenditurePlanInfo, status: expenditurePlanStatus } = await getDataFile<PlanData>('Expenditure plan');
    if(expenditurePlanInfo === undefined) throw new Error('jsonData is undefined');
    if(expenditurePlanStatus !== 'success') {
        new Notice(expenditurePlanStatus)
        console.error(expenditurePlanStatus)
    }

    const { jsonData: incomePlanInfo, status: incomePlanStatus } = await getDataFile<PlanData>('Income plan');
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
            const resultExpense = expenditurePlanInfo.sort((a: any, b: any) => b.amount - a.amount)
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
            resultExpense.forEach((e: any, i: any) => {
                const dataItem = expenseDataList.createEl('li', {
                    cls: 'data-item',
                    attr: {
                            'data-id': e.id,
                            'data-type': e.type
                        }
                })
                dataItem.onclick = async (e: any) => {
                    await editingPlan(e);
                };
                const itemCategory = dataItem.createEl('p', {
                    text: `${e.emoji} ${e.name}`
                })
                const itemAmount = dataItem.createEl('p', {
                    text: String(e.amount)
                })
            })
        }
        if(incomePlanInfo !== null) {
            if(incomePlanInfo === undefined) throw new Error('incomePlanInfo is undefined')
            mainContentBody.removeClass('main-content-body--undefined')
            const resultIncome = incomePlanInfo.sort((a: any, b: any) => b.amount - a.amount)
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
            resultIncome.forEach((e: any, i: any) => {
                const dataItem = incomeDataList.createEl('li', {
                    cls: 'data-item',
                    attr: {
                            'data-id': e.id,
                            'data-type': e.type
                        }
                })
                dataItem.onclick = async (e: any) => {
                    await editingPlan(e);
                };
                const itemCategory = dataItem.createEl('p', {
                    text: `${e.emoji} ${e.name}`
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
        addPlan();
    })
}

export const showBills = async (mainContentBody: any, mainContentButton: any) => {
    stateManager({ openPageNow: "Bills" });
    const { jsonData: billsInfo, status } = await getDataArchiveFile<BillData>('Archive bills');
    if(status !== 'success') {
        new Notice(status)
        console.error(status)
    }
    if(billsInfo === undefined) throw new Error('Bill is undefined')

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
        if(billsInfo.filter((e: any) => e.generalBalance).length >= 1) {
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

            billsInfo.forEach((e: any, i) => {
                if(e.generalBalance) {
                    const dataItem = trueDataList.createEl('li', {
                        cls: 'data-item',
                        attr: {
                                'data-id': e.id
                            }
                    })
                    dataItem.onclick = async (e: any) => {
                        await editingBill(e);
                    }
                    const itemCategory = dataItem.createEl('p', {
                        text: `${e.emoji} ${e.name}`
                    })
                    const itemAmount = dataItem.createEl('p', {
                        text: String(e.balance)
                    })
                }
            })
        }
        
        if(billsInfo.filter((e: any) => !e.generalBalance).length >= 1) {
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
            
            billsInfo.forEach((e: any, i) => {
                if(!e.generalBalance) {
                    const dataItem = falseDataList.createEl('li', {
                        cls: 'data-item',
                        attr: {
                                'data-id': e.id
                            }
                    })
                    dataItem.onclick = async (e: any) => {
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
        addBills();
    })
}