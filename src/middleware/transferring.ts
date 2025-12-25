import { setIcon, Notice } from "obsidian";
import { transferJsonToBills } from "../controllers/editingData";
import { pluginInstance, viewInstance, TransferBetweenBills, BillData, PlanData, HistoryData } from "../../main";
import { getDataArchiveFile, getDataFile } from "../controllers/searchData";
import { updateFile } from "../controllers/editingData";
import { getCurrencySymbol } from "./otherFunc";

export const expenditureTransaction = async (
    data: HistoryData,
    modifier: 'add' | 'remove' | 'edit',
    oldData?: HistoryData
) => {
    const amount = Number(data.amount);

    const billsRes = await getDataArchiveFile<BillData>('Archive bills');
    if (billsRes.status !== 'success') return billsRes.status;
    if (!billsRes.jsonData || !billsRes.file || !billsRes.content) {
        return 'Bills data error';
    }

    const plansRes = await getDataFile<PlanData>('Expenditure plan');
    if (plansRes.status !== 'success') return plansRes.status;
    if (!plansRes.jsonData || !plansRes.file || !plansRes.content) {
        return 'Plans data error';
    }

    let bills = billsRes.jsonData;
    let plans = plansRes.jsonData;

    const update = async () => {
        const billUpdate = await updateFile(bills, billsRes.file, billsRes.content);
        if (billUpdate !== 'success') return billUpdate;

        const planUpdate = await updateFile(plans, plansRes.file, plansRes.content);
        if (planUpdate !== 'success') return planUpdate;

        return 'success';
    };

    const updateBill = (billId: string, delta: number) => {
        bills = bills.map(b =>
            b.id === billId ? { ...b, balance: Number(b.balance) + delta } : b
        );
    };

    const updatePlan = (planId: string, delta: number) => {
        plans = plans.map(p =>
            p.id === planId ? { ...p, amount: Number(p.amount) + delta } : p
        );
    };

    switch (modifier) {
        case 'add':
            updateBill(data.bill.id, -amount);
            updatePlan(data.category.id, amount);
            return await update();

        case 'remove':
            updateBill(data.bill.id, amount);
            updatePlan(data.category.id, -amount);
            return await update();

        case 'edit':
            if (!oldData) return 'Old data is required for edit';

            updateBill(oldData.bill.id, Number(oldData.amount));
            updatePlan(oldData.category.id, -Number(oldData.amount));
            await update();

            const newBillsRes = await getDataArchiveFile<BillData>('Archive bills');
            const newPlansRes = await getDataFile<PlanData>('Expenditure plan');

            if (!newBillsRes.jsonData || !newPlansRes.jsonData) {
                return 'Reload data error';
            }

            bills = newBillsRes.jsonData;
            plans = newPlansRes.jsonData;

            updateBill(data.bill.id, -amount);
            updatePlan(data.category.id, amount);
            return await update();

        default:
            return 'Invalid modifier';
    }
};

export const incomeTransaction = async (
    data: HistoryData,
    modifier: 'add' | 'remove' | 'edit',
    oldData?: HistoryData
) => {
    const amount = Number(data.amount);

    const billsRes = await getDataArchiveFile<BillData>('Archive bills');
    if (billsRes.status !== 'success') return billsRes.status;
    if (!billsRes.jsonData || !billsRes.file || !billsRes.content) {
        return 'Bills data error';
    }

    const plansRes = await getDataFile<PlanData>('Income plan');
    if (plansRes.status !== 'success') return plansRes.status;
    if (!plansRes.jsonData || !plansRes.file || !plansRes.content) {
        return 'Plans data error';
    }

    let bills = billsRes.jsonData;
    let plans = plansRes.jsonData;

    const update = async () => {
        const billRes = await updateFile(bills, billsRes.file, billsRes.content);
        if (billRes !== 'success') return billRes;

        const planRes = await updateFile(plans, plansRes.file, plansRes.content);
        if (planRes !== 'success') return planRes;

        return 'success';
    };

    const updateBill = (billId: string, delta: number) => {
        bills = bills.map(b =>
            b.id === billId
                ? { ...b, balance: Number(b.balance) + delta }
                : b
        );
    };

    const updatePlan = (planId: string, delta: number) => {
        plans = plans.map(p =>
            p.id === planId
                ? { ...p, amount: Number(p.amount) + delta }
                : p
        );
    };

    switch (modifier) {
        case 'add':
            updateBill(data.bill.id, amount);
            updatePlan(data.category.id, amount);
            return await update();

        case 'remove':
            updateBill(data.bill.id, -amount);
            updatePlan(data.category.id, -amount);
            return await update();

        case 'edit':
            if (!oldData) return 'Old data is required for edit';

            updateBill(oldData.bill.id, -Number(oldData.amount));
            updatePlan(oldData.category.id, -Number(oldData.amount));
            await update();

            const newBillsRes = await getDataArchiveFile<BillData>('Archive bills');
            const newPlansRes = await getDataFile<PlanData>('Income plan');

            if (!newBillsRes.jsonData || !newPlansRes.jsonData) {
                return 'Reload data error';
            }

            bills = newBillsRes.jsonData;
            plans = newPlansRes.jsonData;

            updateBill(data.bill.id, amount);
            updatePlan(data.category.id, amount);
            return await update();

        default:
            return 'Invalid modifier';
    }
};


export const transferBetweenBills = async (billId: string) => {
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
        if(!inputSum.value) {
            inputSum.focus()
            return new Notice('Enter the amount')
        }
        const data: TransferBetweenBills = {
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