'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FiClock } from 'react-icons/fi';
import { getTimetable, getSubjects, getSections, getPeriodTimings } from '@/lib/dataService';
import { useToast } from '@/components/ui/Toast';

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function StudentTimetablePage() {
    const { user } = useAuth();
    const toast = useToast();
    const [timetable, setTimetable] = useState({});
    const [periodTimings, setPeriodTimings] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchTimetable();
    }, [user]);

    const fetchTimetable = async () => {
        try {
            const [tData, subData, secData, ptData] = await Promise.all([
                getTimetable(), getSubjects(), getSections(), getPeriodTimings()
            ]);

            // Resolve the student's section doc ID from class + section name
            const sectionDoc = secData.find(s => s.classId === user.class && s.name === user.section);
            const sectionId = sectionDoc?.id;

            const newTimetable = {
                Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: []
            };

            // Each tData entry is a flat slot: { classId, sectionId, day, period, subjectId, teacherId }
            tData.forEach(slot => {
                if (slot.classId === user.class && slot.sectionId === sectionId) {
                    const subjectDoc = subData.find(s => s.id === slot.subjectId);
                    if (newTimetable[slot.day]) {
                        newTimetable[slot.day].push({
                            ...slot,
                            subject: subjectDoc ? subjectDoc.name : 'Unknown Subject'
                        });
                    }
                }
            });

            // Sort periods
            Object.keys(newTimetable).forEach(day => {
                newTimetable[day].sort((a, b) => parseInt(a.period) - parseInt(b.period));
            });

            setTimetable(newTimetable);
            setPeriodTimings(ptData);
        } catch (error) {
            toast.error("Failed to load timetable");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const subjectColors = { Mathematics: '#4f46e5', English: '#0d9488', Science: '#3b82f6', Hindi: '#f59e0b', 'Social Science': '#ef4444', Computer: '#8b5cf6' };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header"><div><h1 className="page-title">My Timetable</h1></div></div>
            <div className="table-container">
                <table className="table">
                    <thead><tr><th>Day</th>{[1, 2, 3, 4, 5, 6, 7, 8].map(p => <th key={p} style={{ textAlign: 'center' }}><div>Period {p}</div>{periodTimings[p]?.startTime && periodTimings[p]?.endTime && <div style={{ fontSize: '0.625rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>{periodTimings[p].startTime} - {periodTimings[p].endTime}</div>}</th>)}</tr></thead>
                    <tbody>
                        {DAYS_OF_WEEK.map(day => (
                            <tr key={day}>
                                <td style={{ fontWeight: 600, background: 'var(--color-bg)' }}>{day}</td>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(period => {
                                    const slot = (timetable[day] || []).find(s => parseInt(s.period) === period);
                                    return (
                                        <td key={period} style={{ textAlign: 'center' }}>
                                            {slot ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem' }}>
                                                    <span style={{ padding: '0.25rem 0.625rem', borderRadius: '0.375rem', background: (subjectColors[slot.subject] || '#6b7280') + '15', color: subjectColors[slot.subject] || '#6b7280', fontWeight: 600, fontSize: '0.8125rem' }}>
                                                        {slot.subject}
                                                    </span>
                                                    {slot.startTime && slot.endTime && <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>{slot.startTime} - {slot.endTime}</span>}
                                                </div>
                                            ) : '—'}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
