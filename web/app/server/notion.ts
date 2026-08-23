import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const TokenExchangeInputSchema = z.object({
	code: z.string().min(1, '인증 코드가 필요합니다.'),
	redirectUri: z.string().url('유효한 redirectUri가 필요합니다.'),
});

/**
 * [Server Boundary] Notion OAuth 2.0 Access Token 교환 서버 함수
 * Client Secret은 클라이언트에 노출되지 않고 서버 런타임 환경변수에서만 사용됩니다.
 */
export const exchangeNotionTokenFn = createServerFn({ method: 'POST' })
	.validator((data: unknown) => TokenExchangeInputSchema.parse(data))
	.handler(async ({ data }) => {
		const clientId = process.env.NOTION_CLIENT_ID;
		const clientSecret = process.env.NOTION_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			throw new Error('서버에 NOTION_CLIENT_ID 또는 NOTION_CLIENT_SECRET 환경변수가 설정되지 않았습니다.');
		}

		const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

		const response = await fetch('https://api.notion.com/v1/oauth/token', {
			method: 'POST',
			headers: {
				'Authorization': `Basic ${basicAuth}`,
				'Content-Type': 'application/json',
				'Notion-Version': '2022-06-28',
			},
			body: JSON.stringify({
				grant_type: 'authorization_code',
				code: data.code,
				redirect_uri: data.redirectUri,
			}),
		});

		const result = (await response.json()) as Record<string, unknown>;

		if (!response.ok) {
			throw new Error((result.message as string) || (result.error as string) || 'Notion OAuth 토큰 교환 실패');
		}

		return {
			accessToken: result.access_token as string,
			workspaceName: (result.workspace_name as string) || '연결된 워크스페이스',
			workspaceIcon: (result.workspace_icon as string) || '',
			workspaceId: result.workspace_id as string,
			botId: result.bot_id as string,
			duplicatedTemplateId: (result.duplicated_template_id as string) || null,
		};
	});

const FetchJobsInputSchema = z.object({
	status: z.enum(['all', 'applied', 'interview', 'passed', 'rejected']).optional(),
	site: z.enum(['all', 'wanted', 'saramin', 'jobkorea', 'jasoseol']).optional(),
	query: z.string().optional(),
});

export interface JobItem {
	id: string;
	title: string;
	company: string;
	site: string;
	status: 'applied' | 'interview' | 'passed' | 'rejected';
	deadline: string | null;
	url: string;
	createdAt: string;
}

/**
 * [Server Boundary] 채용 공고 목록 조회 서버 함수 (SSR 및 스트리밍 지원)
 */
export const fetchNotionJobsFn = createServerFn({ method: 'GET' })
	.validator((data: unknown) => FetchJobsInputSchema.parse(data || {}))
	.handler(async ({ data }): Promise<JobItem[]> => {
		// Mock 데이터 또는 실제 Notion Database API 호출
		const mockJobs: JobItem[] = [
			{
				id: 'job-1',
				title: '프론트엔드 엔지니어 (React/TypeScript)',
				company: '토스 (Toss)',
				site: 'wanted',
				status: 'applied',
				deadline: '2026-09-15',
				url: 'https://www.wanted.co.kr/wd/184175',
				createdAt: new Date().toISOString(),
			},
			{
				id: 'job-2',
				title: '시니어 풀스택 개발자',
				company: '당근마켓',
				site: 'saramin',
				status: 'interview',
				deadline: '2026-09-30',
				url: 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=491823',
				createdAt: new Date().toISOString(),
			},
			{
				id: 'job-3',
				title: '백엔드 플랫폼 엔지니어 (Node.js)',
				company: '카카오 (Kakao)',
				site: 'jobkorea',
				status: 'passed',
				deadline: null,
				url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/441239',
				createdAt: new Date().toISOString(),
			},
		];

		return mockJobs.filter((job) => {
			if (data.status && data.status !== 'all' && job.status !== data.status) {
				return false;
			}
			if (data.site && data.site !== 'all' && job.site !== data.site) {
				return false;
			}
			if (data.query) {
				const q = data.query.toLowerCase();
				return job.title.toLowerCase().includes(q) || job.company.toLowerCase().includes(q);
			}
			return true;
		});
	});
