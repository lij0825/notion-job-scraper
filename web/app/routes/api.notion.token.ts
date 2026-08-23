import { createAPIFileRoute } from '@tanstack/react-start/api';

export const Route = createAPIFileRoute('/api/notion/token')({
	POST: async ({ request }) => {
		try {
			const body = (await request.json()) as { code?: string; redirect_uri?: string };
			const { code, redirect_uri } = body || {};

			if (!code || !redirect_uri) {
				return new Response(
					JSON.stringify({ success: false, error: 'code와 redirect_uri 파라미터가 필요합니다.' }),
					{
						status: 400,
						headers: {
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*',
						},
					}
				);
			}

			const clientId = process.env.NOTION_CLIENT_ID;
			const clientSecret = process.env.NOTION_CLIENT_SECRET;

			if (!clientId || !clientSecret) {
				return new Response(
					JSON.stringify({ success: false, error: '서버 OAuth 환경변수가 누락되었습니다.' }),
					{
						status: 500,
						headers: {
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*',
						},
					}
				);
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
					code,
					redirect_uri,
				}),
			});

			const data = (await response.json()) as Record<string, unknown>;

			if (!response.ok) {
				return new Response(
					JSON.stringify({
						success: false,
						error: (data.message as string) || (data.error as string) || 'Notion OAuth 실패',
					}),
					{
						status: response.status,
						headers: {
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*',
						},
					}
				);
			}

			return new Response(
				JSON.stringify({
					success: true,
					data: {
						access_token: data.access_token,
						workspace_name: data.workspace_name,
						workspace_icon: data.workspace_icon,
						workspace_id: data.workspace_id,
						bot_id: data.bot_id,
						duplicated_template_id: data.duplicated_template_id,
					},
				}),
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				}
			);
		} catch (err) {
			return new Response(
				JSON.stringify({
					success: false,
					error: err instanceof Error ? err.message : '서버 오류 발생',
				}),
				{
					status: 500,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				}
			);
		}
	},
	OPTIONS: async () => {
		return new Response(null, {
			status: 204,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			},
		});
	},
});
