import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeNotionId } from '../../utils/notion-id';
import { BackgroundMessageRouter } from '../../entrypoints/background/router';
import { AuthService } from '../auth/auth-service';
import { NotionJobService } from '../notion/notion-service';
import * as storage from '../../utils/storage';
import type { JobData } from '../../utils/types';

describe('normalizeNotionId (Notion ID 정규화 유틸리티)', () => {
	it('Given 32자 16진수 문자열이 주어졌을 때, When normalizeNotionId를 호출하면, Then 동일한 ID를 반환한다', () => {
		const rawId = '1234567890abcdef1234567890abcdef';
		expect(normalizeNotionId(rawId)).toBe('1234567890abcdef1234567890abcdef');
	});

	it('Given UUID 형태의 문자열이 주어졌을 때, When normalizeNotionId를 호출하면, Then 하이픈이 제거된 32자리 Hex ID를 반환한다', () => {
		const uuid = '12345678-1234-1234-1234-1234567890ab';
		expect(normalizeNotionId(uuid)).toBe('123456781234123412341234567890ab');
	});

	it('Given Notion URL 형태가 주어졌을 때, When normalizeNotionId를 호출하면, Then 32자 hex ID를 추출하여 반환한다', () => {
		const url = 'https://www.notion.so/myworkspace/1234567890abcdef1234567890abcdef?v=999';
		expect(normalizeNotionId(url)).toBe('1234567890abcdef1234567890abcdef');
	});

	it('Given 빈 문자열이 주어졌을 때, When normalizeNotionId를 호출하면, Then 빈 문자열을 반환한다', () => {
		expect(normalizeNotionId('   ')).toBe('');
	});
});

describe('BackgroundMessageRouter (커맨드 디스패처)', () => {
	let mockAuthService: AuthService;
	let mockNotionJobService: NotionJobService;
	let router: BackgroundMessageRouter;

	beforeEach(() => {
		mockAuthService = new AuthService();
		mockNotionJobService = new NotionJobService();

		vi.spyOn(mockAuthService, 'getAuthStatus').mockResolvedValue({
			success: true,
			data: { isConnected: true, workspaceName: 'Test Workspace' },
		});
		vi.spyOn(mockAuthService, 'logout').mockResolvedValue({
			success: true,
			data: undefined,
		});
		vi.spyOn(mockNotionJobService, 'saveToNotion').mockResolvedValue({
			success: true,
			data: { pageId: 'page-123' },
		});

		router = new BackgroundMessageRouter({
			authService: mockAuthService,
			notionJobService: mockNotionJobService,
		});
	});

	it('Given GET_AUTH_STATUS 메시지가 주어졌을 때, When dispatch를 호출하면, Then authService.getAuthStatus로 위임된다', async () => {
		const response = await router.dispatch({ type: 'GET_AUTH_STATUS' });

		expect(response.success).toBe(true);
		expect(mockAuthService.getAuthStatus).toHaveBeenCalledTimes(1);
	});

	it('Given LOGOUT 메시지가 주어졌을 때, When dispatch를 호출하면, Then authService.logout으로 위임된다', async () => {
		const response = await router.dispatch({ type: 'LOGOUT' });

		expect(response.success).toBe(true);
		expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
	});

	it('Given SAVE_TO_NOTION 메시지가 주어졌을 때, When dispatch를 호출하면, Then notionJobService.saveToNotion으로 위임된다', async () => {
		const payload: JobData = {
			title: '백엔드 엔지니어',
			company: '테스트사',
			url: 'https://example.com/1',
			deadline: null,
			description: '직무 설명',
			site: 'wanted',
		};

		const response = await router.dispatch({ type: 'SAVE_TO_NOTION', payload });

		expect(response.success).toBe(true);
		expect(mockNotionJobService.saveToNotion).toHaveBeenCalledWith(payload);
	});
});

describe('NotionJobService 단위 테스트', () => {
	const sampleJob: JobData = {
		title: '직무',
		company: '회사',
		url: 'https://example.com',
		deadline: null,
		description: '설명',
		site: 'wanted',
	};

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('Given 액세스 토큰이 저장되어 있지 않을 때, When saveToNotion을 호출하면, Then 연결 오류 응답을 반환한다', async () => {
		vi.spyOn(storage, 'getStoredData').mockResolvedValue({
			accessToken: undefined,
			workspaceName: undefined,
			workspaceId: undefined,
			databaseId: undefined,
		});

		const service = new NotionJobService();
		const response = await service.saveToNotion(sampleJob);

		expect(response.success).toBe(false);
		if (!response.success) {
			expect(response.error).toContain('Notion에 연결되어 있지 않습니다');
		}
	});

	it('Given Database ID가 설정되어 있지 않을 때, When saveToNotion을 호출하면, Then DB ID 미설정 에러를 반환한다', async () => {
		vi.spyOn(storage, 'getStoredData').mockResolvedValue({
			accessToken: 'test-token',
			workspaceName: undefined,
			workspaceId: undefined,
			databaseId: undefined,
		});

		const service = new NotionJobService();
		const response = await service.saveToNotion(sampleJob);

		expect(response.success).toBe(false);
		if (!response.success) {
			expect(response.error).toContain('Notion Database ID가 설정되지 않았습니다');
		}
	});
});
