import type { JobData } from '../types';
import { sanitizeText, parseDeadline } from '../../../utils/sanitize';

export async function scrapeJasoseol(): Promise<JobData | null> {
	// 1. STRICT GUARD: Check modal URL parameter (?ec=)
	const ec = new URLSearchParams(window.location.search).get('ec');
	if (!ec) {
		return null;
	}

	// 2. Locate Active Container
	let activeContainer = document.querySelector<HTMLElement>('[data-current="true"]');

	if (!activeContainer) {
		const ecAnchors = Array.from(
			document.querySelectorAll<HTMLElement>(`a[href*="ec=${ec}"], [data-ec="${ec}"]`)
		);
		if (ecAnchors.length > 0) {
			let parent: HTMLElement | null = ecAnchors[0];
			while (parent && parent !== document.body) {
				if ((parent.innerText || parent.textContent || '').length > 100) {
					activeContainer = parent;
					break;
				}
				parent = parent.parentElement;
			}
		}
	}

	if (!activeContainer) {
		return null;
	}

	const text = activeContainer.innerText || activeContainer.textContent || '';
	const lines = text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);

	if (lines.length < 7) {
		return null;
	}

	// 3. Company Extraction (Regex or Line 5)
	const companyMatch = text.match(/([^\r\n>]+)\s*>/);
	const company = companyMatch ? companyMatch[1].trim() : (lines[5] || '');

	// 4. Title Extraction (Line 6)
	const title = lines[6] || '';

	// 5. Deadline Extraction
	let deadline: string | null = null;
	const allDates = text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g);
	if (allDates && allDates.length > 0) {
		const lastDateStr = allDates[allDates.length - 1];
		deadline = parseDeadline(lastDateStr);
	}

	// 6. Description Extraction
	const descriptionLines = lines.slice(7);
	const description = descriptionLines.length > 0
		? descriptionLines.join('\n')
		: text;

	return {
		company,
		title,
		deadline,
		url: `https://jasoseol.com/recruit?ec=${ec}`,
		description: sanitizeText(description),
		site: 'jasoseol',
	};
}
