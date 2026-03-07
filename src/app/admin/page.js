'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGreeting, formatDate } from '@/lib/utils';
import { FiUsers, FiBookOpen, FiGrid, FiLayers, FiClock, FiCheckSquare, FiCalendar, FiTrendingUp, FiAlertCircle, FiArrowRight } from 'react-icons/fi';
import Link from 'next/link';
import { getStudents, getTeachers, getClasses, getSections, getLeaveRequests, getCalendarEvents } from '@/lib/dataService';

export default function AdminDashboard() {
    const { user } = useAuth();

    const [statsData, setStatsData] = useState({ totalStudents: 0, totalTeachers: 0, totalClasses: 0, totalSections: 0 });
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [recentStudents, setRecentStudents] = useState([]);
    const [classesData, setClassesData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [students, teachers, classes, sections, leaves, events] = await Promise.all([
                    getStudents(), getTeachers(), getClasses(), getSections(), getLeaveRequests(), getCalendarEvents()
                ]);

                setStatsData({
                    totalStudents: students.length,
                    totalTeachers: teachers.length,
                    totalClasses: classes.length,
                    totalSections: sections.length
                });

                setPendingLeaves(leaves.filter(l => l.status === 'Pending'));

                const now = new Date();
                setUpcomingEvents(
                    events.filter(e => new Date(e.date) >= now)
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .slice(0, 4)
                );

                setRecentStudents(students.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5));
                setClassesData(classes);
            } catch (error) {
                console.error("Dashboard fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const stats = [
        { label: 'Total Students', value: statsData.totalStudents, icon: <FiBookOpen />, variant: 'primary', href: '/admin/students' },
        { label: 'Total Teachers', value: statsData.totalTeachers, icon: <FiUsers />, variant: 'secondary', href: '/admin/teachers' },
        { label: 'Classes', value: statsData.totalClasses, icon: <FiGrid />, variant: 'accent', href: '/admin/classes' },
        { label: 'Sections', value: statsData.totalSections, icon: <FiLayers />, variant: 'danger', href: '/admin/classes' },
    ];

    const quickActions = [
        { label: 'Mark Attendance', icon: <FiCheckSquare />, href: '/admin/attendance', color: '#10b981' },
        { label: 'View Timetable', icon: <FiClock />, href: '/admin/timetable', color: '#3b82f6' },
        { label: 'Manage Exams', icon: <FiTrendingUp />, href: '/admin/exams', color: '#f59e0b' },
        { label: 'View Calendar', icon: <FiCalendar />, href: '/admin/calendar', color: '#8b5cf6' },
    ];

    return (
        <div className="animate-fade-in">
            {/* Page header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">{getGreeting()}, {user?.name?.split(' ')[0]}! 👋</h1>
                    <p className="page-subtitle">Here&apos;s your school overview for today</p>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
                {stats.map((stat) => (
                    <Link key={stat.label} href={stat.href} style={{ textDecoration: 'none' }}>
                        <div className="stat-card">
                            <div className={`stat-icon stat-icon-${stat.variant}`}>
                                {stat.icon}
                            </div>
                            <div className="stat-info">
                                <div className="stat-value">{stat.value}</div>
                                <div className="stat-label">{stat.label}</div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick actions + Pending leaves + Upcoming events */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Quick Actions */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Quick Actions</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        {quickActions.map((action) => (
                            <Link key={action.label} href={action.href} style={{ textDecoration: 'none' }}>
                                <div
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.875rem', borderRadius: '0.5rem',
                                        border: '1px solid var(--color-border)',
                                        cursor: 'pointer', transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = action.color;
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--color-border)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <span style={{ color: action.color, fontSize: '1.125rem' }}>{action.icon}</span>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)' }}>{action.label}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Pending Leaves */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">
                            <FiAlertCircle style={{ color: '#f59e0b', marginRight: '0.5rem' }} />
                            Pending Leave Requests
                        </span>
                        <span className="badge badge-warning">{pendingLeaves.length}</span>
                    </div>
                    {pendingLeaves.length === 0 ? (
                        <div className="empty-state">
                            <p className="empty-state-text">No pending requests</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {pendingLeaves.map((leave) => {
                                return (
                                    <div
                                        key={leave.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                                            background: 'var(--color-warning-bg)',
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{leave.studentName || 'Student'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                                {leave.reason} • {formatDate(leave.startDate)}
                                            </div>
                                        </div>
                                        <span className="badge badge-warning">Pending</span>
                                    </div>
                                );
                            })}
                            <Link href="/admin/leave" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                                View All <FiArrowRight />
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Upcoming Events + Recent Students */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Upcoming Events */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">📅 Upcoming Events</span>
                        <Link href="/admin/calendar" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)' }}>View All</Link>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {upcomingEvents.map((event) => (
                            <div
                                key={event.id}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    padding: '0.625rem 0',
                                    borderBottom: '1px solid var(--color-border)',
                                }}
                            >
                                <div style={{
                                    width: 44, height: 44, borderRadius: '0.5rem',
                                    background: 'var(--color-primary-50)', display: 'flex',
                                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-primary)', lineHeight: 1 }}>
                                        {new Date(event.date).toLocaleDateString('en-IN', { month: 'short' })}
                                    </span>
                                    <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1.2 }}>
                                        {new Date(event.date).getDate()}
                                    </span>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{event.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{event.description}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Students */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">🎒 Recent Students</span>
                        <Link href="/admin/students" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)' }}>View All</Link>
                    </div>
                    <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Class</th>
                                    <th>Section</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentStudents.map((student) => {
                                    const cls = classesData.find(c => c.id === student.class);
                                    return (
                                        <tr key={student.id}>
                                            <td style={{ fontWeight: 500 }}>{student.name}</td>
                                            <td>{cls?.name || student.class}</td>
                                            <td><span className="badge badge-primary">{student.section}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
