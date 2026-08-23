import { createRouter, createMemoryHistory } from '@tanstack/react-router';
import { queryClient } from '../lib/queryClient';
import { routeTree } from './routes';
import type { RouterContext } from './types';

export function createPopupRouter(initialPath: string = '/', customContext?: Partial<RouterContext>) {
	const history = createMemoryHistory({
		initialEntries: [initialPath],
	});

	return createRouter({
		routeTree,
		history,
		context: {
			queryClient,
			...customContext,
		},
		defaultPreload: 'intent',
	});
}

export const router = createPopupRouter('/');
