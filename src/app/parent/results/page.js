'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getChildrenByParentEmail, getChildResults } from '@/lib/parentService';
import { getClasses, getExams, getSubjects } from '@/lib/dataService';
import { calculateGrade, calculatePercentage } from '@/lib/utils';
import { FiAward } from 'react-icons/fi';

export default function ParentResultsPage() {
    const { user } = useAuth();
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [classes, setClasses] = useState([]);
    const [exams, setExams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [kids, cls, exm, subs] = await Promise.all([
                    getChildrenByParentEmail(user?.email), getClasses(), getExams(), getSubjects()
                ]);
                setChildren(kids); setClasses(cls); setExams(exm); setSubjects(subs);
                if (kids.length > 0) setSelectedChild(kids[0]);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (user?.email) fetch();
    }, [user]);

    useEffect(() => {
        if (!selectedChild) return;
        const fetchResults = async () => {
            try {
                const data = await getChildResults(selectedChild.id);
                setResults(data);
            } catch (e) { console.error(e); }
        };
        fetchResults();
    }, [selectedChild]);

    const getClassName = (id) => classes.find(c => c.id === id)?.name || id;
    const getExamName = (id) => exams.find(e => e.id === id)?.name || id;
    const getSubjectName = (id) => subjects.find(s => s.id === id)?.name || id;

    if (loading) return <div className="loading-overlay" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

    // Group results by exam
    const resultsByExam = {};
    results.forEach(r => {
        if (!resultsByExam[r.examId]) resultsByExam[r.examId] = [];
        resultsByExam[r.examId].push(r);
    });

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Results</h1>
                    <p className="page-subtitle">View your child&apos;s exam results and performance</p>
                </div>
                {children.length > 1 && (
                    <select className="input" style={{ width: 'auto', minWidth: 200 }} value={selectedChild?.id || ''} onChange={e => setSelectedChild(children.find(c => c.id === e.target.value))}>
                        {children.map(c => <option key={c.id} value={c.id}>{c.name} — {getClassName(c.class)} {c.section}</option>)}
                    </select>
                )}
            </div>

            {Object.keys(resultsByExam).length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <div className="empty-state-title">No results yet</div>
                    <p className="empty-state-text">Results will appear here once published.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {Object.entries(resultsByExam).map(([examId, examResults]) => {
                        const totalObtained = examResults.reduce((sum, r) => sum + (r.marks?.reduce((s, m) => s + (m.obtained || 0), 0) || 0), 0);
                        const totalMax = examResults.reduce((sum, r) => sum + (r.marks?.reduce((s, m) => s + (m.total || 0), 0) || 0), 0);
                        const overallPct = calculatePercentage(totalObtained, totalMax);
                        const { grade, remark } = calculateGrade(overallPct);

                        return (
                            <div key={examId} className="card">
                                <div className="card-header">
                                    <div>
                                        <span className="card-title"><FiAward style={{ marginRight: '0.5rem', color: '#8b5cf6' }} />{getExamName(examId)}</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: overallPct >= 33 ? 'var(--color-success)' : 'var(--color-danger)' }}>{overallPct}%</div>
                                        <span className={`badge ${overallPct >= 60 ? 'badge-success' : overallPct >= 33 ? 'badge-warning' : 'badge-danger'}`}>{grade} - {remark}</span>
                                    </div>
                                </div>
                                <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                                    <table className="table">
                                        <thead><tr><th>Subject</th><th>Marks</th><th>Total</th><th>%</th><th>Grade</th></tr></thead>
                                        <tbody>
                                            {examResults.flatMap(r => (r.marks || []).map((m, i) => {
                                                const pct = calculatePercentage(m.obtained, m.total);
                                                const g = calculateGrade(pct);
                                                return (
                                                    <tr key={`${r.id}-${i}`}>
                                                        <td style={{ fontWeight: 500 }}>{getSubjectName(m.subjectId)}</td>
                                                        <td>{m.obtained}</td>
                                                        <td>{m.total}</td>
                                                        <td>{pct}%</td>
                                                        <td><span className={`badge ${pct >= 60 ? 'badge-success' : pct >= 33 ? 'badge-warning' : 'badge-danger'}`}>{g.grade}</span></td>
                                                    </tr>
                                                );
                                            }))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
