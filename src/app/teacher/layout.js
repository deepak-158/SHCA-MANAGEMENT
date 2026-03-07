'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { ToastProvider } from '@/components/ui/Toast';
import { ROLES } from '@/constants';

export default function TeacherLayout({ children }) {
    return (
        <ToastProvider>
            <DashboardLayout requiredRoles={[ROLES.CLASS_TEACHER, ROLES.SUBJECT_TEACHER]}>
                {children}
            </DashboardLayout>
        </ToastProvider>
    );
}
