import { Client } from '@notionhq/client';
import type { JobData } from './types';

/** Notion paragraph 블록 하나의 최대 텍스트 길이 (API 제한) */
const MAX_BLOCK_TEXT_LENGTH = 2000;

/**
 * 긴 description 텍스트를 Notion API 제한(2000자)에 맞게
 * 여러 paragraph 블록으로 분할합니다.
 * 줄바꿈 기준으로 분할하여 가독성을 유지합니다.
 */
function buildDescriptionBlocks(description: string) {
	if (!description.trim()) {
		return [];
	}

	const lines = description.split('\n');
	const blocks: Array<{
		object: 'block';
		type: 'paragraph';
		paragraph: { rich_text: Array<{ type: 'text'; text: { content: string } }> };
	}> = [];

	let currentChunk = '';

	for (const line of lines) {
		const lineWithNewline = currentChunk ? '\n' + line : line;

		// 현재 청크에 추가 시 2000자 초과하면 현재 청크를 블록으로 저장하고 새 청크 시작
		if ((currentChunk + lineWithNewline).length > MAX_BLOCK_TEXT_LENGTH) {
			if (currentChunk) {
				blocks.push({
					object: 'block',
					type: 'paragraph',
					paragraph: {
						rich_text: [{ type: 'text', text: { content: currentChunk } }],
					},
				});
			}
			// 단일 줄이 2000자를 초과하는 경우 강제 분할
			let remaining = line;
			while (remaining.length > MAX_BLOCK_TEXT_LENGTH) {
				blocks.push({
					object: 'block',
					type: 'paragraph',
					paragraph: {
						rich_text: [
							{ type: 'text', text: { content: remaining.slice(0, MAX_BLOCK_TEXT_LENGTH) } },
						],
					},
				});
				remaining = remaining.slice(MAX_BLOCK_TEXT_LENGTH);
			}
			currentChunk = remaining;
		} else {
			currentChunk += lineWithNewline;
		}
	}

	// 마지막 청크 처리
	if (currentChunk.trim()) {
		blocks.push({
			object: 'block',
			type: 'paragraph',
			paragraph: {
				rich_text: [{ type: 'text', text: { content: currentChunk } }],
			},
		});
	}

	return blocks;
}

/**
 * Notion Database에 새 채용 공고 페이지를 생성합니다.
 * Background Service Worker에서만 호출됩니다.
 *
 * @returns 생성된 Notion 페이지 ID
 * @throws Notion API 호출 실패 시 에러
 */
export async function createJobPage(
	accessToken: string,
	databaseId: string,
	jobData: JobData
): Promise<string> {
	const notion = new Client({ auth: accessToken });

	const response = await notion.pages.create({
		parent: { database_id: databaseId },
		properties: {
			// 직무명 (Title 속성)
			Title: {
				title: [{ text: { content: jobData.title || '(제목 없음)' } }],
			},
			// 회사명 (Rich Text 속성)
			Company: {
				rich_text: [{ text: { content: jobData.company || '(회사명 없음)' } }],
			},
			// 공고 URL (URL 속성)
			URL: {
				url: jobData.url,
			},
			// 마감일 (Date 속성) — Notion 캘린더 자동 동기화에 필요
			...(jobData.deadline
				? {
						Deadline: {
							date: { start: jobData.deadline },
						},
					}
				: {}),
			// 지원 상태 (Select 속성) — 기본값 "지원 예정"
			Status: {
				select: { name: '지원 예정' },
			},
		},
		// 직무 설명을 페이지 본문 블록으로 추가
		children: buildDescriptionBlocks(jobData.description),
	});

	return response.id;
}

/**
 * Notion Database가 실제로 존재하고 접근 가능한지 검증합니다.
 * 설정 화면에서 Database ID 유효성 검사에 사용됩니다.
 *
 * @throws 접근 불가 또는 존재하지 않는 DB일 경우 에러
 */
export async function validateDatabase(
	accessToken: string,
	databaseId: string
): Promise<{ valid: boolean; name: string }> {
	const notion = new Client({ auth: accessToken });
	const db = await notion.databases.retrieve({ database_id: databaseId });

	// 데이터베이스 제목 추출
	const titleProp = db.title;
	const name =
		titleProp.length > 0 && titleProp[0]?.plain_text ? titleProp[0].plain_text : '(제목 없음)';

	return { valid: true, name };
}
