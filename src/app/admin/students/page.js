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
import { parseCSV, generateCSV, downloadCSVFile } from '@/lib/csvParser';

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
    const [importClass, setImportClass] = useState('');
    const [importSection, setImportSection] = useState('');
    const [importProgress, setImportProgress] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [form, setForm] = useState({
        name: '', gender: 'Male', dob: '', address: '', parentName: '',
        parentContact: '', parentEmail: '', studentEmail: '', admissionNumber: '', rollNumber: '', class: '', section: '',
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
        setForm({ name: '', gender: 'Male', dob: '', address: '', parentName: '', parentContact: '', parentEmail: '', studentEmail: '', admissionNumber: '', rollNumber: '', class: '', section: '' });
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
        if (form.studentEmail && !emailRegex.test(form.studentEmail)) {
            toast.error('Please enter a valid student email address');
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
                
                const studentLoginEmail = form.studentEmail || `${form.admissionNumber.toLowerCase() || newId.toLowerCase()}@school.com`;
                const studentCreds = createCredentials(form.name, 'student', newId);
                const parentCreds = createCredentials(form.parentName || 'Parent', 'parent', `${newId}_P`);

                // Create Parent Firebase Auth Account
                try {
                    await createUserAccount(form.parentEmail, parentCreds.tempPassword, {
                        name: form.parentName || 'Parent',
                        role: 'parent',
                        childrenIds: [newId],
                        studentId: null,
                    });
                } catch (authError) {
                    if (authError.code === 'auth/email-already-in-use') {
                        // Parent account likely exists (sibling), which is fine, we just won't reset their password
                        console.log("Parent account already exists, skipping creation");
                    } else {
                        throw authError; // For other errors
                    }
                }

                // Create Student Firebase Auth Account
                try {
                    await createUserAccount(studentLoginEmail, studentCreds.tempPassword, {
                        name: form.name,
                        role: 'student',
                        studentId: newId,
                        parentEmail: form.parentEmail, // Link parent email
                    });
                } catch (authError) {
                    if (authError.code === 'auth/email-already-in-use') {
                        toast.error(`Student email ${studentLoginEmail} is already registered.`);
                        setIsSubmitting(false);
                        return;
                    }
                    throw authError;
                }

                await addStudent({ id: newId, ...studentData, loginEmail: studentLoginEmail });
                await addAuditLog('ADD_STUDENT', { studentId: newId, name: form.name });

                // Send Dual Credentials via email to the Parent
                try {
                    await fetch('/api/send-credentials', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: form.parentEmail,
                            name: form.parentName || form.name,
                            studentName: form.name,
                            studentEmail: studentLoginEmail,
                            studentPassword: studentCreds.tempPassword,
                            parentEmail: form.parentEmail,
                            parentPassword: parentCreds.tempPassword,
                            role: 'dual', 
                        }),
                    });
                } catch (emailErr) {
                    console.error('Email sending failed:', emailErr);
                }

                setShowCredentials({ 
                    studentEmail: studentLoginEmail, studentPassword: studentCreds.tempPassword,
                    parentEmail: form.parentEmail, parentPassword: parentCreds.tempPassword, 
                    role: 'dual'
                });
                toast.success('Student enrolled & dual accounts created');
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

        if (!importClass || !importSection) {
            toast.error('Please select class and section first');
            e.target.value = '';
            return;
        }

        setIsSubmitting(true);
        setImportProgress('Reading file...');
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const { headers, rows } = parseCSV(text);

                if (rows.length === 0) {
                    toast.error('CSV file is empty or invalid');
                    setIsSubmitting(false);
                    setImportProgress('');
                    return;
                }

                const totalRows = rows.length;
                let successCount = 0;
                let failCount = 0;

                // Get existing students count for ID generation
                const existingCount = students.length;

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];

                    if (!row.name) { failCount++; continue; }

                    setImportProgress(`Importing ${i + 1} of ${totalRows}...`);

                    const newId = `S${String(existingCount + i + 1).padStart(3, '0')}`;
                    const parentEmail = row.parentemail || '';
                    const providedStudentEmail = row.studentemail || '';
                    
                    const studentData = {
                        id: newId,
                        name: row.name,
                        gender: row.gender || 'Male',
                        dob: row.dob || '',
                        address: row.address || '',
                        parentName: row.parentname || '',
                        parentContact: row.parentcontact || '',
                        parentEmail,
                        admissionNumber: row.admissionnumber || `ADM${Date.now()}${i}`,
                        rollNumber: parseInt(row.rollnumber) || i + 1,
                        class: importClass,
                        section: importSection,
                    };

                    try {
                        let studentLoginEmail = providedStudentEmail;
                        let studentCreds = null;
                        
                        if (parentEmail) {
                            studentLoginEmail = providedStudentEmail || `${studentData.admissionNumber.toLowerCase() || newId.toLowerCase()}@school.com`;
                            studentCreds = createCredentials(row.name, 'student', newId);
                            const parentCreds = createCredentials(row.parentname || 'Parent', 'parent', `${newId}_P`);
                            
                            // Try create Parent
                            try {
                                await createUserAccount(parentEmail, parentCreds.tempPassword, {
                                    name: row.parentname || 'Parent',
                                    role: 'parent',
                                    childrenIds: [newId],
                                    studentId: null,
                                });
                            } catch (authErr) {
                                if (authErr.code !== 'auth/email-already-in-use') {
                                    console.error(`Parent account creation failed for ${parentEmail}:`, authErr);
                                }
                            }

                            // Try create Student
                            try {
                                await createUserAccount(studentLoginEmail, studentCreds.tempPassword, {
                                    name: row.name,
                                    role: 'student',
                                    studentId: newId,
                                    parentEmail: parentEmail,
                                });
                                studentData.loginEmail = studentLoginEmail;
                                
                                // Send Dual Credentials
                                fetch('/api/send-credentials', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        to: parentEmail,
                                        name: row.parentname || row.name,
                                        studentName: row.name,
                                        studentEmail: studentLoginEmail,
                                        studentPassword: studentCreds.tempPassword,
                                        parentEmail: parentEmail,
                                        parentPassword: parentCreds.tempPassword,
                                        role: 'dual',
                                    }),
                                }).catch(() => {});
                            } catch (authErr) {
                                console.error(`Student account creation failed for ${studentLoginEmail}:`, authErr);
                                // Fallback: if student email fails, we might still save the student record but without login
                            }
                        }

                        await addStudent(studentData);
                        successCount++;
                    } catch (err) {
                        console.error(`Failed to import row ${i + 1}:`, err);
                        failCount++;
                    }
                }

                const msg = `Imported ${successCount} student${successCount !== 1 ? 's' : ''}${failCount > 0 ? ` (${failCount} failed)` : ''}`;
                if (successCount > 0) toast.success(msg);
                else toast.error('No students were imported');

                setShowImport(false);
                setImportClass('');
                setImportSection('');
                fetchData();
            } catch (error) {
                toast.error("Error importing students");
                console.error(error);
            } finally {
                setIsSubmitting(false);
                setImportProgress('');
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const downloadCSVTemplate = () => {
        const csv = generateCSV(
            ['Name', 'Gender', 'DOB', 'Address', 'ParentName', 'ParentContact', 'ParentEmail', 'StudentEmail', 'AdmissionNumber', 'RollNumber'],
            [
                ['John Doe', 'Male', '2014-05-12', '123 Main St, Apt 4', 'Mr. Doe', '9800000001', 'parent@email.com', '', 'ADM2024100', '1'],
                ['Jane Smith', 'Female', '2014-08-20', '456 Oak Ave', 'Mrs. Smith', '9800000002', 'jane.parent@email.com', 'student@email.com', 'ADM2024101', '2'],
            ]
        );
        downloadCSVFile(csv, 'student_import_template.csv');
        toast.success('Template downloaded');
    };

    const downloadStudentList = () => {
        if (filtered.length === 0) { toast.error('No students to download'); return; }
        const classLabel = filterClass ? (classes.find(c => c.id === filterClass)?.name || filterClass) : 'All_Classes';
        const sectionLabel = filterSection || 'All_Sections';

        const headers = ['Sr No', 'Admission No', 'Name', 'Gender', 'DOB', 'Class', 'Section', 'Roll No', 'Parent Name', 'Parent Contact', 'Parent Email', 'Student Email', 'Address'];
        const rows = filtered.map((s, idx) => [
            idx + 1, s.admissionNumber || '', s.name || '', s.gender || '', s.dob || '',
            getClassName(s.class), s.section || '', s.rollNumber || '',
            s.parentName || '', s.parentContact || '', s.parentEmail || '', s.loginEmail || '', s.address || '',
        ]);

        const csv = generateCSV(headers, rows);
        downloadCSVFile(csv, `students_${classLabel}_${sectionLabel}.csv`);
        toast.success(`Downloaded ${filtered.length} student records`);
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
                <button className="btn btn-secondary btn-sm" onClick={downloadStudentList} title="Download student list as CSV">
                    <FiDownload /> Download List
                </button>
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
                    <div className="input-group"><label className="input-label">Student Email (Optional)</label><input className="input" type="email" placeholder="student@email.com (auto-generated if empty)" value={form.studentEmail} onChange={e => setForm({ ...form, studentEmail: e.target.value })} /></div>
                    <div className="input-group grid-form-full"><label className="input-label">Address</label><textarea className="input" placeholder="Full address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                </div>
                {!editingStudent && <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--color-info-bg)', fontSize: '0.8125rem', color: '#2563eb' }}>💡 Separate Student and Parent accounts will be created. Credentials will be automatically emailed to the parent.</div>}
            </Modal>

            {/* Import CSV Modal */}
            <Modal isOpen={showImport} onClose={() => { setShowImport(false); setImportClass(''); setImportSection(''); }} title="📥 Bulk Import Students (CSV)"
                footer={<button className="btn btn-secondary" onClick={() => { setShowImport(false); setImportClass(''); setImportSection(''); }}>Close</button>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Step 1: Select class and section */}
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text)' }}>Step 1: Select Class & Section</p>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div className="input-group" style={{ flex: 1, minWidth: 140 }}>
                                <label className="input-label">Class</label>
                                <select className="input" value={importClass} onChange={e => { setImportClass(e.target.value); setImportSection(''); }}>
                                    <option value="">Select Class</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="input-group" style={{ flex: 1, minWidth: 120 }}>
                                <label className="input-label">Section</label>
                                <select className="input" value={importSection} onChange={e => setImportSection(e.target.value)} disabled={!importClass}>
                                    <option value="">Select</option>
                                    {sections.filter(s => s.classId === importClass).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Upload CSV */}
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', background: importClass && importSection ? 'var(--color-info-bg)' : 'var(--color-bg)', border: `1px dashed ${importClass && importSection ? '#93c5fd' : 'var(--color-border)'}`, textAlign: 'center', opacity: importClass && importSection ? 1 : 0.5 }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Step 2: Upload CSV File</p>
                        {importClass && importSection && (
                            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                                Importing to <strong>{classes.find(c => c.id === importClass)?.name} - {importSection}</strong>
                            </p>
                        )}
                        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVImport} style={{ display: 'none' }} />
                        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={!importClass || !importSection || isSubmitting}>
                            {isSubmitting ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {importProgress}</> : <><FiUpload /> Choose CSV File</>}
                        </button>
                    </div>

                    <button className="btn btn-secondary" onClick={downloadCSVTemplate} style={{ alignSelf: 'flex-start' }}><FiDownload /> Download CSV Template</button>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                        <strong>CSV Columns:</strong> Name, Gender, DOB, Address, ParentName, ParentContact, ParentEmail, AdmissionNumber, RollNumber
                        <br /><span style={{ color: 'var(--color-text-muted)' }}>Class and Section are set from the dropdown above — no need to include them in the CSV.</span>
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
