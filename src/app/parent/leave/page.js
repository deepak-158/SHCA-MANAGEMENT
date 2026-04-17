'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { getChildrenByParentEmail, getChildLeaves } from '@/lib/parentService';
import { getClasses, submitLeaveRequest } from '@/lib/dataService';
import Modal from '@/components/ui/Modal';
import { FiPlus, FiClipboard } from 'react-icons/fi';
import { formatDate } from '@/lib/utils';

export default function ParentLeavePage() {
    const { user } = useAuth();
    const toast = useToast();
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [classes, setClasses] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ reason: '', startDate: '', endDate: '' });

    useEffect(() => {
        const fetch = async () => {
            try {
                const [kids, cls] = await Promise.all([getChildrenByParentEmail(user?.email), getClasses()]);
                setChildren(kids); setClasses(cls);
                if (kids.length > 0) setSelectedChild(kids[0]);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (user?.email) fetch();
    }, [user]);

    useEffect(() => {
        if (!selectedChild) return;
        const fetchLeaves = async () => {
            try {
                const data = await getChildLeaves(selectedChild.id);
                setLeaves(data);
            } catch (e) { console.error(e); }
        };
        fetchLeaves();
    }, [selectedChild]);

    const handleSubmit = async () => {
        if (!form.reason || !form.startDate || !form.endDate) {
            toast.error('Please fill all fields');
            return;
        }
        setSubmitting(true);
        try {
            await submitLeaveRequest({
                studentId: selectedChild.id,
                studentName: selectedChild.name,
                classId: selectedChild.class,
                sectionId: selectedChild.section,
                reason: form.reason,
                startDate: form.startDate,
                endDate: form.endDate,
                appliedBy: 'parent',
                parentName: user?.name,
            });
            toast.success('Leave application submitted');
            setShowModal(false);
            setForm({ reason: '', startDate: '', endDate: '' });
            // Refresh
            const data = await getChildLeaves(selectedChild.id);
            setLeaves(data);
        } catch (e) {
            toast.error('Failed to submit leave');
            console.error(e);
        } finally { setSubmitting(false); }
    };

    const getClassName = (id) => classes.find(c => c.id === id)?.name || id;

    const statusBadge = (status) => {
        const map = { Pending: 'badge-warning', Approved: 'badge-success', Rejected: 'badge-danger' };
        return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
    };

    if (loading) return <div className="loading-overlay" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Leave Applications</h1>
                    <p className="page-subtitle">Submit and track leave requests for your child</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {children.length > 1 && (
                        <select className="input" style={{ width: 'auto', minWidth: 200 }} value={selectedChild?.id || ''} onChange={e => setSelectedChild(children.find(c => c.id === e.target.value))}>
                            {children.map(c => <option key={c.id} value={c.id}>{c.name} — {getClassName(c.class)} {c.section}</option>)}
                        </select>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <FiPlus /> Apply Leave
                    </button>
                </div>
            </div>

            {/* Leave list */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Reason</th><th>From</th><th>To</th><th>Status</th><th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaves.length === 0 ? (
                            <tr><td colSpan={5}><div className="empty-state"><p className="empty-state-text">No leave applications</p></div></td></tr>
                        ) : leaves.map(l => (
                            <tr key={l.id}>
                                <td style={{ fontWeight: 500 }}>{l.reason}</td>
                                <td>{formatDate(l.startDate)}</td>
                                <td>{formatDate(l.endDate)}</td>
                                <td>{statusBadge(l.status)}</td>
                                <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{l.remarks || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Apply Leave Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="📝 Apply for Leave"
                footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</button></>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--color-info-bg)', fontSize: '0.8125rem' }}>
                        Applying leave for: <strong>{selectedChild?.name}</strong> ({getClassName(selectedChild?.class)} - {selectedChild?.section})
                    </div>
                    <div className="input-group">
                        <label className="input-label">Reason *</label>
                        <textarea className="input" placeholder="Reason for leave" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
                    </div>
                    <div className="grid-form">
                        <div className="input-group">
                            <label className="input-label">From Date *</label>
                            <input className="input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label className="input-label">To Date *</label>
                            <input className="input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
