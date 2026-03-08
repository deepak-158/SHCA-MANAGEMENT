'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { FiUsers, FiDownload, FiSearch, FiFilter } from 'react-icons/fi';
import { getClasses, getSections, getStudents, getTimetable } from '@/lib/dataService';

export default function TeacherStudentsPage() {
    const { user } = useAuth();
    const toast = useToast();

    const isClassTeacher = !!user?.classTeacherOf;

    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [availableClassSections, setAvailableClassSections] = useState([]); // [{class, section}]
    const [loading, setLoading] = useState(true);

    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            const [cData, sData, stData, ttData] = await Promise.all([
                getClasses(), getSections(), getStudents(), getTimetable()
            ]);

            const sortedClasses = cData.sort((a, b) => (a.order || 0) - (b.order || 0));
            setClasses(sortedClasses);
            setSections(sData);
            setAllStudents(stData);

            // Build available class+section pairs from all sources
            const pairs = new Map();
            const addPair = (classId, sectionName) => {
                const key = `${classId}|${sectionName}`;
                if (!pairs.has(key)) pairs.set(key, { class: classId, section: sectionName });
            };

            // 1. From classTeacherOf
            if (user?.classTeacherOf?.class && user.classTeacherOf.section) {
                addPair(user.classTeacherOf.class, user.classTeacherOf.section);
            }

            // 2. From assignedClasses (supports both old string[] and new {class,section}[] format)
            (user?.assignedClasses || []).forEach(ac => {
                if (typeof ac === 'object' && ac.class && ac.section) {
                    addPair(ac.class, ac.section);
                } else if (typeof ac === 'string') {
                    // Old format: just classId — add all sections for that class
                    sData.filter(s => s.classId === ac).forEach(s => addPair(ac, s.name));
                }
            });

            // 3. From timetable: find slots where this teacher is assigned
            if (user?.teacherId) {
                ttData.filter(t => t.teacherId === user.teacherId).forEach(t => {
                    const sec = sData.find(s => s.id === t.sectionId);
                    if (sec) addPair(t.classId, sec.name);
                });
            }

            const classSections = [...pairs.values()];
            setAvailableClassSections(classSections);

            // Auto-select first available
            if (user?.classTeacherOf) {
                setSelectedClass(user.classTeacherOf.class);
                setSelectedSection(user.classTeacherOf.section);
            } else if (classSections.length > 0) {
                setSelectedClass(classSections[0].class);
                setSelectedSection(classSections[0].section);
            }
        } catch (error) {
            toast.error('Failed to load data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Build unique class list from available class+section pairs
    const availableClasses = (() => {
        const ids = [...new Set(availableClassSections.map(cs => cs.class))];
        return classes.filter(c => ids.includes(c.id));
    })();

    // Filter sections for the selected class, only those in availableClassSections
    const filteredSections = (() => {
        const allowed = availableClassSections.filter(cs => cs.class === selectedClass).map(cs => cs.section);
        return sections.filter(s => s.classId === selectedClass && allowed.includes(s.name));
    })();

    const students = allStudents
        .filter(s => s.class === selectedClass && (!selectedSection || s.section === selectedSection))
        .filter(s => !searchQuery || s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.rollNumber?.toString().includes(searchQuery))
        .sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));

    const getClassName = (classId) => {
        const cls = classes.find(c => c.id === classId);
        return cls?.name || classId;
    };

    const downloadCSV = () => {
        if (students.length === 0) {
            toast.error('No students to download');
            return;
        }

        const className = getClassName(selectedClass);
        const sectionLabel = selectedSection ? `-${selectedSection}` : '';

        let csv = 'Sr No,Name,Gender,DOB,Roll No,Admission No,Parent Name,Parent Contact,Parent Email,Address\n';
        students.forEach((s, idx) => {
            csv += `${idx + 1},"${s.name || ''}",${s.gender || ''},${s.dob || ''},${s.rollNumber || ''},${s.admissionNumber || ''},"${s.parentName || ''}",${s.parentContact || ''},${s.parentEmail || ''},"${(s.address || '').replace(/"/g, '""')}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `students_${className}${sectionLabel}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">My Students</h1>
                    <p className="page-subtitle">
                        {isClassTeacher
                            ? `Class Teacher of ${getClassName(user.classTeacherOf.class)} - ${user.classTeacherOf.section}`
                            : 'View students of your assigned classes'}
                    </p>
                </div>
                {students.length > 0 && (
                    <button className="btn btn-primary" onClick={downloadCSV}>
                        <FiDownload /> Download CSV
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="input-group" style={{ minWidth: '160px', flex: '0 1 auto', marginBottom: 0 }}>
                        <label className="input-label"><FiFilter style={{ display: 'inline', verticalAlign: 'middle' }} /> Class</label>
                        <select className="input" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }}>
                            <option value="">Select Class</option>
                            {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="input-group" style={{ minWidth: '120px', flex: '0 1 auto', marginBottom: 0 }}>
                        <label className="input-label">Section</label>
                        <select className="input" value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
                            <option value="">All Sections</option>
                            {filteredSections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="input-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                        <label className="input-label"><FiSearch style={{ display: 'inline', verticalAlign: 'middle' }} /> Search</label>
                        <input className="input" placeholder="Search by name or roll no..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Stats */}
            {selectedClass && (
                <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
                    <div className="stat-card">
                        <div className="stat-icon stat-icon-primary"><FiUsers /></div>
                        <div className="stat-info">
                            <div className="stat-value">{students.length}</div>
                            <div className="stat-label">Total Students</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon stat-icon-secondary"><FiUsers /></div>
                        <div className="stat-info">
                            <div className="stat-value">{students.filter(s => s.gender === 'Male').length}</div>
                            <div className="stat-label">Boys</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon stat-icon-accent"><FiUsers /></div>
                        <div className="stat-info">
                            <div className="stat-value">{students.filter(s => s.gender === 'Female').length}</div>
                            <div className="stat-label">Girls</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Student Table */}
            {!selectedClass ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <div className="empty-state-title">Select a class to view students</div>
                        <div className="empty-state-text">Choose a class from the dropdown above</div>
                    </div>
                </div>
            ) : students.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">👨‍🎓</div>
                        <div className="empty-state-title">No students found</div>
                        <div className="empty-state-text">
                            {searchQuery ? 'Try a different search query' : 'No students in this class/section'}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Roll No</th>
                                <th>Name</th>
                                <th>Gender</th>
                                <th>DOB</th>
                                <th>Section</th>
                                <th>Parent Name</th>
                                <th>Parent Contact</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s, idx) => (
                                <tr key={s.id}>
                                    <td>{idx + 1}</td>
                                    <td><span className="badge badge-neutral">{s.rollNumber || '—'}</span></td>
                                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                                    <td>{s.gender || '—'}</td>
                                    <td>{s.dob || '—'}</td>
                                    <td><span className="badge badge-info">{s.section || '—'}</span></td>
                                    <td>{s.parentName || '—'}</td>
                                    <td>{s.parentContact || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
