import React, { useId } from 'react';

interface DatePickerProps {
	/** YYYY-MM-DD 형식의 날짜 값 또는 null (미설정) */
	value: string | null;
	onChange: (value: string | null) => void;
	label?: string;
	/** 선택 가능한 최소 날짜 (기본: 오늘) */
	minDate?: string;
}

/**
 * 마감일 날짜 선택 컴포넌트
 * deadline이 null(상시채용)인 경우 팝업에서 수동으로 날짜를 선택할 수 있습니다.
 * "날짜 없이 저장" 버튼으로 다시 null로 되돌릴 수 있습니다.
 */
const DatePicker: React.FC<DatePickerProps> = ({
	value,
	onChange,
	label = '마감일 직접 입력',
	minDate,
}) => {
	const inputId = useId();

	// 최소 날짜: 제공되지 않으면 오늘 날짜를 기본값으로 사용
	const today = new Date().toISOString().split('T')[0];
	const effectiveMinDate = minDate ?? today;

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(e.target.value || null);
	};

	const handleClear = () => {
		onChange(null);
	};

	return (
		<div className="date-picker">
			<label htmlFor={inputId} className="date-picker__label">
				<span className="date-picker__icon" aria-hidden="true">📅</span>
				{label}
				<span className="date-picker__badge">상시채용</span>
			</label>

			<div className="date-picker__controls">
				<input
					id={inputId}
					type="date"
					className="date-picker__input"
					value={value ?? ''}
					min={effectiveMinDate}
					onChange={handleChange}
					aria-label="지원 마감일 선택"
				/>

				{value && (
					<button
						type="button"
						className="date-picker__clear-btn"
						onClick={handleClear}
						title="날짜 지우기"
						aria-label="선택한 날짜 지우기"
					>
						✕
					</button>
				)}
			</div>

			<p className="date-picker__hint">
				{value
					? `선택한 마감일: ${formatDisplayDate(value)}`
					: 'Notion에는 마감일 없이 저장됩니다.'}
			</p>
		</div>
	);
};

/** YYYY-MM-DD를 사람이 읽기 쉬운 형식으로 변환합니다. */
function formatDisplayDate(dateStr: string): string {
	try {
		const [year, month, day] = dateStr.split('-');
		return `${year}년 ${Number(month)}월 ${Number(day)}일`;
	} catch {
		return dateStr;
	}
}

export default DatePicker;
