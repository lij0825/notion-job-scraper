import React, { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { exchangeNotionTokenFn } from '../server/notion';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const OAuthSearchSchema = z.object({
	code: z.string().optional(),
	error: z.string().optional(),
});

export const Route = createFileRoute('/oauth/callback')({
	validateSearch: (search) => OAuthSearchSchema.parse(search),
	component: OAuthCallbackComponent,
});

function OAuthCallbackComponent() {
	const search = Route.useSearch();
	const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
	const [workspace, setWorkspace] = useState<string>('');
	const [errorMessage, setErrorMessage] = useState<string>('');

	useEffect(() => {
		if (search.error) {
			setStatus('error');
			setErrorMessage(search.error);
			return;
		}

		if (!search.code) {
			setStatus('error');
			setErrorMessage('인증 코드가 누락되었습니다.');
			return;
		}

		// Exchange code using Server Function
		exchangeNotionTokenFn({
			data: {
				code: search.code,
				redirectUri: typeof window !== 'undefined' ? window.location.origin + '/oauth/callback' : '',
			},
		})
			.then((res) => {
				setStatus('success');
				setWorkspace(res.workspaceName);
			})
			.catch((err) => {
				setStatus('error');
				setErrorMessage(err instanceof Error ? err.message : '토큰 교환에 실패했습니다.');
			});
	}, [search]);

	return (
		<div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center space-y-4">
			{status === 'processing' && (
				<>
					<Loader2 className="w-8 h-8 animate-spin text-primary" />
					<h2 className="text-base font-semibold text-foreground">Notion 인증 처리 중...</h2>
					<p className="text-xs text-muted-foreground">잠시만 기다려 주세요.</p>
				</>
			)}

			{status === 'success' && (
				<>
					<div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
						<CheckCircle2 className="w-6 h-6" />
					</div>
					<h2 className="text-base font-semibold text-foreground">Notion 연동 완료!</h2>
					<p className="text-xs text-muted-foreground">
						<span className="font-medium text-foreground">{workspace}</span> 워크스페이스와 성공적으로 연결되었습니다.
						이제 브라우저 확장 프로그램으로 돌아가 이용하실 수 있습니다.
					</p>
				</>
			)}

			{status === 'error' && (
				<>
					<div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
						<AlertCircle className="w-6 h-6" />
					</div>
					<h2 className="text-base font-semibold text-foreground">인증 실패</h2>
					<p className="text-xs text-rose-400">{errorMessage}</p>
				</>
			)}
		</div>
	);
}
