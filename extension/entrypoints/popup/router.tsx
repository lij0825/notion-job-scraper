import React from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../lib/queryClient';
import { useAuthStatusQuery, useDismissErrorMutation } from '../../hooks/queries/useAuthQuery';
import { NotionHeader } from '../../components/notion/NotionHeader';
import ScrapingView from './components/ScrapingView';
import AuthView from './components/AuthView';
import { Loader2 } from 'lucide-react';

const PopupAppContent: React.FC = () => {
	const { data: authStatus, isLoading } = useAuthStatusQuery();
	const dismissErrorMutation = useDismissErrorMutation();

	if (isLoading) {
		return (
			<div className="w-[380px] min-h-[220px] flex flex-col items-center justify-center space-y-2.5 bg-background text-foreground py-10">
				<Loader2 className="w-5 h-5 animate-spin text-primary" />
				<p className="text-xs text-muted-foreground">Notion 연동 확인 중...</p>
			</div>
		);
	}

	return (
		<div className="w-[380px] flex flex-col bg-background text-foreground min-h-0">
			<NotionHeader
				authStatus={authStatus}
				onDismissError={() => dismissErrorMutation.mutate()}
			/>
			<main className="flex-1 overflow-x-hidden">
				<Routes>
					<Route
						path="/"
						element={
							authStatus?.isConnected ? (
								<ScrapingView />
							) : (
								<Navigate to="/settings" replace />
							)
						}
					/>
					<Route path="/settings" element={<AuthView />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</main>
		</div>
	);
};

export const PopupRouter: React.FC = () => {
	return (
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>
				<PopupAppContent />
			</MemoryRouter>
		</QueryClientProvider>
	);
};

export default PopupRouter;
