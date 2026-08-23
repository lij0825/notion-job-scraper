import React from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Button } from '../ui/button';
import { Settings, ArrowLeft } from 'lucide-react';
import type { AuthStatus } from '../../utils/types';

export interface NotionHeaderProps {
	authStatus?: AuthStatus;
	onDismissError?: () => void;
}

export const NotionHeader: React.FC<NotionHeaderProps> = ({
	authStatus,
}) => {
	const location = useLocation();
	const isSettings = location.pathname === '/settings';

	return (
		<header className="flex flex-col border-b border-border bg-background">
			{/* Breadcrumb & Navigation Bar */}
			<div className="flex items-center justify-between px-3 py-2 text-xs">
				<div className="flex items-center gap-1.5 min-w-0">
					<div className="w-5 h-5 rounded bg-muted/60 flex items-center justify-center text-xs shrink-0 shadow-sm border border-border">
						📋
					</div>
					<span className="text-muted-foreground font-medium hover:text-foreground transition-colors truncate">
						{authStatus?.workspaceName || 'Notion'}
					</span>
					<span className="text-muted-foreground/60">/</span>
					<span className="font-semibold text-foreground truncate">
						{isSettings ? '설정' : '채용 공고 스크래퍼'}
					</span>
				</div>

				<div className="flex items-center gap-1 shrink-0">
					{isSettings ? (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
							asChild
						>
							<Link to="/" search={{ mode: 'auto' }} title="뒤로가기" aria-label="메인 뷰로 돌아가기">
								<ArrowLeft className="w-3.5 h-3.5" />
							</Link>
						</Button>
					) : (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
							asChild
						>
							<Link to="/settings" search={{ tab: 'existing' }} title="설정" aria-label="설정 페이지로 이동">
								<Settings className="w-3.5 h-3.5" />
							</Link>
						</Button>
					)}
				</div>
			</div>

			{/* Status Bar */}
			<div className="px-3 py-1 bg-muted/20 flex items-center text-[11px] border-t border-border/30">
				<div className="flex items-center gap-1.5">
					<span
						className={`w-1.5 h-1.5 rounded-full ${
							authStatus?.lastError
								? 'bg-destructive animate-pulse'
								: authStatus?.isConnected
									? 'bg-emerald-500'
									: 'bg-muted-foreground'
						}`}
					/>
					<span className="text-muted-foreground">
						{authStatus?.lastError
							? '연결 오류'
							: authStatus?.isConnected
								? '워크스페이스 연동됨'
								: '미연결 상태'}
					</span>
				</div>
			</div>
		</header>
	);
};
