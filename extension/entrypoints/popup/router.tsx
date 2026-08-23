import React from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../lib/queryClient';
import { router } from '../../router';

export const PopupRouter: React.FC = () => {
	return (
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} context={{ queryClient }} />
		</QueryClientProvider>
	);
};

export default PopupRouter;
