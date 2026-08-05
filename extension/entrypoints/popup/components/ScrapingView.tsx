import React, { useState } from 'react';
import DatePicker from './DatePicker';
import type { JobData, BackgroundResponse } from '../../../utils/types';

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

interface ScrapingViewProps {
	jobData: JobData | null;
	scrapeError: string | null;
	saveStatus: SaveStatus;
	saveError: string | null;
	onSave: (jobData: JobData) => Promise<void>;
	onRefresh: () => Promise<void>;
}

/**
 * 스크래핑된 채용 공고 데이터를 표시하고 Notion 저장을 처리하는 뷰
 *
 * 상태별 UI:
 *   - 스크래핑 성공: 공고 카드 + DatePicker(상시채용 시) + 저장 버튼
 *   - 스크래핑 실패: 에러 메시지 + 새로고침 버튼
 *   - 저장 중: 로딩 스피너
 *   - 저장 성공: 성공 메시지
 *   - 저장 실패: 에러 메시지
 */
const ScrapingView: React.FC<ScrapingViewProps> = ({
	jobData,
	scrapeError,
	saveStatus,
	saveError,
	onSave,
	onRefresh,
}) => {
	// 사용자가 직접 수정할 수 있는 마감일 (상시채용 → DatePicker로 설정)
	const [overrideDeadline, setOverrideDeadline] = useState<string | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);

	/** "상시채용"인지 여부 */
	const isAlwaysOpen = jobData?.deadline === null;

	/** 실제 Notion에 저장될 마감일: 사용자 override > 원본 데이터 */
	const effectiveDeadline = isAlwaysOpen ? overrideDeadline : jobData?.deadline ?? null;

	const handleRefresh = async () => {
		setIsRefreshing(true);
		setOverrideDeadline(null);
		await onRefresh();
		setIsRefreshing(false);
	};

	const handleSave = async () => {
		if (!jobData) return;
		await onSave({ ...jobData, deadline: effectiveDeadline });
	};

	// 에러 상태 (스크래핑 실패)
	if (scrapeError && !jobData) {
		return (
			<div className="scraping-view">
				<div className="error-state">
					<div className="error-icon" aria-hidden="true">🔍</div>
					<h2 className="error-title">채용 공고를 찾을 수 없어요</h2>
					<p className="error-message">{scrapeError}</p>
					<div className="supported-sites">
						<p className="supported-sites__label">지원 사이트</p>
						<div className="supported-sites__list">
							{['자소설닷컴', '원티드', '사람인', '잡코리아'].map((site) => (
								<span key={site} className="site-chip">{site}</span>
							))}
						</div>
					</div>
					<button
						className="btn btn--secondary"
						onClick={handleRefresh}
						disabled={isRefreshing}
					>
						{isRefreshing ? '새로고침 중...' : '🔄 다시 시도'}
					</button>
				</div>
			</div>
		);
	}

	// 데이터 없는 경우 (초기 로딩)
	if (!jobData) {
		return (
			<div className="scraping-view">
				<div className="empty-state">
					<div className="empty-icon" aria-hidden="true">📄</div>
					<p className="empty-text">채용 공고 페이지를 열고<br />확장 프로그램을 실행하세요.</p>
				</div>
			</div>
		);
	}

	// 사이트 레이블 맵
	const siteLabels: Record<string, string> = {
		jasoseol: '자소설닷컴',
		wanted: '원티드',
		saramin: '사람인',
		jobkorea: '잡코리아',
		unknown: '알 수 없음',
	};

	return (
		<div className="scraping-view">
			{/* 사이트 뱃지 + 새로고침 */}
			<div className="scraping-view__toolbar">
				<span className="site-badge">{siteLabels[jobData.site] ?? jobData.site}</span>
				<button
					className="icon-btn"
					onClick={handleRefresh}
					disabled={isRefreshing}
					title="다시 스크래핑"
					aria-label="채용 공고 다시 스크래핑"
				>
					{isRefreshing ? '⏳' : '🔄'}
				</button>
			</div>

			{/* 채용 공고 정보 카드 */}
			<div className="job-card">
				<div className="job-card__header">
					<h2 className="job-card__title" title={jobData.title}>
						{jobData.title}
					</h2>
					<p className="job-card__company">{jobData.company}</p>
				</div>

				<div className="job-card__meta">
					{/* 마감일 */}
					<div className="meta-item">
						<span className="meta-label">마감일</span>
						<span className={`meta-value ${jobData.deadline ? '' : 'meta-value--always-open'}`}>
							{jobData.deadline ? formatDate(jobData.deadline) : '상시채용'}
						</span>
					</div>

					{/* URL */}
					<div className="meta-item">
						<span className="meta-label">링크</span>
						<a
							href={jobData.url}
							target="_blank"
							rel="noopener noreferrer"
							className="meta-link"
							title={jobData.url}
						>
							공고 열기 ↗
						</a>
					</div>
				</div>

				{/* 직무 설명 미리보기 */}
				{jobData.description && (
					<div className="job-card__description">
						<p className="description-preview">
							{jobData.description.slice(0, 150)}
							{jobData.description.length > 150 && '...'}
						</p>
					</div>
				)}
			</div>

			{/* 상시채용인 경우 DatePicker 표시 */}
			{isAlwaysOpen && (
				<div className="date-picker-section">
					<DatePicker
						value={overrideDeadline}
						onChange={setOverrideDeadline}
						label="마감일 직접 입력 (선택사항)"
					/>
				</div>
			)}

			{/* 저장 상태 메시지 */}
			{saveStatus === 'success' && (
				<div className="save-feedback save-feedback--success" role="status">
					<span aria-hidden="true">✅</span> Notion에 성공적으로 저장되었습니다!
				</div>
			)}

			{saveStatus === 'error' && saveError && (
				<div className="save-feedback save-feedback--error" role="alert">
					<span aria-hidden="true">❌</span> {saveError}
				</div>
			)}

			{/* 저장 버튼 */}
			<button
				className={`btn btn--primary save-btn ${saveStatus === 'saving' ? 'btn--loading' : ''}`}
				onClick={handleSave}
				disabled={saveStatus === 'saving' || saveStatus === 'success'}
				aria-busy={saveStatus === 'saving'}
			>
				{saveStatus === 'saving' && <span className="btn-spinner" aria-hidden="true" />}
				{saveStatus === 'success' ? '✅ 저장 완료' : saveStatus === 'saving' ? '저장 중...' : '📥 Notion에 저장'}
			</button>
		</div>
	);
};

/** YYYY-MM-DD를 읽기 쉬운 한국어 형식으로 변환합니다. */
function formatDate(dateStr: string): string {
	try {
		const [year, month, day] = dateStr.split('-');
		return `${year}년 ${Number(month)}월 ${Number(day)}일`;
	} catch {
		return dateStr;
	}
}

export default ScrapingView;
