'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { ToastProvider } from '@/components/ui/Toast';
import { ROLES } from '@/constants';

export default function AdminLayout({ children }) {
    return (
        <ToastProvider>
            <DashboardLayout requiredRoles={[ROLES.ADMIN]}>
                {children}
            </DashboardLayout>
        </ToastProvider>
    );
}
