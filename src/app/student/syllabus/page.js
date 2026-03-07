'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FiDownload, FiFileText } from 'react-icons/fi';
import { getSyllabuses, getClasses } from '@/lib/dataService';
import { useToast } from '@/components/ui/Toast';
import { formatDate, getCurrentAcademicYear } from '@/lib/utils';

export default function StudentSyllabusPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [syllabuses, setSyllabuses] = useState([]);
    const [className, setClassName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchSyllabus();
    }, [user]);

    const fetchSyllabus = async () => {
        try {
            const [sData, cData] = await Promise.all([
                getSyllabuses(), getClasses()
            ]);

            const mySyllabuses = sData.filter(s => s.classId === user.class);
            setSyllabuses(mySyllabuses);

            const classDoc = cData.find(c => c.id === user.class);
            if (classDoc) setClassName(classDoc.name);
        } catch (error) {
            toast.error("Failed to load syllabus");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header"><div><h1 className="page-title">Syllabus</h1><p className="page-subtitle">Download your class syllabus</p></div></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {syllabuses.length > 0 ? syllabuses.map(s => (
                    <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '0.75rem', background: 'var(--color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)', fontSize: '1.5rem', flexShrink: 0 }}><FiFileText /></div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>Class {className} Syllabus</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Academic Year {getCurrentAcademicYear()}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>PDF • Updated {formatDate(s.uploadedAt)}</div>
                        </div>
                        <a href={s.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: 'none' }} download>
                            <FiDownload /> Download
                        </a>
                    </div>
                )) : (
                    <div className="card"><div className="empty-state"><div className="empty-state-icon">📄</div><div className="empty-state-title">No syllabus uploaded yet</div></div></div>
                )}
            </div>
        </div>
    );
}
