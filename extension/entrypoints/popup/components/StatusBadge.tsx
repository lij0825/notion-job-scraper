import React from 'react';
import { Badge } from '../../../components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';

interface StatusBadgeProps {
	isConnected: boolean;
	workspaceName?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ isConnected, workspaceName }) => {
	if (isConnected) {
		return (
			<Badge variant="success" className="gap-1.5 py-1 px-2.5 text-xs font-medium">
				<CheckCircle2 className="w-3.5 h-3.5" />
				<span>{workspaceName ? `${workspaceName} 연결됨` : 'Notion 연결됨'}</span>
			</Badge>
		);
	}

	return (
		<Badge variant="destructive" className="gap-1.5 py-1 px-2.5 text-xs font-medium">
			<XCircle className="w-3.5 h-3.5" />
			<span>Notion 미연결</span>
		</Badge>
	);
};

export default StatusBadge;
