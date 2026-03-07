'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { formatDateInput } from '@/lib/utils';
import { FiSave, FiUsers, FiCheckSquare, FiCalendar } from 'react-icons/fi';
import { getStudents, getAttendance, saveAttendance, getClasses } from '@/lib/dataService';

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

    useEffect(() => {
        if (classInfo) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [classInfo, selectedDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [stData, existingAtt, cData] = await Promise.all([
                getStudents(),
                getAttendance(classInfo.class, classInfo.section, selectedDate),
                getClasses()
            ]);

            const classDoc = cData.find(c => c.id === classInfo.class);
            setClassName(classDoc?.name || classInfo.class);

            const mySt = stData.filter(s => s.class === classInfo.class && s.section === classInfo.section);
            setStudents(mySt);

            const map = {};
            if (existingAtt && existingAtt.records) {
                // Load existing records
                existingAtt.records.forEach(r => {
                    map[r.studentId] = r.status;
                });
                // Ensure new students get a default 'Present' status if they weren't in the record
                mySt.forEach(s => {
                    if (!map[s.id]) map[s.id] = 'Present';
                });
                setSaved(true);
            } else {
                // No existing record, default to Present
                mySt.forEach(s => { map[s.id] = 'Present'; });
                setSaved(false); // Enable save button for new records
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

    const presentCount = Object.values(attendance).filter(s => s === 'Present').length;
    const absentCount = Object.values(attendance).filter(s => s === 'Absent').length;

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    if (!classInfo) return <div className="card"><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">You are not assigned as a class teacher</div></div></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header"><div><h1 className="page-title">Mark Attendance</h1><p className="page-subtitle">Your class: {className} - {classInfo.section}</p></div></div>
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    <div className="input-group" style={{ minWidth: 160 }}><label className="input-label">Date</label><input className="input" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8125rem' }}>
                        <span className="badge badge-success">Present: {presentCount}</span>
                        <span className="badge badge-danger">Absent: {absentCount}</span>
                    </div>
                </div>
            </div>

            {students.length > 0 ? (
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
        </div>
    );
}
