import { Plugin, ItemView, WorkspaceLeaf, Platform, PluginSettingTab, Setting, TFolder, TFile, Notice } from 'obsidian';
import { showInitialView, showAnotherInitialView } from './src/view/homeView'; 
import { getCurrencyGroups } from './src/middleware/otherFunc';

const FINANCIAL_ACCOUNTING_VIEW = "financial-accounting-view";
export let pluginInstance: MainPlugin;
export let viewInstance: FinancialAccountingView;

export interface BillData {
    id: string;
    name: string;
    emoji?: string;
    balance: string;
    currency: string;
    generalBalance: boolean;
    comment?: string;
}

export interface PlanData {
    id: string;
    name: string;
    emoji?: string;
    amount: string;
    comment?: string;
    type: 'expense' | 'income';
}

export interface HistoryData {
    id: string;
    amount: string;
    bill: { id: string };
    category: { id: string };
    comment?: string;
    date: string;
    type: 'expense' | 'income';
}

export interface TransferBetweenBills {
    fromBillId: string,
    toBillId: string,
    amount: string,
}

export interface DataFileResult<T> {
    jsonData?: T[] | null;
    content?: string;
    file?: TFile;
    status: 'success' | 'error' | string | any;
}

export default class MainPlugin extends Plugin {
    settings: any;
    async onload(): Promise<void> {
        await this.loadSettings();

        this.registerView(
            FINANCIAL_ACCOUNTING_VIEW,
            (leaf: WorkspaceLeaf) => new FinancialAccountingView(leaf)
        );

        this.app.workspace.onLayoutReady(async () => {
            this.addSettingTab(new SettingsTab(this.app, this));

            this.addRibbonIcon("badge-dollar-sign", "Add operation", async () => {
                await this.activateView();
            });

            this.addCommand({
                id: "financial-accounting-view",
                name: "Open the finance panel",
                callback: () => this.activateView(),
            });
        });

        pluginInstance = this;
        
        console.log('Financial accounting plugin loaded');
    }

    async activateView(): Promise<void> {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(FINANCIAL_ACCOUNTING_VIEW)[0];

        if (!leaf) {
            if (Platform.isDesktop) {
                leaf = workspace.getRightLeaf(false);
            } else {
                leaf = workspace.getLeaf(true);
            }

            if (leaf) {
                await leaf.setViewState({
                    type: FINANCIAL_ACCOUNTING_VIEW,
                    active: true,
                });
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    async loadSettings(): Promise<void> {
        const loaded = await this.loadData();
        const defaults = new DefaultSettings();
        this.settings = Object.assign({}, defaults, loaded || {});
    }
    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }

    onunload(): void {
        this.app.workspace.detachLeavesOfType(FINANCIAL_ACCOUNTING_VIEW);
    }

}

class FinancialAccountingView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return FINANCIAL_ACCOUNTING_VIEW;
    }

    getDisplayText(): string {
        return "Financial accounting view";
    }

    getIcon(): string {
        return "chart-pie";
    }

    async onOpen(): Promise<void> {
        viewInstance = this
        
        const { selectedYear, selectedMonth } = stateManager();
        if (selectedMonth === null && selectedYear === null) {
            await showInitialView();
        } else {
            await showAnotherInitialView();
        }
    }

    async onClose(): Promise<void> {
    }
}

class DefaultSettings {
    targetFolder: string;
    startYear: number;
    baseCurrency: string;
    defaultTag: string;
    constructor() {
        this.targetFolder = 'Finances';
        this.startYear = 2020;
        this.baseCurrency = "USD";
        this.defaultTag = 'Finances';
    }
}

class SettingsTab extends PluginSettingTab {
    plugin: MainPlugin;
    constructor(app: any, plugin: MainPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h1", { text: "Plugin settings" });

        const folders = this.app.vault.getAllLoadedFiles().filter((f: any) => f instanceof TFolder).map((f: any) => f.path);

        const defaultFolder = this.plugin.settings.targetFolder || "Finances/";
        const hasDefault = folders.includes(defaultFolder);

        // Selecting a directory
        new Setting(containerEl)
        .setName("Working directory")
        .setDesc("Select the folder the plugin will work with.")
        .addDropdown((drop) => {
            for (const path of folders) {
            drop.addOption(path, path);
            }

            if (!hasDefault) {
            drop.addOption(defaultFolder, `${defaultFolder} (does not exist)`);
            }

            drop.setValue(defaultFolder);

            drop.onChange(async (value) => {
            this.plugin.settings.targetFolder = value;
            await this.plugin.saveSettings();
            new Notice(`Folder selected: ${value}`);
            });
        });

        // Selecting the initial year of accounting
        new Setting(containerEl)
        .setName("Initial year of accounting")
        .setDesc("Select the year from which financial accounting has been conducted")
        .addDropdown((drop) => {
            const currentYear = new Date().getFullYear();
            for (let year = currentYear - 100; year <= currentYear; year++) {
            drop.addOption(String(year), String(year));
            }

            drop.setValue(String(this.plugin.settings.startYear));

            drop.onChange(async (value) => {
            this.plugin.settings.startYear = Number(value);
            await this.plugin.saveSettings();
            new Notice(`The starting year has been changed to ${value}`);
            });
        });

        // Selecting the base currency
        const settingEl = new Setting(containerEl)
        .setName("Main currency")
        .setDesc("Select the currency from which the conversion will be performed")
        .settingEl;

        const selectEl = settingEl.createEl("select", { cls: "currency-select" });

        const { popularCurrencies, otherCurrencies } = getCurrencyGroups();
        // --- Popular ---
        const popularGroup = document.createElement("optgroup");
        popularGroup.label = "Popular";

        popularCurrencies.forEach((cur: any) => {
            const option = document.createElement("option");
            option.value = cur.code;
            option.textContent = `${cur.code} • ${cur.name} • ${cur.symbol}`;
            popularGroup.appendChild(option);
        });

        // --- Other ---
        const otherGroup = document.createElement("optgroup");
        otherGroup.label = "All currencies";

        otherCurrencies.forEach((cur: any) => {
            const option = document.createElement("option");
            option.value = cur.code;
            option.textContent = `${cur.code} ${cur.name} • ${cur.symbol}`;
            otherGroup.appendChild(option);
        });

        selectEl.appendChild(popularGroup);
        selectEl.appendChild(otherGroup);

        selectEl.value = this.plugin.settings.baseCurrency;

        selectEl.addEventListener("change", async (event: any) => {
            this.plugin.settings.baseCurrency = event.target.value;
            await this.plugin.saveSettings();
            new Notice(`The main currency has been changed to ${event.target.value}`);
        });

        new Setting(containerEl)
        .setName("Default tag for Obsidian")
        .setDesc("Enter one word to use as a tag (no spaces).")
        .addText((text) => {
            text.setPlaceholder("For example: Finances").setValue(this.plugin.settings.defaultTag || "");

            text.inputEl.addEventListener("keydown", async (e: KeyboardEvent) => {
            if ((e as any).key === "Enter") {
                (e as any).preventDefault();
                text.inputEl.blur();
            }
            });

            text.inputEl.addEventListener("blur", async () => {
            // eslint-disable-next-line prefer-const
            let value = text.getValue().trim();

            if (/\s/.test(value)) {
                new Notice("Error: Tag must not contain spaces.");
                return;
            }

            if (!/^[\w\-а-яА-ЯёЁ]+$/.test(value)) {
                new Notice("The tag can only contain letters, numbers, underscores and hyphens.");
                return;
            }

            this.plugin.settings.defaultTag = value;
            await this.plugin.saveSettings();
            new Notice(`The tag "${value}" has been saved.`);
            });
        });
    }
}

type State = {
    openPageNow: string | null;
    selectedYear: string | null;
    selectedMonth: string | null;
};

const createStateManager = () => {
    let state: State = {
        openPageNow: null,
        selectedYear: null,
        selectedMonth: null,
    };

    return function updateState(newState?: Partial<State>): State {
        if (newState) {
            state = { ...state, ...newState }; 
        }
        return state; 
    };
}

export const stateManager = createStateManager();