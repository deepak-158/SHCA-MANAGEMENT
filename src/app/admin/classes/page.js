'use client';

import { useState, useEffect } from 'react';
import { CLASS_LIST, SECTION_LIST } from '@/constants';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiUser, FiGrid, FiChevronRight, FiX } from 'react-icons/fi';
import { getClasses, getSections, getTeachers, getStudents, addClass, updateClass, addSection, updateSection, deleteSection, deleteClass, addAuditLog, updateTeacher, updateUserRoleByEmail } from '@/lib/dataService';

export default function ClassesPage() {
    const toast = useToast();
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    const [expandedClass, setExpandedClass] = useState(null);

    // Combined Add/Edit modal state
    const [showModal, setShowModal] = useState(false);
    const [editingClass, setEditingClass] = useState(null); // null = add mode, object = edit mode
    const [selectedNewClass, setSelectedNewClass] = useState('');
    const [modalSections, setModalSections] = useState([]); // [{ name: 'A', classTeacherId: '' }, ...]
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [cData, sData, tData, stData] = await Promise.all([
                getClasses(), getSections(), getTeachers(), getStudents()
            ]);
            setClasses(cData);
            setSections(sData);
            setTeachers(tData);
            setStudents(stData);
        } catch (error) {
            toast.error("Failed to load classes data");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleClass = (classId) => {
        setExpandedClass(expandedClass === classId ? null : classId);
    };

    const getSectionsForClass = (classId) => sections.filter(s => s.classId === classId);

    const getTeacherName = (teacherId) => {
        if (!teacherId) return 'Not Assigned';
        const t = teachers.find(t => t.id === teacherId);
        return t ? t.name : 'Not Assigned';
    };

    const getStudentCount = (classId, sectionName) => {
        return students.filter(s => s.class === classId && s.section === sectionName).length;
    };

    // --- Modal helpers ---

    const openAddModal = () => {
        setEditingClass(null);
        setSelectedNewClass('');
        setModalSections([{ name: 'A', classTeacherId: '' }]);
        setShowModal(true);
    };

    const openEditModal = (cls) => {
        setEditingClass(cls);
        setSelectedNewClass('');
        const classSections = sections.filter(s => s.classId === cls.id);
        setModalSections(
            classSections.length > 0
                ? classSections.map(s => ({ id: s.id, name: s.name, classTeacherId: s.classTeacherId || '' }))
                : [{ name: 'A', classTeacherId: '' }]
        );
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingClass(null);
        setSelectedNewClass('');
        setModalSections([]);
    };

    const toggleSectionInModal = (sectionName) => {
        const exists = modalSections.find(s => s.name === sectionName);
        if (exists) {
            // Don't allow removing if it has students (edit mode)
            if (editingClass) {
                const count = getStudentCount(editingClass.id, sectionName);
                if (count > 0) {
                    toast.error(`Cannot remove Section ${sectionName} — ${count} student(s) assigned`);
                    return;
                }
            }
            setModalSections(modalSections.filter(s => s.name !== sectionName));
        } else {
            setModalSections([...modalSections, { name: sectionName, classTeacherId: '' }]);
        }
    };

    const setTeacherForSection = (sectionName, teacherId) => {
        // Check if this teacher is already assigned to another section in the modal
        if (teacherId) {
            const alreadyInModal = modalSections.find(s => s.name !== sectionName && s.classTeacherId === teacherId);
            if (alreadyInModal) {
                const tName = teachers.find(t => t.id === teacherId)?.name || 'This teacher';
                toast.error(`${tName} is already assigned to Section ${alreadyInModal.name}`);
                return;
            }
        }
        setModalSections(modalSections.map(s => s.name === sectionName ? { ...s, classTeacherId: teacherId } : s));
    };

    // --- Save handler ---

    // Helper: sync a teacher's role to class_teacher and update their record
    const syncTeacherRole = async (teacherId, classId, sectionName) => {
        if (!teacherId) return;
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) return;
        // Update teacher doc with isClassTeacher + classTeacherOf
        await updateTeacher(teacherId, {
            isClassTeacher: true,
            classTeacherOf: { class: classId, section: sectionName },
        });
        // Update role in users collection
        if (teacher.email) {
            await updateUserRoleByEmail(teacher.email, 'class_teacher', {
                isClassTeacher: true,
                classTeacherOf: { class: classId, section: sectionName },
            });
        }
    };

    // Helper: if a teacher is no longer class teacher of any section, revert to subject_teacher
    const revertTeacherRoleIfNeeded = async (teacherId, allSectionsAfterSave) => {
        if (!teacherId) return;
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) return;
        // Check if this teacher is still assigned as class teacher in any section
        const stillAssigned = allSectionsAfterSave.some(s => s.classTeacherId === teacherId);
        // Also check sections from OTHER classes
        const otherClassSections = sections.filter(s => !allSectionsAfterSave.find(as => as.id === s.id));
        const assignedElsewhere = otherClassSections.some(s => s.classTeacherId === teacherId);

        if (!stillAssigned && !assignedElsewhere) {
            await updateTeacher(teacherId, {
                isClassTeacher: false,
                classTeacherOf: null,
            });
            if (teacher.email) {
                await updateUserRoleByEmail(teacher.email, 'subject_teacher', {
                    isClassTeacher: false,
                    classTeacherOf: null,
                });
            }
        }
    };

    // Get teacher IDs already assigned as class teacher in OTHER classes (not the one being edited)
    const getAssignedClassTeacherIds = () => {
        const editingClassId = editingClass?.id;
        return sections
            .filter(s => s.classTeacherId && s.classId !== editingClassId)
            .map(s => s.classTeacherId);
    };

    const handleSave = async () => {
        if (modalSections.length === 0) {
            toast.error('Add at least one section');
            return;
        }

        if (!editingClass && !selectedNewClass) {
            toast.error('Select a class');
            return;
        }

        setIsSubmitting(true);

        // Validate: no teacher assigned as class teacher in another class
        const alreadyAssigned = getAssignedClassTeacherIds();
        for (const sec of modalSections) {
            if (sec.classTeacherId && alreadyAssigned.includes(sec.classTeacherId)) {
                const tName = teachers.find(t => t.id === sec.classTeacherId)?.name || 'A teacher';
                toast.error(`${tName} is already a class teacher of another class. A teacher can only be class teacher of one class.`);
                setIsSubmitting(false);
                return;
            }
        }

        try {
            if (editingClass) {
                // EDIT MODE — sync sections
                const existingSections = sections.filter(s => s.classId === editingClass.id);

                // Sections to delete (were in DB but no longer in modal)
                const toDelete = existingSections.filter(es => !modalSections.find(ms => ms.name === es.name));
                for (const sec of toDelete) {
                    await deleteSection(sec.id);
                }

                // Sections to add (in modal but not in DB)
                const toAdd = modalSections.filter(ms => !existingSections.find(es => es.name === ms.name));
                for (const sec of toAdd) {
                    await addSection({ classId: editingClass.id, name: sec.name, classTeacherId: sec.classTeacherId || null });
                }

                // Sections to update (teacher changed)
                const toUpdate = modalSections.filter(ms => {
                    const existing = existingSections.find(es => es.name === ms.name);
                    return existing && (existing.classTeacherId || '') !== (ms.classTeacherId || '');
                });
                for (const sec of toUpdate) {
                    const existing = existingSections.find(es => es.name === sec.name);
                    await updateSection(existing.id, { classTeacherId: sec.classTeacherId || null });
                }

                // Sync class teacher roles for newly assigned teachers
                for (const sec of [...toAdd, ...toUpdate]) {
                    if (sec.classTeacherId) {
                        await syncTeacherRole(sec.classTeacherId, editingClass.id, sec.name);
                    }
                }

                // Revert role for teachers that were unassigned
                const removedTeacherIds = new Set();
                for (const sec of toDelete) {
                    if (sec.classTeacherId) removedTeacherIds.add(sec.classTeacherId);
                }
                for (const sec of toUpdate) {
                    const existing = existingSections.find(es => es.name === sec.name);
                    if (existing?.classTeacherId && existing.classTeacherId !== sec.classTeacherId) {
                        removedTeacherIds.add(existing.classTeacherId);
                    }
                }
                // Build final sections list for this class after save
                const finalSections = modalSections.map(ms => {
                    const existing = existingSections.find(es => es.name === ms.name);
                    return { id: existing?.id, classTeacherId: ms.classTeacherId || null };
                });
                for (const tid of removedTeacherIds) {
                    await revertTeacherRoleIfNeeded(tid, finalSections);
                }

                toast.success(`${editingClass.name} updated successfully`);
                await addAuditLog('UPDATE_CLASS', { className: editingClass.name });
            } else {
                // ADD MODE — create class + sections
                const classInfo = CLASS_LIST.find(c => c.id === selectedNewClass);
                if (!classInfo) return;

                const classDoc = await addClass({ name: classInfo.name, order: classInfo.order });
                const classId = classDoc.id;

                for (const sec of modalSections) {
                    await addSection({ classId, name: sec.name, classTeacherId: sec.classTeacherId || null });
                    // Sync class teacher role
                    if (sec.classTeacherId) {
                        await syncTeacherRole(sec.classTeacherId, classId, sec.name);
                    }
                }

                toast.success(`${classInfo.name} with ${modalSections.length} section(s) added`);
                await addAuditLog('ADD_CLASS', { className: classInfo.name, sections: modalSections.length });
            }

            closeModal();
            fetchData();
        } catch (error) {
            toast.error(editingClass ? "Failed to update class" : "Failed to add class");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClass = async (classId, className) => {
        const classStudents = students.filter(s => s.class === classId);
        if (classStudents.length > 0) {
            toast.error(`Cannot delete ${className} — it has ${classStudents.length} student(s) assigned`);
            return;
        }
        if (!confirm(`Are you sure you want to delete ${className} and all its sections?`)) return;

        try {
            // Delete all sections first
            const classSections = sections.filter(s => s.classId === classId);
            for (const sec of classSections) {
                await deleteSection(sec.id);
            }
            await deleteClass(classId);
            toast.success(`${className} deleted`);
            await addAuditLog('DELETE_CLASS', { className });
            fetchData();
        } catch (error) {
            toast.error('Failed to delete class');
            console.error(error);
        }
    };

    const availableClasses = CLASS_LIST.filter(c => !classes.find(cls => cls.name === c.name));

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Classes & Sections</h1>
                    <p className="page-subtitle">Manage school classes and their sections</p>
                </div>
                <button className="btn btn-primary" onClick={openAddModal}>
                    <FiPlus /> Add Class
                </button>
            </div>

            {/* Stats */}
            <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-primary"><FiGrid /></div>
                    <div className="stat-info">
                        <div className="stat-value">{classes.length}</div>
                        <div className="stat-label">Total Classes</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-secondary"><FiLayers /></div>
                    <div className="stat-info">
                        <div className="stat-value">{sections.length}</div>
                        <div className="stat-label">Total Sections</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-accent"><FiUsers /></div>
                    <div className="stat-info">
                        <div className="stat-value">{students.length}</div>
                        <div className="stat-label">Students</div>
                    </div>
                </div>
            </div>

            {/* Classes list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {classes.map((cls) => {
                    const classSections = getSectionsForClass(cls.id);
                    const isExpanded = expandedClass === cls.id;
                    const totalStudents = classSections.reduce((sum, sec) => sum + getStudentCount(cls.id, sec.name), 0);

                    return (
                        <div key={cls.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            {/* Class header */}
                            <div
                                onClick={() => toggleClass(cls.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleClass(cls.id); }}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
                                    textAlign: 'left', transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ color: 'var(--color-text-muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)' }}>
                                        <FiChevronRight />
                                    </span>
                                    <div>
                                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)' }}>{cls.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                            {classSections.length} section{classSections.length !== 1 ? 's' : ''} • {totalStudents} student{totalStudents !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {classSections.map((sec) => (
                                        <span key={sec.id} className="badge badge-primary">{sec.name}</span>
                                    ))}
                                    <button
                                        className="btn btn-ghost btn-icon btn-sm"
                                        onClick={(e) => { e.stopPropagation(); openEditModal(cls); }}
                                        title={`Edit ${cls.name}`}
                                    >
                                        <FiEdit2 style={{ fontSize: '0.875rem' }} />
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-icon btn-sm"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id, cls.name); }}
                                        title={`Delete ${cls.name}`}
                                    >
                                        <FiTrash2 style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }} />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded sections */}
                            {isExpanded && classSections.length > 0 && (
                                <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--color-border)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                                        {classSections.map((section) => (
                                            <div
                                                key={section.id}
                                                style={{
                                                    padding: '1rem', borderRadius: '0.625rem',
                                                    border: '1px solid var(--color-border)',
                                                    background: 'var(--color-bg)',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                                                        Section {section.name}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
                                                        <FiUser style={{ flexShrink: 0 }} />
                                                        <span>Class Teacher: <strong style={{ color: 'var(--color-text)' }}>{getTeacherName(section.classTeacherId)}</strong></span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
                                                        <FiUsers style={{ flexShrink: 0 }} />
                                                        <span>Students: <strong style={{ color: 'var(--color-text)' }}>{getStudentCount(cls.id, section.name)}</strong></span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isExpanded && classSections.length === 0 && (
                                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>
                                    No sections added yet — <button style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => openEditModal(cls)}>click to edit</button>
                                </div>
                            )}
                        </div>
                    );
                })}

                {classes.length === 0 && (
                    <div className="card"><div className="empty-state"><div className="empty-state-icon">📚</div><div className="empty-state-title">No classes added yet</div><div className="empty-state-subtitle">Click "Add Class" to get started</div></div></div>
                )}
            </div>

            {/* Add / Edit Class Modal */}
            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editingClass ? `Edit ${editingClass.name}` : 'Add New Class'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : editingClass ? 'Save Changes' : 'Add Class'}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Class selector (add mode only) */}
                    {!editingClass && (
                        <div className="input-group">
                            <label className="input-label">Class *</label>
                            {availableClasses.length > 0 ? (
                                <select className="input" value={selectedNewClass} onChange={(e) => setSelectedNewClass(e.target.value)}>
                                    <option value="">Select Class</option>
                                    {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            ) : (
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>All classes have been added.</p>
                            )}
                        </div>
                    )}

                    {/* Section checkboxes */}
                    <div>
                        <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Sections *</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {SECTION_LIST.map(sec => {
                                const isSelected = modalSections.find(s => s.name === sec);
                                const hasStudents = editingClass && getStudentCount(editingClass.id, sec) > 0;
                                return (
                                    <button
                                        key={sec}
                                        type="button"
                                        onClick={() => toggleSectionInModal(sec)}
                                        style={{
                                            width: 44, height: 44, borderRadius: '0.5rem',
                                            border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                            background: isSelected ? 'var(--color-primary)' : 'var(--color-bg)',
                                            color: isSelected ? '#fff' : 'var(--color-text)',
                                            fontWeight: 700, fontSize: '0.9375rem', cursor: hasStudents && isSelected ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.15s',
                                            opacity: hasStudents && isSelected ? 0.7 : 1,
                                        }}
                                        title={hasStudents && isSelected ? `Has students — cannot remove` : `Section ${sec}`}
                                    >
                                        {sec}
                                    </button>
                                );
                            })}
                        </div>
                        {modalSections.length === 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '0.375rem' }}>Select at least one section</div>
                        )}
                    </div>

                    {/* Per-section teacher assignment */}
                    {modalSections.length > 0 && (
                        <div>
                            <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Class Teachers (Optional)</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {modalSections.sort((a, b) => a.name.localeCompare(b.name)).map(sec => (
                                    <div key={sec.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 80 }}>Section {sec.name}</span>
                                        <select
                                            className="input"
                                            style={{ flex: 1 }}
                                            value={sec.classTeacherId || ''}
                                            onChange={(e) => setTeacherForSection(sec.name, e.target.value)}
                                        >
                                            <option value="">No Teacher</option>
                                            {teachers.map(t => {
                                                const assignedElsewhere = getAssignedClassTeacherIds();
                                                const usedInModal = modalSections.find(s => s.name !== sec.name && s.classTeacherId === t.id);
                                                const isCurrentSelection = sec.classTeacherId === t.id;
                                                const disabled = !isCurrentSelection && (assignedElsewhere.includes(t.id) || !!usedInModal);
                                                return <option key={t.id} value={t.id} disabled={disabled}>{t.name}{disabled ? ' (already class teacher)' : ''}</option>;
                                            })}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}

function FiLayers(props) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
        </svg>
    );
}
