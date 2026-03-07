'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/constants';
import { getInitials } from '@/lib/utils';
import {
    FiHome, FiUsers, FiBookOpen, FiCalendar, FiClock,
    FiCheckSquare, FiFileText, FiAward, FiArrowUpRight,
    FiBarChart2, FiLogOut, FiSettings, FiClipboard, FiGrid,
    FiDownload, FiEdit3, FiX, FiMenu, FiActivity
} from 'react-icons/fi';

const adminNavItems = [
    { label: 'Overview', section: 'MAIN' },
    { href: '/admin', icon: <FiHome />, label: 'Dashboard' },
    { label: 'Management', section: 'MANAGEMENT' },
    { href: '/admin/classes', icon: <FiGrid />, label: 'Classes & Sections' },
    { href: '/admin/teachers', icon: <FiUsers />, label: 'Teachers' },
    { href: '/admin/students', icon: <FiBookOpen />, label: 'Students' },
    { label: 'Academics', section: 'ACADEMICS' },
    { href: '/admin/timetable', icon: <FiClock />, label: 'Timetable' },
    { href: '/admin/syllabus', icon: <FiFileText />, label: 'Syllabus' },
    { href: '/admin/calendar', icon: <FiCalendar />, label: 'Academic Calendar' },
    { label: 'Assessment', section: 'ASSESSMENT' },
    { href: '/admin/attendance', icon: <FiCheckSquare />, label: 'Attendance' },
    { href: '/admin/leave', icon: <FiClipboard />, label: 'Leave Requests' },
    { href: '/admin/exams', icon: <FiEdit3 />, label: 'Examinations' },
    { href: '/admin/results', icon: <FiAward />, label: 'Results' },
    { href: '/admin/promotion', icon: <FiArrowUpRight />, label: 'Promotion' },
    { label: 'Reports', section: 'REPORTS' },
    { href: '/admin/reports', icon: <FiBarChart2 />, label: 'Reports & Analytics' },
    { href: '/admin/audit-logs', icon: <FiActivity />, label: 'Audit Logs' },
];

const teacherNavItems = [
    { label: 'Overview', section: 'MAIN' },
    { href: '/teacher', icon: <FiHome />, label: 'Dashboard' },
    { label: 'Daily Tasks', section: 'DAILY' },
    { href: '/teacher/attendance', icon: <FiCheckSquare />, label: 'Attendance' },
    { href: '/teacher/leave', icon: <FiClipboard />, label: 'Leave Requests' },
    { label: 'Academics', section: 'ACADEMICS' },
    { href: '/teacher/timetable', icon: <FiClock />, label: 'My Timetable' },
    { href: '/teacher/marks', icon: <FiEdit3 />, label: 'Enter Marks' },
    { href: '/teacher/calendar', icon: <FiCalendar />, label: 'Calendar' },
];

const studentNavItems = [
    { label: 'Overview', section: 'MAIN' },
    { href: '/student', icon: <FiHome />, label: 'Dashboard' },
    { label: 'Academics', section: 'ACADEMICS' },
    { href: '/student/timetable', icon: <FiClock />, label: 'Timetable' },
    { href: '/student/attendance', icon: <FiCheckSquare />, label: 'Attendance' },
    { href: '/student/leave', icon: <FiClipboard />, label: 'Leave Request' },
    { href: '/student/syllabus', icon: <FiDownload />, label: 'Syllabus' },
    { label: 'Examinations', section: 'EXAMS' },
    { href: '/student/exams', icon: <FiEdit3 />, label: 'Exam Schedule' },
    { href: '/student/results', icon: <FiAward />, label: 'Results' },
    { href: '/student/calendar', icon: <FiCalendar />, label: 'Calendar' },
];

export default function Sidebar({ sidebarOpen, onCloseSidebar }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    let navItems = adminNavItems;
    if (user?.role === ROLES.CLASS_TEACHER || user?.role === ROLES.SUBJECT_TEACHER) {
        navItems = teacherNavItems;
    } else if (user?.role === ROLES.STUDENT) {
        navItems = studentNavItems;
    }

    const roleName = {
        [ROLES.ADMIN]: 'Administrator',
        [ROLES.CLASS_TEACHER]: 'Class Teacher',
        [ROLES.SUBJECT_TEACHER]: 'Subject Teacher',
        [ROLES.STUDENT]: 'Student',
    };

    return (
        <>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                        zIndex: 45, display: 'none',
                    }}
                    className="sidebar-overlay"
                    onClick={onCloseSidebar}
                />
            )}

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">🎓</div>
                    <div>
                        <div className="sidebar-logo-text">SMS Portal</div>
                        <div className="sidebar-logo-sub">School Management</div>
                    </div>
                    <button
                        onClick={onCloseSidebar}
                        style={{
                            marginLeft: 'auto', background: 'none', border: 'none',
                            color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.125rem',
                            display: 'none',
                        }}
                        className="sidebar-close-btn"
                    >
                        <FiX />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item, i) => {
                        if (item.section) {
                            return (
                                <div key={i} className="sidebar-section-label">
                                    {item.section}
                                </div>
                            );
                        }
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                                onClick={onCloseSidebar}
                            >
                                <span className="sidebar-link-icon">{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.5rem 0.75rem', marginBottom: '0.5rem',
                    }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.8125rem', fontWeight: 600, color: '#fff', flexShrink: 0,
                        }}>
                            {getInitials(user?.name || '')}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{
                                fontSize: '0.8125rem', fontWeight: 600, color: '#fff',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                                {user?.name}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)' }}>
                                {roleName[user?.role] || 'User'}
                            </div>
                        </div>
                    </div>

                    <button onClick={logout} className="sidebar-link" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        <span className="sidebar-link-icon"><FiLogOut /></span>
                        Sign Out
                    </button>
                </div>
            </aside>

            <style jsx global>{`
        @media (max-width: 1024px) {
          .sidebar-overlay { display: block !important; }
          .sidebar-close-btn { display: block !important; }
        }
      `}</style>
        </>
    );
}
