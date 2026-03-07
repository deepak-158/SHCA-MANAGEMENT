'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAttendanceRecords } from '@/lib/dataService';
import { getCurrentAcademicYear } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

export default function StudentAttendancePage() {
    const { user } = useAuth();
    const toast = useToast();
    const [data, setData] = useState([]);
    const [stats, setStats] = useState({ present: 0, absent: 0, leave: 0, total: 0, pct: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchAttendance();
    }, [user]);

    const fetchAttendance = async () => {
        try {
            const records = await getAttendanceRecords(user.class, user.section, getCurrentAcademicYear());
            const studentId = user.uid || user.id;

            const monthlyData = {};
            let totalPresent = 0;
            let totalAbsent = 0;
            let totalLeave = 0;

            records.forEach(record => {
                const dateObj = new Date(record.date);
                const month = dateObj.toLocaleString('default', { month: 'long' });

                if (!monthlyData[month]) {
                    monthlyData[month] = { month, total: 0, present: 0, absent: 0, leave: 0 };
                }

                // Check if this student is in this attendance record
                if (record.records) {
                    const myRecord = record.records.find(r => r.studentId === studentId);
                    if (myRecord) {
                        monthlyData[month].total++;

                        // Status: P, A, L
                        if (myRecord.status === 'P') {
                            monthlyData[month].present++;
                            totalPresent++;
                        } else if (myRecord.status === 'A') {
                            monthlyData[month].absent++;
                            totalAbsent++;
                        } else if (myRecord.status === 'L') {
                            monthlyData[month].leave++;
                            totalLeave++;
                        }
                    } else {
                        // Assuming present if unmarked (depends on school policy)
                        monthlyData[month].total++;
                        monthlyData[month].present++;
                        totalPresent++;
                    }
                }
            });

            const formattedData = Object.values(monthlyData).map(m => ({
                ...m,
                pct: m.total ? Math.round((m.present / m.total) * 100) : 0
            }));

            // Sort months (simplified)
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

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header"><div><h1 className="page-title">My Attendance</h1><p className="page-subtitle">Your attendance summary</p></div></div>
            <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card"><div className="stat-icon stat-icon-primary" style={{ background: '#ecfdf5', color: '#059669' }}>✓</div><div className="stat-info"><div className="stat-value">{stats.present}</div><div className="stat-label">Days Present</div></div></div>
                <div className="stat-card"><div className="stat-icon stat-icon-danger">✗</div><div className="stat-info"><div className="stat-value">{stats.absent}</div><div className="stat-label">Days Absent</div></div></div>
                <div className="stat-card"><div className="stat-icon stat-icon-accent">📋</div><div className="stat-info"><div className="stat-value">{stats.leave}</div><div className="stat-label">Days Leave</div></div></div>
                <div className="stat-card"><div className="stat-icon stat-icon-primary">%</div><div className="stat-info"><div className="stat-value">{stats.pct}%</div><div className="stat-label">Overall</div></div></div>
            </div>

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
