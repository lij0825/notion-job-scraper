import React from 'react';
import { cn } from '../../utils/cn';

export interface NotionPropertyRowProps {
	icon: React.ReactNode;
	label: string;
	children: React.ReactNode;
	className?: string;
	required?: boolean;
	isSelected?: boolean;
	onToggle?: () => void;
	disabled?: boolean;
}

export const NotionPropertyRow: React.FC<NotionPropertyRowProps> = ({
	icon,
	label,
	children,
	className,
	required = false,
	isSelected = true,
	onToggle,
	disabled = false,
}) => {
	return (
		<div
			className={cn(
				'flex items-center text-xs py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors border border-transparent hover:border-border/40 gap-2',
				!isSelected && 'opacity-40 hover:opacity-75',
				className
			)}
		>
			{/* Checkbox toggle / selection */}
			{onToggle && !required ? (
				<input
					type="checkbox"
					checked={isSelected}
					onChange={onToggle}
					disabled={disabled}
					className="w-3.5 h-3.5 rounded border-border bg-background text-primary focus:ring-1 focus:ring-primary cursor-pointer shrink-0"
					aria-label={`${label} 필드 선택`}
				/>
			) : (
				<div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
					{required && <span className="text-[10px] text-muted-foreground">•</span>}
				</div>
			)}

			{/* Property Label & Icon */}
			<div className="flex items-center gap-1.5 w-24 shrink-0 text-muted-foreground select-none">
				<span className="shrink-0">{icon}</span>
				<span className="truncate font-medium">{label}</span>
			</div>

			{/* Property Value Input / Content */}
			<div className="flex-1 min-w-0">{children}</div>
		</div>
	);
};
