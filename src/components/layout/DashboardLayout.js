'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout({ children, title, requiredRoles }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
        if (!loading && user && requiredRoles && !requiredRoles.includes(user.role)) {
            router.push('/');
        }
    }, [user, loading, router, requiredRoles]);

    if (loading) {
        return (
            <div className="loading-overlay" style={{ minHeight: '100vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div>
            <Sidebar sidebarOpen={sidebarOpen} onCloseSidebar={() => setSidebarOpen(false)} />
            <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} title={title} />
            <main className="main-content animate-fade-in">
                {children}
            </main>
        </div>
    );
}
