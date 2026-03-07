'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { FiActivity, FiSearch, FiFilter } from 'react-icons/fi';
import { getAuditLogs } from '@/lib/dataService';

const ACTION_LABELS = {
    ADD_STUDENT: { label: 'Student Added', color: '#059669', bg: '#ecfdf5' },
    UPDATE_STUDENT: { label: 'Student Updated', color: '#2563eb', bg: '#eff6ff' },
    DELETE_STUDENT: { label: 'Student Deleted', color: '#dc2626', bg: '#fef2f2' },
    ADD_TEACHER: { label: 'Teacher Added', color: '#059669', bg: '#ecfdf5' },
    UPDATE_TEACHER: { label: 'Teacher Updated', color: '#2563eb', bg: '#eff6ff' },
    DELETE_TEACHER: { label: 'Teacher Deleted', color: '#dc2626', bg: '#fef2f2' },
    RESET_CREDENTIALS: { label: 'Credentials Reset', color: '#d97706', bg: '#fffbeb' },
    ADD_CLASS: { label: 'Class Added', color: '#059669', bg: '#ecfdf5' },
    UPDATE_CLASS: { label: 'Class Updated', color: '#2563eb', bg: '#eff6ff' },
    DELETE_CLASS: { label: 'Class Deleted', color: '#dc2626', bg: '#fef2f2' },
    PROMOTE_STUDENTS: { label: 'Students Promoted', color: '#7c3aed', bg: '#f5f3ff' },
};

export default function AuditLogsPage() {
    const toast = useToast();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAction, setFilterAction] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const data = await getAuditLogs(200);
            setLogs(data);
        } catch (error) {
            toast.error('Failed to load audit logs');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filtered = logs.filter(log => {
        const matchSearch = !searchQuery ||
            log.performedBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            JSON.stringify(log.details || {}).toLowerCase().includes(searchQuery.toLowerCase());
        const matchAction = !filterAction || log.action === filterAction;
        return matchSearch && matchAction;
    });

    const formatTimestamp = (ts) => {
        if (!ts) return '—';
        const date = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        return date.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const uniqueActions = [...new Set(logs.map(l => l.action))].sort();

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Audit Logs</h1>
                    <p className="page-subtitle">Track all administrative actions and changes</p>
                </div>
                <button className="btn btn-secondary" onClick={fetchLogs}>
                    <FiActivity /> Refresh
                </button>
            </div>

            <div className="filters-bar">
                <div className="search-input">
                    <FiSearch className="search-input-icon" />
                    <input className="input" placeholder="Search logs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                </div>
                <select className="input" style={{ width: 'auto', minWidth: 180 }} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
                    <option value="">All Actions</option>
                    {uniqueActions.map(a => (
                        <option key={a} value={a}>{ACTION_LABELS[a]?.label || a}</option>
                    ))}
                </select>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    {filtered.length} log{filtered.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Action</th>
                            <th>Details</th>
                            <th>Performed By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(log => {
                            const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: '#64748b', bg: '#f1f5f9' };
                            return (
                                <tr key={log.id}>
                                    <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{formatTimestamp(log.timestamp)}</td>
                                    <td>
                                        <span style={{
                                            display: 'inline-block', padding: '0.25rem 0.625rem',
                                            borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600,
                                            color: actionInfo.color, background: actionInfo.bg,
                                        }}>
                                            {actionInfo.label}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {log.details?.name && <span style={{ fontWeight: 500 }}>{log.details.name}</span>}
                                        {log.details?.studentId && <span> ({log.details.studentId})</span>}
                                        {log.details?.teacherId && <span> ({log.details.teacherId})</span>}
                                        {log.details?.className && <span> {log.details.className}</span>}
                                        {!log.details?.name && !log.details?.className && JSON.stringify(log.details || {})}
                                    </td>
                                    <td style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{log.performedBy}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <div className="empty-state-title">No audit logs found</div>
                    </div>
                )}
            </div>
        </div>
    );
}
