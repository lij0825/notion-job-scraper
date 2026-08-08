import React, { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import DatePicker from './DatePicker';
import type { JobData } from '../../../utils/types';

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

interface ScrapingViewProps {
	jobData: JobData | null;
	scrapeError: string | null;
	saveStatus: SaveStatus;
	saveError: string | null;
	onSave: (jobData: JobData) => Promise<void>;
	onRefresh: () => Promise<void>;
}

/** 선택/해제 가능한 필드 키 */
type SelectableField = 'title' | 'company' | 'deadline' | 'url' | 'description';

/** 필드 선택 상태 맵 — true이면 Notion에 저장됨 */
type FieldSelectionMap = Record<SelectableField, boolean>;

/** Notion 페이지 생성 시 반드시 필요한 필드 (체크 해제 불가) */
const REQUIRED_FIELDS: ReadonlySet<SelectableField> = new Set(['title', 'url']);

/** 필드 레이블 한글 맵 */
const FIELD_LABELS: Record<SelectableField, string> = {
	title: '직무명',
	company: '회사명',
	deadline: '마감일',
	url: '공고 URL',
	description: '직무 설명',
};

/** 클릭 가능한 채용 사이트 URL 매핑 */
const SITE_URLS: Record<string, string> = {
	'자소설닷컴': 'https://jasoseol.com',
	'원티드': 'https://www.wanted.co.kr',
	'사람인': 'https://www.saramin.co.kr',
	'잡코리아': 'https://www.jobkorea.co.kr',
};

/**
 * 스크래핑된 채용 공고를 편집 가능한 폼으로 표시하고,
 * 사용자가 필드를 선택/해제한 뒤 Notion에 저장할 수 있게 합니다.
 *
 * 핵심 원칙:
 *   - 자동 전송 없음 — 사용자가 "선택한 항목 저장" 버튼을 클릭해야만 Notion에 저장
 *   - 모든 필드는 편집 가능 (title, company, url, description은 텍스트 입력)
 *   - deadline은 DatePicker 컴포넌트로 날짜 선택
 *   - title, url은 필수 필드 — 체크박스 해제 불가
 */
const ScrapingView: React.FC<ScrapingViewProps> = ({
	jobData,
	scrapeError,
	saveStatus,
	saveError,
	onSave,
	onRefresh,
}) => {
	// 사용자가 수정할 수 있는 로컬 사본
	const [editableData, setEditableData] = useState<JobData | null>(null);
	// 각 필드의 선택/해제 상태
	const [selectedFields, setSelectedFields] = useState<FieldSelectionMap>({
		title: true,
		company: true,
		deadline: true,
		url: true,
		description: true,
	});
	const [isRefreshing, setIsRefreshing] = useState(false);

	// jobData가 변경되면 편집 가능 사본을 동기화
	useEffect(() => {
		if (jobData) {
			setEditableData({ ...jobData });
			// 새 데이터가 들어오면 모든 필드를 다시 선택 상태로 초기화
			setSelectedFields({
				title: true,
				company: true,
				deadline: true,
				url: true,
				description: true,
			});
		}
	}, [jobData]);

	/** 단일 필드 값 업데이트 핸들러 */
	const updateField = <K extends keyof JobData>(field: K, value: JobData[K]) => {
		setEditableData((prev) => (prev ? { ...prev, [field]: value } : prev));
	};

	/** 필드 선택/해제 토글 */
	const toggleField = (field: SelectableField) => {
		// 필수 필드는 해제 불가
		if (REQUIRED_FIELDS.has(field)) return;
		setSelectedFields((prev) => ({ ...prev, [field]: !prev[field] }));
	};

	const handleRefresh = async () => {
		setIsRefreshing(true);
		await onRefresh();
		setIsRefreshing(false);
	};

	/** 선택된 필드만 포함하여 Notion에 저장 */
	const handleSave = async () => {
		if (!editableData) return;

		const dataToSave: JobData = {
			title: editableData.title,
			company: selectedFields.company ? editableData.company : '',
			url: editableData.url,
			deadline: selectedFields.deadline ? editableData.deadline : null,
			description: selectedFields.description ? editableData.description : '',
			site: editableData.site,
		};

		await onSave(dataToSave);
	};

	const handleSiteClick = (url: string) => {
		browser.tabs.create({ url });
	};

	const renderSupportedSites = () => (
		<div className="supported-sites">
			<p className="supported-sites__label">지원 사이트</p>
			<div className="supported-sites__list">
				{Object.entries(SITE_URLS).map(([name, url]) => (
					<button
						key={name}
						className="site-chip site-chip--link"
						onClick={() => handleSiteClick(url)}
						title={`${name} 열기`}
					>
						{name}
					</button>
				))}
			</div>
		</div>
	);

	// 에러 상태 (스크래핑 실패)
	if (scrapeError && !jobData) {
		return (
			<div className="scraping-view">
				<div className="error-state">
					<div className="error-icon" aria-hidden="true">🔍</div>
					<h2 className="error-title">채용 공고를 찾을 수 없어요</h2>
					<p className="error-message">{scrapeError}</p>
					{renderSupportedSites()}
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
	if (!jobData || !editableData) {
		return (
			<div className="scraping-view">
				<div className="empty-state">
					<div className="empty-icon" aria-hidden="true">📄</div>
					<p className="empty-text">채용 공고 페이지를 열고<br />확장 프로그램을 실행하세요.</p>
					{renderSupportedSites()}
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

	/** 상시채용 여부 */
	const isAlwaysOpen = editableData.deadline === null;

	/** 선택된 (저장될) 필드 개수 */
	const selectedCount = Object.values(selectedFields).filter(Boolean).length;
	const totalCount = Object.keys(selectedFields).length;

	return (
		<div className="scraping-view">
			{/* 사이트 뱃지 + 새로고침 */}
			<div className="scraping-view__toolbar">
				<span className="site-badge">{siteLabels[editableData.site] ?? editableData.site}</span>
				<div className="toolbar-actions">
					<span className="field-count">{selectedCount}/{totalCount} 필드 선택</span>
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
			</div>

			{/* 편집 가능한 필드 폼 */}
			<div className="field-form">
				{/* 직무명 (필수) */}
				<div className="field-row">
					<label className="field-checkbox-label">
						<input
							type="checkbox"
							className="field-checkbox"
							checked={selectedFields.title}
							disabled
							aria-label="직무명 선택 (필수)"
						/>
						<span className="field-checkbox-custom field-checkbox-custom--locked" />
						<span className="field-label">
							{FIELD_LABELS.title}
							<span className="field-required" title="필수 항목">*</span>
						</span>
					</label>
					<input
						type="text"
						className="field-input"
						value={editableData.title}
						onChange={(e) => updateField('title', e.target.value)}
						placeholder="직무명 입력"
						spellCheck={false}
					/>
				</div>

				{/* 회사명 (선택) */}
				<div className={`field-row ${!selectedFields.company ? 'field-row--disabled' : ''}`}>
					<label className="field-checkbox-label">
						<input
							type="checkbox"
							className="field-checkbox"
							checked={selectedFields.company}
							onChange={() => toggleField('company')}
							aria-label="회사명 포함 여부"
						/>
						<span className="field-checkbox-custom" />
						<span className="field-label">{FIELD_LABELS.company}</span>
					</label>
					<input
						type="text"
						className="field-input"
						value={editableData.company}
						onChange={(e) => updateField('company', e.target.value)}
						placeholder="회사명 입력"
						disabled={!selectedFields.company}
						spellCheck={false}
					/>
				</div>

				{/* 마감일 (선택) */}
				<div className={`field-row field-row--deadline ${!selectedFields.deadline ? 'field-row--disabled' : ''}`}>
					<label className="field-checkbox-label">
						<input
							type="checkbox"
							className="field-checkbox"
							checked={selectedFields.deadline}
							onChange={() => toggleField('deadline')}
							aria-label="마감일 포함 여부"
						/>
						<span className="field-checkbox-custom" />
						<span className="field-label">
							{FIELD_LABELS.deadline}
							{isAlwaysOpen && <span className="field-badge-inline">상시채용</span>}
						</span>
					</label>
					{selectedFields.deadline && (
						<div className="field-deadline-picker">
							<DatePicker
								value={editableData.deadline}
								onChange={(val) => updateField('deadline', val)}
								label={isAlwaysOpen ? '마감일 직접 입력' : '마감일 변경'}
							/>
						</div>
					)}
					{!selectedFields.deadline && (
						<p className="field-excluded-hint">저장 시 마감일이 제외됩니다</p>
					)}
				</div>

				{/* 공고 URL (필수) */}
				<div className="field-row">
					<label className="field-checkbox-label">
						<input
							type="checkbox"
							className="field-checkbox"
							checked={selectedFields.url}
							disabled
							aria-label="공고 URL 선택 (필수)"
						/>
						<span className="field-checkbox-custom field-checkbox-custom--locked" />
						<span className="field-label">
							{FIELD_LABELS.url}
							<span className="field-required" title="필수 항목">*</span>
						</span>
					</label>
					<input
						type="text"
						className="field-input field-input--url"
						value={editableData.url}
						onChange={(e) => updateField('url', e.target.value)}
						placeholder="URL 입력"
						spellCheck={false}
					/>
				</div>

				{/* 직무 설명 (선택) */}
				<div className={`field-row field-row--description ${!selectedFields.description ? 'field-row--disabled' : ''}`}>
					<label className="field-checkbox-label">
						<input
							type="checkbox"
							className="field-checkbox"
							checked={selectedFields.description}
							onChange={() => toggleField('description')}
							aria-label="직무 설명 포함 여부"
						/>
						<span className="field-checkbox-custom" />
						<span className="field-label">{FIELD_LABELS.description}</span>
					</label>
					{selectedFields.description ? (
						<textarea
							className="field-textarea"
							value={editableData.description}
							onChange={(e) => updateField('description', e.target.value)}
							placeholder="직무 설명 입력"
							rows={4}
							spellCheck={false}
						/>
					) : (
						<p className="field-excluded-hint">저장 시 직무 설명이 제외됩니다</p>
					)}
				</div>
			</div>

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
				{saveStatus === 'success'
					? '✅ 저장 완료'
					: saveStatus === 'saving'
						? '저장 중...'
						: `📥 선택한 항목 Notion에 저장 (${selectedCount})`}
			</button>
		</div>
	);
};

export default ScrapingView;
