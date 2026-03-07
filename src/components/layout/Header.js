'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getInitials, getGreeting } from '@/lib/utils';
import { FiMenu, FiBell, FiCalendar, FiClipboard, FiX } from 'react-icons/fi';
import { getCalendarEvents, getLeaveRequests } from '@/lib/dataService';

export default function Header({ onMenuToggle, title }) {
    const { user } = useAuth();
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (user) fetchNotifications();
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const items = [];
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const nextWeek = new Date(now);
            nextWeek.setDate(nextWeek.getDate() + 7);

            // Upcoming events (next 7 days)
            const events = await getCalendarEvents();
            events.forEach(e => {
                const d = new Date(e.date);
                if (d >= now && d <= nextWeek) {
                    items.push({
                        id: `evt_${e.id}`,
                        type: 'event',
                        title: e.title,
                        subtitle: new Date(e.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
                        date: new Date(e.date),
                    });
                }
            });

            // Leave-related notifications
            if (user.role === 'student') {
                const leaves = await getLeaveRequests();
                const myLeaves = leaves.filter(l => l.studentId === user.studentId);
                myLeaves.slice(0, 5).forEach(l => {
                    if (l.status === 'Approved' || l.status === 'Rejected') {
                        items.push({
                            id: `lv_${l.id}`,
                            type: 'leave',
                            title: `Leave ${l.status}`,
                            subtitle: `${l.reason} (${l.fromDate} to ${l.toDate})`,
                            status: l.status,
                            date: l.updatedAt?.toDate?.() || l.createdAt?.toDate?.() || new Date(),
                        });
                    }
                });
            } else if (user.role === 'teacher' && user.classTeacherOf) {
                const leaves = await getLeaveRequests();
                const pendingLeaves = leaves.filter(l =>
                    l.status === 'Pending' &&
                    l.classId === user.classTeacherOf.class &&
                    l.sectionId === user.classTeacherOf.section
                );
                pendingLeaves.slice(0, 5).forEach(l => {
                    items.push({
                        id: `lv_${l.id}`,
                        type: 'leave',
                        title: 'Pending Leave Request',
                        subtitle: `${l.studentName || 'Student'} — ${l.reason}`,
                        status: 'Pending',
                        date: l.createdAt?.toDate?.() || new Date(),
                    });
                });
            } else if (user.role === 'admin') {
                const leaves = await getLeaveRequests();
                const pendingLeaves = leaves.filter(l => l.status === 'Pending');
                pendingLeaves.slice(0, 5).forEach(l => {
                    items.push({
                        id: `lv_${l.id}`,
                        type: 'leave',
                        title: 'Pending Leave Request',
                        subtitle: `${l.studentName || 'Student'} — ${l.reason}`,
                        status: 'Pending',
                        date: l.createdAt?.toDate?.() || new Date(),
                    });
                });
            }

            items.sort((a, b) => new Date(b.date) - new Date(a.date));
            setNotifications(items);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        } finally {
            setLoading(false);
        }
    };

    const statusColor = (s) => s === 'Approved' ? '#10b981' : s === 'Rejected' ? '#ef4444' : '#f59e0b';

    return (
        <header className="header">
            <div className="header-left">
                <button className="menu-toggle" onClick={onMenuToggle}>
                    <FiMenu />
                </button>
                <div>
                    <div className="header-title">{title || `${getGreeting()}, ${user?.name?.split(' ')[0] || 'User'}!`}</div>
                </div>
            </div>

            <div className="header-right">
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                    <button
                        className="btn btn-ghost btn-icon"
                        title="Notifications"
                        style={{ position: 'relative' }}
                        onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) fetchNotifications(); }}
                    >
                        <FiBell />
                        {notifications.length > 0 && (
                            <span style={{
                                position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16,
                                borderRadius: '50%', background: '#ef4444', border: '2px solid #fff',
                                fontSize: '0.5625rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, padding: '0 3px',
                            }}>
                                {notifications.length > 9 ? '9+' : notifications.length}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div style={{
                            position: 'absolute', top: '100%', right: 0, marginTop: 8,
                            width: 340, maxHeight: 420, overflowY: 'auto',
                            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                            borderRadius: '0.75rem', boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                            zIndex: 1000,
                        }}>
                            <div style={{
                                padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Notifications</span>
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowNotifications(false)}><FiX /></button>
                            </div>

                            {loading ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔔</div>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>No new notifications</div>
                                </div>
                            ) : (
                                <div>
                                    {notifications.map(n => (
                                        <div key={n.id} style={{
                                            padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)',
                                            display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                                            cursor: 'default', transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{
                                                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: n.type === 'event' ? 'var(--color-primary-50)' : (n.status === 'Pending' ? '#fef3c7' : n.status === 'Approved' ? '#d1fae5' : '#fee2e2'),
                                                color: n.type === 'event' ? 'var(--color-primary)' : statusColor(n.status),
                                                fontSize: '0.875rem',
                                            }}>
                                                {n.type === 'event' ? <FiCalendar /> : <FiClipboard />}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                    {n.title}
                                                    {n.status && <span style={{ fontSize: '0.625rem', padding: '1px 6px', borderRadius: 99, background: statusColor(n.status) + '20', color: statusColor(n.status), fontWeight: 700 }}>{n.status}</span>}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.subtitle}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="header-avatar" title={user?.name}>
                    {getInitials(user?.name || '')}
                </div>
            </div>
        </header>
    );
}
