export function getTicketTypeBadgeClass(type: string): string {
    switch (type) {
        case 'bug':
            return 'bg-orange-600 text-white border-orange-600 me-0';
        case 'feature':
            return 'bg-blue-600 text-white border-blue-600 me-0';
        default:
            return 'bg-green-600 text-white border-green-600 me-0';
    }
}

export function getTicketStatusBadgeClass(status: string): string {
    switch (status) {
        case 'backlog':
            return 'bg-gray-600 text-white border-gray-600 me-0';
        case 'ready':
            return 'bg-blue-600 text-white border-blue-600 me-0';
        case 'in-progress':
            return 'bg-amber-600 text-white border-amber-600 me-0';
        case 'halt':
            return 'bg-red-600 text-white border-red-600 me-0';
        case 'review':
            return 'bg-orange-600 text-white border-orange-600 me-0';
        case 'testing':
            return 'bg-indigo-600 text-white border-indigo-600 me-0';
        case 'done':
            return 'bg-green-600 text-white border-green-600 me-0';
        default:
            return 'bg-gray-600 text-white border-gray-600 me-0';
    }
}