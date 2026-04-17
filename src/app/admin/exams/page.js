'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { EXAM_TYPES } from '@/constants';
import { formatDate, getCurrentAcademicYear } from '@/lib/utils';
import { FiPlus, FiEdit2, FiTrash2, FiCalendar, FiUpload, FiCheck, FiDownload } from 'react-icons/fi';
import { getClasses, getSubjects, getExams, addExam, updateExam, deleteExam } from '@/lib/dataService';
import { parseCSV, generateCSV, downloadCSVFile } from '@/lib/csvParser';

export default function ExamsPage() {
    const toast = useToast();
    const [exams, setExams] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingExam, setEditingExam] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({ name: '', type: 'Unit Test', classIds: [], startDate: '', endDate: '', maxMarks: 100 });

    // Schedule state
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleExam, setScheduleExam] = useState(null);
    const [selectedScheduleClass, setSelectedScheduleClass] = useState('');
    const [scheduleRows, setScheduleRows] = useState([]);
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);

    // CSV import state
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [csvPreview, setCsvPreview] = useState([]);
    const [csvErrors, setCsvErrors] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [eData, cData, sData] = await Promise.all([getExams(), getClasses(), getSubjects()]);
            setExams(eData);
            setClasses(cData);
            setSubjects(sData);
        } catch (error) {
            toast.error("Failed to load data");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleClass = (classId) => {
        setForm(prev => ({
            ...prev,
            classIds: prev.classIds.includes(classId) ? prev.classIds.filter(c => c !== classId) : [...prev.classIds, classId],
        }));
    };

    const handleSave = async () => {
        if (!form.name || !form.startDate || !form.endDate || form.classIds.length === 0 || !form.maxMarks) {
            toast.error('Fill all required fields and select at least one class'); return;
        }
        setIsSubmitting(true);
        try {
            if (editingExam) {
                await updateExam(editingExam.id, form);
                toast.success('Exam updated');
            } else {
                await addExam({ ...form, academicYear: getCurrentAcademicYear() });
                toast.success('Exam created');
            }
            setShowModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error("Failed to save exam");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => { setForm({ name: '', type: 'Unit Test', classIds: [], startDate: '', endDate: '', maxMarks: 100 }); setEditingExam(null); };

    const handleDelete = async (id) => {
        if (!confirm("Delete this exam?")) return;
        try {
            await deleteExam(id);
            toast.success('Exam deleted');
            fetchData();
        } catch (error) {
            toast.error("Failed to delete exam");
            console.error(error);
        }
    };

    // --- Schedule functions ---
    const openScheduleModal = (exam) => {
        setScheduleExam(exam);
        const firstClassId = exam.classIds?.[0] || '';
        setSelectedScheduleClass(firstClassId);
        loadScheduleForClass(exam, firstClassId);
        setShowScheduleModal(true);
    };

    const loadScheduleForClass = (exam, classId) => {
        const existing = exam.schedule?.[classId] || [];
        if (existing.length > 0) {
            setScheduleRows(existing.map(r => ({ ...r })));
        } else {
            // Pre-fill with subjects for this class
            const classSubjects = subjects.filter(s => s.classId === classId);
            setScheduleRows(classSubjects.map(s => ({ subjectId: s.id, date: '', startTime: '', endTime: '' })));
        }
    };

    const handleScheduleClassChange = (classId) => {
        setSelectedScheduleClass(classId);
        loadScheduleForClass(scheduleExam, classId);
    };

    const handleScheduleRowChange = (index, field, value) => {
        setScheduleRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
    };

    const addScheduleRow = () => {
        setScheduleRows(prev => [...prev, { subjectId: '', date: '', startTime: '', endTime: '' }]);
    };

    const removeScheduleRow = (index) => {
        setScheduleRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveSchedule = async () => {
        const valid = scheduleRows.every(r => r.subjectId && r.date && r.startTime && r.endTime);
        if (!valid && scheduleRows.length > 0) {
            toast.error('Fill all fields for each row or remove empty rows'); return;
        }
        setIsSavingSchedule(true);
        try {
            const updatedSchedule = { ...(scheduleExam.schedule || {}), [selectedScheduleClass]: scheduleRows };
            await updateExam(scheduleExam.id, { schedule: updatedSchedule });
            setScheduleExam(prev => ({ ...prev, schedule: updatedSchedule }));
            setExams(prev => prev.map(e => e.id === scheduleExam.id ? { ...e, schedule: updatedSchedule } : e));
            toast.success('Schedule saved for ' + (classes.find(c => c.id === selectedScheduleClass)?.name || 'class'));
        } catch (error) {
            toast.error("Failed to save schedule");
            console.error(error);
        } finally {
            setIsSavingSchedule(false);
        }
    };

    // --- CSV Bulk Import ---
    const openBulkModal = (exam) => {
        setScheduleExam(exam);
        setCsvPreview([]);
        setCsvErrors([]);
        setShowBulkModal(true);
    };

    const downloadCsvTemplate = () => {
        const examClasses = (scheduleExam?.classIds || []).map(cid => getClassName(cid));
        const headers = ['Class', 'Subject', 'Date (YYYY-MM-DD)', 'Start Time (HH:MM)', 'End Time (HH:MM)'];
        const sampleRows = examClasses.slice(0, 2).map(cn => [cn, 'Mathematics', '2026-03-15', '09:00', '11:00']);
        if (sampleRows.length === 0) sampleRows.push(['Class 1', 'Mathematics', '2026-03-15', '09:00', '11:00']);
        const csv = generateCSV(headers, sampleRows);
        downloadCSVFile(csv, `schedule_template_${scheduleExam?.name || 'exam'}.csv`);
    };

    const handleCsvUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target.result;
            parseCsv(text);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const parseCsv = (text) => {
        const { rows: parsedRows } = parseCSV(text);
        if (parsedRows.length === 0) { toast.error('CSV must have a header row and at least one data row'); return; }

        const rows = [];
        const errors = [];
        // Normalise header keys — strip spaces and special chars
        // parseCSV already lowercases and strips spaces from headers
        // Expected headers (after normalisation): 'class', 'subject', 'date(yyyy-mm-dd)', 'starttime(hh:mm)', 'endtime(hh:mm)'
        // We'll read positionally from the raw values for robustness
        const rawLines = text.split(/\r?\n/).filter(l => l.trim());

        for (let i = 0; i < parsedRows.length; i++) {
            const row = parsedRows[i];
            // Support both normalised key and positional fallback
            const className   = row['class'] || '';
            const subjectName = row['subject'] || '';
            const date        = (row['date(yyyy-mm-dd)'] || row['date'] || '').trim();
            const startTime   = (row['starttime(hh:mm)'] || row['starttime'] || row['start time (hh:mm)'] || row['start'] || '').trim();
            const endTime     = (row['endtime(hh:mm)'] || row['endtime']   || row['end time (hh:mm)']   || row['end']   || '').trim();

            if (!className || !subjectName) { errors.push(`Row ${i + 1}: Class and Subject are required`); continue; }

            const classDoc = classes.find(c => c.name.toLowerCase() === className.toLowerCase());
            if (!classDoc) { errors.push(`Row ${i + 1}: class "${className}" not found`); continue; }
            if (!(scheduleExam?.classIds || []).includes(classDoc.id)) { errors.push(`Row ${i + 1}: class "${className}" not in this exam`); continue; }

            const classSubjects = subjects.filter(s => s.classId === classDoc.id);
            const subjectDoc = classSubjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase());
            if (!subjectDoc) { errors.push(`Row ${i + 1}: subject "${subjectName}" not found for ${className}`); continue; }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(date))      { errors.push(`Row ${i + 1}: invalid date "${date}", use YYYY-MM-DD`); continue; }
            if (!/^\d{2}:\d{2}$/.test(startTime))        { errors.push(`Row ${i + 1}: invalid start time "${startTime}", use HH:MM`); continue; }
            if (!/^\d{2}:\d{2}$/.test(endTime))          { errors.push(`Row ${i + 1}: invalid end time "${endTime}", use HH:MM`); continue; }

            rows.push({ classId: classDoc.id, className: classDoc.name, subjectId: subjectDoc.id, subjectName: subjectDoc.name, date, startTime, endTime });
        }

        setCsvPreview(rows);
        setCsvErrors(errors);
        if (rows.length > 0) toast.success(`Parsed ${rows.length} valid rows`);
        if (errors.length > 0) toast.error(`${errors.length} error(s) found — check below`);
    };

    const handleBulkSave = async () => {
        if (csvPreview.length === 0) { toast.error('No valid rows to import'); return; }
        setIsSavingSchedule(true);
        try {
            const updatedSchedule = { ...(scheduleExam.schedule || {}) };
            // Group rows by classId
            for (const row of csvPreview) {
                if (!updatedSchedule[row.classId]) updatedSchedule[row.classId] = [];
                updatedSchedule[row.classId].push({ subjectId: row.subjectId, date: row.date, startTime: row.startTime, endTime: row.endTime });
            }
            await updateExam(scheduleExam.id, { schedule: updatedSchedule });
            setExams(prev => prev.map(e => e.id === scheduleExam.id ? { ...e, schedule: updatedSchedule } : e));
            const classCount = new Set(csvPreview.map(r => r.classId)).size;
            toast.success(`Imported ${csvPreview.length} entries across ${classCount} class(es)`);
            setShowBulkModal(false);
        } catch (error) {
            toast.error('Failed to save imported schedule');
            console.error(error);
        } finally {
            setIsSavingSchedule(false);
        }
    };

    const getClassName = (id) => classes.find(c => c.id === id)?.name || '—';
    const getSubjectName = (id) => subjects.find(s => s.id === id)?.name || '—';
    const typeColors = { 'Unit Test': 'info', 'Mid Term Exam': 'warning', 'Final Exam': 'danger' };

    const getScheduleStatus = (exam) => {
        if (!exam.schedule) return { count: 0, total: exam.classIds?.length || 0 };
        const count = (exam.classIds || []).filter(cid => exam.schedule[cid]?.length > 0).length;
        return { count, total: exam.classIds?.length || 0 };
    };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div><h1 className="page-title">Examinations</h1><p className="page-subtitle">Create and manage exams & schedules</p></div>
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}><FiPlus /> Create Exam</button>
            </div>

            <div className="grid-cards">
                {exams.map(exam => {
                    const schedStatus = getScheduleStatus(exam);
                    return (
                        <div key={exam.id} className="card card-hover" style={{ cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <span className={`badge badge-${typeColors[exam.type] || 'primary'}`}>{exam.type}</span>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditingExam(exam); setForm({ ...exam, maxMarks: exam.maxMarks || 100 }); setShowModal(true); }}><FiEdit2 /></button>
                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(exam.id)}><FiTrash2 style={{ color: 'var(--color-danger)' }} /></button>
                                </div>
                            </div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>{exam.name}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                                <FiCalendar /> {formatDate(exam.startDate)} — {formatDate(exam.endDate)}
                            </div>
                            {exam.maxMarks && <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Max Marks: <strong>{exam.maxMarks}</strong></div>}

                            {/* Schedule status */}
                            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                                Schedule: <strong>{schedStatus.count}/{schedStatus.total}</strong> classes set
                                {schedStatus.count === schedStatus.total && schedStatus.total > 0 && <FiCheck style={{ color: 'var(--color-success)', marginLeft: 4 }} />}
                            </div>

                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                {exam.classIds.map(cId => (
                                    <span key={cId} className="badge badge-neutral">{getClassName(cId)}</span>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openScheduleModal(exam)}>
                                    <FiCalendar /> Set Schedule
                                </button>
                                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => openBulkModal(exam)}>
                                    <FiUpload /> CSV Import
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {exams.length === 0 && (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-title">No exams created yet</div></div></div>
            )}

            {/* Create/Edit Exam Modal */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingExam ? 'Edit Exam' : 'Create Exam'} size="lg"
                footer={<><button className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="grid-form">
                        <div className="input-group"><label className="input-label">Exam Name *</label><input className="input" placeholder="e.g. Unit Test 1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                        <div className="input-group"><label className="input-label">Exam Type</label><select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                        <div className="input-group"><label className="input-label">Start Date *</label><input className="input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                        <div className="input-group"><label className="input-label">End Date *</label><input className="input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
                        <div className="input-group"><label className="input-label">Maximum Marks *</label><input className="input" type="number" min="1" placeholder="e.g. 100" value={form.maxMarks} onChange={e => setForm({ ...form, maxMarks: parseInt(e.target.value) || '' })} /></div>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Classes *</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', padding: '0.375rem 0.625rem', borderRadius: '0.375rem', border: `1.5px solid ${form.classIds.length === classes.length ? 'var(--color-primary)' : 'var(--color-border)'}`, background: form.classIds.length === classes.length ? 'var(--color-primary-50)' : 'transparent', fontSize: '0.8125rem', fontWeight: 600, transition: 'all 0.15s' }}>
                                <input type="checkbox" checked={form.classIds.length === classes.length} onChange={() => setForm({ ...form, classIds: form.classIds.length === classes.length ? [] : classes.map(c => c.id) })} style={{ display: 'none' }} />
                                All Classes
                            </label>
                            {classes.map(cls => (
                                <label key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', padding: '0.375rem 0.625rem', borderRadius: '0.375rem', border: `1.5px solid ${form.classIds.includes(cls.id) ? 'var(--color-primary)' : 'var(--color-border)'}`, background: form.classIds.includes(cls.id) ? 'var(--color-primary-50)' : 'transparent', fontSize: '0.8125rem', transition: 'all 0.15s' }}>
                                    <input type="checkbox" checked={form.classIds.includes(cls.id)} onChange={() => handleToggleClass(cls.id)} style={{ display: 'none' }} />
                                    {cls.name}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Class-wise Schedule Modal */}
            <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} title={`Exam Schedule — ${scheduleExam?.name || ''}`} size="xl"
                footer={<><button className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>Close</button><button className="btn btn-primary" onClick={handleSaveSchedule} disabled={isSavingSchedule}>{isSavingSchedule ? 'Saving...' : 'Save Schedule'}</button></>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Class selector tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {(scheduleExam?.classIds || []).map(cid => {
                            const hasSchedule = scheduleExam?.schedule?.[cid]?.length > 0;
                            return (
                                <button key={cid}
                                    className={`btn btn-sm ${selectedScheduleClass === cid ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => handleScheduleClassChange(cid)}
                                    style={{ position: 'relative' }}>
                                    {getClassName(cid)}
                                    {hasSchedule && <FiCheck style={{ marginLeft: 4, color: selectedScheduleClass === cid ? '#fff' : 'var(--color-success)' }} />}
                                </button>
                            );
                        })}
                    </div>

                    {selectedScheduleClass && (
                        <>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '30%' }}>Subject</th>
                                            <th style={{ width: '22%' }}>Date</th>
                                            <th style={{ width: '18%' }}>Start Time</th>
                                            <th style={{ width: '18%' }}>End Time</th>
                                            <th style={{ width: '12%', textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scheduleRows.map((row, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <select className="input" value={row.subjectId} onChange={e => handleScheduleRowChange(i, 'subjectId', e.target.value)}>
                                                        <option value="">Select Subject</option>
                                                        {subjects.filter(s => s.classId === selectedScheduleClass).map(s => (
                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td><input className="input" type="date" value={row.date} onChange={e => handleScheduleRowChange(i, 'date', e.target.value)} /></td>
                                                <td><input className="input" type="time" value={row.startTime} onChange={e => handleScheduleRowChange(i, 'startTime', e.target.value)} /></td>
                                                <td><input className="input" type="time" value={row.endTime} onChange={e => handleScheduleRowChange(i, 'endTime', e.target.value)} /></td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeScheduleRow(i)}>
                                                        <FiTrash2 style={{ color: 'var(--color-danger)' }} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button className="btn btn-secondary btn-sm" onClick={addScheduleRow}><FiPlus /> Add Row</button>
                        </>
                    )}
                </div>
            </Modal>

            {/* CSV Import Modal */}
            <Modal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} title={`CSV Import Schedule — ${scheduleExam?.name || ''}`} size="xl"
                footer={<><button className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>Close</button><button className="btn btn-primary" onClick={handleBulkSave} disabled={isSavingSchedule || csvPreview.length === 0}>{isSavingSchedule ? 'Importing...' : `Import ${csvPreview.length} Entries`}</button></>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--color-primary-50)', borderRadius: '0.5rem', fontSize: '0.85rem', color: 'var(--color-primary)' }}>
                        Upload a CSV file with columns: <strong>Class, Subject, Date (YYYY-MM-DD), Start Time (HH:MM), End Time (HH:MM)</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                            <FiUpload style={{ marginRight: 4 }} /> Upload CSV
                            <input type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: 'none' }} />
                        </label>
                        <button className="btn btn-ghost btn-sm" onClick={downloadCsvTemplate}>
                            <FiDownload style={{ marginRight: 4 }} /> Download Template
                        </button>
                    </div>

                    {csvErrors.length > 0 && (
                        <div style={{ padding: '0.75rem', background: 'var(--color-danger-50, #fef2f2)', borderRadius: '0.5rem', fontSize: '0.8rem', color: 'var(--color-danger)', maxHeight: 120, overflow: 'auto' }}>
                            <strong>Errors ({csvErrors.length}):</strong>
                            <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                                {csvErrors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        </div>
                    )}

                    {csvPreview.length > 0 && (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Class</th>
                                        <th>Subject</th>
                                        <th>Date</th>
                                        <th>Start Time</th>
                                        <th>End Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {csvPreview.map((row, i) => (
                                        <tr key={i}>
                                            <td>{row.className}</td>
                                            <td>{row.subjectName}</td>
                                            <td>{formatDate(row.date)}</td>
                                            <td>{row.startTime}</td>
                                            <td>{row.endTime}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {csvPreview.length === 0 && csvErrors.length === 0 && (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                            <div className="empty-state-icon">📄</div>
                            <div className="empty-state-title">Upload a CSV file to preview</div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
