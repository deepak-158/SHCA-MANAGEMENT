'use client';

import { useState, useEffect } from 'react';
import { FiUsers, FiBookOpen, FiTrendingUp, FiBarChart2 } from 'react-icons/fi';
import { getStudents, getTeachers, getClasses, getAttendanceRecords, getResults } from '@/lib/dataService';

export default function ReportsPage() {
    const [studentsData, setStudentsData] = useState([]);
    const [teachersData, setTeachersData] = useState([]);
    const [classesData, setClassesData] = useState([]);
    const [classAttendance, setClassAttendance] = useState([]);
    const [topStudents, setTopStudents] = useState([]);
    const [avgAttendance, setAvgAttendance] = useState(0);
    const [avgPerformance, setAvgPerformance] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [students, teachers, classes, results] = await Promise.all([
                getStudents(), getTeachers(), getClasses(), getResults()
            ]);
            setStudentsData(students);
            setTeachersData(teachers);
            setClassesData(classes);

            // Build a map of student results with their best percentage
            const studentResultMap = {};
            results.forEach(r => {
                if (!studentResultMap[r.studentId] || r.percentage > studentResultMap[r.studentId].percentage) {
                    studentResultMap[r.studentId] = r;
                }
            });

            // Top performers from real results
            const studentsWithResults = students
                .filter(s => studentResultMap[s.id])
                .map(s => {
                    const cls = classes.find(c => c.id === s.class);
                    return { name: s.name, class: cls ? `${cls.name}-${s.section || ''}` : s.class, percentage: studentResultMap[s.id].percentage };
                })
                .sort((a, b) => b.percentage - a.percentage)
                .slice(0, 5);
            setTopStudents(studentsWithResults);

            // Compute average performance from results
            if (results.length > 0) {
                const totalPct = results.reduce((sum, r) => sum + (r.percentage || 0), 0);
                setAvgPerformance(Math.round(totalPct / results.length));
            }

            // Compute class-wise attendance from real records
            let totalAttPct = 0;
            let classesWithAtt = 0;
            const attendance = await Promise.all(classes.slice(0, 8).map(async (cls) => {
                const clsStudents = students.filter(s => s.class === cls.id);
                if (clsStudents.length === 0) return { class: cls.name, students: 0, attendance: 0 };
                try {
                    const sections = [...new Set(clsStudents.map(s => s.section).filter(Boolean))];
                    let totalPresent = 0;
                    let totalRecords = 0;
                    for (const sec of sections) {
                        const records = await getAttendanceRecords(cls.id, sec);
                        records.forEach(rec => {
                            if (rec.records && Array.isArray(rec.records)) {
                                rec.records.forEach(r => {
                                    totalRecords++;
                                    if (r.status === 'Present') totalPresent++;
                                });
                            }
                        });
                    }
                    const avgPct = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
                    if (avgPct > 0) { totalAttPct += avgPct; classesWithAtt++; }
                    return { class: cls.name, students: clsStudents.length, attendance: avgPct };
                } catch { return { class: cls.name, students: clsStudents.length, attendance: 0 }; }
            }));
            setClassAttendance(attendance);
            if (classesWithAtt > 0) setAvgAttendance(Math.round(totalAttPct / classesWithAtt));
        } catch (error) {
            console.error("Reports fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div><h1 className="page-title">Reports & Analytics</h1><p className="page-subtitle">School-wide performance and attendance reports</p></div>
            </div>

            <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card"><div className="stat-icon stat-icon-primary"><FiBookOpen /></div><div className="stat-info"><div className="stat-value">{studentsData.length}</div><div className="stat-label">Total Students</div></div></div>
                <div className="stat-card"><div className="stat-icon stat-icon-secondary"><FiUsers /></div><div className="stat-info"><div className="stat-value">{teachersData.length}</div><div className="stat-label">Total Teachers</div></div></div>
                <div className="stat-card"><div className="stat-icon stat-icon-accent"><FiTrendingUp /></div><div className="stat-info"><div className="stat-value">{avgAttendance}%</div><div className="stat-label">Avg. Attendance</div></div></div>
                <div className="stat-card"><div className="stat-icon stat-icon-danger"><FiBarChart2 /></div><div className="stat-info"><div className="stat-value">{avgPerformance}%</div><div className="stat-label">Avg. Performance</div></div></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Attendance Report */}
                <div className="card">
                    <div className="card-header"><span className="card-title">📊 Class-wise Attendance</span></div>
                    <div className="table-container" style={{ border: 'none' }}>
                        <table className="table">
                            <thead><tr><th>Class</th><th>Students</th><th>Avg Attendance</th></tr></thead>
                            <tbody>
                                {classAttendance.map(row => (
                                    <tr key={row.class}>
                                        <td style={{ fontWeight: 600 }}>{row.class}</td>
                                        <td>{row.students}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--color-border)', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${row.attendance}%`, borderRadius: 4, background: row.attendance > 85 ? 'var(--color-success)' : row.attendance > 70 ? 'var(--color-warning)' : 'var(--color-danger)' }} />
                                                </div>
                                                <span style={{ fontSize: '0.8125rem', fontWeight: 600, minWidth: 36 }}>{row.attendance}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Students */}
                <div className="card">
                    <div className="card-header"><span className="card-title">🏆 Top Performers</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {topStudents.map((s, i) => (
                            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', borderRadius: '0.5rem', background: i === 0 ? 'var(--color-warning-bg)' : 'transparent' }}>
                                <span style={{ width: 28, height: 28, borderRadius: '50%', background: i < 3 ? ['#f59e0b', '#94a3b8', '#cd7f32'][i] : 'var(--color-border)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                                    {i + 1}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{s.class}</div>
                                </div>
                                <span className="badge badge-success">{s.percentage}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
