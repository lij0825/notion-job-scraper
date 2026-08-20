import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initServerSentry, Sentry } from '../lib/sentry';

// Serverless 환경 Sentry 초기화
initServerSentry();

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
	// 환경변수 존재 여부 디버그 로그 — 배포 환경에서 설정 누락을 빠르게 식별하기 위함
	console.log('[token] 환경변수 확인:', {
		NOTION_CLIENT_ID: process.env['NOTION_CLIENT_ID'] ? '설정됨' : '누락',
		NOTION_CLIENT_SECRET: process.env['NOTION_CLIENT_SECRET'] ? '설정됨' : '누락',
	});

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
		const envError = new Error('서버 설정 오류: 환경변수가 누락되었습니다.');
		Sentry.captureException(envError);
		await Sentry.flush(2000);

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
		Sentry.captureException(networkErr);
		await Sentry.flush(2000);

		// Notion API 네트워크 오류 (타임아웃, DNS 실패 등)
		const networkErrMsg = networkErr instanceof Error ? networkErr.message : String(networkErr);
		console.error('[token] Notion API 네트워크 오류:', {
			error: networkErrMsg,
			stack: networkErr instanceof Error ? networkErr.stack : undefined,
		});
		res.status(502).json({
			status: 502,
			error: 'network_error',
			error_description: `Notion API에 연결할 수 없습니다: ${networkErrMsg}`,
		});
		return;
	}

	// Notion API 응답 파싱
	const responseText = await notionResponse.text();
	let responseData: Record<string, unknown>;
	try {
		responseData = JSON.parse(responseText) as Record<string, unknown>;
	} catch (parseErr) {
		Sentry.captureException(parseErr);
		await Sentry.flush(2000);

		// JSON 파싱 실패 시 구조화된 에러로 변환하여 반환
		console.error('[token] Notion API 응답 JSON 파싱 실패:', responseText.slice(0, 500));
		res.status(notionResponse.status).json({
			status: notionResponse.status,
			error: 'invalid_response',
			error_description: `Notion API가 예상치 못한 응답을 반환했습니다: ${responseText.slice(0, 200)}`,
		});
		return;
	}

	// Notion API 오류 응답 — 구조화된 필드로 재구성하여 전달
	if (!notionResponse.ok) {
		const apiError = new Error(
			`Notion API error (${notionResponse.status}): ${String(responseData['error'] ?? 'unknown_error')}`
		);
		Sentry.captureException(apiError);
		await Sentry.flush(2000);

		console.error('[token] Notion API 오류:', {
			httpStatus: notionResponse.status,
			notionError: responseData['error'],
			notionMessage: responseData['message'],
		});
		res.status(notionResponse.status).json({
			status: notionResponse.status,
			error: responseData['error'] ?? 'unknown_error',
			error_description: responseData['message'] ?? JSON.stringify(responseData),
		});
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
