import { setIcon, Notice } from "obsidian";
import { transferJsonToBills } from "../controllers/editingData";
import { pluginInstance, viewInstance } from "../../main";
import { getDataArchiveFile, getDataFile } from "src/controllers/searchData";
import { updateFile } from "src/controllers/editingData";
import { getCurrencySymbol } from "./otherFunc";

export const expenditureTransaction = async (data: object, modifier: string, oldData?: object) => {
    const { jsonData: billJsonData, file: billFile, content: billContent, status: archiveStatus } = await getDataArchiveFile("Archive bills")
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }
    const bill = billJsonData.find(b => b.id === data.bill.id)

    const { jsonData: planJsonData, file: planFile, content: planContent, status } = await getDataFile("Expenditure plan")
    if(!(status === 'success')) {
        return status
    }
    const plan = planJsonData.find(p => p.id === data.category.id)

    let billNewData = [];
    let planNewData = [];

    switch (modifier) {
        case 'add':
            billNewData = billJsonData.map(i => i.id === data.bill.id ? { ...i, balance: Number(bill.balance) - Number(data.amount)} : i)
            planNewData = planJsonData.map(i => i.id === data.category.id ? { ...i, amount: Number(plan.amount) + Number(data.amount)} : i)
            
            return await func()
        case 'remove':
            billNewData = billJsonData.map(i => i.id === data.bill.id ? { ...i, balance: Number(bill.balance) + Number(data.amount)} : i)
            planNewData = planJsonData.map(i => i.id === data.category.id ? { ...i, amount: Number(plan.amount) - Number(data.amount)} : i)

            return await func()
        case 'edit':
            const oldBill = billJsonData.find(b => b.id === oldData.bill.id)
            const oldPlan = planJsonData.find(p => p.id === oldData.category.id)

            billNewData = billJsonData.map(i => i.id === oldData.bill.id ? { ...i, balance: Number(oldBill.balance) + Number(oldData.amount)} : i)
            planNewData = planJsonData.map(i => i.id === oldData.category.id ? { ...i, amount: Number(oldPlan.amount) - Number(oldData.amount)} : i)
            
            await func()

            const { jsonData: newBillJsonData } = await getDataArchiveFile("Archive bills")
            const { jsonData: newpPlanJsonData } = await getDataFile("Expenditure plan")

            const newBill = newBillJsonData.find(b => b.id === data.bill.id)
            const newPlan = newpPlanJsonData.find(p => p.id === data.category.id)

            billNewData = newBillJsonData.map(i => i.id === data.bill.id ? { ...i, balance: Number(newBill.balance) - Number(data.amount)} : i)
            planNewData = newpPlanJsonData.map(i => i.id === data.category.id ? { ...i, amount: Number(newPlan.amount) + Number(data.amount)} : i)

            return await func()
        default:
            return 'Error modifier'
    }

    async function func()  {
        try {
            const { status: billStatus } = await updateFile(billNewData, billFile, billContent)
            if(!(status === 'success')) {
                return billStatus
            }
            const { status: planStatus } = await updateFile(planNewData, planFile, planContent)
            if(!(planStatus === 'success')) {
                return planStatus
            }

            return 'success'
        } catch (error) {
            return error
        }
    }
}

export const incomeTransaction = async (data: object, modifier: string, oldData?: object) => {
    const { jsonData: billJsonData, file: billFile, content: billContent, status: archiveStatus } = await getDataArchiveFile("Archive bills")
    if(!(archiveStatus === 'success')) {
        return archiveStatus
    }
    const bill = billJsonData.find(b => b.id === data.bill.id)

    const { jsonData: planJsonData, file: planFile, content: planContent, status } = await getDataFile("Income plan")
    if(!(status === 'success')) {
        return status
    }
    const plan = planJsonData.find(p => p.id === data.category.id)

    let billNewData = [];
    let planNewData = [];

    switch (modifier) {
        case 'add':
            billNewData = billJsonData.map(i => i.id === data.bill.id ? { ...i, balance: Number(bill.balance) + Number(data.amount)} : i)
            planNewData = planJsonData.map(i => i.id === data.category.id ? { ...i, amount: Number(plan.amount) + Number(data.amount)} : i)
            
            return await func()
        case 'remove':
            billNewData = billJsonData.map(i => i.id === data.bill.id ? { ...i, balance: Number(bill.balance) - Number(data.amount)} : i)
            planNewData = planJsonData.map(i => i.id === data.category.id ? { ...i, amount: Number(plan.amount) - Number(data.amount)} : i)

            return await func()
        case 'edit':
            const oldBill = billJsonData.find(b => b.id === oldData.bill.id)
            const oldPlan = planJsonData.find(p => p.id === oldData.category.id)

            billNewData = billJsonData.map(i => i.id === oldData.bill.id ? { ...i, balance: Number(oldBill.balance) - Number(oldData.amount)} : i)
            planNewData = planJsonData.map(i => i.id === oldData.category.id ? { ...i, amount: Number(oldPlan.amount) - Number(oldData.amount)} : i)
            
            await func()

            const { jsonData: newBillJsonData } = await getDataArchiveFile("Archive bills")
            const { jsonData: newpPlanJsonData } = await getDataFile("Income plan")

            const newBill = newBillJsonData.find(b => b.id === data.bill.id)
            const newPlan = newpPlanJsonData.find(p => p.id === data.category.id)

            billNewData = newBillJsonData.map(i => i.id === data.bill.id ? { ...i, balance: Number(newBill.balance) + Number(data.amount)} : i)
            planNewData = newpPlanJsonData.map(i => i.id === data.category.id ? { ...i, amount: Number(newPlan.amount) + Number(data.amount)} : i)

            return await func()
        default:
            return 'Error modifier'
    }

    async function func()  {
        try {
            const { status: billStatus } = await updateFile(billNewData, billFile, billContent)
            if(!(status === 'success')) {
                return billStatus
            }
            const { status: planStatus } = await updateFile(planNewData, planFile, planContent)
            if(!(planStatus === 'success')) {
                return planStatus
            }

            return 'success'
        } catch (error) {
            return error
        }
    }
}

export const transferBetweenBills = async (billId: string) => {
    if(!billId) {
        return 'Element not found'
    }

    const { jsonData: resultBills, status } = await getDataArchiveFile('Archive bills')
    if(!status) {
        return status
    }

    if(resultBills.length < 2) {
        return 'At least two bills are required to make a transfer'
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
    const fromBillMainGroup = document.createElement("optgroup");
    fromBillMainGroup.label = "Main";
    
    resultBills.forEach(bill => {
        if(bill.generalBalance) {
            const option = document.createElement("option");
            option.value = bill.id;
            option.textContent = `${bill.name} • ${bill.balance} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`;
            fromBillMainGroup.appendChild(option);
        }
    })

    // --- Additional ---
    const fromBillAdditionalGroup = document.createElement("optgroup");
    fromBillAdditionalGroup.label = "Additional";

    resultBills.forEach(bill => {
        if(!bill.generalBalance) {
            const option = document.createElement("option");
            option.value = bill.id;
            option.textContent = `${bill.name} • ${bill.balance} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`;
            fromBillAdditionalGroup.appendChild(option);
        }
    })

    selectFromBill.appendChild(fromBillMainGroup);
    selectFromBill.appendChild(fromBillAdditionalGroup);
    selectFromBill.value = billId;

    const selectToBill = mainFormInput.createEl('select', {
        cls: 'form-selects',
        attr: {
            name: 'select-to-bill',
            id: 'select-to-bill'
        }
    })

    // --- Main ---
    const toBillmainGroup = document.createElement("optgroup");
    toBillmainGroup.label = "Main";
    
    resultBills.forEach(bill => {
        if(bill.generalBalance) {
            const option = document.createElement("option");
            option.value = bill.id;
            option.textContent = `${bill.name} • ${bill.balance} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`;
            toBillmainGroup.appendChild(option);
        }
    })

    // --- Additional ---
    const toBilladditionalGroup = document.createElement("optgroup");
    toBilladditionalGroup.label = "Additional";

    resultBills.forEach(bill => {
        if(!bill.generalBalance) {
            const option = document.createElement("option");
            option.value = bill.id;
            option.textContent = `${bill.name} • ${bill.balance} ${getCurrencySymbol(pluginInstance.settings.baseCurrency)}`;
            toBilladditionalGroup.appendChild(option);
        }
    })

    selectToBill.appendChild(toBillmainGroup);
    selectToBill.appendChild(toBilladditionalGroup);
    selectToBill.value = resultBills[1].id;

    const inputSum = mainFormInput.createEl('input', {
        cls: 'form-inputs',
        attr: {
            placeholder: 'Sum',
            id: 'input-sum',
            type: 'number',
            inputmode: "decimal"
        }
    })
    const addButton = mainFormInput.createEl('button', {
        text: 'Transfer',
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
            fromBillId: selectFromBill.value,
            toBillId: selectToBill.value,
            amount: Number(inputSum.value),
        }
        const resultOfTransfer = await transferJsonToBills(data)
        if(resultOfTransfer === "success") {
            setTimeout(() => {
                viewInstance.onOpen()
                new Notice('Transfer completed')
            }, 100)
        } else {
            new Notice(resultOfTransfer)
        }
    })
}