'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { FiCheck, FiX, FiClock, FiFilter, FiTrash2 } from 'react-icons/fi';
import { getLeaves, getStudents, getClasses, updateLeaveStatus, deleteLeave } from '@/lib/dataService';

export default function LeavePage() {
    const toast = useToast();
    const [leaves, setLeaves] = useState([]);
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [filterStatus, setFilterStatus] = useState('');
    const [remarkModal, setRemarkModal] = useState(null);
    const [remark, setRemark] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [lData, stData, cData] = await Promise.all([
                getLeaves(), getStudents(), getClasses()
            ]);
            // Sort leaves to show pending first, then newest
            lData.sort((a, b) => {
                if (a.status === 'Pending' && b.status !== 'Pending') return -1;
                if (a.status !== 'Pending' && b.status === 'Pending') return 1;
                return new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate);
            });
            setLeaves(lData);
            setStudents(stData);
            setClasses(cData);
        } catch (error) {
            toast.error("Failed to load leave requests");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filtered = leaves.filter(l => !filterStatus || l.status === filterStatus);

    const handleApprove = async (leaveId) => {
        setIsSubmitting(true);
        try {
            const remarks = remark || 'Approved by admin';
            await updateLeaveStatus(leaveId, 'Approved', remarks);

            // Update local state
            setLeaves(leaves.map(l => l.id === leaveId ? { ...l, status: 'Approved', remarks } : l));
            setRemarkModal(null);
            setRemark('');
            toast.success('Leave approved');
        } catch (error) {
            toast.error("Failed to approve leave");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async (leaveId) => {
        setIsSubmitting(true);
        try {
            const remarks = remark || 'Rejected by admin';
            await updateLeaveStatus(leaveId, 'Rejected', remarks);

            // Update local state
            setLeaves(leaves.map(l => l.id === leaveId ? { ...l, status: 'Rejected', remarks } : l));
            setRemarkModal(null);
            setRemark('');
            toast.error('Leave rejected');
        } catch (error) {
            toast.error("Failed to reject leave");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStudent = (leave) => {
        // Try by student doc ID first
        const byId = students.find(s => s.id === leave.studentId);
        if (byId) return byId;
        // Fall back to stored name
        if (leave.studentName) return { name: leave.studentName };
        return null;
    };
    const getClassName = (id) => classes.find(c => c.id === id)?.name || id;

    const handleDelete = async (leaveId) => {
        if (!confirm('Are you sure you want to delete this leave request?')) return;
        try {
            await deleteLeave(leaveId);
            setLeaves(leaves.filter(l => l.id !== leaveId));
            toast.success('Leave request deleted');
        } catch (error) {
            toast.error('Failed to delete leave request');
            console.error(error);
        }
    };

    const statusColors = { Pending: 'warning', Approved: 'success', Rejected: 'danger' };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Leave Requests</h1>
                    <p className="page-subtitle">Manage student leave applications</p>
                </div>
            </div>

            <div className="filters-bar">
                {['', 'Pending', 'Approved', 'Rejected'].map(status => (
                    <button
                        key={status}
                        className={`btn btn-sm ${filterStatus === status ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilterStatus(status)}
                    >
                        {status || 'All'} {status && `(${leaves.filter(l => l.status === status).length})`}
                    </button>
                ))}
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Class</th>
                            <th>Reason</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Remarks</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(leave => {
                            const student = getStudent(leave);
                            return (
                                <tr key={leave.id}>
                                    <td style={{ fontWeight: 600 }}>{student?.name || leave.studentId}</td>
                                    <td>{getClassName(leave.classId)}</td>
                                    <td style={{ maxWidth: 200 }}>{leave.reason}</td>
                                    <td>
                                        <div style={{ fontSize: '0.8125rem' }}>{formatDate(leave.startDate)}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>to {formatDate(leave.endDate)}</div>
                                    </td>
                                    <td><span className={`badge badge-${statusColors[leave.status]}`}>{leave.status}</span></td>
                                    <td style={{ maxWidth: 180, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{leave.remarks || '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            {leave.status === 'Pending' && (
                                                <>
                                                    <button className="btn btn-success btn-sm" onClick={() => handleApprove(leave.id)}>
                                                        <FiCheck /> Approve
                                                    </button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleReject(leave.id)}>
                                                        <FiX /> Reject
                                                    </button>
                                                </>
                                            )}
                                            <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(leave.id)} title="Delete">
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">📝</div>
                        <div className="empty-state-title">No leave requests</div>
                    </div>
                )}
            </div>
        </div>
    );
}
