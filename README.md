# 💰 Financial Accounting

> A personal finance control system built directly into [Obsidian](https://obsidian.md/) — no internet connection required.

---

## Overview

**Financial Accounting** is an Obsidian plugin that turns your vault into a fully offline personal finance manager. Track income and expenses, manage multiple accounts, plan budgets by category, and browse transaction history — all without leaving Obsidian and without sending any data to external services.

---

## Features

- **💳 Accounts (Bills)** — Create multiple accounts with individual currencies, emoji labels, and balance tracking. Designate accounts as "Main" (included in the general balance) or "Additional".
- **📊 Budget Plans** — Define monthly income and expense categories with planned amounts. Archived categories are supported.
- **📋 Transaction History** — Log every income and expense operation with amount, category, account, date, and an optional note. Full search across all transactions.
- **🔄 Transfers Between Accounts** — Move funds between your own accounts, including cross-currency transfers.
- **🗓 Calendar View** — Browse history by year and month. Navigate to any past period to view its data.
- **🔢 Multi-currency Support** — Over 150 world currencies supported. Set a base currency in settings; accounts in non-base currencies are tracked separately.
- **📱 Mobile Compatible** — Works on both desktop and mobile versions of Obsidian with an adaptive interface.
- **🔒 Fully Offline** — All data is stored as JSON files inside your vault. No external requests, no accounts, no cloud sync.

---

## Installation

### Manual Installation

1. Download the latest release files: `main.js`, `manifest.json`, `styles.css`.
2. Create a folder at: `<your-vault>/.obsidian/plugins/financial-accounting/`
3. Place the downloaded files into that folder.
4. Restart Obsidian and enable the plugin in **Settings → Community Plugins**.

---

## Getting Started

After enabling the plugin, a **dollar sign icon** (💲) will appear in the left ribbon. Click it to open the Financial Accounting panel.

### Step 1 — Configure Settings

Go to **Settings → Financial Accounting**:

- **Initial year of accounting** — The earliest year for which annual data files will be generated.
- **Main currency** — Your base currency (default: USD). Used for all budget plans and the general balance display.

### Step 2 — Add an Account

Navigate to the **Bills** tab and click **"Add a bill"**. Fill in:

| Field | Description |
|---|---|
| Name | Account name (e.g. "Cash", "Debit Card") |
| Emoji | A visual icon for the account |
| Currency | The account's currency |
| Current balance | Starting balance |
| Note | Optional comment |
| General balance | Whether to include this account in the total balance |

> ⚠️ Only accounts in the base currency can be included in the general balance.

### Step 3 — Create Budget Categories

Navigate to the **Plan** tab and click **"Create a category"**. Choose **Expense** or **Income**, then fill in the name and an emoji. Categories appear in both the plan and in the operation form.

### Step 4 — Log Transactions

Click the ribbon icon or use the command **"Open the finance panel"**, then click **"Add an expense or income"** at the bottom of the History tab. Fill in:

- Type: **Expense** or **Income**
- Amount
- Account
- Category
- Note (optional)
- Date (with quick buttons: Today / Yesterday / The day before yesterday)

---

## Interface Overview

The plugin panel has three tabs:

### History
Shows all transactions for the selected period, grouped by day. Each entry displays the category emoji, account emoji, name/note, and the signed amount. Tap any entry to edit or delete it. Use the search bar to filter by amount, type, category name, or note.

### Plan
Shows all budget categories split into **Expense** and **Income** sections, sorted by planned amount. Archived categories are collapsed behind a toggle. Tap a category to edit its name, emoji, note, or archive status.

### Bills
Shows all accounts split into **Main** and **Additional** sections. Each account displays its current balance and currency. Tap an account to edit it, view its transaction history, or initiate a transfer to another account.

---

## Data Storage

All data is stored as JSON files inside your vault at:

```
<vault>/.obsidian/plugins/financial-accounting/db/
```

| File | Contents |
|---|---|
| `accounts.json` | All accounts and their current balances |
| `categories.json` | All income and expense plan categories |
| `YYYY.json` | Per-year file with monthly history and plan amounts |

A new year file is automatically created for every year from the configured start year up to the current year.

---

## Commands

| Command | Description |
|---|---|
| `Open the finance panel` | Opens the Financial Accounting side panel |

---

## Settings

| Setting | Description | Default |
|---|---|---|
| Initial year of accounting | Earliest year for data generation | Current year |
| Main currency | Base currency for plans and general balance | USD |

---

## Limitations

- Transactions can only be added to accounts in the **base currency**. Accounts in other currencies are for tracking balances only.
- Deleting a category or account that is referenced in transaction history is blocked until all related transactions are removed.

---

## Author

**Bugayev Daniil**
GitHub: [@Morok1407](https://github.com/Morok1407)

---

## License

MIT License
You are free to use, modify, and distribute this plugin.