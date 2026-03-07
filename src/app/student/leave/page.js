'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { FiSend } from 'react-icons/fi';
import { getLeaveRequests, submitLeaveRequest } from '@/lib/dataService';

export default function StudentLeavePage() {
    const toast = useToast();
    const { user } = useAuth();
    const [leaves, setLeaves] = useState([]);
    const [form, setForm] = useState({ reason: '', startDate: '', endDate: '' });
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user) fetchLeaves();
    }, [user]);

    const fetchLeaves = async () => {
        try {
            const data = await getLeaveRequests();
            const myLeaves = data.filter(l => l.studentId === user.studentId || l.studentId === user.uid || l.studentId === user.id);
            setLeaves(myLeaves.sort((a, b) => new Date(b.startDate) - new Date(a.startDate)));
        } catch (error) {
            toast.error("Failed to load leave history");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.reason || !form.startDate || !form.endDate) { toast.error('Fill all fields'); return; }
        if (new Date(form.endDate) < new Date(form.startDate)) { toast.error('End date must be after start date'); return; }

        setIsSubmitting(true);
        try {
            const studentId = user.studentId || user.uid || user.id;
            const leaveData = {
                studentId,
                studentName: user.name,
                classId: user.class,
                sectionId: user.section,
                reason: form.reason,
                startDate: form.startDate,
                endDate: form.endDate
            };
            const docRef = await submitLeaveRequest(leaveData);

            setLeaves([{ id: docRef.id, ...leaveData, status: 'Pending' }, ...leaves]);
            setForm({ reason: '', startDate: '', endDate: '' });
            toast.success('Leave request submitted');
        } catch (error) {
            toast.error("Failed to submit leave request");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const statusColors = { Pending: 'warning', Approved: 'success', Rejected: 'danger' };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header"><div><h1 className="page-title">Leave Request</h1><p className="page-subtitle">Apply for leave and track status</p></div></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Apply form */}
                <div className="card">
                    <div className="card-header"><span className="card-title">Apply for Leave</span></div>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="input-group">
                            <label className="input-label">Reason *</label>
                            <textarea className="input" placeholder="Reason for leave..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} disabled={isSubmitting} />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label className="input-label">From Date *</label>
                                <input className="input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} min={new Date().toISOString().split('T')[0]} disabled={isSubmitting} />
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label className="input-label">To Date *</label>
                                <input className="input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} min={form.startDate || new Date().toISOString().split('T')[0]} disabled={isSubmitting} />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            <FiSend /> {isSubmitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </form>
                </div>

                {/* History */}
                <div className="card">
                    <div className="card-header"><span className="card-title">My Leave History</span></div>
                    {leaves.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-text">No leave requests yet</div></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {leaves.map(l => (
                                <div key={l.id} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}><span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{l.reason}</span><span className={`badge badge-${statusColors[l.status]}`}>{l.status}</span></div>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{formatDate(l.startDate)} — {formatDate(l.endDate)}</div>
                                    {l.remarks && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>📝 {l.remarks}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
