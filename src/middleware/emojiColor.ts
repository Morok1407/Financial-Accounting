interface RGB {
	r: number;
	g: number;
	b: number;
}

interface HSL {
	h: number;
	s: number;
	l: number;
}

const colorCache = new Map<string, string>();

/**
 * Возвращает цвет, автоматически определённый из emoji.
 *
 * @example
 * getEmojiColor("🎬") // "#6B5B95"
 * getEmojiColor("💳") // "#4285C5"
 */
export function getEmojiColor(emoji: string): string {
	const cached = colorCache.get(emoji);

	if (cached) {
		return cached;
	}

	const color = calculateEmojiColor(emoji);

	colorCache.set(emoji, color);

	return color;
}

/**
 * Основной алгоритм определения цвета.
 */
function calculateEmojiColor(emoji: string): string {
	const pixels = renderEmoji(emoji);

	if (pixels.length === 0) {
		return "#808080";
	}

	const dominantColor = findDominantColor(pixels);

	const hsl = rgbToHsl(dominantColor);

	const normalized = normalizeForChart(hsl);

	return hslToHex(normalized);
}

/**
 * Рендерит emoji в Canvas и возвращает видимые пиксели.
 */
function renderEmoji(emoji: string): RGB[] {
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d", {
		willReadFrequently: true,
	});

	if (!ctx) {
		return [];
	}

	const size = 128;

	canvas.width = size;
	canvas.height = size;

	ctx.clearRect(0, 0, size, size);

	ctx.font = "100px sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	ctx.fillText(emoji, size / 2, size / 2);

	const imageData = ctx.getImageData(
		0,
		0,
		size,
		size
	);

	const pixels: RGB[] = [];

	for (let i = 0; i < imageData.data.length; i += 4) {
		const r = imageData.data[i];
		const g = imageData.data[i + 1];
		const b = imageData.data[i + 2];
		const a = imageData.data[i + 3];

		// Прозрачные пиксели не учитываем.
		if (a < 128) {
			continue;
		}

		// Почти белые пиксели обычно являются
		// частью фона/бликов и мало полезны для цвета.
		if (r > 245 && g > 245 && b > 245) {
			continue;
		}

		pixels.push({ r, g, b });
	}

	return pixels;
}

/**
 * Ищет доминирующий цвет.
 *
 * Цвета группируются с некоторой погрешностью,
 * чтобы #4285C5 и #4386C6 считались одним цветом.
 */
function findDominantColor(pixels: RGB[]): RGB {
	const buckets = new Map<string, {
		color: RGB;
		count: number;
	}>();

	const bucketSize = 24;

	for (const pixel of pixels) {
		const r = Math.floor(pixel.r / bucketSize);
		const g = Math.floor(pixel.g / bucketSize);
		const b = Math.floor(pixel.b / bucketSize);

		const key = `${r}:${g}:${b}`;

		const bucket = buckets.get(key);

		if (bucket) {
			bucket.count++;
		} else {
			buckets.set(key, {
				color: pixel,
				count: 1,
			});
		}
	}

	let dominant = {
		color: pixels[0],
		count: 0,
	};

	for (const bucket of buckets.values()) {
		if (bucket.count > dominant.count) {
			dominant = bucket;
		}
	}

	return dominant.color;
}

/**
 * RGB → HSL
 */
function rgbToHsl({ r, g, b }: RGB): HSL {
	r /= 255;
	g /= 255;
	b /= 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);

	let h = 0;
	let s = 0;

	const l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;

		s = l > 0.5
			? d / (2 - max - min)
			: d / (max + min);

		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;

			case g:
				h = (b - r) / d + 2;
				break;

			case b:
				h = (r - g) / d + 4;
				break;
		}

		h /= 6;
	}

	return {
		h: h * 360,
		s: s * 100,
		l: l * 100,
	};
}

/**
 * Делает цвет более подходящим для pie chart.
 */
function normalizeForChart(hsl: HSL): HSL {
	let { h, s, l } = hsl;

	/*
	 * Если emoji практически серый/чёрный/белый,
	 * добавляем оттенок на основе исходного цвета.
	 *
	 * Это важно для emoji вроде 🎬.
	 */
	if (s < 15) {
		s = 55;

		/*
		 * Используем яркость исходного цвета,
		 * чтобы тёмные emoji оставались тёмнее.
		 */
		if (l < 35) {
			l = 45;
		} else if (l > 75) {
			l = 65;
		} else {
			l = 55;
		}
	}

	/*
	 * Слишком бледные цвета плохо читаются
	 * на диаграмме.
	 */
	s = Math.max(45, Math.min(s, 80));

	/*
	 * Не позволяем цвету стать слишком тёмным
	 * или слишком светлым.
	 */
	l = Math.max(35, Math.min(l, 65));

	return { h, s, l };
}

/**
 * HSL → HEX
 */
function hslToHex({ h, s, l }: HSL): string {
	s /= 100;
	l /= 100;

	const k = (n: number) => (n + h / 30) % 12;

	const a = s * Math.min(l, 1 - l);

	const f = (n: number) =>
		l - a * Math.max(
			-1,
			Math.min(
				k(n) - 3,
				Math.min(9 - k(n), 1)
			)
		);

	const r = Math.round(255 * f(0));
	const g = Math.round(255 * f(8));
	const b = Math.round(255 * f(4));

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Число → HEX.
 */
function toHex(value: number): string {
	return value
		.toString(16)
		.padStart(2, "0")
		.toUpperCase();
}
