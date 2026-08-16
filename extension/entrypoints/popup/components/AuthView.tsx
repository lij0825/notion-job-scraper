import React, { useId, useState } from 'react';
import StatusBadge from './StatusBadge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { Separator } from '../../../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useJobStore } from '../../../stores/useJobStore';
import {
	Link2,
	LogOut,
	CheckCircle2,
	AlertTriangle,
	Database,
	PlusCircle,
	Sparkles,
	HelpCircle,
	Loader2,
	ShieldCheck,
	Calendar,
	SlidersHorizontal,
} from 'lucide-react';

const AuthView: React.FC = () => {
	const {
		authStatus,
		isConnecting,
		isLoggingOut,
		connectError,
		dbSaveStatus,
		dbSaveMessage,
		dbCreateStatus,
		dbCreateMessage,
		connectNotion,
		logout,
		saveDatabaseId,
		createDatabase,
		resetDbMessages,
	} = useAuthStore();

	const { setActiveView, executeLiveScrape } = useJobStore();

	const [databaseId, setDatabaseId] = useState(authStatus.databaseId ?? '');
	const [parentPageId, setParentPageId] = useState('');

	const dbInputId = useId();
	const parentInputId = useId();

	const handleConnect = async () => {
		const success = await connectNotion();
		if (success) {
			setActiveView('scraping');
			await executeLiveScrape();
		}
	};

	const handleSaveDatabaseId = async () => {
		await saveDatabaseId(databaseId);
	};

	const handleCreateDatabase = async () => {
		const success = await createDatabase(parentPageId);
		if (success) {
			setDatabaseId(useAuthStore.getState().authStatus.databaseId ?? '');
		}
	};

	// 미연결 상태 UI
	if (!authStatus.isConnected) {
		return (
			<div className="flex flex-col p-4 space-y-4">
				<div className="flex flex-col items-center text-center space-y-2 py-4">
					<div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
						<Link2 className="w-6 h-6" />
					</div>
					<h2 className="text-lg font-bold tracking-tight">Notion에 연결하세요</h2>
					<p className="text-xs text-muted-foreground max-w-[280px]">
						원클릭으로 채용 공고를 Notion 데이터베이스에 정리하고 동기화할 수 있습니다.
					</p>
				</div>

				{authStatus.lastError && !connectError && (
					<Alert variant="destructive">
						<AlertTriangle className="w-4 h-4" />
						<AlertTitle>연결 실패 이력</AlertTitle>
						<AlertDescription className="text-[11px]">
							{authStatus.lastError.message}
						</AlertDescription>
					</Alert>
				)}

				{connectError && (
					<Alert variant="destructive">
						<AlertTriangle className="w-4 h-4" />
						<AlertTitle>인증 오류</AlertTitle>
						<AlertDescription className="text-[11px]">{connectError}</AlertDescription>
					</Alert>
				)}

				<Button
					id="connect-notion-btn"
					className="w-full py-5 font-semibold text-sm shadow-lg gap-2"
					onClick={handleConnect}
					disabled={isConnecting}
				>
					{isConnecting ? (
						<>
							<Loader2 className="w-4 h-4 animate-spin" />
							<span>Notion 연결 중...</span>
						</>
					) : (
						<>
							<Sparkles className="w-4 h-4" />
							<span>Notion으로 연결하기</span>
						</>
					)}
				</Button>

				<Separator />

				<div className="grid grid-cols-2 gap-2 text-xs">
					<div className="flex items-center gap-2 p-2.5 rounded-lg bg-card border">
						<Sparkles className="w-4 h-4 text-primary shrink-0" />
						<span className="text-[11px] leading-tight">4개 사이트 원클릭 스크래핑</span>
					</div>
					<div className="flex items-center gap-2 p-2.5 rounded-lg bg-card border">
						<SlidersHorizontal className="w-4 h-4 text-primary shrink-0" />
						<span className="text-[11px] leading-tight">필드별 선택 및 직접 수정</span>
					</div>
					<div className="flex items-center gap-2 p-2.5 rounded-lg bg-card border">
						<Calendar className="w-4 h-4 text-primary shrink-0" />
						<span className="text-[11px] leading-tight">마감일 캘린더 자동 동기화</span>
					</div>
					<div className="flex items-center gap-2 p-2.5 rounded-lg bg-card border">
						<ShieldCheck className="w-4 h-4 text-primary shrink-0" />
						<span className="text-[11px] leading-tight">안전한 OAuth 2.0 인증</span>
					</div>
				</div>
			</div>
		);
	}

	// 연결된 상태 (설정 화면)
	return (
		<div className="flex flex-col p-4 space-y-4">
			{/* 연결 상태 카드 */}
			<Card className="border-border/60">
				<CardHeader className="p-3 pb-2 flex-row items-center justify-between space-y-0">
					<CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						Notion 워크스페이스
					</CardTitle>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 px-2"
						onClick={logout}
						disabled={isLoggingOut}
					>
						{isLoggingOut ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
						<span>로그아웃</span>
					</Button>
				</CardHeader>
				<CardContent className="p-3 pt-0">
					<StatusBadge isConnected={authStatus.isConnected} workspaceName={authStatus.workspaceName} />
				</CardContent>
			</Card>

			{/* Database 설정 탭 */}
			<Tabs defaultValue="existing" className="w-full">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="existing" className="gap-1 text-xs">
						<Database className="w-3.5 h-3.5" />
						<span>기존 DB 연결</span>
					</TabsTrigger>
					<TabsTrigger value="create" className="gap-1 text-xs">
						<PlusCircle className="w-3.5 h-3.5" />
						<span>새 DB 생성</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="existing" className="space-y-3 mt-3">
					<Card>
						<CardHeader className="p-3">
							<CardTitle className="text-xs font-medium">Database ID 또는 URL</CardTitle>
							<CardDescription className="text-[11px]">
								저장할 Notion 데이터베이스의 ID나 주소창 URL을 입력하세요.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-3 pt-0 space-y-2">
							<div className="flex items-center gap-1.5">
								<Input
									id={dbInputId}
									type="text"
									className="h-8 text-xs bg-muted/20"
									value={databaseId}
									onChange={(e) => {
										setDatabaseId(e.target.value);
										if (dbSaveStatus !== 'idle') {
											resetDbMessages();
										}
									}}
									placeholder="Database ID 또는 URL"
									spellCheck={false}
								/>
								<Button
									size="sm"
									className="h-8 px-3 text-xs shrink-0"
									onClick={handleSaveDatabaseId}
									disabled={dbSaveStatus === 'saving'}
								>
									{dbSaveStatus === 'saving' ? (
										<Loader2 className="w-3.5 h-3.5 animate-spin" />
									) : (
										'저장'
									)}
								</Button>
							</div>

							{dbSaveMessage && (
								<Alert variant={dbSaveStatus === 'success' ? 'success' : 'destructive'} className="py-1.5 px-2.5">
									{dbSaveStatus === 'success' ? (
										<CheckCircle2 className="w-3.5 h-3.5" />
									) : (
										<AlertTriangle className="w-3.5 h-3.5" />
									)}
									<AlertDescription className="text-[11px] font-medium ml-1">
										{dbSaveMessage}
									</AlertDescription>
								</Alert>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="create" className="space-y-3 mt-3">
					<Card>
						<CardHeader className="p-3">
							<CardTitle className="text-xs font-medium">부모 페이지 URL 또는 ID</CardTitle>
							<CardDescription className="text-[11px]">
								채용 공고 전용 데이터베이스를 생성할 Notion 상위 페이지를 지정하세요.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-3 pt-0 space-y-2">
							<div className="flex items-center gap-1.5">
								<Input
									id={parentInputId}
									type="text"
									className="h-8 text-xs bg-muted/20"
									value={parentPageId}
									onChange={(e) => {
										setParentPageId(e.target.value);
										if (dbCreateStatus !== 'idle') {
											resetDbMessages();
										}
									}}
									placeholder="Notion 페이지 URL 붙여넣기"
									spellCheck={false}
								/>
								<Button
									size="sm"
									className="h-8 px-3 text-xs shrink-0"
									onClick={handleCreateDatabase}
									disabled={dbCreateStatus === 'creating'}
								>
									{dbCreateStatus === 'creating' ? (
										<Loader2 className="w-3.5 h-3.5 animate-spin" />
									) : (
										'DB 생성'
									)}
								</Button>
							</div>

							{dbCreateMessage && (
								<Alert variant={dbCreateStatus === 'success' ? 'success' : 'destructive'} className="py-1.5 px-2.5">
									{dbCreateStatus === 'success' ? (
										<CheckCircle2 className="w-3.5 h-3.5" />
									) : (
										<AlertTriangle className="w-3.5 h-3.5" />
									)}
									<AlertDescription className="text-[11px] font-medium ml-1">
										{dbCreateMessage}
									</AlertDescription>
								</Alert>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* 도움말 안내 */}
			<div className="rounded-lg border bg-muted/30 p-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
				<HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
				<div>
					<span className="font-semibold text-foreground">권한 공유 필수:</span> 대상 Notion 페이지나 DB의 상단 메뉴 [연결 추가]에서 본 통합 확장을 반드시 허용해 주세요.
				</div>
			</div>
		</div>
	);
};

export default AuthView;
