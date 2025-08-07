// @ts-ignore
const { Plugin, Modal, setIcon, Notice } = require("obsidian");

module.exports = class addSidebarButton extends Plugin {
    onload() {
        this.addRibbonIcon("wallet", "add operation", () => {
            new addOperation(this.app).open();
        });
    }

    onunload() {
        console.log("Плагин выгружен");
    }
}

class addOperation extends Modal {
    onOpen() {
        const { contentEl, headerEl, titleEl } = this;

        titleEl.createEl("button", {
            text: `🗓️ ${getCurrentMonth()}`
        });

        const balance = contentEl.createEl("div", {
            cls: "balance"
        });

        const balanceTop = balance.createEl('div', {
            cls: 'balance-top'
        })

        balanceTop.createEl('span', {
            text: 'Баланс'
        })

        balanceTop.createEl('p', {
            text: '20000₸'
        })

        balanceTop.createEl('span', {
            text: '~3000 на день'
        })

        const balanceLine = balance.createEl('div', {
            cls: 'balance-line'
        })

        const balanceBody = balance.createEl('div', {
            cls: 'balance-body'
        })

        const balanceExpenses = balanceBody.createEl('div', {
            cls: 'balance_body-expenses'
        })

        balanceExpenses.createEl('span', {
            text: 'Расход'
        })

        const balanceExpensesСheck = balanceExpenses.createEl('div', {
            cls: 'balance_expenses-check'
        })

        setIcon(balanceExpensesСheck, 'upload')
        balanceExpensesСheck.createEl('p', {
            text: `17000`
        })

        const balanceIncome = balanceBody.createEl('div', {
            cls: 'balance_body-income'
        })

        balanceIncome.createEl('span', {
            text: 'Доход'
        })

        const balanceIncomeCheck = balanceIncome.createEl('div', {
            cls: 'balance_income-check'
        })

        setIcon(balanceIncomeCheck, 'download')
        balanceIncomeCheck.createEl('p', {
            text: '20000'
        })
    }

    onClose() {
        const { containerEl } = this;
        containerEl.empty();
    }
}

function amountOfMoney() {

}

function getCurrentMonth() {
    const months = [
        "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
    ];
    const now = new Date();
    return months[now.getMonth()];
}
