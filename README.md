# Financial Accounting

Track personal income, expenses, and account balances inside [Obsidian](https://obsidian.md/). Financial Accounting keeps your records in your vault and works offline, without registration or a connection to your bank.

## Features

- **Finance dashboard:** review your balance, income and expense summaries, and a monthly expense chart. Select chart categories to inspect the related operations.
- **Transaction history:** record income and expenses with an account, category, date, and optional note. Search the selected month by amount, transaction type, account, category, or note.
- **Categories:** organize income and expenses with names, emoji, and optional parent categories. Review totals calculated from recorded transactions.
- **Multiple accounts:** track cash, cards, and other balances. Choose which accounts contribute to the general balance and archive accounts you no longer use.
- **Transfers:** move money between accounts in the same currency or enter separate source and target amounts for a cross-currency transfer.
- **Monthly navigation:** use the calendar to revisit earlier months and their transaction records.
- **Local storage:** financial records are saved as JSON files in your vault's configuration folder.

Requires **Obsidian 1.8.0 or later**. The plugin supports desktop and mobile layouts. Accounts are called **Bills** in the interface.

## Installation

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from a release on the [releases page](https://github.com/Morok1407/Financial-Accounting/releases).
2. Create the following folder in your vault:

   ```text
   <vault>/.obsidian/plugins/financial-accounting/
   ```

3. Copy the three files into that folder.
4. Restart Obsidian, enable community plugins if needed, and enable **Financial Accounting** in **Settings → Community plugins**.

If you use a custom Obsidian configuration folder, replace `.obsidian` with that folder's name.

### Community plugins

Once the plugin is available in the community catalog, open **Settings → Community plugins → Browse**, search for **Financial Accounting**, then select **Install** and **Enable**. Until then, use manual installation.

## Getting started

### 1. Choose your settings

Open **Settings → Financial Accounting** and configure:

| Setting | Purpose | Default |
| --- | --- | --- |
| Initial year of accounting | First year to make available for accounting records | Current year |
| Main currency | Currency used for income, expenses, category totals, and the general balance | USD |

Choose your main currency before entering transactions. Changing this setting does not convert existing amounts.

### 2. Open the finance panel

Run **Financial Accounting: Open the finance panel** from the command palette, or select the dollar-sign ribbon icon, whose tooltip is **Add operation**. The panel opens in the right sidebar on desktop and in a workspace tab on mobile.

### 3. Add an account

Open **Bills** and use the add button. Enter a name, emoji, currency, starting balance, and optional note.

Enable **Take into account in the general balance** for accounts you want to include in your total. Only accounts in the main currency can use this option.

### 4. Create categories

Open **Plan** and use the add button to create income and expense categories, such as Salary and Groceries. Give each category a name and emoji; optionally add a note or parent category.

Create at least one category of each type before adding transactions: the current operation form requires both income and expense categories to exist.

Despite the name **Plan**, this section shows actual transaction totals for the selected month. It does not provide editable budget targets.

### 5. Record an operation

Use the add-operation button and choose **Expense** or **Income**. Enter the amount, choose an account and category, set the date, and optionally add a note. Select **Add** to save the operation and update the account balance.

Only accounts in the main currency can be used for income and expense operations. Select an entry in **History** to edit or delete it.

## Exploring your finances

| Section | What you can do |
| --- | --- |
| Home | Review balance and summary cards, explore the expense chart, and inspect category breakdowns and filtered operations. |
| History | Browse the selected month's operations grouped by day, search them, and open entries for editing. |
| Plan | Review monthly income and expense totals by category, edit category details, and archive or restore categories. |
| Bills | Review account balances, edit account details, archive or restore accounts, and initiate transfers. |

Use the month selector at the top of the panel to open the calendar and choose a period. Account balances represent current balances, including when you browse an earlier month.

### Transfers between accounts

Open an account in **Bills**, then select **Transactions between bills** and choose the destination account.

- For accounts in the same currency, enter one amount.
- For accounts in different currencies, enter both the source amount and the target amount. Exchange rates are not downloaded or calculated automatically.

Transfers update account balances directly. They do **not** create entries in transaction history or count toward income and expense totals.

## Data storage and privacy

The plugin does not make network requests, collect analytics, or send financial records to an external service. It has no built-in bank connection or synchronization service. Any backup or synchronization software you configure separately may copy these files according to its own settings.

Financial records are stored here by default:

```text
<vault>/.obsidian/plugins/financial-accounting/db/
├── accounts.json
├── categories.json
└── YYYY.json
```

| File | Contents |
| --- | --- |
| `accounts.json` | Account details, currencies, balances, and archive status |
| `categories.json` | Income and expense category definitions |
| `YYYY.json` | Transaction records organized by month for that year |

Plugin settings are saved separately in `data.json` in the plugin folder. A custom Obsidian configuration folder replaces `.obsidian` in these paths.

**Include the plugin's `db` folder and `data.json` in your backups.** These are plain JSON files, not encrypted by the plugin or stored as Markdown notes. Back them up before uninstalling the plugin or replacing its folder; copying only your notes will not preserve these records. When updating manually, replace the three release files and retain your data files.

## Current limitations

- Income and expense operations use the main currency only. Other-currency accounts support balance tracking and transfers.
- Changing the main currency does not recalculate past transactions or balances. The change is blocked while an account in another currency is included in the general balance.
- Search is limited to the selected month.
- Transfers have no transaction history entries.
- Categories and accounts referenced by transaction history cannot be deleted. Archive them to retain their records.

## Development

Clone the repository and install its dependencies with Node.js and npm:

```sh
git clone https://github.com/Morok1407/Financial-Accounting.git
cd Financial-Accounting
npm ci
npm run build
```

The build checks TypeScript and writes `main.js`, `manifest.json`, and `styles.css` to `dist/`. Copy these files into the plugin folder of a test vault to try the build.

For development, `npm run dev` watches the TypeScript source and writes `main.js` to the repository root. The build copies the existing `styles.css`; it does not compile `styles.scss`.

## Feedback and contributions

Report bugs and suggest improvements through [GitHub Issues](https://github.com/Morok1407/Financial-Accounting/issues). For bug reports, include your Obsidian version, plugin version, platform, and steps to reproduce the problem. Use sample records instead of sharing private financial data.

Pull requests are welcome. For publishing requirements, see Obsidian's [plugin submission guide](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin).

## License

[MIT](LICENSE) © 2026 [Bugayev Daniil](https://github.com/Morok1407).
