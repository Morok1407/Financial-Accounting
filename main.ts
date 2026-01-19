import { Plugin, ItemView, WorkspaceLeaf, Platform, PluginSettingTab, Setting, TFolder, TFile, Notice, App } from 'obsidian';
import { showInitialView, showAnotherInitialView } from './src/view/homeView'; 
import { getCurrencyGroups } from './src/middleware/otherFunc';
import { getDataArchiveFile } from './src/controllers/searchData';

const FINANCIAL_ACCOUNTING_VIEW = "financial-accounting-view";

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

export type ResultOfExecution = 
    | {
        status: 'success';
    }
    | {
        status: 'error';
        error: Error;
    };


export type TransferData =
    | {
        type: 'same-currency';
        fromBillId: string;
        toBillId: string;
        amount: number;
    }
    | {
        type: 'cross-currency';
        fromBillId: string;
        toBillId: string;
        sourceAmount: number;
        targetAmount: number;
    };


export type DataFileResult<T> =
    | {
        status: 'success';
        jsonData: T[] | null;
        file?: TFile;
        content?: string;
    }
    | {
        status: 'error';
        error: Error;
    };

export type DataItemResult<T> =
    | {
        status: 'success';
        item: T;
    }
    | {
        status: 'error';
        error: Error;
    };

export default class MainPlugin extends Plugin {
    static instance: MainPlugin;
    settings: DefaultSettings = new DefaultSettings();
    private unregisterTracking?: () => void;

    async onload(): Promise<void> {
        MainPlugin.instance = this;

        await this.loadSettings();

        this.registerView(
            FINANCIAL_ACCOUNTING_VIEW,
            (leaf: WorkspaceLeaf) => new FinancialAccountingView(leaf)
        );

        this.app.workspace.onLayoutReady(() => {
            this.addSettingTab(new SettingsTab(this.app, this));

            const ribbonIcon = this.addRibbonIcon("badge-dollar-sign", "Add operation", async () => {
                await this.activateView();
            });
            this.registerInterval(
                window.setInterval(() => {
                    const ribbon = document.querySelector(".workspace-ribbon.mod-left");
                    if (!ribbon || !ribbonIcon) return;

                    if (Platform.isMobile && ribbon.firstChild !== ribbonIcon) {
                        ribbon.append(ribbonIcon);
                    }
                }, 1000)
            );

            this.unregisterTracking = trackActiveFinancialAccountingView(
                this.app,
                () => {
                    waitForMobileNavBar((mobileNavBar) => {
                        mobileNavBar.classList.add('disable-mobile-nav-bar');
                    });
                },
                () => {
                    waitForMobileNavBar((mobileNavBar) => {
                        mobileNavBar.classList.remove('disable-mobile-nav-bar');
                    });
                }
            );

            this.addCommand({
                id: "view-finance",
                name: "Open the finance panel",
                callback: () => this.activateView(),
            });
        });
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
            await workspace.revealLeaf(leaf).catch(console.error);
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
        this.unregisterTracking?.();
    }
}

export class FinancialAccountingView extends ItemView {
    static instance: FinancialAccountingView;

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
        FinancialAccountingView.instance = this;
        
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

        new Setting(containerEl)
            .setName("Preferences")
            .setHeading();

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

        selectEl.addEventListener("change", async (event: any): Promise<void> => {
            const bills = await getDataArchiveFile<BillData>('Archive bills');
            if(bills.status === 'error') {
                new Notice(`Error fetching archive bills: ${bills.error.message}`);
                return
            }

            const newCurrency = event.target.value;
            const generalBalanceBills = bills.jsonData?.filter(
                bill => bill.generalBalance && bill.currency !== newCurrency
            );

            if (generalBalanceBills && generalBalanceBills.length > 0) {
                const bill = generalBalanceBills[0];

                selectEl.value = this.plugin.settings.baseCurrency;

                new Notice(
                    `Cannot change base currency. Bill "${bill.name}" is set to general balance with currency ${bill.currency}. Please change or disable general balance on this bill first.`
                );

                return;
            }

            this.plugin.settings.baseCurrency = newCurrency;
            await this.plugin.saveSettings().catch(console.error);
            new Notice(`Base currency changed to ${newCurrency}`);
        });

        new Setting(containerEl)
        .setName("Default tag for Obsidian")
        .setDesc("Enter one word to use as a tag (no spaces).")
        .addText((text) => {
            text
            .setPlaceholder("For example: finances")
            .setValue(this.plugin.settings.defaultTag || "");


            text.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
                if ((e as any).key === "Enter") {
                    (e as any).preventDefault();
                    text.inputEl.blur();
                }
            });

            text.inputEl.addEventListener("blur", async (): Promise<void> => {
                const value = text.getValue().trim();

                if (/\s/.test(value)) {
                    new Notice("Tag must not contain spaces.");
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

function trackActiveFinancialAccountingView(
    app: App,
    onActive: () => void,
    onInactive: () => void
) {
    const check = () => {
        const activeView = app.workspace.getActiveViewOfType(FinancialAccountingView);
        if (activeView) {
            onActive();
        } else {
            onInactive();
        }
    };

    app.workspace.on('active-leaf-change', check);
    app.workspace.on('layout-change', check);

    check();

    return () => {
        app.workspace.off('active-leaf-change', check);
        app.workspace.off('layout-change', check);
    };
}

function waitForMobileNavBar(callback: (el: HTMLElement) => void) {
    const observer = new MutationObserver(() => {
        const el = document.querySelector('.mobile-navbar');
        if (el) {
            callback(el as HTMLElement);
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}