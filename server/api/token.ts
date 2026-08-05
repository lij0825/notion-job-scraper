import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Notion OAuth 2.0 토큰 교환 프록시 엔드포인트
 *
 * 역할: 브라우저 확장 프로그램 클라이언트를 대신하여
 *   Notion OAuth 토큰 엔드포인트에 NOTION_CLIENT_SECRET을 포함한
 *   Basic Auth 요청을 수행합니다.
 *   클라이언트 측에는 client_secret이 절대 노출되지 않습니다.
 *
 * 요청 형식:
 *   POST /api/token
 *   Content-Type: application/json
 *   Body: { code: string, redirect_uri: string }
 *
 * 응답: Notion OAuth 토큰 응답 페이로드 그대로 전달
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
	// OPTIONS preflight 요청 처리 (CORS)
	if (req.method === 'OPTIONS') {
		setCorsHeaders(res);
		res.status(204).end();
		return;
	}

	// POST 이외의 메서드 거부
	if (req.method !== 'POST') {
		setCorsHeaders(res);
		res.status(405).json({ error: 'Method Not Allowed. POST만 허용됩니다.' });
		return;
	}

	setCorsHeaders(res);

	// 환경변수 검증 — 서버 시작 시 반드시 설정되어야 함
	const clientId = process.env['NOTION_CLIENT_ID'];
	const clientSecret = process.env['NOTION_CLIENT_SECRET'];

	if (!clientId || !clientSecret) {
		console.error('[token] 환경변수 NOTION_CLIENT_ID 또는 NOTION_CLIENT_SECRET이 설정되지 않았습니다.');
		res.status(500).json({ error: '서버 설정 오류: 환경변수가 누락되었습니다.' });
		return;
	}

	// 요청 바디 파싱 및 유효성 검사
	const body = req.body as { code?: unknown; redirect_uri?: unknown };

	if (!body || typeof body.code !== 'string' || typeof body.redirect_uri !== 'string') {
		res.status(400).json({
			error: '잘못된 요청 형식입니다. { code: string, redirect_uri: string } 이 필요합니다.',
		});
		return;
	}

	const { code, redirect_uri: redirectUri } = body;

	if (!code.trim() || !redirectUri.trim()) {
		res.status(400).json({ error: 'code와 redirect_uri는 필수 필드입니다.' });
		return;
	}

	// Notion OAuth 토큰 교환 요청
	// Basic Auth: Base64("client_id:client_secret")
	const basicAuthToken = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

	let notionResponse: Awaited<ReturnType<typeof fetch>>;
	try {
		notionResponse = await fetch('https://api.notion.com/v1/oauth/token', {
			method: 'POST',
			headers: {
				'Authorization': `Basic ${basicAuthToken}`,
				'Content-Type': 'application/json',
				'Notion-Version': '2022-06-28',
			},
			body: JSON.stringify({
				grant_type: 'authorization_code',
				code,
				redirect_uri: redirectUri,
			}),
		});
	} catch (networkErr) {
		// Notion API 네트워크 오류 (타임아웃, DNS 실패 등)
		console.error('[token] Notion API 네트워크 오류:', networkErr);
		res.status(502).json({
			error: 'Notion API에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
		});
		return;
	}

	// Notion API 응답 파싱
	const responseText = await notionResponse.text();
	let responseData: unknown;
	try {
		responseData = JSON.parse(responseText);
	} catch {
		// JSON 파싱 실패 시 원본 텍스트 포함하여 에러 반환
		res.status(notionResponse.status).json({
			error: `Notion API가 예상치 못한 응답을 반환했습니다: ${responseText.slice(0, 200)}`,
		});
		return;
	}

	// Notion API 오류 응답 전달 (클라이언트가 처리할 수 있도록)
	if (!notionResponse.ok) {
		console.error('[token] Notion API 오류:', notionResponse.status, responseData);
		res.status(notionResponse.status).json(responseData);
		return;
	}

	// 성공: 토큰 데이터를 클라이언트에 그대로 전달
	res.status(200).json(responseData);
}

/** CORS 헤더 설정 — 브라우저 확장에서의 cross-origin 요청 허용 */
function setCorsHeaders(res: VercelResponse): void {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
