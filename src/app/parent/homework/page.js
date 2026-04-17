'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getChildrenByParentEmail } from '@/lib/parentService';
import { getClasses } from '@/lib/dataService';
import { getHomework, getStudentSubmissions } from '@/lib/homeworkService';
import { FiBook, FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { formatDate } from '@/lib/utils';

export default function ParentHomeworkPage() {
    const { user } = useAuth();
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [classes, setClasses] = useState([]);
    const [homework, setHomework] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [kids, cls] = await Promise.all([getChildrenByParentEmail(user?.email), getClasses()]);
                setChildren(kids); setClasses(cls);
                if (kids.length > 0) setSelectedChild(kids[0]);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (user?.email) fetch();
    }, [user]);

    useEffect(() => {
        if (!selectedChild) return;
        const fetchHW = async () => {
            try {
                const [hw, subs] = await Promise.all([
                    getHomework({ classId: selectedChild.class, sectionId: selectedChild.section }),
                    getStudentSubmissions(selectedChild.id),
                ]);
                setHomework(hw);
                setSubmissions(subs);
            } catch (e) { console.error(e); }
        };
        fetchHW();
    }, [selectedChild]);

    const getClassName = (id) => classes.find(c => c.id === id)?.name || id;

    const getSubmissionStatus = (hwId) => {
        const sub = submissions.find(s => s.homeworkId === hwId);
        if (!sub) return { status: 'Pending', badge: 'badge-warning', icon: <FiClock /> };
        if (sub.status === 'Graded') return { status: `Graded: ${sub.grade}`, badge: 'badge-success', icon: <FiCheckCircle />, feedback: sub.feedback };
        if (sub.status === 'Submitted') return { status: 'Submitted', badge: 'badge-info', icon: <FiCheckCircle /> };
        if (sub.status === 'Resubmit') return { status: 'Resubmit Required', badge: 'badge-danger', icon: <FiAlertCircle />, feedback: sub.feedback };
        return { status: sub.status, badge: 'badge-neutral', icon: <FiClock /> };
    };

    const isOverdue = (dueDate) => new Date(dueDate) < new Date();

    if (loading) return <div className="loading-overlay" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Homework</h1>
                    <p className="page-subtitle">Track assigned homework and submission status</p>
                </div>
                {children.length > 1 && (
                    <select className="input" style={{ width: 'auto', minWidth: 200 }} value={selectedChild?.id || ''} onChange={e => setSelectedChild(children.find(c => c.id === e.target.value))}>
                        {children.map(c => <option key={c.id} value={c.id}>{c.name} — {getClassName(c.class)} {c.section}</option>)}
                    </select>
                )}
            </div>

            {homework.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📚</div>
                    <div className="empty-state-title">No homework assigned</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {homework.sort((a, b) => new Date(b.dueDate || 0) - new Date(a.dueDate || 0)).map(hw => {
                        const sub = getSubmissionStatus(hw.id);
                        const overdue = isOverdue(hw.dueDate) && sub.status === 'Pending';
                        return (
                            <div key={hw.id} className="card" style={{ borderLeft: overdue ? '3px solid var(--color-danger)' : sub.status.startsWith('Graded') ? '3px solid var(--color-success)' : '3px solid var(--color-primary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                                            <FiBook style={{ color: 'var(--color-primary)' }} />
                                            <span style={{ fontSize: '1rem', fontWeight: 600 }}>{hw.title}</span>
                                        </div>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>{hw.description}</p>
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            <span>📅 Due: {formatDate(hw.dueDate)}</span>
                                            {hw.subjectName && <span>📖 {hw.subjectName}</span>}
                                        </div>
                                        {sub.feedback && (
                                            <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'var(--color-info-bg)', fontSize: '0.8125rem' }}>
                                                <strong>Teacher Feedback:</strong> {sub.feedback}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <span className={`badge ${overdue ? 'badge-danger' : sub.badge}`}>
                                            {overdue ? '⚠ Overdue' : sub.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
