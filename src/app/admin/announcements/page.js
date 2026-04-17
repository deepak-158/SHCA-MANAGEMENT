'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiBell, FiSearch } from 'react-icons/fi';
import { getClasses, addAuditLog } from '@/lib/dataService';
import { getAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/lib/communicationService';
import { ROLES } from '@/constants';
import { formatDate } from '@/lib/utils';

export default function AdminAnnouncementsPage() {
    const toast = useToast();
    const [announcements, setAnnouncements] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [form, setForm] = useState({
        title: '', content: '', isUrgent: false,
        targetRoles: [], targetClasses: [],
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [anns, cls] = await Promise.all([getAnnouncements(), getClasses()]);
            setAnnouncements(anns); setClasses(cls);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        if (!form.title || !form.content) { toast.error('Title and content are required'); return; }
        try {
            if (editing) {
                await updateAnnouncement(editing.id, form);
                toast.success('Updated');
            } else {
                await addAnnouncement({ ...form, createdBy: 'Admin' });
                await addAuditLog('CREATE_ANNOUNCEMENT', { title: form.title });
                toast.success('Announcement published');
            }
            setShowModal(false); resetForm(); fetchData();
        } catch (e) { toast.error('Failed: ' + e.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this announcement?')) return;
        try {
            await deleteAnnouncement(id);
            toast.success('Deleted'); fetchData();
        } catch (e) { toast.error('Failed'); }
    };

    const resetForm = () => {
        setForm({ title: '', content: '', isUrgent: false, targetRoles: [], targetClasses: [] });
        setEditing(null);
    };

    const toggleRole = (role) => {
        setForm(prev => ({
            ...prev,
            targetRoles: prev.targetRoles.includes(role)
                ? prev.targetRoles.filter(r => r !== role)
                : [...prev.targetRoles, role],
        }));
    };

    const filtered = announcements.filter(a =>
        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Announcements</h1>
                    <p className="page-subtitle">Broadcast notices to students, teachers, and parents</p>
                </div>
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                    <FiPlus /> New Announcement
                </button>
            </div>

            <div className="filters-bar">
                <div className="search-input"><FiSearch className="search-input-icon" /><input className="input" placeholder="Search announcements..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: '2.5rem' }} /></div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{filtered.length} announcements</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filtered.length === 0 ? (
                    <div className="empty-state"><div className="empty-state-icon">📢</div><div className="empty-state-title">No announcements</div></div>
                ) : filtered.map(ann => (
                    <div key={ann.id} className="card" style={{ borderLeft: ann.isUrgent ? '3px solid var(--color-danger)' : '3px solid var(--color-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                                    {ann.isUrgent && <span className="badge badge-danger">🔴 Urgent</span>}
                                    <span style={{ fontSize: '1rem', fontWeight: 700 }}>{ann.title}</span>
                                </div>
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem', lineHeight: 1.6 }}>{ann.content}</p>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                                    {ann.targetRoles?.length > 0 ? ann.targetRoles.map(r => (
                                        <span key={r} className="badge badge-neutral">{r}</span>
                                    )) : <span className="badge badge-primary">All Users</span>}
                                    <span style={{ color: 'var(--color-text-muted)' }}>• {ann.createdAt?.toDate ? ann.createdAt.toDate().toLocaleDateString('en-IN') : 'Just now'}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditing(ann); setForm(ann); setShowModal(true); }}><FiEdit2 /></button>
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(ann.id)}><FiTrash2 style={{ color: 'var(--color-danger)' }} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editing ? 'Edit Announcement' : '📢 New Announcement'} size="lg"
                footer={<><button className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Publish'}</button></>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="input-group">
                        <label className="input-label">Title *</label>
                        <input className="input" placeholder="Announcement title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Content *</label>
                        <textarea className="input" style={{ minHeight: 120 }} placeholder="Write your announcement here..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Target Audience (leave empty for all)</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {[{ key: 'admin', label: 'Admin' }, { key: 'class_teacher', label: 'Teachers' }, { key: 'student', label: 'Students' }, { key: 'parent', label: 'Parents' }].map(role => (
                                <button key={role.key}
                                    className={`btn btn-sm ${form.targetRoles.includes(role.key) ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => toggleRole(role.key)}
                                    type="button"
                                >
                                    {role.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Target Classes (leave empty for all)</label>
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                            {classes.map(cls => (
                                <button key={cls.id}
                                    className={`btn btn-sm ${form.targetClasses?.includes(cls.id) ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setForm(prev => ({
                                        ...prev,
                                        targetClasses: prev.targetClasses?.includes(cls.id)
                                            ? prev.targetClasses.filter(c => c !== cls.id)
                                            : [...(prev.targetClasses || []), cls.id],
                                    }))}
                                    type="button"
                                >
                                    {cls.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.isUrgent} onChange={e => setForm({ ...form, isUrgent: e.target.checked })} />
                        <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>🔴 Mark as Urgent</span>
                    </label>
                </div>
            </Modal>
        </div>
    );
}
