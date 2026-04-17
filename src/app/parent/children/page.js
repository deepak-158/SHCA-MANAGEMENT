'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getChildrenByParentEmail } from '@/lib/parentService';
import { getClasses } from '@/lib/dataService';
import { FiHeart, FiUser, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';

export default function ChildrenPage() {
    const { user } = useAuth();
    const [children, setChildren] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [kids, cls] = await Promise.all([
                    getChildrenByParentEmail(user?.email),
                    getClasses(),
                ]);
                setChildren(kids);
                setClasses(cls);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (user?.email) fetch();
    }, [user]);

    const getClassName = (id) => classes.find(c => c.id === id)?.name || id;

    if (loading) return <div className="loading-overlay" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">My Children</h1>
                    <p className="page-subtitle">View profiles of your children enrolled in the school</p>
                </div>
            </div>

            {children.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">👶</div>
                    <div className="empty-state-title">No children found</div>
                </div>
            ) : (
                <div className="grid-cards">
                    {children.map(child => (
                        <div key={child.id} className="card card-hover">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                                <div style={{
                                    width: 56, height: 56, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.25rem', fontWeight: 700, color: '#fff',
                                }}>
                                    {child.name?.charAt(0)}
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{child.name}</div>
                                    <span className="badge badge-primary">{getClassName(child.class)} - {child.section}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem' }}>
                                    <FiUser style={{ color: 'var(--color-text-muted)' }} />
                                    <span><strong>Gender:</strong> {child.gender}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem' }}>
                                    <FiHeart style={{ color: 'var(--color-text-muted)' }} />
                                    <span><strong>Roll No:</strong> {child.rollNumber} • <strong>Adm:</strong> {child.admissionNumber}</span>
                                </div>
                                {child.dob && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem' }}>
                                        <FiUser style={{ color: 'var(--color-text-muted)' }} />
                                        <span><strong>DOB:</strong> {new Date(child.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                )}
                                {child.address && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem' }}>
                                        <FiMapPin style={{ color: 'var(--color-text-muted)' }} />
                                        <span>{child.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
