# Finance Accounting Plugin

## English

### Description

**Finance Accounting** is a technical Obsidian plugin designed for structured personal finance tracking directly inside your vault.
The plugin provides a UI-based workflow for managing **income**, **expenses**, **accounts (bills)**, **plans**, and **history**, using Markdown files with embedded JSON blocks as the primary data source.

The plugin operates fully offline and stores all data locally in the Obsidian vault, ensuring transparency, portability, and long-term maintainability.

---

### Core Features

* 📊 **Income & Expense tracking**
* 💳 **Multiple bills/accounts** with balances
* 🧾 **Transaction history** with filtering and search
* 📅 **Calendar-based monthly overview**
* 📈 **Income and expense plans**
* 🌍 **Multi-currency support** (ISO 4217-based)
* ⚡ Fully offline, no external APIs

---

### Data Architecture

The plugin uses **Markdown files** with embedded `json` code blocks as structured storage.

Example:

```json
[
    {
        "id": "8122254c-4f86-4cfd-86aa-fcf038548cc4",
        "amount": 1000,
        "bill": {
            "id": "782e29c2-cc5a-45e3-a879-c5736df09d5f"
        },
        "category": {
            "id": "250ff0bb-ae54-4381-8b2e-a3ccd39a8194"
        },
        "comment": "",
        "date": "2025-03-03T15:35:52",
        "type": "income"
    },
    {
        "id": "d20aeec7-2503-4cb7-8df4-c3d69319b330",
        "amount": 7725,
        "bill": {
            "id": "782e29c2-cc5a-45e3-a879-c5736df09d5f"
        },
        "category": {
            "id": "d7feac5b-7074-4b58-8814-09697fee53c4"
        },
        "comment": "",
        "date": "2025-03-03T15:36:54",
        "type": "expense"
    }
]
```

This approach allows:

* manual editing if needed
* long-term data safety without vendor lock-in

---

### Views & UI

The plugin registers a custom Obsidian view that includes:

* balance overview
* income vs expense indicators
* progress bars
* history lists
* add/edit forms
* calendar navigation

All UI styles are scoped and defined in `styles.css`.

---

### Currency Support

The plugin ships with a built-in currency registry:

* ISO code (USD, EUR, KZT, etc.)
* native symbols
* decimal precision
* minor units

This allows correct formatting and future currency conversion extensions.

---

### Installation

#### From Community Plugins (planned)

1. Open **Settings → Community plugins**
2. Disable Safe Mode
3. Search for **Finance Accounting**
4. Install and enable

#### Manual Installation

1. Download the plugin release
2. Copy files into:

   ```
   .obsidian/plugins/finance-accounting-plugin/
   ```
3. Enable the plugin in Obsidian settings

---

### Compatibility

* **Obsidian** ≥ 0.15.0
* Desktop & Mobile
* Windows / macOS / Linux

---

### Development Notes

* Bundled with **esbuild**
* TypeScript
* UI logic separated from data logic

---

### Roadmap / Future Plans

* 🔄 Transfers between bills
* 📤 Export to CSV / JSON
* 📊 Charts and analytics
* 🔐 Optional data validation
* 🌐 Currency conversion (optional API)
* 🧩 Plugin API for extensions

---

### License

MIT License
You are free to use, modify, and distribute this plugin.

---

## Русский

### Описание

**Finance Accounting** — технический плагин для Obsidian, предназначенный для структурированного учета личных финансов прямо внутри хранилища заметок.
Плагин предоставляет UI-интерфейс для работы с **доходами**, **расходами**, **счетами**, **планами** и **историей операций**, используя Markdown-файлы с JSON-блоками в качестве источника данных.

Плагин полностью офлайн и хранит все данные локально в vault Obsidian.

---

### Основные возможности

* 📊 Учет доходов и расходов
* 💳 Несколько счетов с балансами
* 🧾 История операций с поиском
* 📅 Календарный обзор по месяцам
* 📈 Планы доходов и расходов
* 🌍 Поддержка множества валют (ISO 4217)
* ⚡ Работа без интернета

---

### Архитектура данных

Хранение данных осуществляется в **Markdown-файлах** с JSON-блоками.

Пример:

```json
[
    {
        "id": "8122254c-4f86-4cfd-86aa-fcf038548cc4",
        "amount": 1000,
        "bill": {
            "id": "782e29c2-cc5a-45e3-a879-c5736df09d5f"
        },
        "category": {
            "id": "250ff0bb-ae54-4381-8b2e-a3ccd39a8194"
        },
        "comment": "",
        "date": "2025-03-03T15:35:52",
        "type": "income"
    },
    {
        "id": "d20aeec7-2503-4cb7-8df4-c3d69319b330",
        "amount": 7725,
        "bill": {
            "id": "782e29c2-cc5a-45e3-a879-c5736df09d5f"
        },
        "category": {
            "id": "d7feac5b-7074-4b58-8814-09697fee53c4"
        },
        "comment": "",
        "date": "2025-03-03T15:36:54",
        "type": "expense"
    }
]
```

Преимущества:

* возможность ручного редактирования
* отсутствие привязки к сервисам

---

### Интерфейс

Плагин добавляет кастомное представление Obsidian, включающее:

* общий баланс
* сравнение доходов и расходов
* прогресс-бары
* списки операций
* формы добавления и редактирования
* календарную навигацию

Все стили изолированы и описаны в `styles.css`.

---

### Поддержка валют

Встроенный справочник валют содержит:

* ISO-код
* символ
* точность дробной части
* минимальные единицы

Это упрощает расширение функционала в будущем.

---

### Установка

#### Через Community Plugins (в планах)

1. **Settings → Community plugins**
2. Отключить Safe Mode
3. Найти **Finance Accounting**
4. Установить и включить

#### Ручная установка

1. Скачать релиз
2. Скопировать файлы в:

   ```
   .obsidian/plugins/finance-accounting-plugin/
   ```
3. Активировать плагин в настройках

---

### Совместимость

* **Obsidian** ≥ 0.15.0
* Desktop и Mobile
* Windows / macOS / Linux

---

### Заметки для разработчиков

* Сборка через **esbuild**
* TypeScript
* Разделение UI и логики данных

---

### Планы развития

* 🔄 Переводы между счетами
* 📤 Экспорт данных
* 📊 Графики и аналитика
* 🔐 Валидация данных
* 🌐 Конвертация валют
* 🧩 Расширяемый API

---

### Лицензия

MIT License
Свободное использование и модификация.