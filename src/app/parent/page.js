'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGreeting, formatDate } from '@/lib/utils';
import { getChildrenByParentEmail, getChildAttendanceSummary, getChildFees, getChildResults } from '@/lib/parentService';
import { getHomework } from '@/lib/homeworkService';
import { getAnnouncements } from '@/lib/communicationService';
import { getClasses, getExams } from '@/lib/dataService';
import Link from 'next/link';
import { FiCheckSquare, FiAward, FiDollarSign, FiBook, FiCalendar, FiClipboard, FiArrowRight, FiBell, FiHeart } from 'react-icons/fi';

export default function ParentDashboard() {
    const { user } = useAuth();
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [classes, setClasses] = useState([]);
    const [stats, setStats] = useState({ attendance: 0, pendingFees: 0, homeworkDue: 0, upcomingExams: 0 });
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [kidsList, classData] = await Promise.all([
                    getChildrenByParentEmail(user?.email),
                    getClasses(),
                ]);
                setChildren(kidsList);
                setClasses(classData);
                if (kidsList.length > 0) {
                    setSelectedChild(kidsList[0]);
                }
                const anns = await getAnnouncements({ targetRole: 'parent', limit: 5 });
                setAnnouncements(anns);
            } catch (e) {
                console.error('Dashboard fetch error:', e);
            } finally {
                setLoading(false);
            }
        };
        if (user?.email) fetchData();
    }, [user]);

    useEffect(() => {
        if (!selectedChild) return;
        const fetchChildData = async () => {
            try {
                const [attendData, feesData, homeworkData, examsData] = await Promise.all([
                    getChildAttendanceSummary(selectedChild.id, selectedChild.class, selectedChild.section),
                    getChildFees(selectedChild.id),
                    getHomework({ classId: selectedChild.class, sectionId: selectedChild.section }),
                    getExams(),
                ]);

                const pendingFees = feesData.filter(f => f.status === 'Pending' || f.status === 'Overdue');
                const totalDue = pendingFees.reduce((sum, f) => sum + (f.amount - (f.paidAmount || 0)), 0);
                const homeworkDue = homeworkData.filter(h => new Date(h.dueDate) >= new Date()).length;
                const upcomingExams = examsData.filter(e => new Date(e.startDate) >= new Date()).length;

                setStats({
                    attendance: attendData.percentage,
                    pendingFees: totalDue,
                    homeworkDue,
                    upcomingExams,
                });
            } catch (e) {
                console.error('Child data fetch error:', e);
            }
        };
        fetchChildData();
    }, [selectedChild]);

    const getClassName = (classId) => classes.find(c => c.id === classId)?.name || classId;

    if (loading) return <div className="loading-overlay" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">{getGreeting()}, {user?.name?.split(' ')[0]}! 👋</h1>
                    <p className="page-subtitle">Track your child&apos;s academic journey</p>
                </div>
                {children.length > 1 && (
                    <select
                        className="input"
                        style={{ width: 'auto', minWidth: 200 }}
                        value={selectedChild?.id || ''}
                        onChange={e => setSelectedChild(children.find(c => c.id === e.target.value))}
                    >
                        {children.map(child => (
                            <option key={child.id} value={child.id}>
                                {child.name} — {getClassName(child.class)} {child.section}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {children.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">👶</div>
                    <div className="empty-state-title">No children linked</div>
                    <p className="empty-state-text">No students are linked to your email. Please contact the school admin.</p>
                </div>
            ) : (
                <>
                    {/* Selected Child Info */}
                    {selectedChild && (
                        <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #eef2ff 0%, #f0fdfa 100%)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: 56, height: 56, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.25rem', fontWeight: 700, color: '#fff',
                                }}>
                                    {selectedChild.name?.charAt(0)}
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{selectedChild.name}</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                        {getClassName(selectedChild.class)} - Section {selectedChild.section} • Roll #{selectedChild.rollNumber}
                                    </div>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                                        Admission: {selectedChild.admissionNumber}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
                        <Link href="/parent/attendance" style={{ textDecoration: 'none' }}>
                            <div className="stat-card">
                                <div className="stat-icon stat-icon-primary"><FiCheckSquare /></div>
                                <div className="stat-info">
                                    <div className="stat-value">{stats.attendance}%</div>
                                    <div className="stat-label">Attendance</div>
                                </div>
                            </div>
                        </Link>
                        <Link href="/parent/fees" style={{ textDecoration: 'none' }}>
                            <div className="stat-card">
                                <div className="stat-icon stat-icon-danger"><FiDollarSign /></div>
                                <div className="stat-info">
                                    <div className="stat-value">₹{stats.pendingFees.toLocaleString()}</div>
                                    <div className="stat-label">Pending Fees</div>
                                </div>
                            </div>
                        </Link>
                        <Link href="/parent/homework" style={{ textDecoration: 'none' }}>
                            <div className="stat-card">
                                <div className="stat-icon stat-icon-accent"><FiBook /></div>
                                <div className="stat-info">
                                    <div className="stat-value">{stats.homeworkDue}</div>
                                    <div className="stat-label">Homework Due</div>
                                </div>
                            </div>
                        </Link>
                        <div className="stat-card">
                            <div className="stat-icon stat-icon-secondary"><FiCalendar /></div>
                            <div className="stat-info">
                                <div className="stat-value">{stats.upcomingExams}</div>
                                <div className="stat-label">Upcoming Exams</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions + Announcements */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {/* Quick Actions */}
                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">Quick Actions</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                {[
                                    { label: 'View Results', icon: <FiAward />, href: '/parent/results', color: '#8b5cf6' },
                                    { label: 'Pay Fees', icon: <FiDollarSign />, href: '/parent/fees', color: '#ef4444' },
                                    { label: 'Apply Leave', icon: <FiClipboard />, href: '/parent/leave', color: '#f59e0b' },
                                    { label: 'View Timetable', icon: <FiCalendar />, href: '/parent/timetable', color: '#3b82f6' },
                                ].map(action => (
                                    <Link key={action.label} href={action.href} style={{ textDecoration: 'none' }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            padding: '0.875rem', borderRadius: '0.5rem',
                                            border: '1px solid var(--color-border)',
                                            cursor: 'pointer', transition: 'all 0.2s ease',
                                        }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                        >
                                            <span style={{ color: action.color, fontSize: '1.125rem' }}>{action.icon}</span>
                                            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)' }}>{action.label}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Recent Announcements */}
                        <div className="card">
                            <div className="card-header">
                                <span className="card-title"><FiBell style={{ marginRight: '0.5rem', color: '#f59e0b' }} />Announcements</span>
                                <Link href="/parent/announcements" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)' }}>View All</Link>
                            </div>
                            {announcements.length === 0 ? (
                                <div className="empty-state" style={{ padding: '1.5rem' }}>
                                    <p className="empty-state-text">No announcements</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {announcements.slice(0, 4).map(ann => (
                                        <div key={ann.id} style={{
                                            padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                                            background: ann.isUrgent ? 'var(--color-danger-bg)' : 'var(--color-bg)',
                                        }}>
                                            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                                                {ann.isUrgent && <span style={{ color: 'var(--color-danger)', marginRight: '0.25rem' }}>🔴</span>}
                                                {ann.title}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                                                {ann.content?.substring(0, 80)}{ann.content?.length > 80 ? '...' : ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
