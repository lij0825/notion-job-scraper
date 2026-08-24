import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface DatePickerProps {
	value: string | null;
	onChange: (value: string | null) => void;
	label?: string;
	minDate?: string;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const DatePicker: React.FC<DatePickerProps> = ({
	value,
	onChange,
	label = '마감일',
	minDate,
}) => {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// Parse initial year and month from value or today
	const initialDate = value ? new Date(value) : new Date();
	const [viewYear, setViewYear] = useState<number>(
		isNaN(initialDate.getFullYear()) ? new Date().getFullYear() : initialDate.getFullYear()
	);
	const [viewMonth, setViewMonth] = useState<number>(
		isNaN(initialDate.getMonth()) ? new Date().getMonth() : initialDate.getMonth()
	);

	// Close popover when clicking outside or pressing Escape
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			document.addEventListener('keydown', handleKeyDown);
		}
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isOpen]);

	const handlePrevMonth = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (viewMonth === 0) {
			setViewYear((prev) => prev - 1);
			setViewMonth(11);
		} else {
			setViewMonth((prev) => prev - 1);
		}
	};

	const handleNextMonth = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (viewMonth === 11) {
			setViewYear((prev) => prev + 1);
			setViewMonth(0);
		} else {
			setViewMonth((prev) => prev + 1);
		}
	};

	const handleSelectDate = (year: number, month: number, day: number) => {
		const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		onChange(formatted);
		setIsOpen(false);
	};

	const handleQuickAddDays = (days: number, e: React.MouseEvent) => {
		e.stopPropagation();
		const target = new Date();
		target.setDate(target.getDate() + days);
		const formatted = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
		onChange(formatted);
		setIsOpen(false);
	};

	const handleClearDate = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange(null);
		setIsOpen(false);
	};

	// Generate days grid
	const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
	const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
	const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

	const today = new Date();
	const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	// Calculate D-day string
	const getDDayText = (dateStr: string | null) => {
		if (!dateStr) return '상시 채용';
		try {
			const target = new Date(dateStr);
			target.setHours(0, 0, 0, 0);
			const now = new Date();
			now.setHours(0, 0, 0, 0);
			const diffTime = target.getTime() - now.getTime();
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
			if (diffDays === 0) return '오늘 마감 (D-Day)';
			if (diffDays > 0) return `D-${diffDays}`;
			return `마감됨 (D+${Math.abs(diffDays)})`;
		} catch {
			return '';
		}
	};

	return (
		<div className="relative w-full" ref={containerRef}>
			{/* Trigger Button */}
			<div
				role="button"
				tabIndex={0}
				onClick={() => setIsOpen(!isOpen)}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						setIsOpen(!isOpen);
					}
				}}
				className="flex items-center justify-between h-7 px-2 text-xs bg-muted/30 hover:bg-muted/60 border border-border/50 rounded cursor-pointer transition-colors select-none focus:outline-none focus:ring-1 focus:ring-primary"
				aria-label={`${label} 선택기 열기`}
			>
				<div className="flex items-center gap-1.5 min-w-0 truncate">
					<CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
					<span className={value ? 'font-medium text-foreground truncate' : 'text-muted-foreground/70 truncate'}>
						{value ? `${value} (${getDDayText(value)})` : '마감일 선택 (상시 채용 시 비움)'}
					</span>
				</div>

				{value && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-5 w-5 text-muted-foreground hover:text-foreground rounded p-0 shrink-0 ml-1"
						onClick={handleClearDate}
						title="마감일 지우기 (상시 채용)"
						aria-label="마감일 지우기"
					>
						<X className="w-3 h-3" />
					</Button>
				)}
			</div>

			{/* In-DOM Floating Calendar Popover */}
			{isOpen && (
				<div className="absolute right-0 top-full mt-1 z-50 w-64 p-2.5 rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in zoom-in-95 select-none">
					{/* Month / Year Navigator */}
					<div className="flex items-center justify-between pb-2 mb-1.5 border-b border-border/40">
						<span className="text-xs font-semibold text-foreground px-1">
							{viewYear}년 {viewMonth + 1}월
						</span>
						<div className="flex items-center gap-0.5">
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
								onClick={handlePrevMonth}
								aria-label="이전 달"
							>
								<ChevronLeft className="w-3.5 h-3.5" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
								onClick={handleNextMonth}
								aria-label="다음 달"
							>
								<ChevronRight className="w-3.5 h-3.5" />
							</Button>
						</div>
					</div>

					{/* Weekday Headers */}
					<div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground pb-1">
						{WEEKDAYS.map((day, idx) => (
							<span key={day} className={idx === 0 ? 'text-rose-400' : idx === 6 ? 'text-blue-400' : ''}>
								{day}
							</span>
						))}
					</div>

					{/* Days Grid */}
					<div className="grid grid-cols-7 gap-1 text-center text-xs">
						{/* Prev Month Days */}
						{Array.from({ length: firstDayOfWeek }).map((_, idx) => {
							const dayNum = daysInPrevMonth - firstDayOfWeek + idx + 1;
							return (
								<span
									key={`prev-${idx}`}
									className="h-6 flex items-center justify-center text-[11px] text-muted-foreground/30"
								>
									{dayNum}
								</span>
							);
						})}

						{/* Current Month Days */}
						{Array.from({ length: daysInMonth }).map((_, idx) => {
							const dayNum = idx + 1;
							const currentDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
							const isSelected = value === currentDateStr;
							const isToday = todayStr === currentDateStr;
							const dayOfWeek = (firstDayOfWeek + idx) % 7;

							return (
								<button
									key={`curr-${dayNum}`}
									type="button"
									onClick={() => handleSelectDate(viewYear, viewMonth, dayNum)}
									className={`h-6 rounded text-[11px] flex items-center justify-center transition-colors ${
										isSelected
											? 'bg-primary text-primary-foreground font-bold shadow-sm'
											: isToday
												? 'border border-primary text-primary font-medium hover:bg-primary/20'
												: 'hover:bg-muted/70 text-foreground'
									} ${!isSelected && dayOfWeek === 0 ? 'text-rose-400' : ''} ${
										!isSelected && dayOfWeek === 6 ? 'text-blue-400' : ''
									}`}
								>
									{dayNum}
								</button>
							);
						})}
					</div>

					{/* Quick Preset Buttons */}
					<div className="mt-2.5 pt-2 border-t border-border/40 space-y-1.5">
						<div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
							<span className="flex items-center gap-1 font-medium">
								<Clock className="w-2.5 h-2.5" />
								빠른 마감일 지정
							</span>
						</div>
						<div className="grid grid-cols-4 gap-1">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-5 text-[10px] px-1 py-0 bg-card hover:bg-accent border-border"
								onClick={(e) => handleQuickAddDays(7, e)}
							>
								+1주일
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-5 text-[10px] px-1 py-0 bg-card hover:bg-accent border-border"
								onClick={(e) => handleQuickAddDays(14, e)}
							>
								+2주일
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-5 text-[10px] px-1 py-0 bg-card hover:bg-accent border-border"
								onClick={(e) => handleQuickAddDays(30, e)}
							>
								+1개월
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-5 text-[10px] px-1 py-0 text-muted-foreground hover:text-foreground bg-card hover:bg-accent border-border"
								onClick={handleClearDate}
							>
								상시채용
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default DatePicker;
