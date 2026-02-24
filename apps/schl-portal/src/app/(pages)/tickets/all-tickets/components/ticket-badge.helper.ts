export function getTicketTypeBadgeClass(type: string): string {
    switch (type) {
        case 'bug':
            return 'bg-orange-500 text-white border-orange-500 me-0';
        case 'feature':
            return 'bg-blue-500 text-white border-blue-500 me-0';
        default:
            return 'bg-emerald-500 text-white border-emerald-500 me-0';
    }
}

export function getTicketStatusBadgeClass(status: string): string {
    switch (status) {
        case 'new':
            return 'bg-slate-600 text-white border-slate-600 me-0';
        case 'backlog':
            return 'bg-gray-600 text-white border-gray-600 me-0';
        case 'ready':
            return 'bg-blue-600 text-white border-blue-600 me-0';
        case 'in-progress':
            return 'bg-amber-600 text-white border-amber-600 me-0';
        case 'halt':
            return 'bg-red-600 text-white border-red-600 me-0';
        case 'no-work':
            return 'bg-zinc-600 text-white border-zinc-600 me-0';
        case 'review':
            return 'bg-orange-600 text-white border-orange-600 me-0';
        case 'testing':
            return 'bg-indigo-600 text-white border-indigo-600 me-0';
        case 'rejected':
            return 'bg-red-700 text-white border-red-700 me-0';
        case 'resolved':
            return 'bg-emerald-600 text-white border-emerald-600 me-0';
        case 'done':
            return 'bg-green-600 text-white border-green-600 me-0';
        default:
            return 'bg-gray-600 text-white border-gray-600 me-0';
    }
}

export function getTicketPriorityBadgeClass(priority: string): string {
    switch (priority) {
        case 'low':
            return 'bg-slate-500 text-white border-slate-500 me-0';
        case 'medium':
            return 'bg-cyan-600 text-white border-cyan-600 me-0';
        case 'high':
            return 'bg-violet-600 text-white border-violet-600 me-0';
        case 'critical':
            return 'bg-rose-700 text-white border-rose-700 me-0';
        default:
            return 'bg-slate-500 text-white border-slate-500 me-0';
    }
}
