import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initServerSentry } from '../lib/sentry';
import { defaultNotionOAuthService } from '../lib/oauth-service';

initServerSentry();

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

	const body = req.body as { code?: unknown; redirect_uri?: unknown } | undefined;
	if (!body || typeof body.code !== 'string' || typeof body.redirect_uri !== 'string') {
		res.status(400).json({
			error: '잘못된 요청 형식입니다. { code: string, redirect_uri: string } 이 필요합니다.',
		});
		return;
	}

	const result = await defaultNotionOAuthService.exchangeToken({
		code: body.code,
		redirectUri: body.redirect_uri,
	});

	if (!result.success) {
		res.status(result.status).json({
			status: result.status,
			error: result.error,
			error_description: result.errorDescription,
		});
		return;
	}

	res.status(200).json(result.data);
}

function setCorsHeaders(res: VercelResponse): void {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
