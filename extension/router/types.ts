import type { QueryClient } from '@tanstack/react-query';
import type { router } from './index';

export interface RouterContext {
	queryClient: QueryClient;
}

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}
