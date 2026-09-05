export function normalizeNotionId(input: string): string {
	const trimmed = input.trim();
	if (!trimmed) {
		return '';
	}

	try {
		const parsedUrl = new URL(trimmed);
		const cleanPath = parsedUrl.pathname.replace(/-/g, '');
		const endMatch = cleanPath.match(/[a-f0-9]{32}$/i);
		if (endMatch) {
			return endMatch[0];
		}
		const pathMatch = cleanPath.match(/[a-f0-9]{32}/i);
		if (pathMatch) {
			return pathMatch[0];
		}
	} catch {
		// URL이 아닌 경우 일반 문자열 파싱 진행
	}

	const cleanInput = trimmed.replace(/-/g, '');
	const hexMatch = cleanInput.match(/[a-f0-9]{32}/i);
	if (hexMatch) {
		return hexMatch[0];
	}

	return trimmed;
}
