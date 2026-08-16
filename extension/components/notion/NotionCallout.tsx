import React from 'react';
import { cn } from '../../utils/cn';

export interface NotionCalloutProps extends React.HTMLAttributes<HTMLDivElement> {
	icon?: React.ReactNode;
	variant?: 'default' | 'info' | 'warning' | 'error' | 'success';
}

export const NotionCallout: React.FC<NotionCalloutProps> = ({
	icon,
	children,
	className,
	variant = 'default',
	...props
}) => {
	const variantStyles = {
		default: 'bg-muted/40 border-border text-foreground',
		info: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
		warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
		error: 'bg-red-500/10 border-red-500/30 text-red-300',
		success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
	};

	return (
		<div
			className={cn(
				'flex items-start gap-2.5 p-3 rounded-md border text-xs leading-relaxed',
				variantStyles[variant],
				className
			)}
			{...props}
		>
			{icon && <div className="shrink-0 mt-0.5">{icon}</div>}
			<div className="flex-1 overflow-hidden break-words">{children}</div>
		</div>
	);
};
