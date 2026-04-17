'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getChildrenByParentEmail, getChildAttendanceSummary } from '@/lib/parentService';
import { getClasses } from '@/lib/dataService';
import { FiCheckSquare } from 'react-icons/fi';

export default function ParentAttendancePage() {
    const { user } = useAuth();
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [classes, setClasses] = useState([]);
    const [attendance, setAttendance] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [kids, cls] = await Promise.all([getChildrenByParentEmail(user?.email), getClasses()]);
                setChildren(kids);
                setClasses(cls);
                if (kids.length > 0) setSelectedChild(kids[0]);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (user?.email) fetch();
    }, [user]);

    useEffect(() => {
        if (!selectedChild) return;
        const fetchAttendance = async () => {
            try {
                const data = await getChildAttendanceSummary(selectedChild.id, selectedChild.class, selectedChild.section);
                setAttendance(data);
            } catch (e) { console.error(e); }
        };
        fetchAttendance();
    }, [selectedChild]);

    const getClassName = (id) => classes.find(c => c.id === id)?.name || id;

    if (loading) return <div className="loading-overlay" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Attendance</h1>
                    <p className="page-subtitle">Track your child&apos;s attendance record</p>
                </div>
                {children.length > 1 && (
                    <select className="input" style={{ width: 'auto', minWidth: 200 }} value={selectedChild?.id || ''} onChange={e => setSelectedChild(children.find(c => c.id === e.target.value))}>
                        {children.map(c => <option key={c.id} value={c.id}>{c.name} — {getClassName(c.class)} {c.section}</option>)}
                    </select>
                )}
            </div>

            {attendance && (
                <>
                    {/* Summary Cards */}
                    <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
                        <div className="stat-card">
                            <div className="stat-icon stat-icon-primary"><FiCheckSquare /></div>
                            <div className="stat-info">
                                <div className="stat-value">{attendance.percentage}%</div>
                                <div className="stat-label">Overall Attendance</div>
                            </div>
                        </div>
                        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-success)' }}>
                            <div className="stat-info">
                                <div className="stat-value" style={{ color: 'var(--color-success)' }}>{attendance.present}</div>
                                <div className="stat-label">Days Present</div>
                            </div>
                        </div>
                        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-danger)' }}>
                            <div className="stat-info">
                                <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{attendance.absent}</div>
                                <div className="stat-label">Days Absent</div>
                            </div>
                        </div>
                        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-warning)' }}>
                            <div className="stat-info">
                                <div className="stat-value" style={{ color: 'var(--color-accent)' }}>{attendance.leave}</div>
                                <div className="stat-label">On Leave</div>
                            </div>
                        </div>
                    </div>

                    {/* Daily Records */}
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">Daily Records</span>
                            <span className="badge badge-neutral">{attendance.total} Days</span>
                        </div>
                        {attendance.dailyRecords.length === 0 ? (
                            <div className="empty-state"><p className="empty-state-text">No attendance records yet</p></div>
                        ) : (
                            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                                <table className="table">
                                    <thead><tr><th>Date</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {attendance.dailyRecords.map((rec, i) => (
                                            <tr key={i}>
                                                <td>{new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' })}</td>
                                                <td>
                                                    <span className={`badge ${rec.status === 'Present' ? 'badge-success' : rec.status === 'Absent' ? 'badge-danger' : 'badge-warning'}`}>
                                                        {rec.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
