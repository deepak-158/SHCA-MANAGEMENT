'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/communicationService';
import { FiBell, FiCheck, FiX } from 'react-icons/fi';

export default function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!user?.uid) return;
        fetchNotifications();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const notifs = await getNotifications(user.uid);
            setNotifications(notifs.slice(0, 20));
            setUnreadCount(notifs.filter(n => !n.isRead).length);
        } catch (e) { /* silent */ }
    };

    const handleMarkRead = async (id, e) => {
        e.stopPropagation();
        try {
            await markNotificationRead(id);
            fetchNotifications();
        } catch (e) { /* silent */ }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead(user.uid);
            fetchNotifications();
        } catch (e) { /* silent */ }
    };

    const getTimeAgo = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const diff = Date.now() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const typeIcons = {
        announcement: '📢', fee_reminder: '💰', leave_update: '📋',
        result_published: '📊', homework_assigned: '📝', homework_graded: '✅',
        attendance_alert: '⚠️', general: '📌',
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'relative', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-text-secondary)',
                    padding: '0.5rem', borderRadius: '0.5rem', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
                <FiBell />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: '2px', right: '2px',
                        width: 18, height: 18, borderRadius: '50%',
                        background: 'var(--color-danger)', color: '#fff',
                        fontSize: '0.625rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid var(--color-surface)',
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem',
                    width: 360, maxHeight: 420, overflow: 'hidden',
                    background: 'var(--color-surface)', borderRadius: '0.75rem',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                    zIndex: 100, animation: 'slideUp 0.2s ease',
                    display: 'flex', flexDirection: 'column',
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.875rem 1rem', borderBottom: '1px solid var(--color-border)',
                    }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600,
                                }}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div style={{ overflowY: 'auto', maxHeight: 360 }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                🔔 No notifications
                            </div>
                        ) : notifications.map(n => (
                            <div
                                key={n.id}
                                style={{
                                    display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem',
                                    borderBottom: '1px solid var(--color-border)',
                                    background: n.isRead ? 'transparent' : 'var(--color-primary-50)',
                                    cursor: 'pointer', transition: 'background 0.2s',
                                }}
                                onMouseEnter={e => { if (n.isRead) e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
                                onMouseLeave={e => { if (n.isRead) e.currentTarget.style.background = 'transparent'; }}
                                onClick={(e) => !n.isRead && handleMarkRead(n.id, e)}
                            >
                                <span style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: '0.125rem' }}>
                                    {typeIcons[n.type] || '📌'}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: n.isRead ? 400 : 600, marginBottom: '0.125rem' }}>
                                        {n.title}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {n.message}
                                    </div>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                        {getTimeAgo(n.createdAt)}
                                    </div>
                                </div>
                                {!n.isRead && (
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0, marginTop: '0.375rem' }} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
