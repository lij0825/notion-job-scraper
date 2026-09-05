import type { VercelRequest, VercelResponse } from '@vercel/node';

const NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
	if (req.method === 'OPTIONS') {
		setCorsHeaders(res);
		res.status(204).end();
		return;
	}

	if (req.method !== 'POST') {
		setCorsHeaders(res);
		res.status(405).json({ error: 'Method Not Allowed. POST만 허용됩니다.' });
		return;
	}

	setCorsHeaders(res);

	const clientId = process.env['NOTION_CLIENT_ID'];
	const clientSecret = process.env['NOTION_CLIENT_SECRET'];

	if (!clientId || !clientSecret) {
		res.status(500).json({
			error: '서버 환경변수가 올바르게 설정되지 않았습니다. NOTION_CLIENT_ID와 NOTION_CLIENT_SECRET을 확인해 주세요.',
		});
		return;
	}

	const body = req.body as { code?: unknown; redirect_uri?: unknown } | undefined;
	if (!body || typeof body.code !== 'string' || typeof body.redirect_uri !== 'string') {
		res.status(400).json({ error: '잘못된 요청 형식입니다. code와 redirect_uri 필드가 필요합니다.' });
		return;
	}

	const code = body.code.trim();
	const redirectUri = body.redirect_uri.trim();

	if (!code || !redirectUri) {
		res.status(400).json({ error: 'code와 redirect_uri는 필수 필드입니다.' });
		return;
	}

	try {
		const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
		const response = await fetch(NOTION_TOKEN_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Basic ${credentials}`,
				'Notion-Version': '2022-06-28',
			},
			body: JSON.stringify({
				grant_type: 'authorization_code',
				code,
				redirect_uri: redirectUri,
			}),
		});

		const data = (await response.json()) as Record<string, unknown>;

		if (!response.ok) {
			res.status(response.status).json(data);
			return;
		}

		res.status(200).json(data);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		res.status(500).json({ error: `토큰 교환 중 서버 오류가 발생했습니다: ${message}` });
	}
}

function setCorsHeaders(res: VercelResponse): void {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
