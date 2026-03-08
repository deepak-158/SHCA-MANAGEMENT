'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { createCredentials } from '@/lib/credentials';
import { createUserAccount } from '@/lib/accountService';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Modal from '@/components/ui/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiMail, FiPhone, FiBookOpen, FiKey, FiCopy, FiRefreshCw } from 'react-icons/fi';
import { getTeachers, getClasses, getSections, addTeacher, updateTeacher, deleteTeacher, addAuditLog, updateUserRoleByEmail, getTimetable } from '@/lib/dataService';

export default function TeachersPage() {
    const toast = useToast();
    const [teachers, setTeachers] = useState([]);
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [showCredentials, setShowCredentials] = useState(null);
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: '', qualification: '', contact: '', email: '',
        subjectsTaught: '', assignedClasses: [], isClassTeacher: false,
        classTeacherClass: '', classTeacherSection: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [tData, cData, sData, ttData] = await Promise.all([
                getTeachers(), getClasses(), getSections(), getTimetable()
            ]);
            setTeachers(tData);
            setClasses(cData.sort((a, b) => (a.order || 0) - (b.order || 0)));
            setSections(sData);
            setTimetable(ttData);
        } catch (error) {
            toast.error("Failed to load teachers data");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filtered = teachers.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Compute classes assigned via timetable for a given teacher
    const getTimetableClasses = (teacherId) => {
        if (!teacherId) return [];
        const entries = timetable.filter(t => t.teacherId === teacherId);
        const unique = new Map();
        entries.forEach(e => {
            const sec = sections.find(s => s.id === e.sectionId);
            if (sec) {
                const key = `${e.classId}|${sec.name}`;
                if (!unique.has(key)) unique.set(key, { class: e.classId, section: sec.name });
            }
        });
        return [...unique.values()];
    };

    // Get all assigned classes for a teacher (stored + timetable + class teacher)
    const getAllAssignedClasses = (teacher) => {
        const pairs = new Map();
        const addPair = (classId, sectionName) => {
            const key = `${classId}|${sectionName}`;
            if (!pairs.has(key)) pairs.set(key, { class: classId, section: sectionName });
        };
        // From stored assignedClasses
        (teacher.assignedClasses || []).forEach(ac => {
            if (typeof ac === 'object' && ac.class && ac.section) addPair(ac.class, ac.section);
            else if (typeof ac === 'string') {
                sections.filter(s => s.classId === ac).forEach(s => addPair(ac, s.name));
            }
        });
        // From timetable
        getTimetableClasses(teacher.id).forEach(tc => addPair(tc.class, tc.section));
        // From classTeacherOf
        if (teacher.isClassTeacher && teacher.classTeacherOf?.class && teacher.classTeacherOf?.section) {
            addPair(teacher.classTeacherOf.class, teacher.classTeacherOf.section);
        }
        return [...pairs.values()];
    };

    const timetableClasses = editingTeacher ? getTimetableClasses(editingTeacher.id) : [];

    const resetForm = () => {
        setForm({
            name: '', qualification: '', contact: '', email: '',
            subjectsTaught: '', assignedClasses: [], isClassTeacher: false,
            classTeacherClass: '', classTeacherSection: '',
        });
        setEditingTeacher(null);
    };

    const handleOpenAdd = () => {
        resetForm();
        setShowModal(true);
    };

    const handleOpenEdit = (teacher) => {
        setEditingTeacher(teacher);
        // Normalize assignedClasses: filter out old string format entries, keep only {class, section} objects
        const normalizedClasses = (teacher.assignedClasses || []).filter(ac => typeof ac === 'object' && ac.class && ac.section);
        setForm({
            name: teacher.name,
            qualification: teacher.qualification || '',
            contact: teacher.contact || '',
            email: teacher.email,
            subjectsTaught: teacher.subjectsTaught?.join(', ') || '',
            assignedClasses: normalizedClasses,
            isClassTeacher: teacher.isClassTeacher || false,
            classTeacherClass: teacher.classTeacherOf?.class || '',
            classTeacherSection: teacher.classTeacherOf?.section || '',
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.email || !form.contact) {
            toast.error('Please fill all required fields');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        if (!/^\d{10,15}$/.test(form.contact.replace(/[\s\-()]/g, ''))) {
            toast.error('Please enter a valid phone number (10-15 digits)');
            return;
        }

        // Check duplicate email
        const dupEmail = teachers.find(t => t.email === form.email && t.id !== editingTeacher?.id);
        if (dupEmail) {
            toast.error('A teacher with this email already exists');
            return;
        }

        setIsSubmitting(true);
        try {
            // Merge manually selected + timetable + class teacher auto-assigned classes
            const allAssigned = [...form.assignedClasses];
            // Add timetable classes
            timetableClasses.forEach(tc => {
                if (!allAssigned.some(ac => ac.class === tc.class && ac.section === tc.section)) {
                    allAssigned.push(tc);
                }
            });
            // Add class teacher's own class
            if (form.isClassTeacher && form.classTeacherClass && form.classTeacherSection) {
                if (!allAssigned.some(ac => ac.class === form.classTeacherClass && ac.section === form.classTeacherSection)) {
                    allAssigned.push({ class: form.classTeacherClass, section: form.classTeacherSection });
                }
            }

            const teacherData = {
                name: form.name,
                qualification: form.qualification,
                contact: form.contact,
                email: form.email,
                subjectsTaught: form.subjectsTaught.split(',').map(s => s.trim()).filter(Boolean),
                assignedClasses: allAssigned,
                isClassTeacher: form.isClassTeacher,
                classTeacherOf: form.isClassTeacher ? { class: form.classTeacherClass, section: form.classTeacherSection } : null,
            };

            if (editingTeacher) {
                await updateTeacher(editingTeacher.id, teacherData);

                // Sync role in users collection if isClassTeacher changed
                const newRole = form.isClassTeacher ? 'class_teacher' : 'subject_teacher';
                if (editingTeacher.email) {
                    await updateUserRoleByEmail(editingTeacher.email, newRole, {
                        isClassTeacher: !!form.isClassTeacher,
                        classTeacherOf: form.isClassTeacher ? { class: form.classTeacherClass, section: form.classTeacherSection } : null,
                    });
                }

                await addAuditLog('UPDATE_TEACHER', { teacherId: editingTeacher.id, name: form.name });
                toast.success('Teacher updated successfully');
            } else {
                const newId = `T${String(teachers.length + 1).padStart(3, '0')}`;
                const role = form.isClassTeacher ? 'class_teacher' : 'subject_teacher';
                const creds = createCredentials(form.name, 'teacher', newId);

                // Create Firebase Auth account
                try {
                    await createUserAccount(form.email, creds.tempPassword, {
                        name: form.name,
                        role,
                        teacherId: newId,
                        isClassTeacher: !!form.isClassTeacher,
                        classTeacherOf: form.isClassTeacher ? { class: form.classTeacherClass, section: form.classTeacherSection } : null,
                    });
                } catch (authError) {
                    if (authError.code === 'auth/email-already-in-use') {
                        toast.error('This email is already registered. Use a different email.');
                        setIsSubmitting(false);
                        return;
                    }
                    throw authError;
                }

                await addTeacher({ id: newId, ...teacherData });
                await addAuditLog('ADD_TEACHER', { teacherId: newId, name: form.name });

                // Send credentials email
                try {
                    await fetch('/api/send-credentials', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: form.email,
                            name: form.name,
                            email: form.email,
                            tempPassword: creds.tempPassword,
                            role,
                        }),
                    });
                } catch (emailErr) {
                    console.error('Email sending failed:', emailErr);
                }

                setShowCredentials({ ...creds, email: form.email });
                toast.success('Teacher added — account created & credentials emailed');
            }

            setShowModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error('Failed to save teacher: ' + (error.message || ''));
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to remove this teacher?")) return;
        try {
            const teacher = teachers.find(t => t.id === id);
            await deleteTeacher(id);
            await addAuditLog('DELETE_TEACHER', { teacherId: id, name: teacher?.name });
            toast.success('Teacher removed');
            fetchData();
        } catch (error) {
            toast.error("Failed to remove teacher");
            console.error(error);
        }
    };

    const handleResetCredentials = async (teacher) => {
        if (!teacher.email) {
            toast.error('No email found for this teacher.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, teacher.email);
            await addAuditLog('RESET_CREDENTIALS', { teacherId: teacher.id, name: teacher.name });
            toast.success(`Password reset email sent to ${teacher.email}`);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                toast.error('No account found for this email.');
            } else {
                toast.error('Failed to send reset email: ' + error.message);
            }
            console.error(error);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const getSectionName = (teacher) => {
        if (!teacher.classTeacherOf) return '';
        const cls = classes.find(c => c.id === teacher.classTeacherOf.class);
        return `${cls?.name || teacher.classTeacherOf.class} - ${teacher.classTeacherOf.section}`;
    };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Teachers</h1>
                    <p className="page-subtitle">Manage teachers and assign class/subject roles</p>
                </div>
                <button className="btn btn-primary" onClick={handleOpenAdd}>
                    <FiPlus /> Add Teacher
                </button>
            </div>

            {/* Search/Filter */}
            <div className="filters-bar">
                <div className="search-input">
                    <FiSearch className="search-input-icon" />
                    <input
                        className="input"
                        placeholder="Search teachers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                    />
                </div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    {filtered.length} teacher{filtered.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Teachers table */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Subjects</th>
                            <th>Role</th>
                            <th>Class Teacher Of</th>
                            <th>Assigned Classes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((teacher) => (
                            <tr key={teacher.id}>
                                <td><span className="badge badge-neutral">{teacher.id}</span></td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{teacher.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{teacher.qualification}</div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                        <span style={{ fontSize: '0.8125rem' }}>{teacher.email}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{teacher.contact}</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                        {teacher.subjectsTaught.map(s => (
                                            <span key={s} className="badge badge-info">{s}</span>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    {teacher.isClassTeacher ? (
                                        <span className="badge badge-success">Class Teacher</span>
                                    ) : (
                                        <span className="badge badge-primary">Subject Teacher</span>
                                    )}
                                </td>
                                <td>
                                    {teacher.isClassTeacher ? (
                                        <span style={{ fontWeight: 500 }}>{getSectionName(teacher)}</span>
                                    ) : (
                                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                                    )}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                        {(() => {
                                            const allClasses = getAllAssignedClasses(teacher);
                                            return allClasses.length > 0
                                                ? allClasses.map((ac, i) => {
                                                    const label = `${classes.find(c => c.id === ac.class)?.name || ac.class} - ${ac.section}`;
                                                    return <span key={i} className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{label}</span>;
                                                })
                                                : <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
                                        })()}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleOpenEdit(teacher)} title="Edit">
                                            <FiEdit2 />
                                        </button>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleResetCredentials(teacher)} title="Reset Credentials">
                                            <FiKey style={{ color: 'var(--color-accent)' }} />
                                        </button>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(teacher.id)} title="Delete">
                                            <FiTrash2 style={{ color: 'var(--color-danger)' }} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">👩‍🏫</div>
                        <div className="empty-state-title">No teachers found</div>
                        <div className="empty-state-text">Add teachers to manage your school staff</div>
                    </div>
                )}
            </div>

            {/* Add/Edit Teacher Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); resetForm(); }}
                title={editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
                size="lg"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>{editingTeacher ? 'Update' : 'Add Teacher'}</button>
                    </>
                }
            >
                <div className="grid-form">
                    <div className="input-group">
                        <label className="input-label">Full Name *</label>
                        <input className="input" placeholder="e.g. Mrs. Sunita Gupta" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Qualification</label>
                        <input className="input" placeholder="e.g. M.Sc. Mathematics" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Email *</label>
                        <input className="input" type="email" placeholder="teacher@school.edu" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Contact Number *</label>
                        <input className="input" placeholder="9876543210" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
                    </div>
                    <div className="input-group grid-form-full">
                        <label className="input-label">Subjects Taught (comma-separated)</label>
                        <input className="input" placeholder="e.g. Mathematics, Physics" value={form.subjectsTaught} onChange={e => setForm({ ...form, subjectsTaught: e.target.value })} />
                    </div>
                    <div className="input-group grid-form-full">
                        <label className="input-label">Assigned Classes (classes &amp; sections this teacher teaches)</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                            {classes.map(c => {
                                const classSections = sections.filter(s => s.classId === c.id);
                                if (classSections.length === 0) return null;
                                return classSections.map(sec => {
                                    const key = `${c.id}|${sec.name}`;
                                    const isChecked = form.assignedClasses.some(ac => ac.class === c.id && ac.section === sec.name);
                                    const isFromTimetable = timetableClasses.some(tc => tc.class === c.id && tc.section === sec.name);
                                    const isClassTeacherClass = form.isClassTeacher && form.classTeacherClass === c.id && form.classTeacherSection === sec.name;
                                    const isAutoAssigned = isFromTimetable || isClassTeacherClass;
                                    return (
                                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: isAutoAssigned ? 'default' : 'pointer', fontSize: '0.8125rem', whiteSpace: 'nowrap', opacity: isAutoAssigned ? 0.7 : 1 }}>
                                            <input
                                                type="checkbox"
                                                checked={isChecked || isAutoAssigned}
                                                disabled={isAutoAssigned}
                                                onChange={e => {
                                                    const entry = { class: c.id, section: sec.name };
                                                    const updated = e.target.checked
                                                        ? [...form.assignedClasses, entry]
                                                        : form.assignedClasses.filter(ac => !(ac.class === c.id && ac.section === sec.name));
                                                    setForm({ ...form, assignedClasses: updated });
                                                }}
                                                style={{ width: 14, height: 14, accentColor: 'var(--color-primary)' }}
                                            />
                                            {c.name} - {sec.name}
                                            {isFromTimetable && <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>(TT)</span>}
                                            {isClassTeacherClass && <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>(CT)</span>}
                                        </label>
                                    );
                                });
                            })}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>TT = from timetable, CT = class teacher (auto-assigned)</span>
                    </div>
                    <div className="input-group grid-form-full">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                            <input
                                type="checkbox"
                                checked={form.isClassTeacher}
                                onChange={e => setForm({ ...form, isClassTeacher: e.target.checked })}
                                style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }}
                            />
                            <span style={{ fontWeight: 500 }}>Assign as Class Teacher</span>
                        </label>
                    </div>
                    {form.isClassTeacher && (
                        <>
                            <div className="input-group">
                                <label className="input-label">Class</label>
                                <select className="input" value={form.classTeacherClass} onChange={e => setForm({ ...form, classTeacherClass: e.target.value })}>
                                    <option value="">Select Class</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Section</label>
                                <select className="input" value={form.classTeacherSection} onChange={e => setForm({ ...form, classTeacherSection: e.target.value })}>
                                    <option value="">Select Section</option>
                                    {sections.filter(s => s.classId === form.classTeacherClass).map(s => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}
                </div>
                {!editingTeacher && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--color-info-bg)', fontSize: '0.8125rem', color: '#2563eb' }}>
                        💡 A login account will be created using the teacher's email. Credentials will be emailed automatically.
                    </div>
                )}
            </Modal>

            {/* Credentials Display Modal */}
            <Modal
                isOpen={!!showCredentials}
                onClose={() => setShowCredentials(null)}
                title="🔑 Login Credentials Generated"
                footer={
                    <button className="btn btn-primary" onClick={() => setShowCredentials(null)}>Done</button>
                }
            >
                {showCredentials && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--color-success-bg)', border: '1px solid #a7f3d0' }}>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#059669', marginBottom: '0.75rem' }}>
                                Account created successfully! Share these credentials:
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {[
                                    { label: 'Username', value: showCredentials.username },
                                    { label: 'Email', value: showCredentials.email },
                                    { label: 'Temp Password', value: showCredentials.tempPassword },
                                    { label: 'Role', value: showCredentials.role },
                                ].map((item) => (
                                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{item.label}: </span>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'monospace' }}>{item.value}</span>
                                        </div>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => copyToClipboard(item.value)}>
                                            <FiCopy />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                            ⚠️ User will be required to change their password on first login.
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
