'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { calculateGrade, calculatePercentage } from '@/lib/utils';
import { FiEye, FiEyeOff, FiCheckCircle, FiClock } from 'react-icons/fi';
import { getClasses, getSections, getSubjects, getStudents, getExams, updateExam, getResults } from '@/lib/dataService';

export default function ResultsPage() {
    const toast = useToast();
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [exams, setExams] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(null);

    // For viewing results
    const [viewExam, setViewExam] = useState(null);
    const [viewClass, setViewClass] = useState('');
    const [viewSection, setViewSection] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [cData, sData, subData, stData, eData, rData] = await Promise.all([
                getClasses(), getSections(), getSubjects(), getStudents(), getExams(), getResults()
            ]);
            setClasses(cData);
            setSections(sData);
            setSubjects(subData);
            setStudents(stData);
            setExams(eData);
            setResults(rData);
        } catch (error) {
            toast.error("Failed to load data");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleRelease = async (exam) => {
        const newReleased = !exam.resultReleased;
        setToggling(exam.id);
        try {
            await updateExam(exam.id, { resultReleased: newReleased });
            setExams(prev => prev.map(e => e.id === exam.id ? { ...e, resultReleased: newReleased } : e));
            toast.success(newReleased ? `Results released for ${exam.name}` : `Results hidden for ${exam.name}`);
        } catch (error) {
            toast.error("Failed to update");
            console.error(error);
        } finally {
            setToggling(null);
        }
    };

    // Count how many results exist for this exam
    const getResultCount = (examId) => results.filter(r => r.examId === examId).length;

    // Get class names for the exam
    const getExamClassNames = (exam) => {
        return (exam.classIds || []).map(cid => classes.find(c => c.id === cid)?.name).filter(Boolean).join(', ');
    };

    // Filtered data for viewing results
    const viewSections = sections.filter(s => s.classId === viewClass);
    const viewStudents = students.filter(s => s.class === viewClass && s.section === viewSection);
    const viewSubjects = subjects.filter(s => s.classId === viewClass);
    const viewResults = results.filter(r => r.examId === viewExam?.id && r.classId === viewClass && r.sectionId === viewSection);
    const viewMaxMarks = viewExam?.maxMarks || 100;

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div><h1 className="page-title">Results Management</h1><p className="page-subtitle">Release results for students to view</p></div>
            </div>

            {/* Exam cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {exams.map(exam => {
                    const resultCount = getResultCount(exam.id);
                    const isReleased = exam.resultReleased;
                    return (
                        <div key={exam.id} className="card" style={{ border: isReleased ? '2px solid var(--color-success)' : '2px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                <div>
                                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{exam.name}</h3>
                                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{exam.type} • Max Marks: {exam.maxMarks || 100}</p>
                                </div>
                                <span className={`badge badge-${isReleased ? 'success' : 'warning'}`}>
                                    {isReleased ? <><FiCheckCircle style={{ marginRight: 4 }} /> Released</> : <><FiClock style={{ marginRight: 4 }} /> Not Released</>}
                                </span>
                            </div>

                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                                Classes: {getExamClassNames(exam) || 'N/A'}
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                                {resultCount} result{resultCount !== 1 ? 's' : ''} submitted by teachers
                            </p>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className={`btn ${isReleased ? 'btn-danger' : 'btn-success'}`}
                                    style={{ flex: 1 }}
                                    onClick={() => handleToggleRelease(exam)}
                                    disabled={toggling === exam.id}
                                >
                                    {isReleased ? <><FiEyeOff style={{ marginRight: 4 }} /> Hide Results</> : <><FiEye style={{ marginRight: 4 }} /> Release Results</>}
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => { setViewExam(exam); setViewClass(''); setViewSection(''); }}
                                >
                                    <FiEye /> View
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {exams.length === 0 && (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-title">No exams created yet</div><p style={{ color: 'var(--color-text-secondary)' }}>Create exams first from the Exams page</p></div></div>
            )}

            {/* View results section */}
            {viewExam && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Viewing: {viewExam.name}</h3>
                        <button className="btn btn-secondary btn-sm" onClick={() => setViewExam(null)}>Close</button>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <div className="input-group" style={{ minWidth: 160 }}>
                            <label className="input-label">Class</label>
                            <select className="input" value={viewClass} onChange={e => { setViewClass(e.target.value); setViewSection(''); }}>
                                <option value="">Select</option>
                                {classes.filter(c => (viewExam.classIds || []).includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="input-group" style={{ minWidth: 120 }}>
                            <label className="input-label">Section</label>
                            <select className="input" value={viewSection} onChange={e => setViewSection(e.target.value)} disabled={!viewClass}>
                                <option value="">Select</option>
                                {viewSections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {viewClass && viewSection && viewResults.length > 0 ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Roll</th>
                                        <th>Student</th>
                                        {viewSubjects.map(sub => <th key={sub.id} style={{ textAlign: 'center' }}>{sub.name}<br /><span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>/{viewMaxMarks}</span></th>)}
                                        <th style={{ textAlign: 'center' }}>Total</th>
                                        <th style={{ textAlign: 'center' }}>%</th>
                                        <th style={{ textAlign: 'center' }}>Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewResults.map(result => {
                                        const student = students.find(s => s.id === result.studentId);
                                        const pct = result.percentage || 0;
                                        const { grade } = calculateGrade(pct);
                                        const gradeColor = pct >= 60 ? 'success' : pct >= 33 ? 'warning' : 'danger';
                                        const totalObtained = (result.marks || []).reduce((s, m) => s + (m.obtained || 0), 0);
                                        const totalMax = (result.marks || []).reduce((s, m) => s + (m.total || viewMaxMarks), 0);
                                        return (
                                            <tr key={result.id}>
                                                <td>{student?.rollNumber || '—'}</td>
                                                <td style={{ fontWeight: 600 }}>{student?.name || 'Unknown'}</td>
                                                {viewSubjects.map(sub => {
                                                    const m = (result.marks || []).find(mk => mk.subjectId === sub.id);
                                                    return <td key={sub.id} style={{ textAlign: 'center', fontWeight: 500 }}>{m ? m.obtained : '—'}</td>;
                                                })}
                                                <td style={{ textAlign: 'center', fontWeight: 700 }}>{totalObtained}/{totalMax}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{pct}%</td>
                                                <td style={{ textAlign: 'center' }}><span className={`badge badge-${gradeColor}`}>{result.grade || grade}</span></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : viewClass && viewSection ? (
                        <div className="empty-state" style={{ padding: '2rem' }}><div className="empty-state-icon">📝</div><div className="empty-state-title">No results submitted yet for this class/section</div><p style={{ color: 'var(--color-text-secondary)' }}>Teachers need to enter marks first</p></div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
