'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAttendanceRecords, getHolidays } from '@/lib/dataService';
import { useToast } from '@/components/ui/Toast';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function StudentAttendancePage() {
    const { user } = useAuth();
    const toast = useToast();
    const [data, setData] = useState([]);
    const [dailyMap, setDailyMap] = useState({}); // date string -> status
    const [holidays, setHolidays] = useState([]);
    const [stats, setStats] = useState({ present: 0, absent: 0, leave: 0, total: 0, pct: 0 });
    const [loading, setLoading] = useState(true);
    const [calMonth, setCalMonth] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });

    useEffect(() => {
        if (user) fetchAttendance();
    }, [user]);

    const fetchAttendance = async () => {
        try {
            const [records, hData] = await Promise.all([
                getAttendanceRecords(user.class, user.section),
                getHolidays()
            ]);
            setHolidays(hData);
            const studentId = user.studentId || user.uid || user.id;

            const monthlyData = {};
            const dayMap = {};
            let totalPresent = 0;
            let totalAbsent = 0;
            let totalLeave = 0;

            records.forEach(record => {
                if (!record.records || !record.date) return;
                const dateObj = new Date(record.date);
                const month = dateObj.toLocaleString('default', { month: 'long' });

                if (!monthlyData[month]) {
                    monthlyData[month] = { month, total: 0, present: 0, absent: 0, leave: 0 };
                }

                const myRecord = record.records.find(r => r.studentId === studentId);
                if (myRecord) {
                    const status = myRecord.status;
                    monthlyData[month].total++;
                    dayMap[record.date] = status;

                    if (status === 'Present' || status === 'P') {
                        monthlyData[month].present++;
                        totalPresent++;
                    } else if (status === 'Absent' || status === 'A') {
                        monthlyData[month].absent++;
                        totalAbsent++;
                    } else if (status === 'Leave' || status === 'L') {
                        monthlyData[month].leave++;
                        totalLeave++;
                    }
                }
            });

            setDailyMap(dayMap);

            const formattedData = Object.values(monthlyData).map(m => ({
                ...m,
                pct: m.total ? Math.round((m.present / m.total) * 100) : 0
            }));

            const monthOrder = { 'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6, 'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12 };
            formattedData.sort((a, b) => monthOrder[a.month] - monthOrder[b.month]);

            setData(formattedData);

            const total = totalPresent + totalAbsent + totalLeave;
            setStats({
                present: totalPresent,
                absent: totalAbsent,
                leave: totalLeave,
                total,
                pct: total ? Math.round((totalPresent / total) * 100) : 0
            });

        } catch (error) {
            toast.error("Failed to load attendance");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Calendar helpers
    const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
    const firstDayOfWeek = new Date(calMonth.year, calMonth.month, 1).getDay(); // 0=Sun
    const monthLabel = new Date(calMonth.year, calMonth.month).toLocaleString('default', { month: 'long', year: 'numeric' });

    const prevMonth = () => {
        setCalMonth(prev => {
            const m = prev.month - 1;
            return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m };
        });
    };
    const nextMonth = () => {
        setCalMonth(prev => {
            const m = prev.month + 1;
            return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m };
        });
    };

    const getDateStr = (day) => {
        return `${calMonth.year}-${String(calMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const getDayStatus = (day) => {
        const dateStr = getDateStr(day);
        const dateObj = new Date(dateStr + 'T00:00:00');
        if (dateObj.getDay() === 0) return 'sunday';
        if (holidays.includes(dateStr)) return 'holiday';
        const status = dailyMap[dateStr];
        if (!status) return null;
        if (status === 'Present' || status === 'P') return 'present';
        if (status === 'Absent' || status === 'A') return 'absent';
        if (status === 'Leave' || status === 'L') return 'leave';
        return null;
    };

    const statusColors = {
        present: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
        absent: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
        leave: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
        sunday: { bg: '#f1f5f9', color: '#94a3b8', border: '#e2e8f0' },
        holiday: { bg: '#fef2f2', color: '#94a3b8', border: '#e2e8f0' },
    };

    const statusLabel = { present: 'P', absent: 'A', leave: 'L', sunday: 'S', holiday: 'H' };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    // Build calendar grid
    const calendarCells = [];
    // Empty cells before first day
    for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

    return (
        <div className="animate-fade-in">
            <div className="page-header"><div><h1 className="page-title">My Attendance</h1><p className="page-subtitle">Your attendance summary</p></div></div>
            <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card"><div className="stat-icon stat-icon-primary" style={{ background: '#ecfdf5', color: '#059669' }}>✓</div><div className="stat-info"><div className="stat-value">{stats.present}</div><div className="stat-label">Days Present</div></div></div>
                <div className="stat-card"><div className="stat-icon stat-icon-danger">✗</div><div className="stat-info"><div className="stat-value">{stats.absent}</div><div className="stat-label">Days Absent</div></div></div>
                <div className="stat-card"><div className="stat-icon stat-icon-accent">📋</div><div className="stat-info"><div className="stat-value">{stats.leave}</div><div className="stat-label">Days Leave</div></div></div>
                <div className="stat-card"><div className="stat-icon stat-icon-primary">%</div><div className="stat-info"><div className="stat-value">{stats.pct}%</div><div className="stat-label">Overall</div></div></div>
            </div>

            {/* Calendar View */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={prevMonth}><FiChevronLeft /></button>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{monthLabel}</h3>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={nextMonth}><FiChevronRight /></button>
                </div>

                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '4px' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', padding: '0.25rem 0' }}>{d}</div>
                    ))}
                </div>

                {/* Calendar cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {calendarCells.map((day, idx) => {
                        if (day === null) return <div key={`e-${idx}`} />;
                        const status = getDayStatus(day);
                        const sc = status ? statusColors[status] : null;
                        const today = new Date();
                        const isToday = day === today.getDate() && calMonth.month === today.getMonth() && calMonth.year === today.getFullYear();
                        return (
                            <div key={day} style={{
                                position: 'relative',
                                aspectRatio: '1',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '0.5rem',
                                border: isToday ? '2px solid var(--color-primary)' : sc ? `1px solid ${sc.border}` : '1px solid var(--color-border)',
                                background: sc ? sc.bg : 'transparent',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                color: sc ? sc.color : 'var(--color-text)',
                                cursor: 'default',
                                minHeight: 40,
                            }}>
                                <span>{day}</span>
                                {status && (
                                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, lineHeight: 1, marginTop: '1px' }}>
                                        {statusLabel[status]}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                    {[
                        { label: 'Present', color: '#059669', bg: '#ecfdf5' },
                        { label: 'Absent', color: '#dc2626', bg: '#fef2f2' },
                        { label: 'Leave', color: '#d97706', bg: '#fffbeb' },
                        { label: 'Sunday/Holiday', color: '#94a3b8', bg: '#f1f5f9' },
                    ].map(l => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}>
                            <span style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: `1px solid ${l.color}` }} />
                            <span style={{ color: 'var(--color-text-secondary)' }}>{l.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Monthly summary table */}
            <div className="table-container">
                {data.length > 0 ? (
                    <table className="table">
                        <thead><tr><th>Month</th><th>Total Days</th><th>Present</th><th>Absent</th><th>Leave</th><th>%</th></tr></thead>
                        <tbody>
                            {data.map(row => (
                                <tr key={row.month}>
                                    <td style={{ fontWeight: 600 }}>{row.month}</td>
                                    <td>{row.total}</td>
                                    <td><span className="badge badge-success">{row.present}</span></td>
                                    <td><span className="badge badge-danger">{row.absent}</span></td>
                                    <td><span className="badge badge-warning">{row.leave}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden', maxWidth: 80 }}>
                                                <div style={{ height: '100%', width: `${row.pct}%`, borderRadius: 3, background: row.pct > 85 ? 'var(--color-success)' : 'var(--color-warning)' }} />
                                            </div>
                                            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{row.pct}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state" style={{ padding: '2rem' }}><div className="empty-state-title">No attendance records found</div></div>
                )}
            </div>
        </div>
    );
}
