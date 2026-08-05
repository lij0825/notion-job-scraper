/**
 * 스크래핑된 텍스트에서 불필요한 공백, 연속 줄바꿈, 탭 등을 제거합니다.
 * 모든 스크래퍼에서 description 등의 본문 텍스트 처리에 공통 사용합니다.
 */
export function sanitizeText(str: string): string {
	return str
		// Windows 줄바꿈 통일
		.replace(/\r\n/g, '\n')
		// 탭 문자를 단일 공백으로 변환
		.replace(/\t/g, ' ')
		// 줄 내 연속 공백을 단일 공백으로 압축
		.replace(/[ \t]{2,}/g, ' ')
		// 각 줄의 앞뒤 공백 제거
		.split('\n')
		.map((line) => line.trim())
		.join('\n')
		// 3개 이상 연속 줄바꿈을 최대 2개로 제한
		.replace(/\n{3,}/g, '\n\n')
		// 전체 앞뒤 공백 제거
		.trim();
}

/**
 * 날짜 문자열을 YYYY-MM-DD 형식으로 정규화합니다.
 * 상시채용 또는 채용시 마감 패턴이면 null을 반환합니다.
 *
 * @example
 * parseDeadline('2024.12.31') // => '2024-12-31'
 * parseDeadline('상시채용')    // => null
 * parseDeadline('채용시 마감') // => null
 */
export function parseDeadline(text: string): string | null {
	if (!text || !text.trim()) {
		return null;
	}

	const normalized = text.trim();

	// 상시채용 / 채용시 마감 패턴 처리
	if (/상시\s*채용|채용\s*시\s*마감|채용\s*마감\s*시|상시\s*모집|수시\s*채용/i.test(normalized)) {
		return null;
	}

	// ISO 8601 형식 (YYYY-MM-DD) — Notion API와 원티드 API에서 사용
	const isoMatch = normalized.match(/(\d{4})-(\d{2})-(\d{2})/);
	if (isoMatch) {
		return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
	}

	// 한국식 점 구분자 형식 (YYYY.MM.DD)
	const dotMatch = normalized.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
	if (dotMatch) {
		const [, year, month, day] = dotMatch;
		return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
	}

	// 슬래시 구분자 형식 (YYYY/MM/DD)
	const slashMatch = normalized.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
	if (slashMatch) {
		const [, year, month, day] = slashMatch;
		return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
	}

	// 한글 날짜 형식 (YYYY년 MM월 DD일)
	const koreanMatch = normalized.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
	if (koreanMatch) {
		const [, year, month, day] = koreanMatch;
		return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
	}

	return null;
}
