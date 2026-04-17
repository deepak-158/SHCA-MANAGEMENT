'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAnnouncements } from '@/lib/communicationService';
import { FiBell } from 'react-icons/fi';

export default function AnnouncementsViewPage() {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const role = user?.role;
                const classId = user?.class || user?.classTeacherOf;
                const anns = await getAnnouncements({ targetRole: role, classId });
                setAnnouncements(anns);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (user) fetch();
    }, [user]);

    if (loading) return <div className="loading-overlay" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Announcements</h1>
                    <p className="page-subtitle">School notices and important updates</p>
                </div>
            </div>

            {announcements.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📢</div>
                    <div className="empty-state-title">No announcements</div>
                    <p className="empty-state-text">There are no announcements at this time.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {announcements.map(ann => (
                        <div key={ann.id} className="card" style={{ borderLeft: ann.isUrgent ? '3px solid var(--color-danger)' : '3px solid var(--color-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <FiBell style={{ color: ann.isUrgent ? 'var(--color-danger)' : 'var(--color-primary)' }} />
                                {ann.isUrgent && <span className="badge badge-danger">Urgent</span>}
                                <span style={{ fontSize: '1rem', fontWeight: 700 }}>{ann.title}</span>
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: '0.5rem' }}>{ann.content}</p>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                By {ann.createdBy || 'Admin'} • {ann.createdAt?.toDate ? ann.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Just now'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
