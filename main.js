// @ts-ignore
const { Plugin, Modal,   Notice } = require("obsidian");

module.exports = class addSidebarButton extends Plugin {
    onload() {
        this.addRibbonIcon("wallet", "Сказать привет", () => {
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

        titleEl.createEl("h1", {
            text: "Добавить операцию"
        });

        const description = contentEl.createEl("div", {
            text: "Здесь можно разместить любое содержимое: текст, кнопки, формы и т.п.",
            cls: "Test"
        });
    }

    onClose() {
        const { containerEl } = this;
        containerEl.empty();
    }
}