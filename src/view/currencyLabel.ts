import currencies from '../../currencies.json';
import flags from '../assets/currency-flags.json';

/** Local artwork avoids reliance on the operating system's flag emoji font. */
export function currencyLabel(code: string): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const emoji = currencies[code as keyof typeof currencies]?.flagEmoji ?? '🌐';
    const svg = (flags as Record<string, string>)[emoji];
    if (svg) {
        const image = document.createElement('img');
        image.className = 'finance-currency-flag';
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        image.alt = '';
        image.setAttribute('aria-hidden', 'true');
        image.width = 22;
        image.height = 22;
        image.draggable = false;
        fragment.appendChild(image);
    }
    fragment.appendChild(document.createTextNode(code));
    return fragment;
}
