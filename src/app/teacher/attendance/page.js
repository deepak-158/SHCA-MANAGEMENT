'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { formatDateInput } from '@/lib/utils';
import { FiSave, FiUsers, FiCheckSquare, FiCalendar, FiDownload } from 'react-icons/fi';
import { getStudents, getAttendance, saveAttendance, getClasses, getHolidays, getAttendanceRecords, getLeaveRequests } from '@/lib/dataService';

export default function TeacherAttendancePage() {
    const toast = useToast();
    const { user } = useAuth();
    const classInfo = user?.classTeacherOf;

    const [selectedDate, setSelectedDate] = useState(formatDateInput(new Date()));
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [saved, setSaved] = useState(true);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [className, setClassName] = useState('');
    const [holidays, setHolidays] = useState([]);
    const [isHolidayOrSunday, setIsHolidayOrSunday] = useState(false);
    const [holidayReason, setHolidayReason] = useState('');

    // Report state
    const [reportMonth, setReportMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (classInfo) {
            fetchHolidays();
        } else {
            setLoading(false);
        }
    }, [classInfo]);

    useEffect(() => {
        if (classInfo && holidays !== null) {
            checkDateAndFetch();
        }
    }, [classInfo, selectedDate, holidays]);

    const fetchHolidays = async () => {
        try {
            const h = await getHolidays();
            setHolidays(h);
        } catch (error) {
            console.error(error);
            setHolidays([]);
        }
    };

    const checkDateAndFetch = () => {
        const dateObj = new Date(selectedDate + 'T00:00:00');
        const dayOfWeek = dateObj.getDay(); // 0 = Sunday

        if (dayOfWeek === 0) {
            setIsHolidayOrSunday(true);
            setHolidayReason('Sunday is a weekly off. No attendance can be marked.');
            setLoading(false);
            return;
        }

        if (holidays.includes(selectedDate)) {
            setIsHolidayOrSunday(true);
            setHolidayReason('This date is marked as a holiday by the admin. No attendance can be marked.');
            setLoading(false);
            return;
        }

        setIsHolidayOrSunday(false);
        setHolidayReason('');
        fetchData();
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [stData, existingAtt, cData, leavesData] = await Promise.all([
                getStudents(),
                getAttendance(classInfo.class, classInfo.section, selectedDate),
                getClasses(),
                getLeaveRequests()
            ]);

            const classDoc = cData.find(c => c.id === classInfo.class);
            setClassName(classDoc?.name || classInfo.class);

            const mySt = stData.filter(s => s.class === classInfo.class && s.section === classInfo.section);
            setStudents(mySt);

            // Build set of studentIds on approved leave for selectedDate
            const onLeaveIds = new Set();
            leavesData.forEach(l => {
                if (l.status === 'Approved' && l.startDate && l.endDate) {
                    if (selectedDate >= l.startDate && selectedDate <= l.endDate) {
                        onLeaveIds.add(l.studentId);
                    }
                }
            });

            const map = {};
            if (existingAtt && existingAtt.records) {
                existingAtt.records.forEach(r => {
                    map[r.studentId] = r.status;
                });
                mySt.forEach(s => {
                    if (!map[s.id]) map[s.id] = onLeaveIds.has(s.id) ? 'Leave' : 'Present';
                });
                setSaved(true);
            } else {
                mySt.forEach(s => { map[s.id] = onLeaveIds.has(s.id) ? 'Leave' : 'Present'; });
                setSaved(false);
            }
            setAttendance(map);
        } catch (error) {
            toast.error("Failed to load attendance data");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const markStatus = (id, status) => { setAttendance({ ...attendance, [id]: status }); setSaved(false); };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const records = students.map(s => ({
                studentId: s.id,
                status: attendance[s.id] || 'Present'
            }));

            await saveAttendance(classInfo.class, classInfo.section, selectedDate, records);
            setSaved(true);
            toast.success('Attendance saved!');
        } catch (error) {
            toast.error("Failed to save attendance");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadReport = async () => {
        if (!classInfo) return;
        setIsDownloading(true);
        try {
            const [year, month] = reportMonth.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();

            // Get all attendance records for this class/section
            const allRecords = await getAttendanceRecords(classInfo.class, classInfo.section);
            // Get students
            const stData = await getStudents();
            const mySt = stData.filter(s => s.class === classInfo.class && s.section === classInfo.section)
                .sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || '', undefined, { numeric: true }));

            if (mySt.length === 0) {
                toast.error('No students found');
                setIsDownloading(false);
                return;
            }

            // Build a map: date -> { studentId -> status }
            const dateMap = {};
            allRecords.forEach(rec => {
                if (rec.date) {
                    const recDate = new Date(rec.date);
                    if (recDate.getFullYear() === year && recDate.getMonth() + 1 === month) {
                        const statusMap = {};
                        (rec.records || []).forEach(r => { statusMap[r.studentId] = r.status; });
                        dateMap[rec.date] = statusMap;
                    }
                }
            });

            // Build working days (exclude Sundays & holidays)
            const workingDays = [];
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dateObj = new Date(dateStr + 'T00:00:00');
                if (dateObj.getDay() === 0) continue; // Skip Sunday
                if (holidays.includes(dateStr)) continue; // Skip holidays
                workingDays.push(dateStr);
            }

            // CSV header
            const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
            let csv = `Attendance Report - ${className} ${classInfo.section} - ${monthName} ${year}\n\n`;
            csv += `Roll No,Student Name,${workingDays.map(d => d.split('-')[2]).join(',')},Present,Absent,Leave,Total Days,%\n`;

            // CSV rows
            mySt.forEach(student => {
                let present = 0, absent = 0, leave = 0;
                const dayStatuses = workingDays.map(dateStr => {
                    const dayData = dateMap[dateStr];
                    if (!dayData) return '-';
                    const status = dayData[student.id];
                    if (!status) return '-';
                    if (status === 'Present') { present++; return 'P'; }
                    if (status === 'Absent') { absent++; return 'A'; }
                    if (status === 'Leave') { leave++; return 'L'; }
                    return '-';
                });
                const total = present + absent + leave;
                const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                csv += `${student.rollNumber || ''},"${student.name}",${dayStatuses.join(',')},${present},${absent},${leave},${total},${pct}%\n`;
            });

            // Summary row
            csv += `\nTotal Working Days: ${workingDays.length}\n`;

            // Download
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Attendance_${className}_${classInfo.section}_${monthName}_${year}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success('Report downloaded!');
        } catch (error) {
            toast.error('Failed to generate report');
            console.error(error);
        } finally {
            setIsDownloading(false);
        }
    };

    const presentCount = Object.values(attendance).filter(s => s === 'Present').length;
    const absentCount = Object.values(attendance).filter(s => s === 'Absent').length;

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    if (!classInfo) return <div className="card"><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">You are not assigned as a class teacher</div></div></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header"><div><h1 className="page-title">Mark Attendance</h1><p className="page-subtitle">Your class: {className} - {classInfo.section}</p></div></div>
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="input-group" style={{ minWidth: 160 }}><label className="input-label">Date</label><input className="input" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div>
                    {!isHolidayOrSunday && (
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8125rem' }}>
                            <span className="badge badge-success">Present: {presentCount}</span>
                            <span className="badge badge-danger">Absent: {absentCount}</span>
                        </div>
                    )}
                </div>
            </div>

            {isHolidayOrSunday ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">🏖️</div>
                        <div className="empty-state-title">{holidayReason}</div>
                        <div className="empty-state-text">Please select a working day to mark attendance.</div>
                    </div>
                </div>
            ) : students.length > 0 ? (
                <div className="card">
                    {students.map((student, idx) => (
                        <div key={student.id} className="attendance-row">
                            <span style={{ width: 30, fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>{idx + 1}</span>
                            <div className="attendance-student"><div>{student.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Roll: {student.rollNumber}</div></div>
                            <div className="attendance-actions">
                                {['Present', 'Absent', 'Leave'].map(status => (
                                    <button key={status} className={`attendance-btn attendance-btn-${status.toLowerCase()} ${attendance[student.id] === status ? 'active' : ''}`} onClick={() => markStatus(student.id, status)} disabled={isSaving}>{status}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saved || isSaving}>
                            <FiSave /> {isSaving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Attendance'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">No students found in this class</div></div></div>
            )}

            {/* Monthly Report Download */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>📊 Download Monthly Attendance Report</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="input-group" style={{ minWidth: 160 }}>
                        <label className="input-label">Month</label>
                        <input className="input" type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} />
                    </div>
                    <button className="btn btn-secondary" onClick={handleDownloadReport} disabled={isDownloading}>
                        <FiDownload /> {isDownloading ? 'Generating...' : 'Download CSV'}
                    </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                    Exports detailed day-wise attendance for all students (excludes Sundays &amp; holidays).
                </p>
            </div>
        </div>
    );
}
