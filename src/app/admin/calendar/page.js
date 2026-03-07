'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { formatDate, getCurrentAcademicYear } from '@/lib/utils';
import { FiPlus, FiEdit2, FiTrash2, FiCalendar } from 'react-icons/fi';
import { getCalendarEvents, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/dataService';

export default function CalendarPage() {
    const toast = useToast();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({ date: '', title: '', description: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await getCalendarEvents();
            setEvents(data);
        } catch (error) {
            toast.error("Failed to load calendar events");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const sortedEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));

    const handleSave = async () => {
        if (!form.date || !form.title) { toast.error('Date and title are required'); return; }

        setIsSubmitting(true);
        try {
            if (editingEvent) {
                await updateCalendarEvent(editingEvent.id, form);
                toast.success('Event updated');
            } else {
                await addCalendarEvent({ ...form, academicYear: getCurrentAcademicYear() });
                toast.success('Event added');
            }
            setShowModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error("Failed to save event");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => { setForm({ date: '', title: '', description: '' }); setEditingEvent(null); };

    const handleDelete = async (id) => {
        if (!confirm("Delete this event?")) return;
        try {
            await deleteCalendarEvent(id);
            toast.success('Event deleted');
            fetchData();
        } catch (error) {
            toast.error("Failed to delete event");
            console.error(error);
        }
    };

    const isPast = (date) => new Date(date) < new Date();

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
    <div className="animate-fade-in">
        <div className="page-header">
            <div><h1 className="page-title">Academic Calendar</h1><p className="page-subtitle">Manage school events, holidays, and important dates</p></div>
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}><FiPlus /> Add Event</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sortedEvents.map(event => (
                <div key={event.id} className="card" style={{
                    padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
                    opacity: isPast(event.date) ? 0.5 : 1,
                }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: '0.75rem',
                        background: isPast(event.date) ? 'var(--color-surface-hover)' : 'var(--color-primary-50)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                            {new Date(event.date).toLocaleDateString('en-IN', { month: 'short' })}
                        </span>
                        <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>
                            {new Date(event.date).getDate()}
                        </span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{event.title}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{event.description}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditingEvent(event); setForm({ date: event.date, title: event.title, description: event.description }); setShowModal(true); }}><FiEdit2 /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(event.id)}><FiTrash2 style={{ color: 'var(--color-danger)' }} /></button>
                    </div>
                </div>
            ))}
        </div>

        <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingEvent ? 'Edit Event' : 'Add Event'}
            footer={<><button className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group"><label className="input-label">Date *</label><input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Title *</label><input className="input" placeholder="e.g. Independence Day" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Description</label><textarea className="input" placeholder="Event details..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
        </Modal>
    </div>
    );
}
