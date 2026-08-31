import type { VercelRequest, VercelResponse } from '@vercel/node';

const NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token';

function setCorsHeaders(res: VercelResponse): void {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
	// OPTIONS preflight 요청 처리 (CORS)
	if (req.method === 'OPTIONS') {
		setCorsHeaders(res);
		res.status(204).end();
		return;
	}

	setCorsHeaders(res);

	// POST 이외의 메서드 거부
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method Not Allowed. POST만 허용됩니다.' });
		return;
	}

	const clientId = process.env['NOTION_CLIENT_ID'];
	const clientSecret = process.env['NOTION_CLIENT_SECRET'];

	if (!clientId || !clientSecret) {
		console.error('[token] NOTION_CLIENT_ID 또는 NOTION_CLIENT_SECRET 환경변수가 설정되지 않았습니다.');
		res.status(500).json({
			error: '서버 환경변수가 올바르게 설정되지 않았습니다. Vercel 대시보드에서 NOTION_CLIENT_ID와 NOTION_CLIENT_SECRET을 등록해 주세요.',
		});
		return;
	}

	const { code, redirect_uri } = req.body ?? {};

	if (!code || typeof code !== 'string') {
		res.status(400).json({ error: 'code 필드가 누락되었거나 유효하지 않습니다.' });
		return;
	}

	if (!redirect_uri || typeof redirect_uri !== 'string') {
		res.status(400).json({ error: 'redirect_uri 필드가 누락되었거나 유효하지 않습니다.' });
		return;
	}

	try {
		const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

		const notionResponse = await fetch(NOTION_TOKEN_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Basic ${credentials}`,
			},
			body: JSON.stringify({
				grant_type: 'authorization_code',
				code,
				redirect_uri,
			}),
		});

		const data = await notionResponse.json();

		if (!notionResponse.ok) {
			console.error('[token] Notion API 토큰 교환 실패:', data);
			res.status(notionResponse.status).json(data);
			return;
		}

		res.status(200).json(data);
	} catch (err) {
		console.error('[token] 서버 내부 오류:', err);
		res.status(500).json({ error: '토큰 교환 중 서버 오류가 발생했습니다.' });
	}
}
