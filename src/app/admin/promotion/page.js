'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { FiArrowUpRight, FiCheck, FiAlertTriangle, FiSearch, FiUserX } from 'react-icons/fi';
import { getClasses, getSections, getStudents, updateStudent, deleteStudent, addAuditLog } from '@/lib/dataService';

export default function PromotionPage() {
    const toast = useToast();
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [targetClass, setTargetClass] = useState('');
    const [targetSection, setTargetSection] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [promoted, setPromoted] = useState([]);
    const [done, setDone] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [cData, secData, stData] = await Promise.all([
                getClasses(), getSections(), getStudents()
            ]);
            setClasses(cData.sort((a, b) => a.order - b.order));
            setSections(secData);
            setAllStudents(stData);
        } catch (error) {
            toast.error("Failed to load initial data");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const currentClass = classes.find(c => c.id === selectedClass);
    const currentOrder = currentClass?.order ?? -1;
    // Find the next class by smallest order greater than current (handles gaps in order values)
    const defaultNextClass = classes
        .filter(c => c.order > currentOrder)
        .sort((a, b) => a.order - b.order)[0] || null;

    // Auto-set target class when source class changes
    useEffect(() => {
        if (defaultNextClass) {
            setTargetClass(defaultNextClass.id);
        } else {
            setTargetClass('');
        }
        setTargetSection('');
    }, [selectedClass]);

    const targetClassObj = classes.find(c => c.id === targetClass);
    const sourceSections = sections.filter(s => s.classId === selectedClass);
    const targetSections = sections.filter(s => s.classId === targetClass);

    // Filter students by class, optional section, and search
    const students = allStudents
        .filter(s => s.class === selectedClass)
        .filter(s => !selectedSection || s.section === selectedSection)
        .filter(s => !searchQuery || s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.rollNumber?.toString().includes(searchQuery));

    const toggleStudent = (id) => {
        setPromoted(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    };

    const selectAll = () => setPromoted(students.map(s => s.id));
    const deselectAll = () => setPromoted([]);

    const handlePromote = async () => {
        if (promoted.length === 0) { toast.error('Select students to promote'); return; }
        if (!targetClass) { toast.error('Select a target class'); return; }

        setIsSubmitting(true);
        try {
            const updatePromises = promoted.map(studentId =>
                updateStudent(studentId, { class: targetClass, section: targetSection || '' })
            );
            await Promise.all(updatePromises);

            setDone(true);
            toast.success(`${promoted.length} student(s) promoted from ${currentClass.name} to ${targetClassObj?.name}!`);
            await addAuditLog('PROMOTE_STUDENTS', { count: promoted.length, from: currentClass.name, to: targetClassObj?.name });
            fetchData();
        } catch (error) {
            toast.error("Failed to promote students");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGraduate = async () => {
        if (promoted.length === 0) { toast.error('Select students to mark as graduated'); return; }

        setIsSubmitting(true);
        try {
            const updatePromises = promoted.map(studentId =>
                updateStudent(studentId, { status: 'Graduated', class: '', section: '' })
            );
            await Promise.all(updatePromises);

            setDone(true);
            toast.success(`${promoted.length} student(s) marked as Graduated!`);
            await addAuditLog('PROMOTE_STUDENTS', { count: promoted.length, action: 'graduated' });
            fetchData();
        } catch (error) {
            toast.error("Failed to graduate students");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isHighestClass = currentClass && !defaultNextClass;

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div><h1 className="page-title">Student Promotion</h1><p className="page-subtitle">Promote students to the next class at year end</p></div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="input-group" style={{ minWidth: 160 }}>
                        <label className="input-label">From Class</label>
                        <select className="input" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); setPromoted([]); setDone(false); setSearchQuery(''); }}>
                            <option value="">Select Class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    {selectedClass && sourceSections.length > 0 && (
                        <div className="input-group" style={{ minWidth: 120 }}>
                            <label className="input-label">Section</label>
                            <select className="input" value={selectedSection} onChange={e => { setSelectedSection(e.target.value); setPromoted([]); setDone(false); }}>
                                <option value="">All Sections</option>
                                {sourceSections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                    {selectedClass && !isHighestClass && (
                        <div className="input-group" style={{ minWidth: 160 }}>
                            <label className="input-label">To Class</label>
                            <select className="input" value={targetClass} onChange={e => { setTargetClass(e.target.value); setTargetSection(''); }}>
                                <option value="">Select Target</option>
                                {classes.filter(c => c.id !== selectedClass).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                    {targetClass && targetSections.length > 0 && (
                        <div className="input-group" style={{ minWidth: 120 }}>
                            <label className="input-label">To Section</label>
                            <select className="input" value={targetSection} onChange={e => setTargetSection(e.target.value)}>
                                <option value="">No Section</option>
                                {targetSections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                    {selectedClass && (
                        <div style={{ padding: '0.5rem 1rem', background: isHighestClass ? 'var(--color-warning-bg)' : 'var(--color-success-bg)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                            {isHighestClass ? (
                                <><FiAlertTriangle style={{ color: 'var(--color-warning)' }} /> Highest class — Graduate students</>
                            ) : (
                                <><FiArrowUpRight style={{ color: 'var(--color-success)' }} /> Promote to: <strong>{targetClassObj?.name || '—'}</strong>{targetSection ? ` (${targetSection})` : ''}</>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {selectedClass && students.length > 0 ? (
                <>
                    {/* Search & bulk actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
                            <FiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input className="input" placeholder="Search by name or roll..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 34 }} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-secondary btn-sm" onClick={selectAll} disabled={done}>Select All ({students.length})</button>
                            {promoted.length > 0 && <button className="btn btn-ghost btn-sm" onClick={deselectAll} disabled={done}>Deselect All</button>}
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: '1rem' }}>
                        {students.map(student => (
                            <div key={student.id} className="attendance-row" style={{ cursor: done ? 'default' : 'pointer' }} onClick={() => !done && toggleStudent(student.id)}>
                                <input type="checkbox" checked={promoted.includes(student.id)} onChange={() => { }} disabled={done} style={{ width: 18, height: 18, accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
                                <div className="attendance-student">
                                    <div>{student.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Roll: {student.rollNumber} • Section {student.section}</div>
                                </div>
                                {done && promoted.includes(student.id) && <span className="badge badge-success"><FiCheck /> {isHighestClass ? 'Graduated' : 'Promoted'}</span>}
                            </div>
                        ))}
                    </div>

                    {!done && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            {isHighestClass ? (
                                <button className="btn btn-warning btn-lg" onClick={handleGraduate} disabled={promoted.length === 0 || isSubmitting}>
                                    <FiUserX /> {isSubmitting ? 'Processing...' : `Graduate ${promoted.length} Student${promoted.length !== 1 ? 's' : ''}`}
                                </button>
                            ) : (
                                <button className="btn btn-primary btn-lg" onClick={handlePromote} disabled={promoted.length === 0 || !targetClass || isSubmitting}>
                                    <FiArrowUpRight /> {isSubmitting ? 'Promoting...' : `Promote ${promoted.length} Student${promoted.length !== 1 ? 's' : ''}`}
                                </button>
                            )}
                        </div>
                    )}
                    {done && (
                        <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--color-success-bg)', border: '1px solid #a7f3d0', textAlign: 'center' }}>
                            <FiCheck style={{ color: 'var(--color-success)', fontSize: '1.5rem' }} />
                            <div style={{ fontWeight: 600, marginTop: '0.5rem' }}>{isHighestClass ? 'Graduation' : 'Promotion'} Complete!</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                {promoted.length} student(s) {isHighestClass ? 'graduated' : `promoted to ${targetClassObj?.name}${targetSection ? ` (${targetSection})` : ''}`}
                            </div>
                            <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => { setSelectedClass(''); setPromoted([]); setDone(false); setSearchQuery(''); }}>
                                Start New Promotion
                            </button>
                        </div>
                    )}
                </>
            ) : selectedClass ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">No students found{selectedSection ? ` in Section ${selectedSection}` : ''}</div></div></div>
            ) : (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">🎓</div><div className="empty-state-title">Select a class to begin promotion</div></div></div>
            )}
        </div>
    );
}
