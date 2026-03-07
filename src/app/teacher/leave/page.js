'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { FiCheck, FiX } from 'react-icons/fi';
import { getLeaveRequests, updateLeaveStatus, getStudents, getClasses } from '@/lib/dataService';

export default function TeacherLeavePage() {
    const toast = useToast();
    const { user } = useAuth();
    const classInfo = user?.classTeacherOf;

    const [leaves, setLeaves] = useState([]);
    const [students, setStudents] = useState([]);
    const [className, setClassName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (classInfo) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [classInfo]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [lData, stData, cData] = await Promise.all([
                getLeaveRequests(),
                getStudents(),
                getClasses()
            ]);

            // Resolve class name for display
            const classDoc = cData.find(c => c.id === classInfo.class);
            setClassName(classDoc?.name || classInfo.class);

            // Filter leaves for this teacher's class
            const myLeaves = lData.filter(l =>
                l.classId === classInfo.class &&
                l.sectionId === classInfo.section
            );

            // Filter students to just this class to save memory
            const mySt = stData.filter(s => s.class === classInfo.class && s.section === classInfo.section);

            setLeaves(myLeaves.sort((a, b) => new Date(b.startDate) - new Date(a.startDate)));
            setStudents(mySt);
        } catch (error) {
            toast.error("Failed to load leave requests");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, status) => {
        if (!confirm(`Are you sure you want to mark this leave as ${status}?`)) return;

        try {
            const remarks = `${status} by Class Teacher`;
            await updateLeaveStatus(id, status, remarks);

            // Update local state without full refetch
            setLeaves(leaves.map(l =>
                l.id === id ? { ...l, status, remarks } : l
            ));

            toast.success(`Leave ${status.toLowerCase()}`);
        } catch (error) {
            toast.error(`Failed to update leave status`);
            console.error(error);
        }
    };

    const getStudentName = (leave) => {
        // Try looking up by studentId in students collection first
        const byId = students.find(s => s.id === leave.studentId);
        if (byId) return byId.name;
        // Fall back to stored name in leave doc
        if (leave.studentName) return leave.studentName;
        return 'Unknown Student';
    };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    if (!classInfo) return <div className="card"><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">You are not assigned as a class teacher</div></div></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header"><div><h1 className="page-title">Leave Requests</h1><p className="page-subtitle">Review applications for {className} - {classInfo.section}</p></div></div>

            {leaves.length > 0 ? (
                <div className="table-container">
                    <table className="table">
                        <thead><tr><th>Student</th><th>Reason</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {leaves.map(leave => (
                                <tr key={leave.id}>
                                    <td style={{ fontWeight: 600 }}>{getStudentName(leave)}</td>
                                    <td>{leave.reason}</td>
                                    <td><div style={{ fontSize: '0.8125rem' }}>{formatDate(leave.startDate)} — {formatDate(leave.endDate)}</div></td>
                                    <td><span className={`badge badge-${leave.status === 'Approved' ? 'success' : leave.status === 'Rejected' ? 'danger' : 'warning'}`}>{leave.status}</span></td>
                                    <td>
                                        {leave.status === 'Pending' && (
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                <button className="btn btn-success btn-sm" onClick={() => handleAction(leave.id, 'Approved')} title="Approve"><FiCheck /></button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleAction(leave.id, 'Rejected')} title="Reject"><FiX /></button>
                                            </div>
                                        )}
                                        {leave.status !== 'Pending' && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{leave.remarks}</div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">No leave requests found for your class</div></div></div>
            )}
        </div>
    );
}
