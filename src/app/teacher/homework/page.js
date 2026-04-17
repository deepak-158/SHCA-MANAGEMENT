'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { getClasses, getSections, getSubjects, getStudents } from '@/lib/dataService';
import { getHomework, addHomework, updateHomework, deleteHomework, getSubmissions, gradeSubmission, markResubmit } from '@/lib/homeworkService';
import { uploadFile } from '@/lib/cloudinary';
import { FiPlus, FiEdit2, FiTrash2, FiBook, FiPaperclip, FiUsers, FiCheck, FiX, FiEye } from 'react-icons/fi';
import { formatDate } from '@/lib/utils';

export default function TeacherHomeworkPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [homework, setHomework] = useState([]);
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedHW, setSelectedHW] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState({
        title: '', description: '', classId: '', sectionId: '', subjectId: '',
        dueDate: '', attachments: [],
    });

    const [gradeForm, setGradeForm] = useState({ submissionId: '', grade: '', feedback: '' });
    const [showGradeModal, setShowGradeModal] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [cls, sec, subs, stu] = await Promise.all([getClasses(), getSections(), getSubjects(), getStudents()]);
            setClasses(cls); setSections(sec); setSubjects(subs); setStudents(stu);

            // Fetch homework for teacher's assigned classes
            const assignedClasses = user?.assignedClasses || [];
            const classTeacherOf = user?.classTeacherOf;
            let allHW = [];

            if (assignedClasses.length > 0 || classTeacherOf) {
                // Fetch all homework and filter
                const hw = await getHomework({ teacherId: user?.teacherId });
                allHW = hw;
            }
            // Fallback: fetch all if teacher has no assignments tracked
            if (allHW.length === 0) {
                const hw = await getHomework({});
                allHW = hw.filter(h => h.teacherId === user?.teacherId);
            }
            setHomework(allHW);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const getClassName = (id) => classes.find(c => c.id === id)?.name || id;
    const getSubjectName = (id) => subjects.find(s => s.id === id)?.name || id;

    const handleSave = async () => {
        if (!form.title || !form.classId || !form.sectionId || !form.dueDate) {
            toast.error('Please fill all required fields'); return;
        }
        setIsSubmitting(true);
        try {
            const subjectName = getSubjectName(form.subjectId);
            const data = {
                ...form,
                teacherId: user?.teacherId,
                teacherName: user?.name,
                subjectName,
            };
            if (editing) {
                await updateHomework(editing.id, data);
                toast.success('Homework updated');
            } else {
                await addHomework(data);
                toast.success('Homework assigned');
            }
            setShowModal(false); resetForm(); fetchData();
        } catch (e) { toast.error('Failed: ' + e.message); }
        finally { setIsSubmitting(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this homework?')) return;
        try {
            await deleteHomework(id);
            toast.success('Deleted'); fetchData();
        } catch (e) { toast.error('Failed'); }
    };

    const handleViewSubmissions = async (hw) => {
        setSelectedHW(hw);
        try {
            const subs = await getSubmissions(hw.id);
            setSubmissions(subs);
            setShowSubmissionsModal(true);
        } catch (e) { toast.error('Failed to load submissions'); }
    };

    const handleGrade = async () => {
        if (!gradeForm.grade) { toast.error('Grade is required'); return; }
        try {
            await gradeSubmission(gradeForm.submissionId, gradeForm.grade, gradeForm.feedback);
            toast.success('Graded');
            setShowGradeModal(false);
            // Refresh submissions
            if (selectedHW) {
                const subs = await getSubmissions(selectedHW.id);
                setSubmissions(subs);
            }
        } catch (e) { toast.error('Failed'); }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            toast.info('Uploading...');
            const url = await uploadFile(file);
            setForm(prev => ({ ...prev, attachments: [...prev.attachments, { name: file.name, url }] }));
            toast.success('File attached');
        } catch (err) { toast.error('Upload failed'); }
        e.target.value = '';
    };

    const resetForm = () => {
        setForm({ title: '', description: '', classId: '', sectionId: '', subjectId: '', dueDate: '', attachments: [] });
        setEditing(null);
    };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Homework Management</h1>
                    <p className="page-subtitle">Create assignments and track student submissions</p>
                </div>
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                    <FiPlus /> Assign Homework
                </button>
            </div>

            {homework.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📝</div>
                    <div className="empty-state-title">No homework assigned yet</div>
                    <p className="empty-state-text">Click &quot;Assign Homework&quot; to create your first assignment.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {homework.sort((a, b) => new Date(b.dueDate || 0) - new Date(a.dueDate || 0)).map(hw => {
                        const isOverdue = new Date(hw.dueDate) < new Date();
                        return (
                            <div key={hw.id} className="card" style={{ borderLeft: isOverdue ? '3px solid var(--color-danger)' : '3px solid var(--color-primary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                                            <FiBook style={{ color: 'var(--color-primary)' }} />
                                            <span style={{ fontSize: '1rem', fontWeight: 700 }}>{hw.title}</span>
                                            {isOverdue && <span className="badge badge-danger">Overdue</span>}
                                        </div>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>{hw.description}</p>
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            <span>📚 {getClassName(hw.classId)} - {hw.sectionId}</span>
                                            {hw.subjectName && <span>📖 {hw.subjectName}</span>}
                                            <span>📅 Due: {formatDate(hw.dueDate)}</span>
                                            {hw.attachments?.length > 0 && <span>📎 {hw.attachments.length} file(s)</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button className="btn btn-sm btn-secondary" onClick={() => handleViewSubmissions(hw)}><FiEye /> Submissions</button>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditing(hw); setForm(hw); setShowModal(true); }}><FiEdit2 /></button>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(hw.id)}><FiTrash2 style={{ color: 'var(--color-danger)' }} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Homework Modal */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editing ? 'Edit Homework' : '📝 Assign New Homework'} size="lg"
                footer={<><button className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : editing ? 'Update' : 'Assign'}</button></>}>
                <div className="grid-form">
                    <div className="input-group grid-form-full"><label className="input-label">Title *</label><input className="input" placeholder="e.g. Chapter 5 Exercises" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                    <div className="input-group grid-form-full"><label className="input-label">Description</label><textarea className="input" placeholder="Describe the assignment..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                    <div className="input-group"><label className="input-label">Class *</label><select className="input" value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value, sectionId: '' })}><option value="">Select</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                    <div className="input-group"><label className="input-label">Section *</label><select className="input" value={form.sectionId} onChange={e => setForm({ ...form, sectionId: e.target.value })} disabled={!form.classId}><option value="">Select</option>{sections.filter(s => s.classId === form.classId).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                    <div className="input-group"><label className="input-label">Subject</label><select className="input" value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}><option value="">Select</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    <div className="input-group"><label className="input-label">Due Date *</label><input className="input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
                    <div className="input-group grid-form-full">
                        <label className="input-label">Attachments</label>
                        <input type="file" onChange={handleFileUpload} style={{ fontSize: '0.875rem' }} />
                        {form.attachments?.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                {form.attachments.map((att, i) => (
                                    <span key={i} className="badge badge-info"><FiPaperclip /> {att.name}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Submissions Modal */}
            <Modal isOpen={showSubmissionsModal} onClose={() => setShowSubmissionsModal(false)} title={`📋 Submissions — ${selectedHW?.title}`} size="lg"
                footer={<button className="btn btn-secondary" onClick={() => setShowSubmissionsModal(false)}>Close</button>}>
                {submissions.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}><p className="empty-state-text">No submissions yet</p></div>
                ) : (
                    <div className="table-container" style={{ border: 'none' }}>
                        <table className="table">
                            <thead><tr><th>Student</th><th>Submitted</th><th>Status</th><th>Grade</th><th>Actions</th></tr></thead>
                            <tbody>
                                {submissions.map(sub => (
                                    <tr key={sub.id}>
                                        <td style={{ fontWeight: 500 }}>{sub.studentName || sub.studentId}</td>
                                        <td>{formatDate(sub.submittedAt)}</td>
                                        <td><span className={`badge ${sub.status === 'Graded' ? 'badge-success' : sub.status === 'Submitted' ? 'badge-info' : sub.status === 'Resubmit' ? 'badge-danger' : 'badge-warning'}`}>{sub.status}</span></td>
                                        <td>{sub.grade || '—'}</td>
                                        <td>
                                            <button className="btn btn-sm btn-primary" onClick={() => { setGradeForm({ submissionId: sub.id, grade: sub.grade || '', feedback: sub.feedback || '' }); setShowGradeModal(true); }}>
                                                <FiCheck /> Grade
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal>

            {/* Grade Modal */}
            <Modal isOpen={showGradeModal} onClose={() => setShowGradeModal(false)} title="📝 Grade Submission"
                footer={<><button className="btn btn-secondary" onClick={() => setShowGradeModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleGrade}>Save Grade</button></>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="input-group"><label className="input-label">Grade *</label><select className="input" value={gradeForm.grade} onChange={e => setGradeForm({ ...gradeForm, grade: e.target.value })}><option value="">Select</option><option>A+</option><option>A</option><option>B+</option><option>B</option><option>C+</option><option>C</option><option>D</option><option>F</option></select></div>
                    <div className="input-group"><label className="input-label">Feedback</label><textarea className="input" placeholder="Feedback for student..." value={gradeForm.feedback} onChange={e => setGradeForm({ ...gradeForm, feedback: e.target.value })} /></div>
                </div>
            </Modal>
        </div>
    );
}
