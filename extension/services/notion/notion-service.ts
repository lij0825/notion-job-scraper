import { getStoredData, updateDatabaseId } from '../../utils/storage';
import { createJobPage, validateDatabase, createNotionDatabase } from '../../utils/notion';
import { normalizeNotionId } from '../../utils/notion-id';
import type { BackgroundResponse, JobData } from '../../utils/types';

export class NotionJobService {
	public async saveToNotion(jobData: JobData): Promise<BackgroundResponse<{ pageId: string }>> {
		const stored = await getStoredData();

		if (!stored.accessToken) {
			return { success: false, error: 'Notion에 연결되어 있지 않습니다. 다시 로그인해 주세요.' };
		}

		if (!stored.databaseId) {
			return {
				success: false,
				error: '저장할 Notion Database ID가 설정되지 않았습니다. 설정에서 Database ID를 입력해 주세요.',
			};
		}

		try {
			const pageId = await createJobPage(stored.accessToken, stored.databaseId, jobData);
			return { success: true, data: { pageId } };
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
			return { success: false, error: this.formatNotionSaveError(errorMessage) };
		}
	}

	public async saveDatabaseId(databaseId: string): Promise<BackgroundResponse<{ name: string }>> {
		const trimmed = databaseId.trim();
		if (!trimmed) {
			return { success: false, error: 'Database ID를 입력해 주세요.' };
		}

		const stored = await getStoredData();
		if (!stored.accessToken) {
			return { success: false, error: '먼저 Notion에 연결해 주세요.' };
		}

		const cleanedId = normalizeNotionId(trimmed);

		try {
			const { name } = await validateDatabase(stored.accessToken, cleanedId);
			await updateDatabaseId(cleanedId);
			return { success: true, data: { name } };
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
			if (errorMessage.includes('object_not_found') || errorMessage.includes('Could not find')) {
				return {
					success: false,
					error: 'Database를 찾을 수 없습니다. ID를 확인하고 통합이 공유되었는지 확인해 주세요.',
				};
			}
			return { success: false, error: `Database 검증 실패: ${errorMessage}` };
		}
	}

	public async createDatabase(parentPageId: string): Promise<BackgroundResponse<{ id: string; name: string }>> {
		const trimmed = parentPageId.trim();
		if (!trimmed) {
			return { success: false, error: 'Parent Page ID를 입력해 주세요.' };
		}

		const stored = await getStoredData();
		if (!stored.accessToken) {
			return { success: false, error: '먼저 Notion에 연결해 주세요.' };
		}

		try {
			const newDbId = await createNotionDatabase(stored.accessToken, trimmed);
			await updateDatabaseId(newDbId);
			return { success: true, data: { id: newDbId, name: '🎯 지원 채용공고 관리' } };
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
			if (errorMessage.includes('object_not_found')) {
				return {
					success: false,
					error: 'Parent Page를 찾을 수 없습니다. 올바른 URL/ID인지, 통합이 해당 페이지에 추가되어 있는지 확인해 주세요.',
				};
			}
			return { success: false, error: `Database 생성 실패: ${errorMessage}` };
		}
	}

	private formatNotionSaveError(message: string): string {
		if (message.includes('object_not_found') || message.includes('404')) {
			return 'Database를 찾을 수 없습니다. Database ID를 확인하고 Notion 통합이 해당 DB에 공유되어 있는지 확인해 주세요.';
		}
		if (message.includes('unauthorized') || message.includes('401')) {
			return '인증이 만료되었습니다. 다시 로그인해 주세요.';
		}
		if (message.includes('validation_error')) {
			return 'Database 속성이 올바르지 않습니다. Title, Company, URL, Deadline, Status 속성이 있는지 확인해 주세요.';
		}
		return `Notion 저장 실패: ${message}`;
	}
}

export const notionJobService = new NotionJobService();
