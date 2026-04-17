'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { getHomework, getStudentSubmissions, submitHomework } from '@/lib/homeworkService';
import { getSubjects } from '@/lib/dataService';
import { uploadFile } from '@/lib/cloudinary';
import Modal from '@/components/ui/Modal';
import { FiBook, FiUpload, FiClock, FiCheckCircle, FiAlertCircle, FiPaperclip } from 'react-icons/fi';
import { formatDate } from '@/lib/utils';

export default function StudentHomeworkPage() {
    const { user } = useAuth();
    const toast = useToast();
    const fileRef = useRef(null);
    const [homework, setHomework] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [selectedHW, setSelectedHW] = useState(null);
    const [submitFiles, setSubmitFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [hw, subs, subjs] = await Promise.all([
                    getHomework({ classId: user?.class, sectionId: user?.section }),
                    getStudentSubmissions(user?.studentId),
                    getSubjects(),
                ]);
                setHomework(hw); setSubmissions(subs); setSubjects(subjs);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (user?.class) fetch();
    }, [user]);

    const getSubmission = (hwId) => submissions.find(s => s.homeworkId === hwId);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            toast.info('Uploading...');
            const url = await uploadFile(file);
            setSubmitFiles(prev => [...prev, { name: file.name, url }]);
            toast.success('File attached');
        } catch (err) { toast.error('Upload failed'); }
        e.target.value = '';
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await submitHomework({
                homeworkId: selectedHW.id,
                studentId: user?.studentId,
                studentName: user?.name,
                attachments: submitFiles,
            });
            toast.success('Homework submitted');
            setShowSubmitModal(false); setSubmitFiles([]); setSelectedHW(null);
            // Refresh
            const subs = await getStudentSubmissions(user?.studentId);
            setSubmissions(subs);
        } catch (e) { toast.error('Failed: ' + e.message); }
        finally { setSubmitting(false); }
    };

    const isOverdue = (dueDate) => new Date(dueDate) < new Date();

    if (loading) return <div className="loading-overlay" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Homework</h1>
                    <p className="page-subtitle">View assigned homework and submit your work</p>
                </div>
            </div>

            {homework.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📚</div>
                    <div className="empty-state-title">No homework assigned</div>
                    <p className="empty-state-text">Assignments will appear here once your teacher posts them.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {homework.sort((a, b) => new Date(b.dueDate || 0) - new Date(a.dueDate || 0)).map(hw => {
                        const sub = getSubmission(hw.id);
                        const overdue = isOverdue(hw.dueDate) && !sub;
                        const statusInfo = sub
                            ? sub.status === 'Graded' ? { text: `Graded: ${sub.grade}`, badge: 'badge-success', icon: <FiCheckCircle /> }
                                : sub.status === 'Resubmit' ? { text: 'Resubmit', badge: 'badge-danger', icon: <FiAlertCircle /> }
                                    : { text: 'Submitted', badge: 'badge-info', icon: <FiCheckCircle /> }
                            : overdue ? { text: 'Overdue', badge: 'badge-danger', icon: <FiAlertCircle /> }
                                : { text: 'Pending', badge: 'badge-warning', icon: <FiClock /> };

                        return (
                            <div key={hw.id} className="card" style={{ borderLeft: `3px solid ${sub?.status === 'Graded' ? 'var(--color-success)' : overdue ? 'var(--color-danger)' : 'var(--color-primary)'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                                            <FiBook style={{ color: 'var(--color-primary)' }} />
                                            <span style={{ fontSize: '1rem', fontWeight: 700 }}>{hw.title}</span>
                                        </div>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>{hw.description}</p>
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            {hw.subjectName && <span>📖 {hw.subjectName}</span>}
                                            <span>📅 Due: {formatDate(hw.dueDate)}</span>
                                            {hw.teacherName && <span>👩‍🏫 {hw.teacherName}</span>}
                                            {hw.attachments?.length > 0 && (
                                                <span>📎 {hw.attachments.map((a, i) => (
                                                    <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', marginLeft: '0.25rem' }}>{a.name}</a>
                                                ))}</span>
                                            )}
                                        </div>
                                        {sub?.feedback && (
                                            <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'var(--color-info-bg)', fontSize: '0.8125rem' }}>
                                                <strong>Teacher Feedback:</strong> {sub.feedback}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                        <span className={`badge ${statusInfo.badge}`}>{statusInfo.icon} {statusInfo.text}</span>
                                        {(!sub || sub.status === 'Resubmit') && (
                                            <button className="btn btn-sm btn-primary" onClick={() => { setSelectedHW(hw); setSubmitFiles([]); setShowSubmitModal(true); }}>
                                                <FiUpload /> {sub?.status === 'Resubmit' ? 'Resubmit' : 'Submit'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Submit Modal */}
            <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title={`📤 Submit: ${selectedHW?.title}`}
                footer={<><button className="btn btn-secondary" onClick={() => setShowSubmitModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Homework'}</button></>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--color-bg)', fontSize: '0.8125rem' }}>
                        <strong>{selectedHW?.title}</strong><br />
                        <span style={{ color: 'var(--color-text-secondary)' }}>Due: {formatDate(selectedHW?.dueDate)}</span>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Upload your work</label>
                        <input type="file" ref={fileRef} onChange={handleFileUpload} style={{ fontSize: '0.875rem' }} />
                        {submitFiles.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                {submitFiles.map((f, i) => (
                                    <span key={i} className="badge badge-success"><FiPaperclip /> {f.name}</span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                        💡 You can upload documents, images, or any file related to your homework.
                    </div>
                </div>
            </Modal>
        </div>
    );
}
