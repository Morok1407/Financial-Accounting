import Big from 'big.js';

/** A collection of amounts. Different currencies are never added together. */
export class MoneyTotals {
    readonly values = new Map<string, Big>();
    add(currency: string, amount: Big | string): this {
        this.values.set(currency, (this.values.get(currency) ?? new Big(0)).plus(amount));
        return this;
    }
    plus(other: MoneyTotals): MoneyTotals {
        const result = new MoneyTotals();
        for (const [currency, amount] of this.values) result.add(currency, amount);
        for (const [currency, amount] of other.values) result.add(currency, amount);
        return result;
    }
    minus(other: MoneyTotals): MoneyTotals {
        const negative = new MoneyTotals();
        for (const [currency, amount] of other.values) negative.add(currency, amount.neg());
        return this.plus(negative);
    }
    toString(): string {
        return [...this.values].sort(([a], [b]) => a.localeCompare(b))
            .map(([currency, amount]) => `${amount.toString()} ${currency}`).join(' · ') || '0';
    }
}
