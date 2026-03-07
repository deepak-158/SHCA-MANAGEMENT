'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { formatDateInput } from '@/lib/utils';
import { FiCheckSquare, FiCalendar, FiSave, FiUsers } from 'react-icons/fi';
import { getClasses, getSections, getStudents, getAttendanceByDate, saveAttendance } from '@/lib/dataService';

export default function AttendancePage() {
    const toast = useToast();
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedDate, setSelectedDate] = useState(formatDateInput(new Date()));
    const [attendance, setAttendance] = useState({});
    const [saved, setSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    // Also fetch attendance whenever class, section, or date changes
    useEffect(() => {
        if (selectedClass && selectedSection && selectedDate) {
            fetchAttendanceRecord();
        }
    }, [selectedClass, selectedSection, selectedDate]);

    const fetchInitialData = async () => {
        try {
            const [cData, sData, stData] = await Promise.all([
                getClasses(), getSections(), getStudents()
            ]);
            setClasses(cData);
            setSections(sData);
            setStudents(stData);
        } catch (error) {
            toast.error("Failed to load initial data");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceRecord = async () => {
        try {
            const records = await getAttendanceByDate(selectedClass, selectedSection, selectedDate);
            const map = {};

            if (records.length > 0) {
                // Load existing
                records[0].records.forEach(r => { map[r.studentId] = r.status; });
            } else {
                // Default to present for all students in this section
                const sectionStudents = students.filter(s => s.class === selectedClass && s.section === selectedSection);
                sectionStudents.forEach(s => { map[s.id] = 'Present'; });
            }
            setAttendance(map);
            setSaved(records.length > 0);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load attendance record");
        }
    };

    const filteredStudents = students.filter(s => s.class === selectedClass && s.section === selectedSection);
    const filteredSections = sections.filter(s => s.classId === selectedClass);

    const handleSelectSection = (sec) => {
        setSelectedSection(sec);
        setSaved(false);
    };

    const markStatus = (studentId, status) => {
        setAttendance({ ...attendance, [studentId]: status });
        setSaved(false);
    };

    const markAllPresent = () => {
        const map = {};
        filteredStudents.forEach(s => { map[s.id] = 'Present'; });
        setAttendance(map);
        setSaved(false);
    };

    const handleSave = async () => {
        if (filteredStudents.length === 0) { toast.error('No students to save'); return; }

        setIsSaving(true);
        try {
            const recordsToSave = Object.keys(attendance).map(studentId => ({
                studentId,
                status: attendance[studentId]
            }));

            await saveAttendance(selectedClass, selectedSection, selectedDate, recordsToSave);
            setSaved(true);
            toast.success('Attendance saved successfully!');
        } catch (error) {
            toast.error("Failed to save attendance");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const presentCount = Object.values(attendance).filter(s => s === 'Present').length;
    const absentCount = Object.values(attendance).filter(s => s === 'Absent').length;
    const leaveCount = Object.values(attendance).filter(s => s === 'Leave').length;

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Attendance Management</h1>
                    <p className="page-subtitle">Mark and view daily attendance</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="input-group" style={{ minWidth: 160 }}>
                        <label className="input-label">Date</label>
                        <input className="input" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
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
                        <select className="input" value={selectedSection} onChange={e => handleSelectSection(e.target.value)} disabled={!selectedClass}>
                            <option value="">Select</option>
                            {sections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                    </div>
                    {selectedSection && (
                        <button className="btn btn-secondary btn-sm" onClick={markAllPresent}>Mark All Present</button>
                    )}
                </div>
            </div>

            {selectedClass && selectedSection && filteredStudents.length > 0 && (
                <>
                    {/* Summary */}
                    <div className="grid-stats" style={{ marginBottom: '1rem' }}>
                        <div className="stat-card">
                            <div className="stat-icon stat-icon-primary"><FiUsers /></div>
                            <div className="stat-info"><div className="stat-value">{filteredStudents.length}</div><div className="stat-label">Total</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}><FiCheckSquare /></div>
                            <div className="stat-info"><div className="stat-value">{presentCount}</div><div className="stat-label">Present</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon stat-icon-danger"><FiCheckSquare /></div>
                            <div className="stat-info"><div className="stat-value">{absentCount}</div><div className="stat-label">Absent</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon stat-icon-accent"><FiCalendar /></div>
                            <div className="stat-info"><div className="stat-value">{leaveCount}</div><div className="stat-label">Leave</div></div>
                        </div>
                    </div>

                    {/* Attendance list */}
                    <div className="card">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {filteredStudents.map((student, idx) => (
                                <div key={student.id} className="attendance-row">
                                    <span style={{ width: 30, fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>{idx + 1}</span>
                                    <div className="attendance-student">
                                        <div>{student.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Roll: {student.rollNumber}</div>
                                    </div>
                                    <div className="attendance-actions">
                                        {['Present', 'Absent', 'Leave'].map(status => (
                                            <button
                                                key={status}
                                                className={`attendance-btn attendance-btn-${status.toLowerCase()} ${attendance[student.id] === status ? 'active' : ''}`}
                                                onClick={() => markStatus(student.id, status)}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saved}>
                                <FiSave /> {saved ? 'Saved ✓' : 'Save Attendance'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {selectedClass && selectedSection && filteredStudents.length === 0 && (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">No students in this section</div></div></div>
            )}

            {(!selectedClass || !selectedSection) && (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">Select class and section</div><div className="empty-state-text">Choose a class and section above to mark attendance</div></div></div>
            )}
        </div>
    );
}
