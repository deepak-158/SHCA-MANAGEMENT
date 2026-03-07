'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGreeting } from '@/lib/utils';
import { FiBookOpen, FiCheckSquare, FiCalendar, FiAward, FiClock, FiClipboard, FiDownload, FiArrowRight } from 'react-icons/fi';
import Link from 'next/link';
import { getClasses, getCalendarEvents } from '@/lib/dataService';

export default function StudentDashboard() {
    const { user } = useAuth();
    const [cls, setCls] = useState(null);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            const [cData, eData] = await Promise.all([
                getClasses(),
                getCalendarEvents()
            ]);

            const classDoc = cData.find(c => c.id === user.class);
            setCls(classDoc);

            setUpcomingEvents(eData.filter(e => new Date(e.date) >= new Date()).slice(0, 3));
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    const quickLinks = [
        { label: 'Timetable', icon: <FiClock />, href: '/student/timetable', color: '#4f46e5' },
        { label: 'Attendance', icon: <FiCheckSquare />, href: '/student/attendance', color: '#10b981' },
        { label: 'Leave Request', icon: <FiClipboard />, href: '/student/leave', color: '#f59e0b' },
        { label: 'Syllabus', icon: <FiDownload />, href: '/student/syllabus', color: '#3b82f6' },
        { label: 'Exam Schedule', icon: <FiCalendar />, href: '/student/exams', color: '#ef4444' },
        { label: 'Results', icon: <FiAward />, href: '/student/results', color: '#8b5cf6' },
    ];

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{getGreeting()}, {user?.name?.split(' ')[0]}! 👋</h1>
                    <p className="page-subtitle">{cls?.name || user?.class} - Section {user?.section}</p>
                </div>
            </div>

            {/* Quick links grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {quickLinks.map(link => (
                    <Link key={link.label} href={link.href} style={{ textDecoration: 'none' }}>
                        <div className="card card-hover" style={{ textAlign: 'center', padding: '1.5rem 1rem', cursor: 'pointer' }}>
                            <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: link.color + '15', color: link.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', margin: '0 auto 0.75rem' }}>
                                {link.icon}
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>{link.label}</div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Upcoming events */}
            <div className="card">
                <div className="card-header"><span className="card-title">📅 Upcoming Events</span><Link href="/student/calendar" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)' }}>View All</Link></div>
                {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
                    <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '0.5rem', background: 'var(--color-primary-50)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.5rem', fontWeight: 600, color: 'var(--color-primary)' }}>{new Date(event.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>{new Date(event.date).getDate()}</span>
                        </div>
                        <div><div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{event.title}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{event.description}</div></div>
                    </div>
                )) : (
                    <div className="empty-state" style={{ padding: '1rem' }}><div className="empty-state-title" style={{ fontSize: '0.875rem' }}>No upcoming events</div></div>
                )}
            </div>
        </div>
    );
}
