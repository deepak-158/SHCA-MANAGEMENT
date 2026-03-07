'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { calculateGrade } from '@/lib/utils';
import { FiAward } from 'react-icons/fi';
import { getResults, getExams, getSubjects } from '@/lib/dataService';
import { useToast } from '@/components/ui/Toast';

export default function StudentResultsPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchResults();
    }, [user]);

    const fetchResults = async () => {
        try {
            const [rData, eData, sData] = await Promise.all([
                getResults(), getExams(), getSubjects()
            ]);

            const studentId = user.studentId || user.uid || user.id;
            const myResultsDocs = rData.filter(r => r.studentId === studentId);

            // Only hide results for exams explicitly marked as not released
            const releasedExamIds = eData.filter(e => e.resultReleased !== false).map(e => e.id);

            const formattedResults = myResultsDocs
                .filter(resultDoc => releasedExamIds.includes(resultDoc.examId))
                .map(resultDoc => {
                const examDoc = eData.find(e => e.id === resultDoc.examId);

                const subjectsFormatted = (resultDoc.marks || []).map(m => {
                    const subjectDoc = sData.find(s => s.id === m.subjectId);
                    return {
                        name: subjectDoc ? subjectDoc.name : 'Unknown Subject',
                        marks: m.obtained,
                        total: m.total
                    };
                });

                return {
                    id: resultDoc.id,
                    exam: examDoc ? examDoc.name : 'Unknown Exam',
                    ...resultDoc,
                    subjects: subjectsFormatted
                };
            });

            setResults(formattedResults);
        } catch (error) {
            toast.error("Failed to load results");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header"><div><h1 className="page-title">My Results</h1></div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {results.length > 0 ? results.map(result => {
                    const pct = result.percentage || 0;
                    const { grade, remark } = calculateGrade(pct);
                    return (
                        <div key={result.id} className="card">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <h3 style={{ fontWeight: 700, fontSize: '1.125rem' }}>{result.exam}</h3>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>{pct}%</div>
                                    <span className={`badge badge-${pct >= 60 ? 'success' : pct >= 33 ? 'warning' : 'danger'}`}>Grade: {result.grade || grade} • {remark}</span>
                                </div>
                            </div>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table className="table">
                                    <thead><tr><th>Subject</th><th style={{ textAlign: 'center' }}>Marks</th><th style={{ textAlign: 'center' }}>Total</th><th>Grade</th></tr></thead>
                                    <tbody>
                                        {result.subjects.map(sub => {
                                            const sp = Math.round((sub.marks / sub.total) * 100);
                                            const sg = calculateGrade(sp);
                                            return (
                                                <tr key={sub.name}>
                                                    <td style={{ fontWeight: 500 }}>{sub.name}</td>
                                                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{sub.marks}</td>
                                                    <td style={{ textAlign: 'center' }}>{sub.total}</td>
                                                    <td><span className={`badge badge-${sp >= 60 ? 'success' : sp >= 33 ? 'warning' : 'danger'}`}>{sg.grade}</span></td>
                                                </tr>
                                            );
                                        })}
                                        <tr style={{ fontWeight: 700 }}>
                                            <td>Total</td>
                                            <td style={{ textAlign: 'center' }}>{result.totalMarksObtained || result.subjects.reduce((s, sub) => s + sub.marks, 0)}</td>
                                            <td style={{ textAlign: 'center' }}>{result.totalMarks || result.subjects.reduce((s, sub) => s + sub.total, 0)}</td>
                                            <td><span className={`badge badge-${pct >= 60 ? 'success' : 'warning'}`}>{result.grade || grade}</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="card"><div className="empty-state"><div className="empty-state-icon">🏆</div><div className="empty-state-title">No results published yet</div></div></div>
                )}
            </div>
        </div>
    );
}
