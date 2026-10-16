# Financial Accounting 1.0.3

- Added reusable note buttons for the selected category when adding or editing an operation.
- Added CSV history export in settings, covering all years and currencies with category and account names and emoji.
- Fixed compatibility with older numeric amounts and balances. Monetary fields are normalized on read and saved as strings; existing decimal strings keep their precision.
- Simplified view helpers and the finance header, and removed unused variables and imports.
- Fixed the `prefer-const` lint error in chart color normalization.

## Release files

Publish the contents of `dist`: `main.js`, `manifest.json`, `styles.css`, `LICENSE-TWEMOJI.txt`, and `TWEMOJI-NOTICE.md` under the tag `1.0.3`.

Requires Obsidian 1.8.0 or later. Existing data remains compatible; no manual conversion is needed. Transfers affect balances directly and are not included in the exported operation history.
