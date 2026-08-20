import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';

export interface ErrorFallbackProps {
	error?: unknown;
	resetError?: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
	const errorMessage =
		error instanceof Error
			? error.message
			: typeof error === 'string'
				? error
				: '예상치 못한 오류가 발생했습니다.';

	const handleRetry = () => {
		if (resetError) {
			resetError();
		} else {
			window.location.reload();
		}
	};

	return (
		<div className="flex flex-col items-center justify-center p-6 text-center bg-background text-foreground min-h-[300px] space-y-4">
			<div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive border border-destructive/30">
				<AlertTriangle className="w-6 h-6" />
			</div>

			<div className="space-y-1">
				<h3 className="text-base font-semibold text-foreground">오류가 발생했습니다</h3>
				<p className="text-xs text-muted-foreground">
					문제가 지속되면 확장 프로그램을 다시 시작해 주세요.
				</p>
			</div>

			<div className="w-full max-h-24 overflow-y-auto p-2.5 rounded bg-muted/40 border border-border text-left text-[11px] font-mono text-muted-foreground break-words">
				{errorMessage}
			</div>

			<Button
				type="button"
				variant="secondary"
				size="sm"
				onClick={handleRetry}
				className="flex items-center gap-1.5 text-xs"
			>
				<RefreshCw className="w-3.5 h-3.5" />
				다시 시도
			</Button>
		</div>
	);
};

export default ErrorFallback;
