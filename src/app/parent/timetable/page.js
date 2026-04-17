'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getChildrenByParentEmail } from '@/lib/parentService';
import { getClasses, getTimetable, getSubjects, getTeachers, getPeriodTimings } from '@/lib/dataService';
import { DAYS_OF_WEEK, PERIODS } from '@/constants';

export default function ParentTimetablePage() {
    const { user } = useAuth();
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [classes, setClasses] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [timings, setTimings] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [kids, cls, tt, subs, tchs, tim] = await Promise.all([
                    getChildrenByParentEmail(user?.email), getClasses(), getTimetable(),
                    getSubjects(), getTeachers(), getPeriodTimings()
                ]);
                setChildren(kids); setClasses(cls); setTimetable(tt);
                setSubjects(subs); setTeachers(tchs); setTimings(tim);
                if (kids.length > 0) setSelectedChild(kids[0]);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (user?.email) fetch();
    }, [user]);

    const getClassName = (id) => classes.find(c => c.id === id)?.name || id;
    const getSubjectName = (id) => subjects.find(s => s.id === id)?.name || '';
    const getTeacherName = (id) => teachers.find(t => t.id === id)?.name || '';

    const getSlot = (day, period) => {
        if (!selectedChild) return null;
        return timetable.find(s => s.classId === selectedChild.class && s.sectionId === selectedChild.section && s.day === day && s.period === period);
    };

    if (loading) return <div className="loading-overlay" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Timetable</h1>
                    <p className="page-subtitle">Weekly class schedule for your child</p>
                </div>
                {children.length > 1 && (
                    <select className="input" style={{ width: 'auto', minWidth: 200 }} value={selectedChild?.id || ''} onChange={e => setSelectedChild(children.find(c => c.id === e.target.value))}>
                        {children.map(c => <option key={c.id} value={c.id}>{c.name} — {getClassName(c.class)} {c.section}</option>)}
                    </select>
                )}
            </div>

            {selectedChild && (
                <div className="timetable-grid" style={{ gridTemplateColumns: `120px repeat(${PERIODS.length}, 1fr)` }}>
                    {/* Header row */}
                    <div className="timetable-cell timetable-header-cell">Day / Period</div>
                    {PERIODS.map(p => (
                        <div key={p} className="timetable-cell timetable-header-cell">
                            <div>P{p}</div>
                            {timings?.periods?.[p - 1] && (
                                <div style={{ fontSize: '0.625rem', fontWeight: 400, opacity: 0.7 }}>
                                    {timings.periods[p - 1].start}-{timings.periods[p - 1].end}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Day rows */}
                    {DAYS_OF_WEEK.map(day => (
                        <>
                            <div key={day} className="timetable-cell timetable-day-cell">{day}</div>
                            {PERIODS.map(period => {
                                const slot = getSlot(day, period);
                                return (
                                    <div key={`${day}-${period}`} className="timetable-cell">
                                        {slot ? (
                                            <>
                                                <span className="timetable-subject">{getSubjectName(slot.subjectId)}</span>
                                                <span className="timetable-teacher">{getTeacherName(slot.teacherId)}</span>
                                            </>
                                        ) : (
                                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>—</span>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    ))}
                </div>
            )}
        </div>
    );
}
