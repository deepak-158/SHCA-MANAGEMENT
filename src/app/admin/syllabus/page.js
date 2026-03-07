'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { FiUpload, FiFileText, FiTrash2 } from 'react-icons/fi';
import { getClasses, getSyllabusCards, addSyllabus, deleteSyllabus } from '@/lib/dataService';
import { uploadFile } from '@/lib/cloudinary';

export default function SyllabusPage() {
    const toast = useToast();
    const [syllabi, setSyllabi] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedClassId, setSelectedClassId] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [sData, cData] = await Promise.all([
                getSyllabusCards(), getClasses()
            ]);
            setSyllabi(sData);
            setClasses(cData.sort((a, b) => a.order - b.order));
        } catch (error) {
            toast.error("Failed to load syllabus data");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setShowUploadModal(true);
        }
        e.target.value = ''; // Reset input
    };

    const handleUploadSubmit = async () => {
        if (!selectedFile || !selectedClassId) {
            toast.error("Please select a file and a class");
            return;
        }

        setIsUploading(true);
        try {
            // 1. Upload to Cloudinary
            const fileUrl = await uploadFile(selectedFile);

            // 2. Save metadata to Firestore
            await addSyllabus({
                classId: selectedClassId,
                fileName: selectedFile.name,
                fileUrl: fileUrl,
            });

            toast.success(`"${selectedFile.name}" uploaded successfully`);
            setShowUploadModal(false);
            setSelectedFile(null);
            setSelectedClassId('');
            fetchData();
        } catch (error) {
            toast.error("Failed to upload syllabus");
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this syllabus?")) return;
        try {
            await deleteSyllabus(id);
            toast.success("Syllabus deleted");
            fetchData();
        } catch (error) {
            toast.error("Failed to delete syllabus");
            console.error(error);
        }
    };

    const getClassName = (id) => classes.find(c => c.id === id)?.name || id;

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div><h1 className="page-title">Syllabus Management</h1><p className="page-subtitle">Upload and manage class-wise syllabus documents</p></div>
                <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                    <FiUpload /> Upload Syllabus
                    <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileSelect} style={{ display: 'none' }} />
                </label>
            </div>

            <div className="grid-cards">
                {syllabi.map(s => (
                    <div key={s.id} className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'var(--color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)', fontSize: '1.25rem', flexShrink: 0 }}>
                            <FiFileText />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600 }}>Class {getClassName(s.classId)}</div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <a href={s.fileUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }} className="hover:text-primary transition-colors">
                                    {s.fileName}
                                </a>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                Uploaded: {new Date(s.uploadedAt).toLocaleDateString()}
                            </div>
                        </div>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(s.id)}>
                            <FiTrash2 style={{ color: 'var(--color-danger)' }} />
                        </button>
                    </div>
                ))}
            </div>

            {syllabi.length === 0 && (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">📄</div><div className="empty-state-title">No syllabus uploaded yet</div></div></div>
            )}

            <Modal
                isOpen={showUploadModal}
                onClose={() => !isUploading && setShowUploadModal(false)}
                title="Upload Syllabus"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowUploadModal(false)} disabled={isUploading}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleUploadSubmit} disabled={isUploading || !selectedClassId}>
                            {isUploading ? 'Uploading...' : 'Upload'}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <strong>File:</strong> {selectedFile?.name}
                    </div>
                    <div className="input-group">
                        <label className="input-label">Assign to Class *</label>
                        <select
                            className="input"
                            value={selectedClassId}
                            onChange={e => setSelectedClassId(e.target.value)}
                            disabled={isUploading}
                        >
                            <option value="">Select Class</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
