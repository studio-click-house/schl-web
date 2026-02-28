export function getTicketTypeBadgeClass(type: string): string {
    switch (type) {
        case 'bug':
            return 'bg-orange-500 text-white border-orange-500 me-0';

        case 'feature':
            return 'bg-blue-500 text-white border-blue-500 me-0';

        case 'improvement':
            return 'bg-emerald-500 text-white border-emerald-500 me-0';

        case 'request':
            return 'bg-violet-500 text-white border-violet-500 me-0';

        default:
            return 'bg-gray-500 text-white border-gray-500 me-0';
    }
}

export function getTicketStatusBadgeClass(status: string): string {
    switch (status) {
        case 'pending':
            return 'bg-slate-600 text-white border-slate-600 me-0';
        case 'reviewed':
            return 'bg-orange-600 text-white border-orange-600 me-0';
        case 'in-progress':
            return 'bg-amber-600 text-white border-amber-600 me-0';
        case 'on-hold':
            return 'bg-red-600 text-white border-red-600 me-0';
        case 'rejected':
            return 'bg-red-700 text-white border-red-700 me-0';
        case 'resolved':
            return 'bg-emerald-600 text-white border-emerald-600 me-0';
        default:
            return 'bg-gray-600 text-white border-gray-600 me-0';
    }
}

export function getTicketPriorityBadgeClass(priority: string): string {
    switch (priority) {
        case 'low':
            return 'bg-yellow-300 text-black border-yellow-300 me-0';
        case 'medium':
            return 'bg-orange-600 text-white border-orange-600 me-0';
        case 'high':
            return 'bg-red-600 text-white border-red-600 me-0';
        default:
            return 'bg-slate-500 text-white border-slate-500 me-0';
    }
}
