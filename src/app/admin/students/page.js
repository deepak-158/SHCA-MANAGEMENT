'use client';

import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { createCredentials } from '@/lib/credentials';
import { createUserAccount } from '@/lib/accountService';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Modal from '@/components/ui/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUpload, FiDownload, FiKey, FiCopy, FiFilter, FiMail } from 'react-icons/fi';
import { getStudents, getClasses, getSections, addStudent, updateStudent, deleteStudent, addAuditLog } from '@/lib/dataService';

export default function StudentsPage() {
    const toast = useToast();
    const fileInputRef = useRef(null);
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [showCredentials, setShowCredentials] = useState(null);
    const [showImport, setShowImport] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [form, setForm] = useState({
        name: '', gender: 'Male', dob: '', address: '', parentName: '',
        parentContact: '', parentEmail: '', admissionNumber: '', rollNumber: '', class: '', section: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [stData, cData, sData] = await Promise.all([
                getStudents(), getClasses(), getSections()
            ]);
            setStudents(stData);
            setClasses(cData);
            setSections(sData);
        } catch (error) {
            toast.error("Failed to load students data");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filtered = students.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
        const matchClass = !filterClass || s.class === filterClass;
        const matchSection = !filterSection || s.section === filterSection;
        return matchSearch && matchClass && matchSection;
    });

    const resetForm = () => {
        setForm({ name: '', gender: 'Male', dob: '', address: '', parentName: '', parentContact: '', parentEmail: '', admissionNumber: '', rollNumber: '', class: '', section: '' });
        setEditingStudent(null);
    };

    const handleSave = async () => {
        if (!form.name || !form.class || !form.section || !form.admissionNumber) {
            toast.error('Please fill all required fields');
            return;
        }

        if (!editingStudent && !form.parentEmail) {
            toast.error('Parent email is required for account creation');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (form.parentEmail && !emailRegex.test(form.parentEmail)) {
            toast.error('Please enter a valid parent email address');
            return;
        }

        if (form.parentContact && !/^\d{10,15}$/.test(form.parentContact.replace(/[\s\-()]/g, ''))) {
            toast.error('Please enter a valid phone number (10-15 digits)');
            return;
        }

        const dupAdm = students.find(s => s.admissionNumber === form.admissionNumber && s.id !== editingStudent?.id);
        if (dupAdm) {
            toast.error('Admission number already exists');
            return;
        }

        setIsSubmitting(true);
        try {
            const studentData = {
                ...form,
                rollNumber: parseInt(form.rollNumber) || students.length + 1
            };

            if (editingStudent) {
                await updateStudent(editingStudent.id, studentData);
                await addAuditLog('UPDATE_STUDENT', { studentId: editingStudent.id, name: form.name });
                toast.success('Student updated');
            } else {
                const newId = `S${String(students.length + 1).padStart(3, '0')}`;
                const creds = createCredentials(form.name, 'student', newId);

                // Create Firebase Auth account using parent email
                const loginEmail = form.parentEmail;
                try {
                    await createUserAccount(loginEmail, creds.tempPassword, {
                        name: form.name,
                        role: 'student',
                        studentId: newId,
                    });
                } catch (authError) {
                    if (authError.code === 'auth/email-already-in-use') {
                        toast.error('This email is already registered. Use a different email.');
                        setIsSubmitting(false);
                        return;
                    }
                    throw authError;
                }

                await addStudent({ id: newId, ...studentData, loginEmail });
                await addAuditLog('ADD_STUDENT', { studentId: newId, name: form.name });

                // Send credentials email
                try {
                    await fetch('/api/send-credentials', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: loginEmail,
                            name: form.name,
                            email: loginEmail,
                            tempPassword: creds.tempPassword,
                            role: 'student',
                        }),
                    });
                } catch (emailErr) {
                    console.error('Email sending failed:', emailErr);
                }

                setShowCredentials({ ...creds, email: loginEmail });
                toast.success('Student added — account created & credentials emailed');
            }

            setShowModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error('Failed to save student: ' + (error.message || ''));
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to remove this student?")) return;
        try {
            const student = students.find(s => s.id === id);
            await deleteStudent(id);
            await addAuditLog('DELETE_STUDENT', { studentId: id, name: student?.name });
            toast.success('Student removed');
            fetchData();
        } catch (error) {
            toast.error("Failed to delete student");
            console.error(error);
        }
    };

    const handleResetCredentials = async (student) => {
        const resetEmail = student.loginEmail || student.parentEmail;
        if (!resetEmail) {
            toast.error('No email found for this student. Please edit and add a parent email.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, resetEmail);
            await addAuditLog('RESET_CREDENTIALS', { studentId: student.id, name: student.name });
            toast.success(`Password reset email sent to ${resetEmail}`);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                toast.error('No account found for this email. The student may not have an account yet.');
            } else {
                toast.error('Failed to send reset email: ' + error.message);
            }
            console.error(error);
        }
    };

    const handleCSVImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsSubmitting(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const lines = text.split('\n').filter(Boolean);
                if (lines.length < 2) {
                    toast.error('CSV file is empty or invalid');
                    setIsSubmitting(false);
                    return;
                }

                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                const importedPromises = [];

                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',').map(v => v.trim());
                    const row = {};
                    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

                    const newId = `S${String(students.length + i).padStart(3, '0')}`;
                    const parentEmail = row.parentemail || row['parent email'] || '';
                    const studentData = {
                        id: newId,
                        name: row.name || '',
                        gender: row.gender || 'Male',
                        dob: row.dob || '',
                        address: row.address || '',
                        parentName: row.parentname || row['parent name'] || '',
                        parentContact: row.parentcontact || row['parent contact'] || '',
                        parentEmail,
                        admissionNumber: row.admissionnumber || row['admission number'] || `ADM${Date.now()}${i}`,
                        rollNumber: parseInt(row.rollnumber || row['roll number']) || i,
                        class: row.class || '',
                        section: row.section || '',
                    };

                    // Create auth account if email provided
                    if (parentEmail) {
                        const creds = createCredentials(row.name || '', 'student', newId);
                        try {
                            await createUserAccount(parentEmail, creds.tempPassword, {
                                name: row.name || '',
                                role: 'student',
                                studentId: newId,
                            });
                            studentData.loginEmail = parentEmail;
                            // Send credentials email (fire and forget)
                            fetch('/api/send-credentials', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    to: parentEmail,
                                    name: row.name || '',
                                    email: parentEmail,
                                    tempPassword: creds.tempPassword,
                                    role: 'student',
                                }),
                            }).catch(() => {});
                        } catch (authErr) {
                            console.error(`Account creation failed for ${parentEmail}:`, authErr);
                        }
                    }

                    importedPromises.push(addStudent(studentData));
                }

                await Promise.all(importedPromises);
                toast.success(`${importedPromises.length} students imported! Credentials generated.`);
                setShowImport(false);
                fetchData();
            } catch (error) {
                toast.error("Error importing students");
                console.error(error);
            } finally {
                setIsSubmitting(false);
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const downloadCSVTemplate = () => {
        const csv = 'Name,Gender,DOB,Address,ParentName,ParentContact,ParentEmail,AdmissionNumber,RollNumber,Class,Section\nJohn Doe,Male,2014-05-12,123 Main St,Mr. Doe,9800000001,parent@email.com,ADM2024100,1,class-5,A\n';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'student_import_template.csv'; a.click();
        URL.revokeObjectURL(url);
        toast.success('Template downloaded');
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied');
    };

    const getClassName = (classId) => classes.find(c => c.id === classId)?.name || classId;

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Students</h1>
                    <p className="page-subtitle">Manage student records, credentials, and bulk import</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
                        <FiUpload /> Import CSV
                    </button>
                    <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                        <FiPlus /> Add Student
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-input">
                    <FiSearch className="search-input-icon" />
                    <input className="input" placeholder="Search by name or admission no..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                </div>
                <select className="input" style={{ width: 'auto', minWidth: 140 }} value={filterClass} onChange={e => { setFilterClass(e.target.value); setFilterSection(''); }}>
                    <option value="">All Classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {filterClass && (
                    <select className="input" style={{ width: 'auto', minWidth: 120 }} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                        <option value="">All Sections</option>
                        {sections.filter(s => s.classId === filterClass).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                )}
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Table */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Adm. No.</th>
                            <th>Name</th>
                            <th>Class</th>
                            <th>Section</th>
                            <th>Roll</th>
                            <th>Parent</th>
                            <th>Contact</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(student => (
                            <tr key={student.id}>
                                <td><span className="badge badge-neutral">{student.admissionNumber}</span></td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{student.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{student.gender}</div>
                                </td>
                                <td>{getClassName(student.class)}</td>
                                <td><span className="badge badge-primary">{student.section}</span></td>
                                <td>{student.rollNumber}</td>
                                <td style={{ fontSize: '0.8125rem' }}>{student.parentName}</td>
                                <td style={{ fontSize: '0.8125rem' }}>{student.parentContact}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditingStudent(student); setForm(student); setShowModal(true); }} title="Edit"><FiEdit2 /></button>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleResetCredentials(student)} title="Reset Credentials"><FiKey style={{ color: 'var(--color-accent)' }} /></button>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(student.id)} title="Delete"><FiTrash2 style={{ color: 'var(--color-danger)' }} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">🎒</div>
                        <div className="empty-state-title">No students found</div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingStudent ? 'Edit Student' : 'Add New Student'} size="lg"
                footer={<><button className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>{editingStudent ? 'Update' : 'Add Student'}</button></>}>
                <div className="grid-form">
                    <div className="input-group"><label className="input-label">Full Name *</label><input className="input" placeholder="e.g. Rahul Verma" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                    <div className="input-group"><label className="input-label">Gender</label><select className="input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option>Male</option><option>Female</option><option>Other</option></select></div>
                    <div className="input-group"><label className="input-label">Date of Birth</label><input className="input" type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} /></div>
                    <div className="input-group"><label className="input-label">Admission Number *</label><input className="input" placeholder="ADM2024001" value={form.admissionNumber} onChange={e => setForm({ ...form, admissionNumber: e.target.value })} /></div>
                    <div className="input-group"><label className="input-label">Class *</label><select className="input" value={form.class} onChange={e => setForm({ ...form, class: e.target.value })}><option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                    <div className="input-group"><label className="input-label">Section *</label><select className="input" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}><option value="">Select</option>{sections.filter(s => s.classId === form.class).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                    <div className="input-group"><label className="input-label">Roll Number</label><input className="input" type="number" value={form.rollNumber} onChange={e => setForm({ ...form, rollNumber: e.target.value })} /></div>
                    <div className="input-group"><label className="input-label">Parent Name</label><input className="input" placeholder="Mr. S.K. Verma" value={form.parentName} onChange={e => setForm({ ...form, parentName: e.target.value })} /></div>
                    <div className="input-group"><label className="input-label">Parent Contact</label><input className="input" placeholder="9800000001" value={form.parentContact} onChange={e => setForm({ ...form, parentContact: e.target.value })} /></div>
                    <div className="input-group"><label className="input-label">Parent Email {!editingStudent && '*'}</label><input className="input" type="email" placeholder="parent@email.com" value={form.parentEmail} onChange={e => setForm({ ...form, parentEmail: e.target.value })} /></div>
                    <div className="input-group grid-form-full"><label className="input-label">Address</label><textarea className="input" placeholder="Full address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                </div>
                {!editingStudent && <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--color-info-bg)', fontSize: '0.8125rem', color: '#2563eb' }}>💡 A login account will be created using the parent email. Credentials will be emailed automatically.</div>}
            </Modal>

            {/* Import CSV Modal */}
            <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="📥 Bulk Import Students (CSV)"
                footer={<button className="btn btn-secondary" onClick={() => setShowImport(false)}>Close</button>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--color-info-bg)', border: '1px dashed #93c5fd', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>Upload a CSV file with student records</p>
                        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVImport} style={{ display: 'none' }} />
                        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}><FiUpload /> Choose CSV File</button>
                    </div>
                    <button className="btn btn-secondary" onClick={downloadCSVTemplate} style={{ alignSelf: 'flex-start' }}><FiDownload /> Download CSV Template</button>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                        <strong>CSV Columns:</strong> Name, Gender, DOB, Address, ParentName, ParentContact, ParentEmail, AdmissionNumber, RollNumber, Class, Section
                    </div>
                </div>
            </Modal>

            {/* Credentials Modal */}
            <Modal isOpen={!!showCredentials} onClose={() => setShowCredentials(null)} title="🔑 Login Credentials"
                footer={<button className="btn btn-primary" onClick={() => setShowCredentials(null)}>Done</button>}>
                {showCredentials && (
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--color-success-bg)', border: '1px solid #a7f3d0' }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#059669', marginBottom: '0.75rem' }}>Credentials generated:</div>
                        {[{ label: 'Username', value: showCredentials.username }, { label: 'Email', value: showCredentials.email }, { label: 'Temp Password', value: showCredentials.tempPassword }].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                                <span><span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{item.label}: </span><span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{item.value}</span></span>
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => copyToClipboard(item.value)}><FiCopy /></button>
                            </div>
                        ))}
                        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>⚠️ Password change required on first login.</div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
