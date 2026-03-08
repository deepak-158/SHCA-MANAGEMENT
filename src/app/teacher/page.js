'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGreeting, formatDate } from '@/lib/utils';
import { FiUsers, FiCheckSquare, FiClipboard, FiCalendar, FiArrowRight, FiDownload } from 'react-icons/fi';
import Link from 'next/link';
import { getClasses, getStudents, getLeaveRequests, getCalendarEvents } from '@/lib/dataService';

export default function TeacherDashboard() {
    const { user } = useAuth();
    const isClassTeacher = user?.classTeacherOf;

    const [myClass, setMyClass] = useState(null);
    const [myStudents, setMyStudents] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState(0);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            // Fetch events for everyone
            const eventsData = await getCalendarEvents();
            setUpcomingEvents(eventsData.filter(e => new Date(e.date) >= new Date()).slice(0, 3));

            // Fetch class-specific data if they are a class teacher
            if (isClassTeacher) {
                const [cData, stData, lData] = await Promise.all([
                    getClasses(),
                    getStudents(),
                    getLeaveRequests()
                ]);

                const classDoc = cData.find(c => c.id === isClassTeacher.class);
                setMyClass(classDoc);

                setMyStudents(stData.filter(s => s.class === isClassTeacher.class && s.section === isClassTeacher.section));

                // Only count pending leaves for their class/section
                setPendingLeaves(lData.filter(l =>
                    l.status === 'Pending' &&
                    l.classId === isClassTeacher.class &&
                    l.sectionId === isClassTeacher.section
                ).length);
            }
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    const downloadStudentList = () => {
        if (myStudents.length === 0) return;
        const className = myClass?.name || 'Class';
        const section = isClassTeacher?.section || '';

        let csv = 'Sr No,Name,Gender,DOB,Roll No,Parent Name,Parent Contact,Parent Email,Address\n';
        const sorted = [...myStudents].sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));
        sorted.forEach((s, idx) => {
            csv += `${idx + 1},"${s.name || ''}",${s.gender || ''},${s.dob || ''},${s.rollNumber || ''},"${s.parentName || ''}",${s.parentContact || ''},${s.parentEmail || ''},"${(s.address || '').replace(/"/g, '""')}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `students_${className}_${section}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading Dashboard...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{getGreeting()}, {user?.name?.split(' ')[0]}! 👋</h1>
                    <p className="page-subtitle">{isClassTeacher ? `Class Teacher of ${myClass?.name || isClassTeacher.class} - ${isClassTeacher.section}` : 'Subject Teacher'}</p>
                </div>
            </div>

            <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
                {isClassTeacher && (
                    <>
                        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={downloadStudentList} title="Click to download student list">
                            <div className="stat-icon stat-icon-primary"><FiUsers /></div>
                            <div className="stat-info">
                                <div className="stat-value">{myStudents.length}</div>
                                <div className="stat-label">My Students</div>
                            </div>
                            <FiDownload style={{ color: 'var(--color-text-muted)', marginLeft: 'auto' }} />
                        </div>
                        <div className="stat-card"><div className="stat-icon stat-icon-accent"><FiClipboard /></div><div className="stat-info"><div className="stat-value">{pendingLeaves}</div><div className="stat-label">Pending Leaves</div></div></div>
                    </>
                )}
                <div className="stat-card"><div className="stat-icon stat-icon-secondary"><FiCalendar /></div><div className="stat-info"><div className="stat-value">{upcomingEvents.length}</div><div className="stat-label">Upcoming Events</div></div></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isClassTeacher ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                {/* Quick Actions */}
                <div className="card">
                    <div className="card-header"><span className="card-title">Quick Actions</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {isClassTeacher && (
                            <Link href="/teacher/attendance" className="sidebar-link" style={{ color: 'var(--color-text)', background: 'var(--color-bg)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                                <span className="sidebar-link-icon" style={{ color: 'var(--color-success)' }}><FiCheckSquare /></span>
                                Mark Attendance <FiArrowRight style={{ marginLeft: 'auto' }} />
                            </Link>
                        )}
                        {isClassTeacher && (
                            <Link href="/teacher/leave" className="sidebar-link" style={{ color: 'var(--color-text)', background: 'var(--color-bg)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                                <span className="sidebar-link-icon" style={{ color: 'var(--color-accent)' }}><FiClipboard /></span>
                                Review Leave Requests <FiArrowRight style={{ marginLeft: 'auto' }} />
                            </Link>
                        )}
                        <Link href="/teacher/marks" className="sidebar-link" style={{ color: 'var(--color-text)', background: 'var(--color-bg)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                            <span className="sidebar-link-icon" style={{ color: 'var(--color-primary)' }}><FiCheckSquare /></span>
                            Enter Marks <FiArrowRight style={{ marginLeft: 'auto' }} />
                        </Link>
                        {isClassTeacher && myStudents.length > 0 && (
                            <button onClick={downloadStudentList} className="sidebar-link" style={{ color: 'var(--color-text)', background: 'var(--color-bg)', borderRadius: '0.5rem', padding: '0.75rem', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center' }}>
                                <span className="sidebar-link-icon" style={{ color: 'var(--color-info)' }}><FiDownload /></span>
                                Download Student List <FiArrowRight style={{ marginLeft: 'auto' }} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Upcoming Events */}
                <div className="card">
                    <div className="card-header"><span className="card-title">📅 Upcoming Events</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
            </div>
        </div>
    );
}
