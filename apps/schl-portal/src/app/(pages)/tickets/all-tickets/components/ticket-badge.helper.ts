export function getTicketStatusBadgeClass(status: string): string {
    switch (status) {
        case 'in-review':
            return 'bg-slate-600 text-white border-slate-600 me-0'; // neutral gray — under evaluation
        case 'pending':
            return 'bg-yellow-600 text-white border-yellow-600 me-0'; // warm yellow — waiting
        case 'in-progress':
            return 'bg-blue-600 text-white border-blue-600 me-0'; // blue — active work
        case 'on-hold':
            return 'bg-orange-600 text-white border-orange-600 me-0'; // orange — caution, paused
        case 'rejected':
            return 'bg-red-600 text-white border-red-600 me-0'; // red — final negative
        case 'finished':
            return 'bg-emerald-600 text-white border-emerald-600 me-0'; // green — success
        default:
            return '';
    }
}

export function getTicketPriorityBadgeClass(priority: string): string {
    switch (priority) {
        case 'low':
            return 'bg-green-600 text-white border-green-600';
        case 'medium':
            return 'bg-yellow-600 text-white border-yellow-600';
        case 'high':
            return 'bg-orange-600 text-white border-orange-600';
        default:
            return '';
    }
}
