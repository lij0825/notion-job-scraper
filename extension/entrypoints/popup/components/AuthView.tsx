import React, { useId, useState } from 'react';
import StatusBadge from './StatusBadge';
import type { AuthStatus, BackgroundResponse, ConnectionError } from '../../../utils/types';

interface AuthViewProps {
	authStatus: AuthStatus;
	onConnect: () => Promise<BackgroundResponse<AuthStatus>>;
	onLogout: () => Promise<void>;
	onSaveDatabaseId: (id: string) => Promise<BackgroundResponse<{ name: string }>>;
	/** 마지막 OAuth 연결 에러 — 미연결 상태에서 표시 */
	lastError?: ConnectionError;
}

/**
 * 인증/설정 뷰 컴포넌트
 *
 * 미연결 상태: Notion 연결 버튼 + 안내 메시지
 * 연결 상태:
 *   - 워크스페이스 정보 + 연결 상태 뱃지
 *   - Database ID 입력 필드 (저장 + 검증)
 *   - 로그아웃 버튼
 */
const AuthView: React.FC<AuthViewProps> = ({
	authStatus,
	onConnect,
	onLogout,
	onSaveDatabaseId,
	lastError,
}) => {
	const [isConnecting, setIsConnecting] = useState(false);
	const [connectError, setConnectError] = useState<string | null>(null);
	const [databaseId, setDatabaseId] = useState(authStatus.databaseId ?? '');
	const [dbSaveStatus, setDbSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
	const [dbSaveMessage, setDbSaveMessage] = useState<string | null>(null);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const dbInputId = useId();

	const handleConnect = async () => {
		setIsConnecting(true);
		setConnectError(null);

		const response = await onConnect();

		if (!response.success) {
			setConnectError(response.error);
		}

		setIsConnecting(false);
	};

	const handleSaveDatabaseId = async () => {
		if (!databaseId.trim()) {
			setDbSaveStatus('error');
			setDbSaveMessage('Database ID를 입력해 주세요.');
			return;
		}

		setDbSaveStatus('saving');
		setDbSaveMessage(null);

		const response = await onSaveDatabaseId(databaseId.trim());

		if (response.success) {
			setDbSaveStatus('success');
			setDbSaveMessage(`"${response.data.name}" DB가 연결되었습니다.`);
			setTimeout(() => {
				setDbSaveStatus('idle');
				setDbSaveMessage(null);
			}, 3000);
		} else {
			setDbSaveStatus('error');
			setDbSaveMessage(response.error);
		}
	};

	const handleLogout = async () => {
		setIsLoggingOut(true);
		await onLogout();
		setIsLoggingOut(false);
	};

	// 미연결 상태 UI
	if (!authStatus.isConnected) {
		return (
			<div className="auth-view">
				<div className="auth-hero">
					<div className="auth-hero__icon" aria-hidden="true">🔗</div>
					<h2 className="auth-hero__title">Notion에 연결하세요</h2>
					<p className="auth-hero__desc">
						Notion 계정을 연결하면 채용 공고를<br />
						원하는 정보만 선택하여 저장할 수 있습니다.
					</p>
				</div>

				{/* 이전 OAuth 실패 이력 (storage.local에서 조회) */}
				{lastError && !connectError && (
					<div className="error-banner error-banner--persistent" role="alert">
						<span aria-hidden="true">⚠️</span>
						<div>
							<span>{lastError.message}</span>
							<time className="error-banner__time">
								{new Date(lastError.occurredAt).toLocaleString()}
							</time>
						</div>
					</div>
				)}

				{connectError && (
					<div className="error-banner" role="alert">
						<span aria-hidden="true">⚠️</span> {connectError}
					</div>
				)}

				<button
					id="connect-notion-btn"
					className={`btn btn--primary btn--full ${isConnecting ? 'btn--loading' : ''}`}
					onClick={handleConnect}
					disabled={isConnecting}
					aria-busy={isConnecting}
				>
					{isConnecting && <span className="btn-spinner" aria-hidden="true" />}
					{isConnecting ? '연결 중...' : '🔑 Notion으로 연결하기'}
				</button>

				<div className="auth-features">
					<div className="feature-item">
						<span className="feature-icon" aria-hidden="true">✨</span>
						<span>4개 채용 사이트 원클릭 스크래핑</span>
					</div>
					<div className="feature-item">
						<span className="feature-icon" aria-hidden="true">✏️</span>
						<span>필드별 편집·선택 후 저장</span>
					</div>
					<div className="feature-item">
						<span className="feature-icon" aria-hidden="true">📅</span>
						<span>마감일 캘린더 자동 동기화</span>
					</div>
					<div className="feature-item">
						<span className="feature-icon" aria-hidden="true">🔒</span>
						<span>안전한 OAuth 2.0 인증</span>
					</div>
				</div>
			</div>
		);
	}

	// 연결된 상태 UI (설정 패널)
	return (
		<div className="auth-view auth-view--connected">
			{/* 연결 상태 섹션 */}
			<section className="settings-section">
				<h3 className="settings-section__title">연결 상태</h3>
				<div className="workspace-card">
					<div className="workspace-card__info">
						<StatusBadge
							isConnected={authStatus.isConnected}
							workspaceName={authStatus.workspaceName}
						/>
					</div>
					<button
						className="btn btn--danger-ghost btn--sm"
						onClick={handleLogout}
						disabled={isLoggingOut}
						aria-busy={isLoggingOut}
					>
						{isLoggingOut ? '로그아웃 중...' : '로그아웃'}
					</button>
				</div>
			</section>

			{/* Database ID 설정 섹션 */}
			<section className="settings-section">
				<h3 className="settings-section__title">Notion Database</h3>
				<p className="settings-section__desc">
					저장할 Notion Database의 ID를 입력하세요.<br />
					Database URL에서 32자리 ID를 복사하거나 전체 URL을 붙여넣으세요.
				</p>

				<div className="db-input-group">
					<label htmlFor={dbInputId} className="sr-only">
						Notion Database ID
					</label>
					<input
						id={dbInputId}
						type="text"
						className={`db-input ${
							dbSaveStatus === 'error'
								? 'db-input--error'
								: dbSaveStatus === 'success'
								? 'db-input--success'
								: ''
						}`}
						value={databaseId}
						onChange={(e) => {
							setDatabaseId(e.target.value);
							if (dbSaveStatus !== 'idle') {
								setDbSaveStatus('idle');
								setDbSaveMessage(null);
							}
						}}
						placeholder="Database ID 또는 URL 붙여넣기"
						aria-describedby={dbSaveMessage ? 'db-save-msg' : undefined}
						spellCheck={false}
					/>
					<button
						className={`btn btn--secondary btn--sm db-save-btn ${
							dbSaveStatus === 'saving' ? 'btn--loading' : ''
						}`}
						onClick={handleSaveDatabaseId}
						disabled={dbSaveStatus === 'saving'}
						aria-busy={dbSaveStatus === 'saving'}
					>
						{dbSaveStatus === 'saving' && (
							<span className="btn-spinner btn-spinner--sm" aria-hidden="true" />
						)}
						{dbSaveStatus === 'saving' ? '' : '저장'}
					</button>
				</div>

				{/* 저장 결과 피드백 */}
				{dbSaveMessage && (
					<p
						id="db-save-msg"
						className={`db-feedback ${
							dbSaveStatus === 'success' ? 'db-feedback--success' : 'db-feedback--error'
						}`}
						role={dbSaveStatus === 'error' ? 'alert' : 'status'}
					>
						{dbSaveStatus === 'success' ? '✅' : '⚠️'} {dbSaveMessage}
					</p>
				)}

				{/* DB ID 찾는 방법 안내 */}
				<details className="db-help">
					<summary className="db-help__trigger">Database ID 찾는 방법</summary>
					<div className="db-help__content">
						<ol className="db-help__steps">
							<li>Notion에서 저장할 Database 페이지를 엽니다.</li>
							<li>브라우저 주소창의 URL을 복사합니다.</li>
							<li>위 입력창에 URL 전체를 붙여넣으면 자동으로 ID를 추출합니다.</li>
							<li>"저장" 버튼을 클릭합니다.</li>
						</ol>
						<div className="db-help__note">
							<strong>⚠️ 중요:</strong> Database에 이 통합이 <strong>공유</strong>되어 있어야 합니다.
							(Database 메뉴 → 연결 추가 → 통합 검색)
						</div>
					</div>
				</details>
			</section>
		</div>
	);
};

export default AuthView;
