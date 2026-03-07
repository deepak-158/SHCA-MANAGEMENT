'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils';
import { FiCalendar } from 'react-icons/fi';
import { getExams, getSubjects } from '@/lib/dataService';
import { useToast } from '@/components/ui/Toast';

export default function StudentExamsPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [exams, setExams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchExams();
    }, [user]);

    const fetchExams = async () => {
        try {
            const [eData, sData] = await Promise.all([
                getExams(), getSubjects()
            ]);

            // Filter exams that apply to the student's class
            const myExams = eData.filter(e => e.classIds && e.classIds.includes(user.class));
            setExams(myExams);
            setSubjects(sData);
        } catch (error) {
            toast.error("Failed to load exams");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getSubjectName = (id) => subjects.find(s => s.id === id)?.name || 'Unknown Subject';

    // Random colors for dynamic exam types if they are not standard
    const getTypeColor = (type) => {
        const typeStr = (type || '').toLowerCase();
        if (typeStr.includes('unit') || typeStr.includes('formative')) return 'info';
        if (typeStr.includes('mid') || typeStr.includes('half')) return 'warning';
        if (typeStr.includes('final') || typeStr.includes('annual')) return 'danger';
        return 'primary';
    };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header"><div><h1 className="page-title">Exam Schedule</h1></div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {exams.length > 0 ? exams.map(exam => (
                    <div key={exam.id} className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: '1.125rem' }}>{exam.name}</h3>
                                <span className={`badge badge-${getTypeColor(exam.name)}`}>{exam.name}</span>
                            </div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <FiCalendar /> Starts {formatDate(exam.startDate)}
                            </div>
                        </div>
                        {(() => {
                            const classSchedule = exam.schedule?.[user.class] || [];
                            return classSchedule.length > 0 ? (
                            <div className="table-container" style={{ border: 'none' }}>
                                <table className="table">
                                    <thead><tr><th>Date</th><th>Subject</th><th>Time</th></tr></thead>
                                    <tbody>
                                        {classSchedule.map((s, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: 500 }}>{formatDate(s.date)}</td>
                                                <td>{getSubjectName(s.subjectId)}</td>
                                                <td>{s.startTime} - {s.endTime}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                Schedule not published yet.
                            </div>
                        );
                        })()}
                    </div>
                )) : (
                    <div className="card"><div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-title">No exams scheduled for your class</div></div></div>
                )}
            </div>
        </div>
    );
}
