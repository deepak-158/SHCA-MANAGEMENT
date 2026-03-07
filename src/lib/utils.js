import { GRADE_MAP } from '@/constants';

export function calculateGrade(percentage) {
    for (const entry of GRADE_MAP) {
        if (percentage >= entry.min && percentage <= entry.max) {
            return { grade: entry.grade, remark: entry.remark };
        }
    }
    return { grade: 'N/A', remark: 'N/A' };
}

export function calculatePercentage(obtained, total) {
    if (total === 0) return 0;
    return Math.round((obtained / total) * 100 * 100) / 100;
}

export function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function formatDateInput(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

export function generateId() {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function getCurrentAcademicYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    // Academic year starts in April (month 3)
    const startYear = month >= 3 ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
}

export function getInitials(name) {
    if (!name) return '';
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
}
