'use client';
import { useState, useEffect } from 'react';
import { getCalendarEvents } from '@/lib/dataService';
import { useToast } from '@/components/ui/Toast';

export default function TeacherCalendarPage() {
    const toast = useToast();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const data = await getCalendarEvents();
            setEvents(data.sort((a, b) => new Date(a.date) - new Date(b.date)));
        } catch (error) {
            toast.error("Failed to load events");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header"><div><h1 className="page-title">Academic Calendar</h1></div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {events.length > 0 ? events.map(event => (
                    <div key={event.id} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'var(--color-primary-50)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase' }}>{new Date(event.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>{new Date(event.date).getDate()}</span>
                        </div>
                        <div><div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{event.title}</div><div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{event.description}</div></div>
                    </div>
                )) : (
                    <div className="empty-state"><div className="empty-state-icon">📅</div><div className="empty-state-title">No events found</div></div>
                )}
            </div>
        </div>
    );
}
