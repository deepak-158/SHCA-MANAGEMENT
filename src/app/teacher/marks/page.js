'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { calculateGrade, getCurrentAcademicYear } from '@/lib/utils';
import { FiSave } from 'react-icons/fi';
import { getClasses, getSections, getSubjects, getStudents, getExams, getResultsForClassSection, saveResults } from '@/lib/dataService';

export default function TeacherMarksPage() {
    const toast = useToast();
    const { user } = useAuth();

    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedExam, setSelectedExam] = useState('');

    const [marks, setMarks] = useState({});
    const [saved, setSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [cData, sData, subData, stData, eData] = await Promise.all([
                getClasses(), getSections(), getSubjects(), getStudents(), getExams()
            ]);

            // If they are a subject teacher, optimally we would filter `classes` 
            // to only those they teach, but for now we'll show all classes
            setClasses(cData.sort((a, b) => a.order - b.order));
            setSections(sData);
            setSubjects(subData);
            setAllStudents(stData);
            setExams(eData);
            if (eData.length > 0) setSelectedExam(eData[0].id);
        } catch (error) {
            toast.error("Failed to load initial data");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedClass && selectedSection && selectedSubject && selectedExam) {
            fetchExistingMarks();
        }
    }, [selectedClass, selectedSection, selectedSubject, selectedExam]);

    const fetchExistingMarks = async () => {
        try {
            const results = await getResultsForClassSection(selectedExam, selectedClass, selectedSection);

            const newMarks = {};
            results.forEach(res => {
                const subjectMark = res.marks.find(m => m.subjectId === selectedSubject);
                if (subjectMark) {
                    newMarks[res.studentId] = subjectMark.obtained;
                }
            });

            setMarks(newMarks);
            setSaved(Object.keys(newMarks).length > 0);
        } catch (error) {
            console.error("Failed to load existing marks", error);
        }
    };

    const filteredSections = sections.filter(s => s.classId === selectedClass);
    const students = allStudents.filter(s => s.class === selectedClass && s.section === selectedSection);
    const filteredSubjects = subjects.filter(s => s.classId === selectedClass);

    const selectedExamData = exams.find(e => e.id === selectedExam);
    const maxMarks = selectedExamData?.maxMarks || 100;

    const handleMarkChange = (studentId, value) => {
        const parsedValue = parseInt(value);
        if (isNaN(parsedValue) && value !== '') return;

        setMarks({ ...marks, [studentId]: value === '' ? '' : Math.min(maxMarks, Math.max(0, parsedValue)) });
        setSaved(false);
    };

    const handleSave = async () => {
        if (students.length === 0) return;

        setIsSaving(true);
        try {
            // Because we only edit ONE subject here, we need to fetch existing results 
            // to avoid overwriting other subjects.
            const existingResults = await getResultsForClassSection(selectedExam, selectedClass, selectedSection);

            const resultsToSave = students.map(student => {
                const studentVal = marks[student.id];
                const obtainedMark = studentVal !== undefined && studentVal !== '' ? parseInt(studentVal) : 0;

                // Find existing result for this student
                let existingRes = existingResults.find(r => r.studentId === student.id);

                let marksArray = [];
                if (existingRes && existingRes.marks) {
                    // Update the array with our new subject mark
                    marksArray = [...existingRes.marks];
                    const subjectIdx = marksArray.findIndex(m => m.subjectId === selectedSubject);
                    if (subjectIdx >= 0) {
                        marksArray[subjectIdx].obtained = obtainedMark;
                    } else {
                        marksArray.push({ subjectId: selectedSubject, obtained: obtainedMark, total: maxMarks });
                    }
                } else {
                    // No existing results, create new marks array
                    marksArray = [{ subjectId: selectedSubject, obtained: obtainedMark, total: maxMarks }];
                }

                // Recalculate totals
                const totalMarks = marksArray.reduce((sum, m) => sum + (m.obtained || 0), 0);
                const totalMax = marksArray.reduce((sum, m) => sum + (m.total || maxMarks), 0);
                const percentage = totalMax > 0 ? (totalMarks / totalMax) * 100 : 0;
                const { grade } = calculateGrade(percentage);

                return {
                    ...existingRes,
                    examId: selectedExam,
                    studentId: student.id,
                    classId: selectedClass,
                    sectionId: selectedSection,
                    marks: marksArray,
                    totalMarks,
                    percentage,
                    grade,
                    academicYear: getCurrentAcademicYear()
                };
            });

            await saveResults(selectedExam, selectedClass, selectedSection, resultsToSave);
            setSaved(true);
            toast.success('Marks saved successfully!');
        } catch (error) {
            toast.error("Failed to save marks");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header"><div><h1 className="page-title">Enter Marks</h1><p className="page-subtitle">Enter student marks for your subject</p></div></div>
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="input-group" style={{ minWidth: 160 }}>
                        <label className="input-label">Exam</label>
                        <select className="input" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
                            <option value="">Select Exam</option>
                            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div className="input-group" style={{ minWidth: 160 }}>
                        <label className="input-label">Class</label>
                        <select className="input" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); setSelectedSubject(''); }}>
                            <option value="">Select</option>
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
                    <div className="input-group" style={{ minWidth: 160 }}>
                        <label className="input-label">Subject</label>
                        <select className="input" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={!selectedClass}>
                            <option value="">Select</option>
                            {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {selectedClass && selectedSection && selectedSubject && selectedExam && students.length > 0 ? (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Maximum Marks: <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{maxMarks}</span></span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{students.length} student{students.length > 1 ? 's' : ''}</span>
                    </div>
                    {students.map((student, idx) => (
                        <div key={student.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.625rem 0', borderBottom: '1px solid var(--color-border)' }}>
                            <span style={{ width: 30, fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{idx + 1}</span>
                            <div style={{ flex: 1 }}><div style={{ fontWeight: 500 }}>{student.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Roll: {student.rollNumber}</div></div>
                            <input
                                type="number"
                                className="input"
                                style={{ width: 80, textAlign: 'center' }}
                                min={0} max={maxMarks}
                                placeholder="—"
                                value={marks[student.id] ?? ''}
                                onChange={e => handleMarkChange(student.id, e.target.value)}
                                disabled={isSaving}
                            />
                            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>/ {maxMarks}</span>
                            <span style={{ width: 40, textAlign: 'center' }}>
                                {marks[student.id] !== undefined && marks[student.id] !== '' && (
                                    <span className={`badge badge-${((parseInt(marks[student.id]) || 0) / maxMarks * 100) >= 60 ? 'success' : ((parseInt(marks[student.id]) || 0) / maxMarks * 100) >= 33 ? 'warning' : 'danger'}`}>
                                        {calculateGrade(((parseInt(marks[student.id]) || 0) / maxMarks) * 100).grade}
                                    </span>
                                )}
                            </span>
                        </div>
                    ))}
                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saved || isSaving}>
                            <FiSave /> {isSaving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Marks'}
                        </button>
                    </div>
                </div>
            ) : selectedClass && selectedSection && selectedSubject && selectedExam ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-title">No students found</div></div></div>
            ) : (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-title">Select exam, class, section, and subject</div></div></div>
            )}
        </div>
    );
}
