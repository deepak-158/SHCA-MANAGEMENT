'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { FiUsers, FiCheckSquare, FiCalendar, FiDownload, FiBarChart2 } from 'react-icons/fi';
import { getClasses, getSections, getStudents, getAttendanceRecords, getHolidays } from '@/lib/dataService';

export default function AttendancePage() {
    const toast = useToast();
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [holidays, setHolidays] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
    const [studentStats, setStudentStats] = useState([]);
    const [dailyStats, setDailyStats] = useState([]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedClass && selectedSection && selectedMonth) {
            fetchAnalytics();
        }
    }, [selectedClass, selectedSection, selectedMonth]);

    const fetchInitialData = async () => {
        try {
            const [cData, sData, stData, hData] = await Promise.all([
                getClasses(), getSections(), getStudents(), getHolidays()
            ]);
            setClasses(cData);
            setSections(sData);
            setStudents(stData);
            setHolidays(hData);
        } catch (error) {
            toast.error("Failed to load data");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        setAnalyticsLoading(true);
        try {
            const records = await getAttendanceRecords(selectedClass, selectedSection);

            // Filter by selected month
            const [year, month] = selectedMonth.split('-');
            const monthRecords = records.filter(r => r.date && r.date.startsWith(`${year}-${month}`));
            setAttendanceData(monthRecords);

            const sectionStudents = students.filter(s => s.class === selectedClass && s.section === selectedSection);

            // Build per-student stats
            const statsMap = {};
            sectionStudents.forEach(s => {
                statsMap[s.id] = { id: s.id, name: s.name, rollNumber: s.rollNumber, present: 0, absent: 0, leave: 0, total: 0 };
            });

            // Build daily stats
            const dailyMap = {};

            monthRecords.forEach(rec => {
                const dayPresent = rec.records.filter(r => r.status === 'Present').length;
                const dayAbsent = rec.records.filter(r => r.status === 'Absent').length;
                const dayLeave = rec.records.filter(r => r.status === 'Leave').length;
                dailyMap[rec.date] = { date: rec.date, present: dayPresent, absent: dayAbsent, leave: dayLeave, total: rec.records.length };

                rec.records.forEach(r => {
                    if (statsMap[r.studentId]) {
                        statsMap[r.studentId].total++;
                        if (r.status === 'Present') statsMap[r.studentId].present++;
                        else if (r.status === 'Absent') statsMap[r.studentId].absent++;
                        else if (r.status === 'Leave') statsMap[r.studentId].leave++;
                    }
                });
            });

            setStudentStats(Object.values(statsMap).sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || '', undefined, { numeric: true })));

            // Sort daily by date
            const sortedDaily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
            setDailyStats(sortedDaily);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load analytics");
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const filteredSections = sections.filter(s => s.classId === selectedClass);

    // Overall stats
    const totalPresent = studentStats.reduce((sum, s) => sum + s.present, 0);
    const totalAbsent = studentStats.reduce((sum, s) => sum + s.absent, 0);
    const totalLeave = studentStats.reduce((sum, s) => sum + s.leave, 0);
    const totalRecords = studentStats.reduce((sum, s) => sum + s.total, 0);
    const overallPercentage = totalRecords > 0 ? ((totalPresent / totalRecords) * 100).toFixed(1) : '0.0';
    const workingDays = dailyStats.length;

    const getClassName = () => classes.find(c => c.id === selectedClass)?.name || '';

    const downloadCSV = () => {
        if (studentStats.length === 0) { toast.error('No data to download'); return; }
        const [year, month] = selectedMonth.split('-');
        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

        let csv = `Attendance Report - ${getClassName()} ${selectedSection} - ${monthName} ${year}\n\n`;

        // Student summary
        csv += 'Roll No,Student Name,Present,Absent,Leave,Total Days,Attendance %\n';
        studentStats.forEach(s => {
            const pct = s.total > 0 ? ((s.present / s.total) * 100).toFixed(1) : '0.0';
            csv += `${s.rollNumber || ''},${s.name},${s.present},${s.absent},${s.leave},${s.total},${pct}%\n`;
        });

        csv += `\nDaily Summary\nDate,Present,Absent,Leave,Total,Attendance %\n`;
        dailyStats.forEach(d => {
            const pct = d.total > 0 ? ((d.present / d.total) * 100).toFixed(1) : '0.0';
            csv += `${d.date},${d.present},${d.absent},${d.leave},${d.total},${pct}%\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${getClassName()}_${selectedSection}_${selectedMonth}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report downloaded!');
    };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Attendance Analytics</h1>
                    <p className="page-subtitle">View attendance reports and statistics</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="input-group" style={{ minWidth: 160 }}>
                        <label className="input-label">Month</label>
                        <input className="input" type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
                    </div>
                    <div className="input-group" style={{ minWidth: 160 }}>
                        <label className="input-label">Class</label>
                        <select className="input" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }}>
                            <option value="">Select Class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="input-group" style={{ minWidth: 120 }}>
                        <label className="input-label">Section</label>
                        <select className="input" value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={!selectedClass}>
                            <option value="">Select</option>
                            {filteredSections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                    </div>
                    {selectedClass && selectedSection && studentStats.length > 0 && (
                        <button className="btn btn-secondary btn-sm" onClick={downloadCSV}>
                            <FiDownload /> Download CSV
                        </button>
                    )}
                </div>
            </div>

            {analyticsLoading && (
                <div className="card"><div className="empty-state"><div className="empty-state-title">Loading analytics...</div></div></div>
            )}

            {selectedClass && selectedSection && !analyticsLoading && (
                <>
                    {/* Overview Stats */}
                    <div className="grid-stats" style={{ marginBottom: '1rem' }}>
                        <div className="stat-card">
                            <div className="stat-icon stat-icon-primary"><FiBarChart2 /></div>
                            <div className="stat-info"><div className="stat-value">{overallPercentage}%</div><div className="stat-label">Attendance Rate</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}><FiCheckSquare /></div>
                            <div className="stat-info"><div className="stat-value">{totalPresent}</div><div className="stat-label">Total Present</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon stat-icon-danger"><FiUsers /></div>
                            <div className="stat-info"><div className="stat-value">{totalAbsent}</div><div className="stat-label">Total Absent</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon stat-icon-accent"><FiCalendar /></div>
                            <div className="stat-info"><div className="stat-value">{workingDays}</div><div className="stat-label">Working Days</div></div>
                        </div>
                    </div>

                    {studentStats.length > 0 ? (
                        <>
                            {/* Daily Attendance Bar */}
                            {dailyStats.length > 0 && (
                                <div className="card" style={{ marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text)' }}>Daily Attendance Overview</h3>
                                    <div style={{ overflowX: 'auto' }}>
                                        <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', minHeight: 120, paddingBottom: '1.5rem', minWidth: dailyStats.length * 28 }}>
                                            {dailyStats.map(d => {
                                                const pct = d.total > 0 ? (d.present / d.total) * 100 : 0;
                                                const day = new Date(d.date + 'T00:00:00').getDate();
                                                const barColor = pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626';
                                                return (
                                                    <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 1 24px', minWidth: 24 }}>
                                                        <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>{Math.round(pct)}%</div>
                                                        <div style={{ width: '100%', maxWidth: 22, height: Math.max(pct * 0.8, 4), backgroundColor: barColor, borderRadius: 3 }} title={`${d.date}: ${Math.round(pct)}% (${d.present}P / ${d.absent}A / ${d.leave}L)`} />
                                                        <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{day}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#059669', marginRight: 4 }}></span>{'≥'}80%</span>
                                            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#d97706', marginRight: 4 }}></span>60-79%</span>
                                            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#dc2626', marginRight: 4 }}></span>{'<'}60%</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Student-wise Table */}
                            <div className="card">
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text)' }}>Student-wise Attendance</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Student</th>
                                                <th>Roll No</th>
                                                <th style={{ textAlign: 'center' }}>Present</th>
                                                <th style={{ textAlign: 'center' }}>Absent</th>
                                                <th style={{ textAlign: 'center' }}>Leave</th>
                                                <th style={{ textAlign: 'center' }}>Total</th>
                                                <th style={{ textAlign: 'center' }}>Attendance %</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentStats.map((s, idx) => {
                                                const pct = s.total > 0 ? ((s.present / s.total) * 100).toFixed(1) : '0.0';
                                                const pctNum = parseFloat(pct);
                                                const pctColor = pctNum >= 80 ? '#059669' : pctNum >= 60 ? '#d97706' : '#dc2626';
                                                return (
                                                    <tr key={s.id}>
                                                        <td>{idx + 1}</td>
                                                        <td>{s.name}</td>
                                                        <td>{s.rollNumber || '-'}</td>
                                                        <td style={{ textAlign: 'center' }}><span style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: 12, fontSize: '0.8125rem', fontWeight: 600 }}>{s.present}</span></td>
                                                        <td style={{ textAlign: 'center' }}><span style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 12, fontSize: '0.8125rem', fontWeight: 600 }}>{s.absent}</span></td>
                                                        <td style={{ textAlign: 'center' }}><span style={{ background: '#fffbeb', color: '#d97706', padding: '2px 8px', borderRadius: 12, fontSize: '0.8125rem', fontWeight: 600 }}>{s.leave}</span></td>
                                                        <td style={{ textAlign: 'center' }}>{s.total}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                                <div style={{ width: 50, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                                                                    <div style={{ width: `${pct}%`, height: '100%', background: pctColor, borderRadius: 3 }} />
                                                                </div>
                                                                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: pctColor }}>{pct}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Daily Breakdown Table */}
                            {dailyStats.length > 0 && (
                                <div className="card" style={{ marginTop: '1rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text)' }}>Daily Breakdown</h3>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Day</th>
                                                    <th style={{ textAlign: 'center' }}>Present</th>
                                                    <th style={{ textAlign: 'center' }}>Absent</th>
                                                    <th style={{ textAlign: 'center' }}>Leave</th>
                                                    <th style={{ textAlign: 'center' }}>Attendance %</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dailyStats.map(d => {
                                                    const pct = d.total > 0 ? ((d.present / d.total) * 100).toFixed(1) : '0.0';
                                                    const dateObj = new Date(d.date + 'T00:00:00');
                                                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                                    const displayDate = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                                                    return (
                                                        <tr key={d.date}>
                                                            <td>{displayDate}</td>
                                                            <td>{dayName}</td>
                                                            <td style={{ textAlign: 'center' }}><span style={{ color: '#059669', fontWeight: 600 }}>{d.present}</span></td>
                                                            <td style={{ textAlign: 'center' }}><span style={{ color: '#dc2626', fontWeight: 600 }}>{d.absent}</span></td>
                                                            <td style={{ textAlign: 'center' }}><span style={{ color: '#d97706', fontWeight: 600 }}>{d.leave}</span></td>
                                                            <td style={{ textAlign: 'center' }}><span style={{ fontWeight: 600 }}>{pct}%</span></td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-state-icon">📊</div>
                                <div className="empty-state-title">No attendance data</div>
                                <div className="empty-state-text">No attendance records found for this class/section in the selected month.</div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {(!selectedClass || !selectedSection) && (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">📊</div>
                        <div className="empty-state-title">Select class and section</div>
                        <div className="empty-state-text">Choose a class and section above to view attendance analytics</div>
                    </div>
                </div>
            )}
        </div>
    );
}
