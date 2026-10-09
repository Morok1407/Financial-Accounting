import { activeCurrency, inActiveCurrency } from '../middleware/otherFunc';
import Big from "big.js";
import MainPlugin from "../../main";
import { Notice, setIcon } from "obsidian";
import { stateManager, CardItem, HistoryData, PlanData, BillData, DataFileResult, YearData } from "../../main";
import { getMainData, getAdditionalData, getAllFile, getHistoryMetadata, filterHistory, HistoryMetadata } from "../controllers/searchData";
import { addPlan, addBills } from '../view/addView';
import { editingHistory, editingPlan, editingBill } from '../view/editingView';
import { getEmojiColor } from '../middleware/emojiColor';
import { humanizeDate, isSuccess, getDate, SummarizingDataForTheDay, checkExpenceOrIncome, SummarizingDataForTheFalseBills, SummarizingDataForTheTrueBills, SummarizingData, getCurrencySymbol, formatNumbers, divideByRemainingDays, switchBalanceLine, summarizeCategories, getAmountPercentage, CategorySummary } from "../middleware/otherFunc";

export const showHome = async (mainContent: HTMLDivElement) => {
	stateManager({ openPageNow: "Home" });

	const bills = await getAdditionalData<BillData>('accounts');
	if (bills.status === "error") {
		new Notice(bills.error.message);
		console.error(bills.error);
		return
	}

	const expensePlan = await getAdditionalData<PlanData>('categories', 'expenditure_plan');
	if (expensePlan.status === "error") {
		new Notice(expensePlan.error.message);
		console.error(expensePlan.error);
		return
	}

	const mainContentHeader = mainContent.createEl("div", {
		cls: "main-content-body",
	});

	const balanceContent = mainContentHeader.createEl("div", {
		cls: "balance-content",
	});

	const balance = balanceContent.createEl("div", {
		cls: "balance",
	});

	const balanceTop = balance.createEl("div", {
		cls: "balance-top",
	});

	balanceTop.createEl("span", {
		text: "Balance",
	});

	balanceTop.createEl("p", {
		text: `${formatNumbers(SummarizingDataForTheTrueBills(bills.jsonData).toString())} ${getCurrencySymbol(activeCurrency())}`,
	});

	balanceTop.createEl("span", {
		text: `~${formatNumbers(divideByRemainingDays(SummarizingDataForTheTrueBills(bills.jsonData)).toString())} for a day`,
	});

	const balanceLine = balance.createEl("div", {
		cls: "balance-line",
	});
	balanceLine.style.setProperty("--after-width", `${switchBalanceLine(bills.jsonData, expensePlan.jsonData)}%`);

	const statsContent = mainContent.createDiv();
	const categoriesContent = mainContent.createDiv({ cls: 'home-categories' });
	await Promise.all([gridContent(statsContent), showHomeCategories(categoriesContent)]);
}

interface ChartCategory extends CategorySummary {
	color: string;
	children?: ChartCategory[];
}

const DONUT_INNER_RADIUS = 86;
const DONUT_OUTER_RADIUS = 148;
const DONUT_EMOJI_RADIUS = (DONUT_INNER_RADIUS + DONUT_OUTER_RADIUS) / 2;
const DONUT_EMOJI_PADDING = 3;

const showHomeCategories = async (container: HTMLDivElement) => {
	const [expenses, income, history] = await Promise.all([
		getAdditionalData<PlanData>('categories', 'expenditure_plan'),
		getAdditionalData<PlanData>('categories', 'income_plan'),
		getMainData(),
	]);
	if (!isSuccess(expenses) || !isSuccess(income) || !isSuccess(history)) return;

	const currency = getCurrencySymbol(activeCurrency());
	const { selectedYear, selectedMonth } = stateManager();
	const now = getDate();
	const period = new Date(Number(selectedYear ?? now.year), Number(selectedMonth ?? now.month) - 1, 1)
		.toLocaleDateString('en', { month: 'long', year: 'numeric' });
	const money = (amount: Big) => `${formatNumbers(amount.toString())} ${currency}`;
	const prepareCategories = (plans: PlanData[], type: HistoryData['type']): ChartCategory[] => {
		return summarizeCategories(history.jsonData, plans, type).map(category => ({
			...category,
			color: getEmojiColor(category.emoji),
		}));
	};
	const expenseCategories = prepareCategories(expenses.jsonData, 'expense');
	const incomeCategories = prepareCategories(income.jsonData, 'income');
	const totalExpense = expenseCategories.reduce((sum, category) => sum.plus(category.amount), new Big(0));
	const totalIncome = incomeCategories.reduce((sum, category) => sum.plus(category.amount), new Big(0));
	const selected = new Set<string>();
	const categoryButtons = new Map<string, HTMLButtonElement>();
	const segments = new Map<string, SVGGElement>();

	const chartCard = container.createDiv({ cls: 'home-chart-card' });
	chartCard.createEl('h3', { text: 'Expenses by category', cls: 'home-section-title' });
	const chart = chartCard.createDiv({ cls: 'home-donut' });
	const svg = createChartSvg(chart, 'svg', { viewBox: '0 0 320 320', class: 'home-donut-svg', role: 'group', 'aria-label': 'Expenses by category' });
	const chartCategories = groupDonutCategories(expenseCategories, totalExpense, svg);
	createChartSvg(svg, 'circle', { cx: 160, cy: 160, r: DONUT_EMOJI_RADIUS, fill: 'none', 'stroke-width': DONUT_OUTER_RADIUS - DONUT_INNER_RADIUS, class: 'home-donut-track' });
	const center = chart.createDiv({ cls: 'home-donut-center', attr: { 'aria-live': 'polite', 'aria-atomic': 'true' } });
	const centerTitle = center.createDiv({ cls: 'home-donut-label' });
	const centerAmount = center.createDiv({ cls: 'home-donut-amount' });
	const centerDetail = center.createDiv({ cls: 'home-donut-detail' });
	const clearSelection = center.createEl('button', { cls: 'home-chart-clear', text: 'Clear selection', attr: { type: 'button' } });
	const filter = chartCard.createDiv({ cls: 'home-chart-filter' });
	const showOperations = filter.createEl('button', { cls: 'home-chart-operations', text: 'Show filtered operations →', attr: { type: 'button' } });
	const chips = filter.createDiv({ cls: 'home-chart-chips' });
	const operations = container.createDiv({ cls: 'home-category-operations' });
	operations.hidden = true;
	let operationsVersion = 0;

	const updateSelection = () => {
		operationsVersion++;
		operations.hidden = true;
		operations.empty();
		const active = chartCategories.filter(category => selected.has(category.id));
		const amount = active.reduce((sum, category) => sum.plus(category.amount), new Big(0));
		const accent = active.length === 1 ? active[0].color : 'var(--interactive-accent)';
		center.style.setProperty('--category-color', active.length ? accent : 'var(--text-muted)');
		center.classList.toggle('is-selected', active.length > 0);
		centerTitle.textContent = active.length === 1 ? active[0].name : active.length ? `${active.length} categories` : '';
		centerTitle.hidden = !active.length;
		centerAmount.textContent = money(active.length ? amount : totalExpense);
		centerDetail.textContent = active.length ? `${Math.round(getAmountPercentage(amount, totalExpense))}%` : `Total for ${period}`;
		clearSelection.hidden = !active.length;
		filter.hidden = !active.length;
		for (const category of chartCategories) {
			const isSelected = selected.has(category.id);
			const segment = segments.get(category.id);
			segment?.classList.toggle('is-selected', isSelected);
			segment?.classList.toggle('is-muted', active.length > 0 && !isSelected);
			segment?.setAttribute('aria-pressed', String(isSelected));
			const button = categoryButtons.get(category.id);
			button?.classList.toggle('is-selected', isSelected);
			button?.setAttribute('aria-pressed', String(isSelected));
		}
		chips.empty();
		for (const category of active) {
			const chip = chips.createEl('button', { text: `${category.emoji} ${category.name} ×`, cls: 'home-chart-chip', attr: { type: 'button', 'aria-label': `Remove ${category.name} filter` } });
			chip.style.setProperty('--category-color', category.color);
			chip.addEventListener('click', () => toggleCategory(category.id));
		}
	};
	const toggleCategory = (id: string) => {
		if (selected.has(id)) selected.delete(id);
		else selected.add(id);
		updateSelection();
	};
	clearSelection.addEventListener('click', () => { selected.clear(); updateSelection(); });
	showOperations.addEventListener('click', () => {
		const categoryIds = new Set(chartCategories.filter(category => selected.has(category.id)).flatMap(category => category.categoryIds));
		const filtered = history.jsonData.filter(transaction => transaction.type === 'expense' && categoryIds.has(transaction.category.id));
		operations.empty();
		operations.hidden = false;
		operations.createEl('h3', { cls: 'home-section-title', text: `Selected operations · ${filtered.length}` });
		const list = operations.createDiv({ cls: 'history-content' });
		const version = ++operationsVersion;
		void generationHistoryContent(list, { status: 'success', jsonData: filtered }).then(() => {
			if (version === operationsVersion) operations.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}).catch(error => { console.error('Failed to show category operations', error); });
	});

	let startAngle = -Math.PI / 2;
	for (const category of chartCategories) {
		const sweep = getAmountPercentage(category.amount, totalExpense) / 100 * Math.PI * 2;
		const middle = startAngle + sweep / 2;
		const group = createChartSvg(svg, 'g', {
			class: 'home-donut-segment', role: 'button', tabindex: 0, 'aria-pressed': 'false',
			'aria-label': `${category.name}: ${money(category.amount)}, ${Math.round(getAmountPercentage(category.amount, totalExpense))}%`,
		});
		group.style.setProperty('--segment-x', `${Math.cos(middle) * 6}px`);
		group.style.setProperty('--segment-y', `${Math.sin(middle) * 6}px`);
		createChartSvg(group, 'path', { d: donutSegmentPath(startAngle, sweep), fill: category.color });
		createChartSvg(group, 'title', {}).textContent = `${category.name}: ${money(category.amount)}`;
		createChartSvg(group, 'text', { x: 160 + Math.cos(middle) * DONUT_EMOJI_RADIUS, y: 160 + Math.sin(middle) * DONUT_EMOJI_RADIUS, class: 'home-donut-emoji', 'aria-hidden': 'true' }).textContent = category.emoji;
		group.addEventListener('click', () => toggleCategory(category.id));
		group.addEventListener('keydown', event => {
			if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleCategory(category.id); }
		});
		segments.set(category.id, group);
		startAngle += sweep;
	}
	if (!expenseCategories.length) {
		chartCard.createEl('p', { cls: 'home-category-empty', text: 'No expenses for this month yet.' });
	}

	const renderCategoryBlock = (categories: ChartCategory[], total: Big, type: HistoryData['type']) => {
		const block = container.createDiv({ cls: `home-category-card home-category-card--${type}` });
		const header = block.createDiv({ cls: 'home-category-header' });
		header.createEl('h3', { cls: 'home-section-title', text: type === 'expense' ? 'Expense categories' : 'Income categories' });
		header.createEl('span', { cls: 'home-category-count', text: String(categories.length) });
		if (!categories.length) {
			block.createEl('p', { cls: 'home-category-empty', text: type === 'expense' ? 'No expenses for this month yet.' : 'No income for this month yet.' });
			return;
		}
		for (const category of categories) {
			const row = block.createDiv({ cls: 'home-category-row' });
			row.style.setProperty('--category-color', category.color);
			const details = row.createDiv({ cls: 'home-category-details' });
			const label = `${category.emoji} ${category.name}`;
			if (type === 'expense') {
				const button = details.createEl('button', { cls: 'home-category-name', text: label, attr: { type: 'button', 'aria-pressed': 'false' } });
				button.addEventListener('click', () => toggleCategory(category.id));
				categoryButtons.set(category.id, button);
			} else {
				details.createEl('span', { cls: 'home-category-name', text: label });
			}
			details.createEl('span', { cls: 'home-category-amount', text: money(category.amount) });
			renderCategoryPercentage(row, category.amount, total);
			if (category.children) {
				const breakdown = row.createEl('details', { cls: 'home-category-breakdown' });
				breakdown.createEl('summary', { text: `Show ${category.children.length} categories` });
				for (const child of category.children) {
					const item = breakdown.createDiv({ cls: 'home-category-breakdown-item' });
					item.style.setProperty('--category-color', child.color);
					const details = item.createDiv({ cls: 'home-category-details' });
					details.createEl('span', { cls: 'home-category-name', text: `${child.emoji} ${child.name}` });
					details.createEl('span', { cls: 'home-category-amount', text: money(child.amount) });
					renderCategoryPercentage(item, child.amount, total);
				}
			}
		}
	};
	renderCategoryBlock(chartCategories, totalExpense, 'expense');
	renderCategoryBlock(incomeCategories, totalIncome, 'income');
	updateSelection();
};

function renderCategoryPercentage(container: HTMLDivElement, amount: Big, total: Big): void {
	const percentage = getAmountPercentage(amount, total);
	const progress = container.createDiv({ cls: 'home-category-progress', attr: { 'aria-hidden': 'true' } });
	progress.createDiv().style.width = `${percentage}%`;
	container.createEl('span', { cls: 'home-category-percent', text: `${Math.round(percentage)}%` });
}

function createChartSvg<K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attributes: Record<string, string | number>): SVGElementTagNameMap[K] {
	const element = parent.ownerDocument.createElementNS('http://www.w3.org/2000/svg', tag);
	for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
	parent.appendChild(element);
	return element;
}

function groupDonutCategories(categories: ChartCategory[], total: Big, svg: SVGSVGElement): ChartCategory[] {
	const visible = [...categories];
	const other: ChartCategory = { id: '__other__', name: 'Other', emoji: '📦', color: '#81818b', amount: new Big(0), categoryIds: [], children: [] };
	const boundsByEmoji = new Map<string, DOMRect>();
	const fits = (category: ChartCategory, start: number) => {
		let bounds = boundsByEmoji.get(category.emoji);
		if (!bounds) {
			const label = createChartSvg(svg, 'text', { x: 0, y: 0, class: 'home-donut-emoji', visibility: 'hidden', 'aria-hidden': 'true' });
			label.textContent = category.emoji;
			bounds = label.getBBox();
			label.remove();
			// A hidden Obsidian pane may not provide text metrics until it is shown.
			if (!bounds.width || !bounds.height) bounds = new DOMRect(-11, -13, 22, 26);
			boundsByEmoji.set(category.emoji, bounds);
		}
		const sweep = getAmountPercentage(category.amount, total) / 100 * Math.PI * 2;
		return donutEmojiFits(bounds, start, sweep);
	};
	const moveToOther = (index: number) => {
		const [category] = visible.splice(index, 1);
		other.amount = other.amount.plus(category.amount);
		other.categoryIds.push(...category.categoryIds);
		other.children?.push(category);
	};
	while (visible.length) {
		let start = -Math.PI / 2;
		const tooSmall = visible.findIndex(category => {
			if (!fits(category, start)) return true;
			start += getAmountPercentage(category.amount, total) / 100 * Math.PI * 2;
			return false;
		});
		if (tooSmall !== -1) {
			moveToOther(tooSmall);
			// Removing a slice moves the following horizontal emoji to new angles.
			continue;
		}
		if (other.categoryIds.length && !fits(other, start)) {
			// Other must also have enough space for its icon; keep exact proportions.
			moveToOther(visible.length - 1);
			continue;
		}
		break;
	}
	if (other.categoryIds.length) {
		other.children?.sort((a, b) => b.amount.cmp(a.amount));
		visible.push(other);
	}
	return visible;
}

function donutEmojiFits(bounds: DOMRect, start: number, sweep: number): boolean {
	const middle = start + sweep / 2;
	const x = Math.cos(middle) * DONUT_EMOJI_RADIUS;
	const y = Math.sin(middle) * DONUT_EMOJI_RADIUS;
	const left = x + bounds.x - DONUT_EMOJI_PADDING;
	const right = x + bounds.x + bounds.width + DONUT_EMOJI_PADDING;
	const top = y + bounds.y - DONUT_EMOJI_PADDING;
	const bottom = y + bounds.y + bounds.height + DONUT_EMOJI_PADDING;
	const nearestRadius = Math.hypot(Math.max(left, 0, -right), Math.max(top, 0, -bottom));
	if (nearestRadius < DONUT_INNER_RADIUS) return false;
	const halfAngle = sweep / 2 - donutSegmentGap(sweep);
	return [[left, top], [right, top], [left, bottom], [right, bottom]].every(([px, py]) => {
		const angle = Math.atan2(py, px) - middle;
		const difference = Math.atan2(Math.sin(angle), Math.cos(angle));
		return Math.hypot(px, py) <= DONUT_OUTER_RADIUS && Math.abs(difference) <= halfAngle;
	});
}

function donutSegmentGap(sweep: number): number {
	return sweep < Math.PI * 2 - 0.001 ? Math.min(0.016, sweep / 4) : 0;
}

function donutSegmentPath(start: number, sweep: number): string {
	// Two arcs also cover a full ring when the month has just one category.
	const gap = donutSegmentGap(sweep);
	const from = start + gap;
	const to = start + sweep - gap;
	const middle = (from + to) / 2;
	const point = (radius: number, angle: number) => `${160 + Math.cos(angle) * radius} ${160 + Math.sin(angle) * radius}`;
	const outer = DONUT_OUTER_RADIUS;
	const inner = DONUT_INNER_RADIUS;
	return `M ${point(outer, from)} A ${outer} ${outer} 0 0 1 ${point(outer, middle)} A ${outer} ${outer} 0 0 1 ${point(outer, to)} L ${point(inner, to)} A ${inner} ${inner} 0 0 0 ${point(inner, middle)} A ${inner} ${inner} 0 0 0 ${point(inner, from)} Z`;
}

const gridContent = async (mainContent: HTMLDivElement) => {
	const [bills, expensePlan, incomePlan, history] = await Promise.all([
		getAdditionalData<BillData>('accounts'),
		getAdditionalData<PlanData>('categories', 'expenditure_plan'),
		getAdditionalData<PlanData>('categories', 'income_plan'),
		getMainData()
	]);

	if (
		!isSuccess(bills) ||
		!isSuccess(expensePlan) ||
		!isSuccess(incomePlan) ||
		!isSuccess(history)
	) {
		return;
	}

	const { selectedYear } = stateManager();
	const currentYear = selectedYear ?? getDate().year;
	const nowYear = new Date().getFullYear();
	const startYear = MainPlugin.instance.settings.startYear;

	const yearsToFetch = Array.from(
		new Set([...Array.from({ length: nowYear - startYear + 1 }, (_, i) => startYear + i), Number(currentYear)])
	);

	const yearFilesResults = await Promise.all(yearsToFetch.map(y => getAllFile<YearData>(String(y))));
	const yearFilesMap = new Map<number, YearData>();

	for (let i = 0; i < yearsToFetch.length; i++) {
		const res = yearFilesResults[i];
		if (res.status === "error") {
			new Notice(res.error.message);
			console.error(res.error);
			return;
		}
		yearFilesMap.set(Number(yearsToFetch[i]), res.json);
	}

	const calculateYearStats = (yearDataJson?: YearData) => {
		let expense = new Big(0);
		let income = new Big(0);
		let length = new Big(0);

		if (yearDataJson?.months) {
			Object.values(yearDataJson.months).forEach(month => {
				length = length.plus(month.history.filter(inActiveCurrency).length);
				month.history.filter(inActiveCurrency).forEach(tx => {
					const amount = new Big(tx.amount);
					if (tx.type === 'expense') expense = expense.plus(amount);
					if (tx.type === 'income') income = income.plus(amount);
				});
			});
		}
		return { expense, income, length, balance: income.minus(expense) };
	};

	const selectedYearStats = calculateYearStats(yearFilesMap.get(Number(currentYear)));

	let totalAllExpense = new Big(0);
	let totalAllIncome = new Big(0);
	let totalAllLength = new Big(0);

	for (let year = startYear; year <= nowYear; year++) {
		const stats = calculateYearStats(yearFilesMap.get(year));
		totalAllExpense = totalAllExpense.plus(stats.expense);
		totalAllIncome = totalAllIncome.plus(stats.income);
		totalAllLength = totalAllLength.plus(stats.length);
	}
	const totalAllBalance = totalAllIncome.minus(totalAllExpense);

	const currency = getCurrencySymbol(activeCurrency());

	const monthData: CardItem[] = [
		{ title: "Income", value: `${formatNumbers(SummarizingData(incomePlan.jsonData).toString())} ${currency}`, icon: "arrow-up", type: "income" },
		{ title: "Expenses", value: `${formatNumbers(SummarizingData(expensePlan.jsonData).toString())} ${currency}`, icon: "arrow-down", type: "expense" },
		{ title: "Balance", value: `${formatNumbers(SummarizingDataForTheTrueBills(bills.jsonData).toString())} ${currency}`, icon: "calendar-check", type: "balance" },
		{ title: "Operations", value: `${history.jsonData.length}`, icon: "list", type: "operations" },
	];

	const yearData: CardItem[] = [
		{ title: "Income", value: `${formatNumbers(selectedYearStats.income.toString())} ${currency}`, icon: "arrow-up", type: "income", period: `for ${currentYear}` },
		{ title: "Expenses", value: `${formatNumbers(selectedYearStats.expense.toString())} ${currency}`, icon: "arrow-down", type: "expense", period: `for ${currentYear}` },
		{ title: "Balance", value: `${formatNumbers(selectedYearStats.balance.toString())} ${currency}`, icon: "calendar-check", type: "balance", period: `for ${currentYear}` },
		{ title: "Operations", value: `${selectedYearStats.length}`, icon: "list", type: "operations", period: `for ${currentYear}` },
	];

	const allData: CardItem[] = [
		{ title: "Income", value: `${formatNumbers(totalAllIncome.toString())} ${currency}`, icon: "arrow-up", type: "income", period: "for all time" },
		{ title: "Expenses", value: `${formatNumbers(totalAllExpense.toString())} ${currency}`, icon: "arrow-down", type: "expense", period: "for all time" },
		{ title: "Balance", value: `${formatNumbers(totalAllBalance.toString())} ${currency}`, icon: "calendar-check", type: "balance", period: "for all time" },
		{ title: "Operations", value: `${totalAllLength}`, icon: "list", type: "operations", period: "for all time" },
	];

	const gridContainer = mainContent.createDiv({ cls: "stats-grid" });

	const renderCards = (items: CardItem[]) => {
		gridContainer.empty();
		for (const item of items) {
			const card = gridContainer.createDiv({ cls: `stats-card stats-card-${item.type}` });
			const iconContainer = card.createDiv({ cls: "stats-card-icon" });
			setIcon(iconContainer, item.icon);

			const content = card.createDiv({ cls: "stats-card-content" });
			content.createDiv({ cls: "stats-card-title", text: item.title });
			content.createDiv({ cls: "stats-card-value", text: item.value });
			if (item.period) {
				content.createDiv({ cls: "stats-card-period", text: item.period });
			}
		}
	};

	const views = [
		{ mode: "month", data: monthData },
		{ mode: "year", data: yearData },
		{ mode: "all", data: allData },
	] as const;

	let currentViewIndex = 0;

	const updateView = () => {
		const currentView = views[currentViewIndex];
		gridContainer.dataset.data = currentView.mode;
		renderCards(currentView.data);
	};

	updateView();

	gridContainer.addEventListener("click", () => {
		currentViewIndex = (currentViewIndex + 1) % views.length;
		updateView();
	});
};

export const showHistory = async (mainContent: HTMLDivElement) => {
	stateManager({ openPageNow: "History" });

	const mainContentBody = mainContent.createEl("div", {
		cls: "main-content-body",
	});

	const [history, metadata] = await Promise.all([getMainData(), getHistoryMetadata()]);
	if (history.status === 'error') {
		new Notice(history.error.message)
		console.error(history.error)
		return
	}
	if (metadata.status === 'error') {
		new Notice(metadata.error.message);
		console.error(metadata.error);
		return;
	}

	if (!history.jsonData.length) {
		const undefinedContent = mainContentBody.createEl('div', {
			cls: 'undefined-content'
		})
		mainContentBody.addClass('main-content-body--undefined')

		undefinedContent.createEl('span', {
			text: '🍕 🎮 👕'
		})

		undefinedContent.createEl('p', {
			text: 'Enter any income and expenses to see how much money is actually left.'
		})
	} else {
		mainContentBody.removeClass('main-content-body--undefined')
		const searchInput = mainContentBody.createEl('input', {
			cls: 'input-search',
			attr: {
				id: 'input-search',
				type: 'search',
				placeholder: "Search by operations"
			}
		})
		searchInput.addEventListener('input', () => {
			const query = searchInput.value;
			void renderHistoryResults(historyContent, () => Promise.resolve({
				status: 'success', jsonData: filterHistory(history.jsonData, query, metadata.json),
			}), metadata.json);
		});
	}
	const historyContent = mainContentBody.createEl('div', {
		cls: 'history-content'
	})

	if (history.jsonData.length) {
		await renderHistoryResults(historyContent, () => Promise.resolve(history), metadata.json);
	}
}

const historyRenderVersions = new WeakMap<HTMLDivElement, number>();

async function renderHistoryResults(historyContent: HTMLDivElement, loadHistory: () => Promise<DataFileResult<HistoryData>>, metadata: HistoryMetadata) {
	const version = (historyRenderVersions.get(historyContent) ?? 0) + 1;
	historyRenderVersions.set(historyContent, version);
	const isCurrent = () => historyRenderVersions.get(historyContent) === version;
	historyContent.empty();
	historyContent.removeClass('main-content-body--undefined');
	historyContent.setAttribute('aria-busy', 'true');
	try {
		const result = await loadHistory();
		if (!isCurrent()) return;
		if (result.status === 'error') {
			new Notice(result.error.message);
			console.error(result.error);
			return;
		}

		const content = historyContent.ownerDocument.createElement('div');
		if (!result.jsonData.length) {
			const empty = content.createDiv({ cls: 'undefined-content' });
			empty.createEl('span', { text: '🍕 🎮 👕' });
			empty.createEl('p', { text: 'No matching operations found.' });
		} else {
			await generationHistoryContent(content, result, metadata);
		}
		if (!isCurrent()) return;
		historyContent.replaceChildren(...Array.from(content.childNodes));
		historyContent.classList.toggle('main-content-body--undefined', !result.jsonData.length);
	} catch (error) {
		if (isCurrent()) {
			console.error('Failed to render history', error);
			new Notice('Failed to load operations.');
		}
	} finally {
		if (isCurrent()) historyContent.setAttribute('aria-busy', 'false');
	}
}

export async function generationHistoryContent(historyContent: HTMLDivElement, historyData: DataFileResult<HistoryData>, metadata?: HistoryMetadata) {
	if (historyData.status === 'error') return historyData.error;
	if (historyData.jsonData.length) {
		if (!metadata) {
			const result = await getHistoryMetadata();
			if (result.status === 'error') return new Notice(result.error.message);
			metadata = result.json;
		}
		const now = new Date().getTime();

		const groupedByDay = Object.values(
			historyData.jsonData.reduce<Record<string, HistoryData[]>>(
				(acc, item) => {
					const day = item.date.split('T')[0];

					if (!acc[day]) {
						acc[day] = [];
					}

					acc[day].push(item);
					return acc;
				},
				{}
			)
		)
			.map(group => group.flat())
			.sort(
				(a, b) =>
					new Date(b[0].date).getTime() -
					new Date(a[0].date).getTime()
			);

		const result = groupedByDay.map(dayGroup =>
			dayGroup.sort(
				(a, b) =>
					Math.abs(new Date(a.date).getTime() - now) -
					Math.abs(new Date(b.date).getTime() - now)
			)
		);

		for (const historyElement of result) {
			const historyBlock = historyContent.createEl('div', {
				cls: 'history-block'
			})

			const headerBlock = historyBlock.createEl('div', {
				cls: 'header-block'
			})
			const dateBlock = headerBlock.createEl('div', {
				cls: 'header-date-block'
			})
			dateBlock.createEl('p', {
				text: humanizeDate(historyElement[0].date.split("T")[0])
			})
			const amountBlock = headerBlock.createEl('div', {
				cls: 'header-amount-block'
			})
			amountBlock.createEl('span', {
				text: `${SummarizingDataForTheDay(historyElement)}`
			})
			const dataList = historyBlock.createEl('ul', {
				cls: 'data-list'
			})
			for (const element of historyElement) {
				const dataItem = dataList.createEl('li', {
					cls: 'data-item',
					attr: {
						'data-id': element.id
					}
				})
				dataItem.onclick = (e: MouseEvent) => {
					void editingHistory(e);
				};

				const category = metadata.categories.get(`${element.type}:${element.category.id}`);
				const bill = metadata.bills.get(element.bill.id);

				const dataText = dataItem.createEl('div', {
					cls: 'data-link'
				})

				const divEmoji = dataText.createEl('div', {
					cls: 'data-link-emoji'
				})
				const divText = dataText.createEl('div', {
					cls: 'data-link-text'
				})

				divEmoji.createEl('p', {
					text: category?.emoji ?? '📦'
				})
				divEmoji.createEl('span', {
					text: bill?.emoji ?? '💳'
				})

				if (!element.comment) {
					divText.createEl('p', {
						text: category?.name ?? 'Uncategorized'
					})
					divText.createEl('span', {
						text: bill?.name ?? 'Unknown account'
					})
				} else {
					divText.createEl('p', {
						text: `${element.comment}`
					})
					divText.createEl('span', {
						text: `${bill?.name ?? 'Unknown account'} • ${category?.name ?? 'Uncategorized'}`
					})
				}

				const dataAmount = dataItem.createEl('div', {
					cls: 'data-link-amount'
				})
				dataAmount.createEl('p', {
					text: `${checkExpenceOrIncome(element.amount, element.type)} ${bill ? getCurrencySymbol(bill.currency) : ''}`.trim()
				})
				if (element.type === 'income') {
					dataAmount.addClass('data-link-amount-income')
				}
			}
		}
	}
}

export const showPlans = async (mainContent: HTMLDivElement) => {
	const mainContentBody = mainContent.createEl("div", {
		cls: "main-content-body",
	});

	stateManager({ openPageNow: "Plans" });

	const expensePlan = await getAdditionalData<PlanData>('categories', 'expenditure_plan');
	if (expensePlan.status === 'error') {
		new Notice(expensePlan.error.message)
		console.error(expensePlan.error)
		return
	}

	const incomePlan = await getAdditionalData<PlanData>('categories', 'income_plan');
	if (incomePlan.status === 'error') {
		new Notice(incomePlan.error.message)
		console.error(incomePlan.error)
		return
	}

	const arcivedExpensePlan = expensePlan.jsonData.filter((e: PlanData) => e.archived)
	const arcivedIncomePlan = incomePlan.jsonData.filter((e: PlanData) => e.archived)

	const notArcivedExpensePlan = expensePlan.jsonData.filter((e: PlanData) => !e.archived)
	const notArcivedIncomePlan = incomePlan.jsonData.filter((e: PlanData) => !e.archived)

	const headerPage = mainContentBody.createEl('div', {
		cls: 'header-page'
	})
	headerPage.createEl('h2', {
		text: 'Categories'
	})
	const creatButton = headerPage.createEl('button', {
		cls: 'creat-button',
		attr: { type: 'button', 'aria-label': 'Create category', title: 'Create category' },
	})
	setIcon(creatButton, 'plus')
	creatButton.addEventListener('click', (): void => {
		void addPlan();
	})

	if (!expensePlan.jsonData.length && !incomePlan.jsonData.length) {
		const undefinedContent = mainContentBody.createEl('div', {
			cls: 'undefined-content section-empty'
		})


		undefinedContent.createEl('span', {
			text: '🍕 🎮 👕'
		})

		undefinedContent.createEl('p', {
			text: 'Create your first category to organize income and expenses.'
		})
	} else {
		mainContentBody.removeClass('main-content-body--undefined')



		if (notArcivedExpensePlan.length) {
			const resultExpense = notArcivedExpensePlan.slice().sort((a: PlanData, b: PlanData) => new Big(b.amount).cmp(new Big(a.amount)))
			const expensePlanBlock = mainContentBody.createEl('div', {
				cls: 'plan-block'
			})
			const expenseDateBlock = expensePlanBlock.createEl('div', {
				cls: 'header-block'
			})
			const typeBlock = expenseDateBlock.createEl('div', {
				cls: 'header-type-block'
			})
			typeBlock.createEl('span', {
				text: 'Expense'
			})
			const amountBlock = expenseDateBlock.createEl('div', {
				cls: 'header-amount-block'
			})
			amountBlock.createEl('span', {
				text: formatNumbers(String(SummarizingData(resultExpense))),
				cls: 'expense-plan-amount'
			})
			const expenseDataList = expensePlanBlock.createEl('ul', {
				cls: 'data-list'
			})
			resultExpense.forEach((e: PlanData) => {
				const dataItem = expenseDataList.createEl('li', {
					cls: 'data-item',
					attr: {
						'data-id': e.id,
						'data-type': e.type
					}
				})
				dataItem.onclick = (e: MouseEvent) => {
					void editingPlan(e);
				};
				const dataText = dataItem.createEl('div', {
					cls: 'data-link'
				})
				const divEmoji = dataText.createEl('div', {
					cls: 'data-link-emoji'
				})
				const divText = dataText.createEl('div', {
					cls: 'data-link-text'
				})
				divEmoji.createEl('p', {
					text: `${e.emoji}`
				})
				divText.createEl('p', {
					text: `${e.name}`
				})
				dataItem.createEl('p', {
					text: formatNumbers(String(e.amount)),
					cls: 'expense-plan-amount'
				})
			})
		}
		if (arcivedExpensePlan.length) {
			mainContentBody.removeClass('main-content-body--undefined')
			const resultExpense = arcivedExpensePlan.slice().sort((a: PlanData, b: PlanData) => new Big(b.amount).cmp(new Big(a.amount)))
			const expensePlanBlock = mainContentBody.createEl('div', {
				cls: 'plan-block'
			})
			const expenseDateBlock = expensePlanBlock.createEl('div', {
				cls: 'header-block'
			})
			const typeBlock = expenseDateBlock.createEl('div', {
				cls: 'header-type-block'
			})
			typeBlock.createEl('span', {
				text: 'Archived expense'
			})
			const amountBlock = expenseDateBlock.createEl('div', {
				cls: 'header-amount-block'
			})
			amountBlock.createEl('span', {
				text: formatNumbers(String(SummarizingData(resultExpense))),
				cls: 'expense-plan-amount'
			})
			const expenseDataList = expensePlanBlock.createEl('ul', {
				cls: 'data-list'
			})
			const showButton = expenseDataList.createEl('li', {
				cls: 'data-item archived-button'
			})
			const showDivEmoji = showButton.createEl('div', {
				cls: 'data-link-emoji'
			})
			const showDivText = showButton.createEl('div', {
				cls: 'data-link-text'
			})
			showDivEmoji.createEl('p', {
				text: '🗃️'
			})
			showDivText.createEl('p', {
				text: `${arcivedExpensePlan.length} archived`,
			})
			showButton.onclick = () => {
				showButton.remove()
				resultExpense.forEach((e: PlanData) => {
					const dataItem = expenseDataList.createEl('li', {
						cls: 'data-item archived-item',
						attr: {
							'data-id': e.id,
							'data-type': e.type
						}
					})
					dataItem.onclick = (e: MouseEvent) => {
						void editingPlan(e);
					};
					const dataText = dataItem.createEl('div', {
						cls: 'data-link'
					})
					const divEmoji = dataText.createEl('div', {
						cls: 'data-link-emoji'
					})
					const divText = dataText.createEl('div', {
						cls: 'data-link-text'
					})
					divEmoji.createEl('p', {
						text: `${e.emoji}`
					})
					divText.createEl('p', {
						text: `${e.name}`
					})
					dataItem.createEl('p', {
						text: formatNumbers(String(e.amount)),
						cls: 'expense-plan-amount'
					})
				})
			}
		}
		if (notArcivedIncomePlan.length) {
			mainContentBody.removeClass('main-content-body--undefined')
			const resultIncome = notArcivedIncomePlan.slice().sort((a: PlanData, b: PlanData) => new Big(b.amount).cmp(new Big(a.amount)))
			const incomePlanBlock = mainContentBody.createEl('div', {
				cls: 'plan-block'
			})
			const incomeDateBlock = incomePlanBlock.createEl('div', {
				cls: 'header-block'
			})
			const typeBlock = incomeDateBlock.createEl('div', {
				cls: 'header-type-block'
			})
			typeBlock.createEl('span', {
				text: 'Income'
			})
			const amountBlock = incomeDateBlock.createEl('div', {
				cls: 'header-amount-block'
			})
			amountBlock.createEl('span', {
				text: formatNumbers(String(SummarizingData(resultIncome))),
				cls: 'income-plan-amount'
			})
			const incomeDataList = incomePlanBlock.createEl('ul', {
				cls: 'data-list'
			})
			resultIncome.forEach((e: PlanData) => {
				const dataItem = incomeDataList.createEl('li', {
					cls: 'data-item',
					attr: {
						'data-id': e.id,
						'data-type': e.type
					}
				})
				dataItem.onclick = (e: MouseEvent) => {
					void editingPlan(e);
				};
				const dataText = dataItem.createEl('div', {
					cls: 'data-link'
				})
				const divEmoji = dataText.createEl('div', {
					cls: 'data-link-emoji'
				})
				const divText = dataText.createEl('div', {
					cls: 'data-link-text'
				})
				divEmoji.createEl('p', {
					text: `${e.emoji}`
				})
				divText.createEl('p', {
					text: `${e.name}`
				})
				dataItem.createEl('p', {
					text: formatNumbers(String(e.amount)),
					cls: 'income-plan-amount'
				})
			})
		}
		if (arcivedIncomePlan.length) {
			mainContentBody.removeClass('main-content-body--undefined')
			const resultIncome = arcivedIncomePlan.slice().sort((a: PlanData, b: PlanData) => new Big(b.amount).cmp(new Big(a.amount)))
			const incomePlanBlock = mainContentBody.createEl('div', {
				cls: 'plan-block'
			})
			const incomeDateBlock = incomePlanBlock.createEl('div', {
				cls: 'header-block'
			})
			const typeBlock = incomeDateBlock.createEl('div', {
				cls: 'header-type-block'
			})
			typeBlock.createEl('span', {
				text: 'Archived income'
			})
			const amountBlock = incomeDateBlock.createEl('div', {
				cls: 'header-amount-block'
			})
			amountBlock.createEl('span', {
				text: formatNumbers(String(SummarizingData(resultIncome))),
				cls: 'income-plan-amount'
			})
			const incomeDataList = incomePlanBlock.createEl('ul', {
				cls: 'data-list'
			})
			const showButton = incomeDataList.createEl('li', {
				cls: 'data-item archived-button'
			})
			const showDivEmoji = showButton.createEl('div', {
				cls: 'data-link-emoji'
			})
			const showDivText = showButton.createEl('div', {
				cls: 'data-link-text'
			})
			showDivEmoji.createEl('p', {
				text: '🗃️'
			})
			showDivText.createEl('p', {
				text: `${arcivedIncomePlan.length} archived`,
			})
			showButton.onclick = () => {
				showButton.remove()
				resultIncome.forEach((e: PlanData) => {
					const dataItem = incomeDataList.createEl('li', {
						cls: 'data-item archived-item',
						attr: {
							'data-id': e.id,
							'data-type': e.type
						}
					})
					dataItem.onclick = (e: MouseEvent) => {
						void editingPlan(e);
					};
					const dataText = dataItem.createEl('div', {
						cls: 'data-link'
					})
					const divEmoji = dataText.createEl('div', {
						cls: 'data-link-emoji'
					})
					const divText = dataText.createEl('div', {
						cls: 'data-link-text'
					})
					divEmoji.createEl('p', {
						text: `${e.emoji}`
					})
					divText.createEl('p', {
						text: `${e.name}`
					})
					dataItem.createEl('p', {
						text: formatNumbers(String(e.amount)),
						cls: 'income-plan-amount'
					})
				})
			}
		}
	}
}

export const showBills = async (mainContent: HTMLDivElement) => {
	const mainContentBody = mainContent.createEl("div", {
		cls: "main-content-body",
	});

	stateManager({ openPageNow: "Bills" });
	const bills = await getAdditionalData<BillData>('accounts');
	if (bills.status === 'error') {
		new Notice(bills.error.message)
		console.error(bills.error)
		return
	}

	const notArcivedMainBills = bills.jsonData.filter((e: BillData) => !e.archived && e.generalBalance)
	const notArcivedAdditionalBills = bills.jsonData.filter((e: BillData) => !e.archived && !e.generalBalance)
	const arcivedMainBills = bills.jsonData.filter((e: BillData) => e.archived && e.generalBalance)
	const arcivedAdditionalBills = bills.jsonData.filter((e: BillData) => e.archived && !e.generalBalance)

	const headerPage = mainContentBody.createEl('div', {
		cls: 'header-page'
	})
	headerPage.createEl('h2', {
		text: 'Accounts'
	})
	const creatButton = headerPage.createEl('button', {
		cls: 'creat-button',
		attr: { type: 'button', 'aria-label': 'Create account', title: 'Create account' },
	})
	setIcon(creatButton, 'plus')
	creatButton.addEventListener('click', (): void => {
		void addBills();
	})

	if (!bills.jsonData.length) {
		const undefinedContent = mainContentBody.createEl('div', {
			cls: 'undefined-content section-empty'
		})


		undefinedContent.createEl('span', {
			text: '💳🏦👛'
		})

		undefinedContent.createEl('p', {
			text: 'No accounts in this currency yet. Create an account to get started.'
		})
	} else {
		mainContentBody.removeClass('main-content-body--undefined')



		if (notArcivedMainBills.length >= 1) {

			const trueBillBlock = mainContentBody.createEl('div', {
				cls: 'bill-block'
			})
			const trueDateBlock = trueBillBlock.createEl('div', {
				cls: 'header-block'
			})
			const typeBlock = trueDateBlock.createEl('div', {
				cls: 'header-type-block'
			})
			typeBlock.createEl('span', {
				text: 'Main'
			})
			const amountBlock = trueDateBlock.createEl('div', {
				cls: 'header-amount-block'
			})
			amountBlock.createEl('span', {
				text: formatNumbers(String(SummarizingDataForTheTrueBills(notArcivedMainBills)))
			})
			const trueDataList = trueBillBlock.createEl('ul', {
				cls: 'data-list'
			})

			notArcivedMainBills.forEach((e: BillData) => {
				const dataItem = trueDataList.createEl('li', {
					cls: 'data-item',
					attr: {
						'data-id': e.id
					}
				})
				dataItem.onclick = async (e: MouseEvent) => {
					await editingBill(e);
				}
				const dataText = dataItem.createEl('div', {
					cls: 'data-link'
				})
				const divEmoji = dataText.createEl('div', {
					cls: 'data-link-emoji'
				})
				const divText = dataText.createEl('div', {
					cls: 'data-link-text'
				})
				divEmoji.createEl('p', {
					text: `${e.emoji}`
				})
				divText.createEl('p', {
					text: `${e.name}`
				})
				dataItem.createEl('p', {
					text: `${formatNumbers(String(e.balance))} ${getCurrencySymbol(e.currency)}`
				})
			})
		}

		if (arcivedMainBills.length >= 1) {
			mainContentBody.removeClass('main-content-body--undefined')
			const trueBillBlock = mainContentBody.createEl('div', {
				cls: 'bill-block'
			})
			const trueDateBlock = trueBillBlock.createEl('div', {
				cls: 'header-block'
			})
			const typeBlock = trueDateBlock.createEl('div', {
				cls: 'header-type-block'
			})
			typeBlock.createEl('span', {
				text: 'Archived main'
			})
			const amountBlock = trueDateBlock.createEl('div', {
				cls: 'header-amount-block'
			})
			amountBlock.createEl('span', {
				text: formatNumbers(String(SummarizingDataForTheTrueBills(arcivedMainBills)))
			})
			const trueDataList = trueBillBlock.createEl('ul', {
				cls: 'data-list'
			})

			const showButton = trueDataList.createEl('li', {
				cls: 'data-item archived-button'
			})
			const showDivEmoji = showButton.createEl('div', {
				cls: 'data-link-emoji'
			})
			const showDivText = showButton.createEl('div', {
				cls: 'data-link-text'
			})
			showDivEmoji.createEl('p', {
				text: '🗃️'
			})
			showDivText.createEl('p', {
				text: `${arcivedMainBills.length} archived`,
			})

			showButton.onclick = () => {
				showButton.remove()
				arcivedMainBills.forEach((e: BillData) => {
					const dataItem = trueDataList.createEl('li', {
						cls: 'data-item archived-item',
						attr: {
							'data-id': e.id
						}
					})
					dataItem.onclick = async (e: MouseEvent) => {
						await editingBill(e);
					}
					const dataText = dataItem.createEl('div', {
						cls: 'data-link'
					})
					const divEmoji = dataText.createEl('div', {
						cls: 'data-link-emoji'
					})
					const divText = dataText.createEl('div', {
						cls: 'data-link-text'
					})
					divEmoji.createEl('p', {
						text: `${e.emoji}`
					})
					divText.createEl('p', {
						text: `${e.name}`
					})
					dataItem.createEl('p', {
						text: `${formatNumbers(String(e.balance))} ${getCurrencySymbol(e.currency)}`
					})
				})
			}
		}

		if (notArcivedAdditionalBills.length >= 1) {
			mainContentBody.removeClass('main-content-body--undefined')
			const falseBillBlock = mainContentBody.createEl('div', {
				cls: 'bill-block'
			})
			const falseDateBlock = falseBillBlock.createEl('div', {
				cls: 'header-block'
			})
			const typeBlock = falseDateBlock.createEl('div', {
				cls: 'header-type-block'
			})
			typeBlock.createEl('span', {
				text: 'Additional'
			})
			const amountBlock = falseDateBlock.createEl('div', {
				cls: 'header-amount-block'
			})
			amountBlock.createEl('span', {
				text: formatNumbers(String(SummarizingDataForTheFalseBills(notArcivedAdditionalBills)))
			})
			const falseDataList = falseBillBlock.createEl('ul', {
				cls: 'data-list'
			})

			notArcivedAdditionalBills.forEach((e: BillData) => {
				const dataItem = falseDataList.createEl('li', {
					cls: 'data-item',
					attr: {
						'data-id': e.id
					}
				})
				dataItem.onclick = async (e: MouseEvent) => {
					await editingBill(e);
				}
				const dataText = dataItem.createEl('div', {
					cls: 'data-link'
				})
				const divEmoji = dataText.createEl('div', {
					cls: 'data-link-emoji'
				})
				const divText = dataText.createEl('div', {
					cls: 'data-link-text'
				})
				divEmoji.createEl('p', {
					text: `${e.emoji}`
				})
				divText.createEl('p', {
					text: `${e.name}`
				})
				dataItem.createEl('p', {
					text: `${formatNumbers(String(e.balance))} ${getCurrencySymbol(e.currency)}`
				})
			})
		}

		if (arcivedAdditionalBills.length >= 1) {
			mainContentBody.removeClass('main-content-body--undefined')
			const trueBillBlock = mainContentBody.createEl('div', {
				cls: 'bill-block'
			})
			const trueDateBlock = trueBillBlock.createEl('div', {
				cls: 'header-block'
			})
			const typeBlock = trueDateBlock.createEl('div', {
				cls: 'header-type-block'
			})
			typeBlock.createEl('span', {
				text: 'Archived main'
			})
			const amountBlock = trueDateBlock.createEl('div', {
				cls: 'header-amount-block'
			})
			amountBlock.createEl('span', {
				text: formatNumbers(String(SummarizingDataForTheTrueBills(arcivedAdditionalBills)))
			})
			const trueDataList = trueBillBlock.createEl('ul', {
				cls: 'data-list'
			})

			const showButton = trueDataList.createEl('li', {
				cls: 'data-item archived-button'
			})
			const showDivEmoji = showButton.createEl('div', {
				cls: 'data-link-emoji'
			})
			const showDivText = showButton.createEl('div', {
				cls: 'data-link-text'
			})
			showDivEmoji.createEl('p', {
				text: '🗃️'
			})
			showDivText.createEl('p', {
				text: `${arcivedMainBills.length} archived`,
			})

			showButton.onclick = () => {
				showButton.remove()
				arcivedAdditionalBills.forEach((e: BillData) => {
					const dataItem = trueDataList.createEl('li', {
						cls: 'data-item archived-item',
						attr: {
							'data-id': e.id
						}
					})
					dataItem.onclick = async (e: MouseEvent) => {
						await editingBill(e);
					}
					const dataText = dataItem.createEl('div', {
						cls: 'data-link'
					})
					const divEmoji = dataText.createEl('div', {
						cls: 'data-link-emoji'
					})
					const divText = dataText.createEl('div', {
						cls: 'data-link-text'
					})
					divEmoji.createEl('p', {
						text: `${e.emoji}`
					})
					divText.createEl('p', {
						text: `${e.name}`
					})
					dataItem.createEl('p', {
						text: `${formatNumbers(String(e.balance))} ${getCurrencySymbol(e.currency)}`
					})
				})
			}
		}
	}
}
