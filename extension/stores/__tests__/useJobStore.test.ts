import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useJobStore } from '../useJobStore';
import { browser } from 'wxt/browser';
import type { JobData } from '../../utils/types';

const mockTabsSendMessage = vi.mocked(browser.tabs.sendMessage);
const mockRuntimeSendMessage = vi.mocked(browser.runtime.sendMessage);

describe('useJobStore (Zustand 스크래핑/채용공고 스토어)', () => {
	beforeEach(() => {
		useJobStore.setState({
			activeView: 'loading',
			jobData: null,
			editableData: null,
			selectedFields: {
				title: true,
				company: true,
				deadline: true,
				url: true,
				description: true,
			},
			scrapeError: null,
			isRefreshing: false,
			saveStatus: 'idle',
			saveError: null,
		});
		vi.clearAllMocks();
	});

	it('Given 채용 데이터가 전달되었을 때, When setJobData를 호출하면, Then jobData와 editableData가 설정되고 필드가 기본 선택된다', () => {
		// Given
		const mockJob: JobData = {
			title: '프론트엔드 개발자',
			company: '원티드랩',
			url: 'https://www.wanted.co.kr/wd/100',
			deadline: '2026-12-31',
			description: 'React 개발',
			site: 'wanted',
		};

		// When
		useJobStore.getState().setJobData(mockJob);

		// Then
		const state = useJobStore.getState();
		expect(state.jobData).toEqual(mockJob);
		expect(state.editableData).toEqual(mockJob);
		expect(state.selectedFields.title).toBe(true);
	});

	it('Given 편집 중인 필드 값이 있을 때, When updateField를 호출하면, Then editableData의 해당 필드만 수정된다', () => {
		// Given
		const mockJob: JobData = {
			title: '백엔드 엔지니어',
			company: '카카오',
			url: 'https://www.wanted.co.kr/wd/200',
			deadline: null,
			description: 'Java 개발',
			site: 'wanted',
		};
		useJobStore.getState().setJobData(mockJob);

		// When
		useJobStore.getState().updateField('company', '카카오페이');

		// Then
		expect(useJobStore.getState().editableData?.company).toBe('카카오페이');
		expect(useJobStore.getState().editableData?.title).toBe('백엔드 엔지니어');
	});

	it('Given 선택 가능한 필드(회사명)가 주어졌을 때, When toggleField를 호출하면, Then 선택 여부가 반전된다 (필수 필드인 title은 토글 불가)', () => {
		// When
		useJobStore.getState().toggleField('company');
		useJobStore.getState().toggleField('title'); // 필수 필드

		// Then
		expect(useJobStore.getState().selectedFields.company).toBe(false);
		expect(useJobStore.getState().selectedFields.title).toBe(true); // 필수 필드는 변경되지 않음
	});

	it('Given 라이브 스크래핑 요청 시, When Content Script로부터 데이터를 수신하면, Then jobData가 갱신된다', async () => {
		// Given
		const mockScraped: JobData = {
			title: '데이터 사이언티스트',
			company: '네이버',
			url: 'https://www.wanted.co.kr/wd/300',
			deadline: '2026-10-10',
			description: '머신러닝 파이프라인',
			site: 'wanted',
		};

		mockTabsSendMessage.mockResolvedValueOnce({
			success: true,
			data: mockScraped,
		});

		// When
		await useJobStore.getState().executeLiveScrape();

		// Then
		expect(useJobStore.getState().jobData?.title).toBe('데이터 사이언티스트');
		expect(useJobStore.getState().isRefreshing).toBe(false);
	});

	it('Given 채용 공고 저장 요청 시, When Background에 전송 성공하면, Then saveStatus가 success로 변경된다', async () => {
		// Given
		const mockJob: JobData = {
			title: '클라우드 엔지니어',
			company: 'AWS',
			url: 'https://www.wanted.co.kr/wd/400',
			deadline: null,
			description: '인프라 구축',
			site: 'wanted',
		};
		useJobStore.getState().setJobData(mockJob);
		mockRuntimeSendMessage.mockResolvedValueOnce({
			success: true,
			data: { pageId: 'notion-page-123' },
		});

		// When
		const success = await useJobStore.getState().saveToNotion();

		// Then
		expect(success).toBe(true);
		expect(useJobStore.getState().saveStatus).toBe('success');
	});
});
