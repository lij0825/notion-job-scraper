import React from 'react';

interface StatusBadgeProps {
	isConnected: boolean;
	workspaceName?: string;
}

/**
 * Notion 연결 상태를 시각적으로 표시하는 뱃지 컴포넌트
 * 연결됨/연결 안됨 상태에 따라 색상과 텍스트가 변경됩니다.
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ isConnected, workspaceName }) => {
	return (
		<div className={`status-badge ${isConnected ? 'status-badge--connected' : 'status-badge--disconnected'}`}>
			{/* 상태 표시 점 (펄스 애니메이션) */}
			<span className="status-dot" aria-hidden="true" />
			<span className="status-text">
				{isConnected
					? workspaceName
						? `${workspaceName} 연결됨`
						: 'Notion 연결됨'
					: 'Notion 미연결'}
			</span>
		</div>
	);
};

export default StatusBadge;
