'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FiClock } from 'react-icons/fi';
import { getTimetable, getClasses, getSections, getSubjects, getPeriodTimings } from '@/lib/dataService';
import { useToast } from '@/components/ui/Toast';

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TeacherTimetablePage() {
    const { user } = useAuth();
    const toast = useToast();
    const [timetable, setTimetable] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchTimetable();
    }, [user]);

    const fetchTimetable = async () => {
        try {
            const [tData, cData, sData, subData, ptData] = await Promise.all([
                getTimetable(), getClasses(), getSections(), getSubjects(), getPeriodTimings()
            ]);

            const teacherId = user.teacherId || user.uid || user.id;

            const newTimetable = {
                Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: []
            };

            // Each tData entry is a flat slot: { classId, sectionId, day, period, subjectId, teacherId }
            tData.forEach(slot => {
                if (slot.teacherId === teacherId) {
                    const classDoc = cData.find(c => c.id === slot.classId);
                    const sectionDoc = sData.find(s => s.id === slot.sectionId);
                    const subjectDoc = subData.find(s => s.id === slot.subjectId);
                    const classNameStr = classDoc ? `${classDoc.name}${sectionDoc ? ' - ' + sectionDoc.name : ''}` : 'Unknown Class';
                    const subjectName = subjectDoc ? subjectDoc.name : 'Unknown Subject';

                    if (newTimetable[slot.day]) {
                        const pt = ptData[slot.period];
                        const timeStr = pt?.startTime && pt?.endTime ? `${pt.startTime} - ${pt.endTime}` : `Period ${slot.period}`;
                        newTimetable[slot.day].push({
                            period: slot.period,
                            subject: subjectName,
                            class: classNameStr,
                            time: timeStr
                        });
                    }
                }
            });

            // Sort each day's periods
            Object.keys(newTimetable).forEach(day => {
                newTimetable[day].sort((a, b) => parseInt(a.period) - parseInt(b.period));
            });

            setTimetable(newTimetable);
        } catch (error) {
            toast.error("Failed to load timetable");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header"><div><h1 className="page-title">My Timetable</h1><p className="page-subtitle">Your teaching schedule for the week</p></div></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {DAYS_OF_WEEK.map(day => (
                    <div key={day} className="card" style={{ padding: 0 }}>
                        <div style={{ padding: '0.75rem 1rem', background: 'var(--color-primary-50)', fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.875rem' }}>{day}</div>
                        <div style={{ padding: '0.75rem' }}>
                            {(timetable[day] || []).length > 0 ? timetable[day].map((slot, i) => (
                                <div key={i} style={{ padding: '0.5rem', borderRadius: '0.375rem', background: 'var(--color-bg)', marginBottom: '0.375rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Period {slot.period}</div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <FiClock /> {slot.time}
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-primary)' }}>{slot.subject}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{slot.class}</div>
                                </div>
                            )) : <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', padding: '0.5rem', textAlign: 'center' }}>No classes scheduled</div>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
