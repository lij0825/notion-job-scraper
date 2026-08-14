import React, { useId } from 'react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Calendar, X } from 'lucide-react';

interface DatePickerProps {
	value: string | null;
	onChange: (value: string | null) => void;
	label?: string;
	minDate?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
	value,
	onChange,
	label = '마감일 직접 입력',
	minDate,
}) => {
	const inputId = useId();
	const today = new Date().toISOString().split('T')[0];
	const effectiveMinDate = minDate ?? today;

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(e.target.value || null);
	};

	const handleClear = () => {
		onChange(null);
	};

	return (
		<div className="space-y-1.5 w-full">
			<div className="flex items-center justify-between text-xs text-muted-foreground">
				<label htmlFor={inputId} className="flex items-center gap-1.5 font-medium text-foreground">
					<Calendar className="w-3.5 h-3.5 text-primary" />
					{label}
				</label>
				<Badge variant="outline" className="text-[10px] py-0 px-1.5">상시채용 지원</Badge>
			</div>

			<div className="flex items-center gap-1.5">
				<Input
					id={inputId}
					type="date"
					className="h-8 text-xs bg-muted/30"
					value={value ?? ''}
					min={effectiveMinDate}
					onChange={handleChange}
					aria-label="지원 마감일 선택"
				/>
				{value && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
						onClick={handleClear}
						title="날짜 지우기"
						aria-label="선택한 날짜 지우기"
					>
						<X className="w-3.5 h-3.5" />
					</Button>
				)}
			</div>

			<p className="text-[11px] text-muted-foreground">
				{value
					? `선택된 마감일: ${formatDisplayDate(value)}`
					: '마감일 없이 상시 채용으로 저장됩니다.'}
			</p>
		</div>
	);
};

function formatDisplayDate(dateStr: string): string {
	try {
		const [year, month, day] = dateStr.split('-');
		return `${year}년 ${Number(month)}월 ${Number(day)}일`;
	} catch {
		return dateStr;
	}
}

export default DatePicker;
