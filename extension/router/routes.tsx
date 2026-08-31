import React from 'react';
import { z } from 'zod';
import {
	createRootRouteWithContext,
	createRoute,
	Outlet,
	redirect,
	lazyRouteComponent,
} from '@tanstack/react-router';
import type { RouterContext } from './types';
import { NotionHeader } from '../components/notion/NotionHeader';
import { useAuthStatusQuery, authStatusQueryOptions } from '../hooks/queries/useAuthQuery';
import ErrorFallback from '../entrypoints/popup/ErrorFallback';
import { Loader2 } from 'lucide-react';

function RootLayout() {
	const { data: authStatus } = useAuthStatusQuery();

	return (
		<div className="w-[380px] flex flex-col bg-background text-foreground min-h-0">
			<NotionHeader authStatus={authStatus} />
			<main className="flex-1 overflow-x-hidden">
				<Outlet />
			</main>
		</div>
	);
}

function RootPending() {
	return (
		<div className="w-[380px] min-h-[220px] flex flex-col items-center justify-center space-y-2.5 bg-background text-foreground py-10">
			<Loader2 className="w-5 h-5 animate-spin text-primary" />
			<p className="text-xs text-muted-foreground">Notion 연동 확인 중...</p>
		</div>
	);
}

export const rootRoute = createRootRouteWithContext<RouterContext>()({
	component: RootLayout,
	pendingComponent: RootPending,
	errorComponent: ({ error, reset }) => <ErrorFallback error={error} resetError={reset} />,
});

export const scrapingSearchSchema = z.object({
	mode: z.enum(['auto', 'manual']).optional().catch('auto'),
});

export const settingsSearchSchema = z.object({
	tab: z.enum(['oauth', 'manual', 'existing', 'create']).optional().catch('oauth'),
});

export const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	validateSearch: (search) => scrapingSearchSchema.parse(search),
	component: lazyRouteComponent(() => import('../entrypoints/popup/components/ScrapingView')),
	pendingComponent: RootPending,
	errorComponent: ({ error, reset }) => <ErrorFallback error={error} resetError={reset} />,
});

export const settingsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/settings',
	validateSearch: (search) => settingsSearchSchema.parse(search),
	component: lazyRouteComponent(() => import('../entrypoints/popup/components/AuthView')),
	pendingComponent: RootPending,
	errorComponent: ({ error, reset }) => <ErrorFallback error={error} resetError={reset} />,
});

export const routeTree = rootRoute.addChildren([indexRoute, settingsRoute]);
