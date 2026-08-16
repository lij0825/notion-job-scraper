import http from 'node:http';

const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.NOTION_CLIENT_ID;
const CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET;

const server = http.createServer(async (req, res) => {
	// CORS Headers
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	if (req.method === 'OPTIONS') {
		res.writeHead(204);
		res.end();
		return;
	}

	const url = new URL(req.url, `http://${req.headers.host}`);

	if (url.pathname === '/api/token' && req.method === 'POST') {
		let body = '';
		req.on('data', (chunk) => {
			body += chunk;
		});

		req.on('end', async () => {
			try {
				const parsed = JSON.parse(body || '{}');
				const { code, redirect_uri } = parsed;

				if (!code || !redirect_uri) {
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: 'code와 redirect_uri가 필요합니다.' }));
					return;
				}

				if (!CLIENT_ID || !CLIENT_SECRET) {
					console.error('[OAuth Server] NOTION_CLIENT_ID 또는 NOTION_CLIENT_SECRET 환경변수가 없습니다.');
					res.writeHead(500, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: '서버 환경변수(NOTION_CLIENT_ID / SECRET)가 설정되지 않았습니다.' }));
					return;
				}

				const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
				console.log(`[OAuth Server] Notion 토큰 교환 요청 전송 (redirect_uri: ${redirect_uri})`);

				const notionRes = await fetch('https://api.notion.com/v1/oauth/token', {
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

				const responseData = await notionRes.text();
				console.log(`[OAuth Server] Notion 응답 상태: ${notionRes.status}`);

				res.writeHead(notionRes.status, { 'Content-Type': 'application/json' });
				res.end(responseData);
			} catch (err) {
				console.error('[OAuth Server] 오류:', err);
				res.writeHead(500, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
			}
		});
		return;
	}

	// Health check / root
	if (url.pathname === '/' || url.pathname === '/health') {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ status: 'ok', service: 'notion-job-scraper-oauth-proxy' }));
		return;
	}

	res.writeHead(404, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify({ error: `Not Found: ${url.pathname}` }));
});

server.listen(PORT, () => {
	console.log(`🚀 Notion OAuth 로컬 프록시 서버 실행 중: http://localhost:${PORT}`);
	console.log(`   - Client ID: ${CLIENT_ID ? '설정됨' : '❌ 누락'}`);
	console.log(`   - Client Secret: ${CLIENT_SECRET ? '설정됨' : '❌ 누락'}`);
});
