'use client';

import { useState, useEffect } from 'react';
import { DAYS_OF_WEEK, PERIODS } from '@/constants';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiAlertTriangle, FiClock, FiSave } from 'react-icons/fi';
import { getClasses, getSections, getSubjects, getTeachers, getTimetable, setTimetableSlot, deleteTimetableSlot, addSubject, getPeriodTimings, setPeriodTimings } from '@/lib/dataService';

export default function TimetablePage() {
    const toast = useToast();
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editSlot, setEditSlot] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({ day: '', period: 1, subjectId: '', teacherId: '' });
    const [newSubjectName, setNewSubjectName] = useState('');
    const [addingSubject, setAddingSubject] = useState(false);
    const [periodTimings, setPeriodTimingsState] = useState({});
    const [showTimingEditor, setShowTimingEditor] = useState(false);
    const [savingTimings, setSavingTimings] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [cData, sData, subData, tData, ttData, ptData] = await Promise.all([
                getClasses(), getSections(), getSubjects(), getTeachers(), getTimetable(), getPeriodTimings()
            ]);
            setClasses(cData);
            setSections(sData);
            setSubjects(subData);
            setTeachers(tData);
            setTimetable(ttData);
            setPeriodTimingsState(ptData);
        } catch (error) {
            toast.error("Failed to load timetable data");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSections = sections.filter(s => s.classId === selectedClass);
    const sectionId = filteredSections.find(s => s.name === selectedSection)?.id || '';
    const sectionTimetable = timetable.filter(t => t.classId === selectedClass && t.sectionId === sectionId);

    const getSubjectName = (id) => subjects.find(s => s.id === id)?.name || '—';
    const getTeacherName = (id) => teachers.find(t => t.id === id)?.name || '—';

    const getCellData = (day, period) => sectionTimetable.find(t => t.day === day && t.period === period);

    const getPeriodTime = (period) => {
        const t = periodTimings[period];
        return t?.startTime && t?.endTime ? `${t.startTime} - ${t.endTime}` : '';
    };

    const handleOpenAdd = (day, period) => {
        setEditSlot(null);
        setForm({ day, period, subjectId: '', teacherId: '' });
        setNewSubjectName('');
        setAddingSubject(false);
        setShowModal(true);
    };

    const handleOpenEdit = (slot) => {
        setEditSlot(slot);
        setForm({ day: slot.day, period: slot.period, subjectId: slot.subjectId, teacherId: slot.teacherId });
        setNewSubjectName('');
        setAddingSubject(false);
        setShowModal(true);
    };

    const handleSaveTimings = async () => {
        setSavingTimings(true);
        try {
            await setPeriodTimings(periodTimings);
            toast.success('Period timings saved');
        } catch (error) {
            toast.error('Failed to save timings');
            console.error(error);
        } finally {
            setSavingTimings(false);
        }
    };

    const handleAddSubject = async () => {
        const name = newSubjectName.trim();
        if (!name) { toast.error('Enter a subject name'); return; }
        const duplicate = subjects.find(s => s.classId === selectedClass && s.name.toLowerCase() === name.toLowerCase());
        if (duplicate) { toast.error('Subject already exists'); setForm({ ...form, subjectId: duplicate.id }); setAddingSubject(false); return; }
        setAddingSubject(true);
        try {
            const docRef = await addSubject({ name, classId: selectedClass });
            const newId = docRef.id;
            setSubjects([...subjects, { id: newId, name, classId: selectedClass }]);
            setForm({ ...form, subjectId: newId });
            setNewSubjectName('');
            toast.success(`Subject "${name}" added`);
        } catch (error) {
            toast.error('Failed to add subject');
            console.error(error);
        } finally {
            setAddingSubject(false);
        }
    };

    const handleSave = async () => {
        if (!form.subjectId || !form.teacherId) { toast.error('Select subject and teacher'); return; }

        setIsSubmitting(true);
        try {
            // Conflict detection: teacher already assigned in this period
            const conflict = timetable.find(t =>
                t.teacherId === form.teacherId && t.day === form.day && t.period === form.period &&
                t.id !== editSlot?.id
            );
            if (conflict) {
                const cls = classes.find(c => c.id === conflict.classId)?.name;
                toast.error(`Conflict! ${getTeacherName(form.teacherId)} is already teaching in ${cls} during ${form.day} Period ${form.period}`);
                setIsSubmitting(false);
                return;
            }

            const slotData = { ...form, classId: selectedClass, sectionId };

            if (editSlot) {
                await setTimetableSlot(editSlot.id, slotData);
                toast.success('Slot updated');
            } else {
                const newSlotId = `${selectedClass}_${sectionId}_${form.day}_${form.period}`;
                await setTimetableSlot(newSlotId, slotData);
                toast.success('Slot added');
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            toast.error("Failed to save slot");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this slot?")) return;
        try {
            await deleteTimetableSlot(id);
            toast.success('Slot removed');
            fetchData();
        } catch (error) {
            toast.error("Failed to delete slot");
            console.error(error);
        }
    };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Timetable Management</h1>
                    <p className="page-subtitle">Create and manage class timetables with conflict detection</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowTimingEditor(!showTimingEditor)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <FiClock /> {showTimingEditor ? 'Hide' : 'Set'} Period Timings
                    </button>
                </div>
            </div>

            {/* Period Timings Editor */}
            {showTimingEditor && (
                <div className="card" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Period Timings</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>Set start and end time for each period</p>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={handleSaveTimings} disabled={savingTimings} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <FiSave /> {savingTimings ? 'Saving...' : 'Save Timings'}
                        </button>
                    </div>
                    <div className="table-container">
                        <table className="table" style={{ fontSize: '0.8125rem' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: 80 }}>Period</th>
                                    <th style={{ width: 140 }}>Start Time</th>
                                    <th style={{ width: 140 }}>End Time</th>
                                    <th>Preview</th>
                                </tr>
                            </thead>
                            <tbody>
                                {PERIODS.map(p => (
                                    <tr key={p}>
                                        <td><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Period {p}</span></td>
                                        <td><input type="time" className="input" style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }} value={periodTimings[p]?.startTime || ''} onChange={e => setPeriodTimingsState({ ...periodTimings, [p]: { ...periodTimings[p], startTime: e.target.value } })} /></td>
                                        <td><input type="time" className="input" style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }} value={periodTimings[p]?.endTime || ''} onChange={e => setPeriodTimingsState({ ...periodTimings, [p]: { ...periodTimings[p], endTime: e.target.value } })} /></td>
                                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                            {periodTimings[p]?.startTime && periodTimings[p]?.endTime ? `${periodTimings[p].startTime} – ${periodTimings[p].endTime}` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedClass && selectedSection ? (
                <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: 100 }}>Day</th>
                                {PERIODS.map(p => <th key={p} style={{ textAlign: 'center' }}><div>Period {p}</div>{getPeriodTime(p) && <div style={{ fontSize: '0.625rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>{getPeriodTime(p)}</div>}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {DAYS_OF_WEEK.map(day => (
                                <tr key={day}>
                                    <td style={{ fontWeight: 600, background: 'var(--color-bg)' }}>{day}</td>
                                    {PERIODS.map(period => {
                                        const cell = getCellData(day, period);
                                        return (
                                            <td key={period} style={{ textAlign: 'center', padding: '0.5rem', minWidth: 130 }}>
                                                {cell ? (
                                                    <div
                                                        style={{
                                                            padding: '0.5rem', borderRadius: '0.5rem', background: 'var(--color-primary-50)',
                                                            cursor: 'pointer', transition: 'all 0.2s',
                                                        }}
                                                        onClick={() => handleOpenEdit(cell)}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-100)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary-50)'}
                                                    >
                                                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-primary)' }}>{getSubjectName(cell.subjectId)}</div>
                                                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>{getTeacherName(cell.teacherId)}</div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleOpenAdd(day, period)}
                                                        style={{
                                                            width: '100%', padding: '0.75rem', border: '1px dashed var(--color-border)',
                                                            borderRadius: '0.5rem', background: 'none', cursor: 'pointer',
                                                            color: 'var(--color-text-muted)', fontSize: '0.8125rem',
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                                                    >
                                                        <FiPlus />
                                                    </button>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">📅</div><div className="empty-state-title">Select a class and section</div></div></div>
            )}

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editSlot ? 'Edit Timetable Slot' : 'Add Timetable Slot'}
                footer={
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: editSlot ? 'space-between' : 'flex-end' }}>
                        {editSlot && <button className="btn btn-danger btn-sm" onClick={() => { handleDelete(editSlot.id); setShowModal(false); }}>Delete Slot</button>}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>Save</button>
                        </div>
                    </div>
                }>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="input-group" style={{ flex: 1 }}><label className="input-label">Day</label><input className="input" value={form.day} disabled /></div>
                        <div className="input-group" style={{ flex: 1 }}><label className="input-label">Period</label><input className="input" value={`Period ${form.period}`} disabled /></div>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Subject *</label>
                        <select className="input" value={form.subjectId} onChange={e => { if (e.target.value === '__new__') { setForm({ ...form, subjectId: '' }); } else { setForm({ ...form, subjectId: e.target.value }); setNewSubjectName(''); } }}>
                            <option value="">Select Subject</option>
                            {subjects.filter(s => s.classId === selectedClass).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            <option value="__new__">+ Add New Subject</option>
                        </select>
                    </div>
                    {(!form.subjectId || newSubjectName) && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label className="input-label">New Subject Name</label>
                                <input className="input" placeholder="e.g. Mathematics" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubject(); }}} />
                            </div>
                            <button className="btn btn-primary btn-sm" onClick={handleAddSubject} disabled={addingSubject} style={{ height: 38 }}>
                                <FiPlus /> Add
                            </button>
                        </div>
                    )}
                    <div className="input-group"><label className="input-label">Teacher *</label><select className="input" value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })}><option value="">Select Teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({(t.subjectsTaught || []).join(', ')})</option>)}</select></div>
                    <div style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'var(--color-warning-bg)', fontSize: '0.8125rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiAlertTriangle /> Teacher conflicts are automatically detected
                    </div>
                </div>
            </Modal>
        </div>
    );
}
