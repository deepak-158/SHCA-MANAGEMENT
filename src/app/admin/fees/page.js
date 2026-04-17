'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDollarSign, FiDownload, FiUsers, FiAlertCircle } from 'react-icons/fi';
import { getClasses, getSections, getStudents, addAuditLog } from '@/lib/dataService';
import { getFeeStructures, addFeeStructure, updateFeeStructure, deleteFeeStructure, getFeePayments, generateFeeInvoices, recordPayment, getDefaulters } from '@/lib/feeService';
import { FEE_TYPES, FEE_FREQUENCY, FEE_STATUS } from '@/constants';
import { formatDate, getCurrentAcademicYear } from '@/lib/utils';

export default function AdminFeesPage() {
    const toast = useToast();
    const [tab, setTab] = useState('structure');
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [students, setStudents] = useState([]);
    const [feeStructures, setFeeStructures] = useState([]);
    const [payments, setPayments] = useState([]);
    const [defaulters, setDefaultersList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fee Structure form
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', type: 'Tuition Fee', amount: '', frequency: 'Monthly', classId: '', academicYear: getCurrentAcademicYear() });

    // Generate invoice form
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState({ feeStructureId: '', classId: '', sectionId: '', dueDate: '' });
    const [generating, setGenerating] = useState(false);

    // Record payment form
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({ paymentId: '', amount: '', method: 'Cash', transactionId: '' });
    const [paymentTarget, setPaymentTarget] = useState(null);

    // Filter
    const [filterClass, setFilterClass] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            const [cls, sec, stu, fees, pays, defs] = await Promise.all([
                getClasses(), getSections(), getStudents(),
                getFeeStructures(), getFeePayments(), getDefaulters()
            ]);
            setClasses(cls); setSections(sec); setStudents(stu);
            setFeeStructures(fees); setPayments(pays); setDefaultersList(defs);
        } catch (e) { console.error(e); toast.error('Failed to load data'); }
        finally { setLoading(false); }
    };

    const getClassName = (id) => classes.find(c => c.id === id)?.name || id || 'All';

    // ---- Fee Structure CRUD ----
    const handleSaveFee = async () => {
        if (!form.name || !form.amount) { toast.error('Name and amount are required'); return; }
        try {
            if (editing) {
                await updateFeeStructure(editing.id, form);
                await addAuditLog('UPDATE_FEE_STRUCTURE', { id: editing.id, name: form.name });
                toast.success('Fee structure updated');
            } else {
                await addFeeStructure(form);
                await addAuditLog('ADD_FEE_STRUCTURE', { name: form.name, amount: form.amount });
                toast.success('Fee structure added');
            }
            setShowModal(false); resetForm(); fetchAll();
        } catch (e) { toast.error('Failed: ' + e.message); }
    };

    const handleDeleteFee = async (id) => {
        if (!confirm('Delete this fee structure?')) return;
        try {
            await deleteFeeStructure(id);
            await addAuditLog('DELETE_FEE_STRUCTURE', { id });
            toast.success('Deleted'); fetchAll();
        } catch (e) { toast.error('Failed'); }
    };

    const resetForm = () => { setForm({ name: '', type: 'Tuition Fee', amount: '', frequency: 'Monthly', classId: '', academicYear: getCurrentAcademicYear() }); setEditing(null); };

    // ---- Generate Invoices ----
    const handleGenerateInvoices = async () => {
        if (!invoiceForm.feeStructureId || !invoiceForm.classId || !invoiceForm.dueDate) {
            toast.error('Please fill all fields'); return;
        }
        setGenerating(true);
        try {
            const fee = feeStructures.find(f => f.id === invoiceForm.feeStructureId);
            let targetStudents = students.filter(s => s.class === invoiceForm.classId);
            if (invoiceForm.sectionId) targetStudents = targetStudents.filter(s => s.section === invoiceForm.sectionId);

            await generateFeeInvoices(targetStudents, fee, invoiceForm.dueDate);
            await addAuditLog('GENERATE_FEE_INVOICES', { feeName: fee.name, count: targetStudents.length });
            toast.success(`Generated ${targetStudents.length} invoices`);
            setShowInvoiceModal(false); setInvoiceForm({ feeStructureId: '', classId: '', sectionId: '', dueDate: '' });
            fetchAll();
        } catch (e) { toast.error('Failed: ' + e.message); }
        finally { setGenerating(false); }
    };

    // ---- Record Payment ----
    const handleRecordPayment = async () => {
        if (!paymentForm.amount) { toast.error('Amount is required'); return; }
        try {
            const amt = parseFloat(paymentForm.amount);
            const totalPaid = (paymentTarget.paidAmount || 0) + amt;
            const status = totalPaid >= paymentTarget.amount ? 'Paid' : 'Partial';
            await recordPayment(paymentTarget.id, {
                paidAmount: totalPaid,
                status,
                method: paymentForm.method,
                transactionId: paymentForm.transactionId || '',
            });
            await addAuditLog('RECORD_FEE_PAYMENT', { studentName: paymentTarget.studentName, amount: amt });
            toast.success(`Payment of ₹${amt} recorded`);
            setShowPaymentModal(false); setPaymentTarget(null);
            setPaymentForm({ paymentId: '', amount: '', method: 'Cash', transactionId: '' });
            fetchAll();
        } catch (e) { toast.error('Failed: ' + e.message); }
    };

    // Filter payments
    const filteredPayments = payments.filter(p => {
        const matchSearch = !searchQuery || p.studentName?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchClass = !filterClass || p.classId === filterClass;
        return matchSearch && matchClass;
    });

    // Revenue stats
    const totalCollected = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + (p.paidAmount || p.amount || 0), 0);
    const totalPending = defaulters.reduce((s, d) => s + ((d.amount || 0) - (d.paidAmount || 0)), 0);

    const tabs = [
        { key: 'structure', label: '💰 Fee Structure' },
        { key: 'payments', label: '💳 Payments' },
        { key: 'defaulters', label: '⚠ Defaulters' },
        { key: 'reports', label: '📊 Reports' },
    ];

    if (loading) return <div className="page-header"><h1 className="page-title">Loading...</h1></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Fee Management</h1>
                    <p className="page-subtitle">Manage fee structures, track payments, and view reports</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={() => setShowInvoiceModal(true)}>
                        <FiUsers /> Generate Invoices
                    </button>
                    <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                        <FiPlus /> Add Fee
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}><FiDollarSign /></div>
                    <div className="stat-info"><div className="stat-value">₹{totalCollected.toLocaleString()}</div><div className="stat-label">Total Collected</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-danger"><FiDollarSign /></div>
                    <div className="stat-info"><div className="stat-value">₹{totalPending.toLocaleString()}</div><div className="stat-label">Outstanding</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-accent"><FiAlertCircle /></div>
                    <div className="stat-info"><div className="stat-value">{defaulters.length}</div><div className="stat-label">Defaulters</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-primary"><FiDollarSign /></div>
                    <div className="stat-info"><div className="stat-value">{feeStructures.length}</div><div className="stat-label">Fee Types</div></div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                {tabs.map(t => (
                    <button key={t.key} className={`tab ${tab === t.key ? 'tab-active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
                ))}
            </div>

            {/* Fee Structure Tab */}
            {tab === 'structure' && (
                <div className="table-container">
                    <table className="table">
                        <thead><tr><th>Name</th><th>Type</th><th>Amount</th><th>Frequency</th><th>Class</th><th>Year</th><th>Actions</th></tr></thead>
                        <tbody>
                            {feeStructures.map(fee => (
                                <tr key={fee.id}>
                                    <td style={{ fontWeight: 600 }}>{fee.name}</td>
                                    <td><span className="badge badge-primary">{fee.type}</span></td>
                                    <td style={{ fontWeight: 600 }}>₹{(fee.amount || 0).toLocaleString()}</td>
                                    <td>{fee.frequency}</td>
                                    <td>{getClassName(fee.classId)}</td>
                                    <td>{fee.academicYear}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditing(fee); setForm(fee); setShowModal(true); }}><FiEdit2 /></button>
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteFee(fee.id)}><FiTrash2 style={{ color: 'var(--color-danger)' }} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {feeStructures.length === 0 && <div className="empty-state"><div className="empty-state-icon">💰</div><div className="empty-state-title">No fee structures defined</div></div>}
                </div>
            )}

            {/* Payments Tab */}
            {tab === 'payments' && (
                <>
                    <div className="filters-bar">
                        <div className="search-input"><FiSearch className="search-input-icon" /><input className="input" placeholder="Search by student name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: '2.5rem' }} /></div>
                        <select className="input" style={{ width: 'auto', minWidth: 140 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                            <option value="">All Classes</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{filteredPayments.length} records</span>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead><tr><th>Student</th><th>Fee</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {filteredPayments.map(p => {
                                    const balance = (p.amount || 0) - (p.paidAmount || 0);
                                    const statusMap = { Pending: 'badge-warning', Paid: 'badge-success', Overdue: 'badge-danger', Partial: 'badge-info' };
                                    return (
                                        <tr key={p.id}>
                                            <td style={{ fontWeight: 500 }}>{p.studentName}</td>
                                            <td>{p.feeName}</td>
                                            <td>₹{(p.amount || 0).toLocaleString()}</td>
                                            <td>₹{(p.paidAmount || 0).toLocaleString()}</td>
                                            <td style={{ fontWeight: 600, color: balance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>₹{balance.toLocaleString()}</td>
                                            <td>{formatDate(p.dueDate)}</td>
                                            <td><span className={`badge ${statusMap[p.status] || 'badge-neutral'}`}>{p.status}</span></td>
                                            <td>
                                                {p.status !== 'Paid' && (
                                                    <button className="btn btn-sm btn-primary" onClick={() => { setPaymentTarget(p); setPaymentForm({ ...paymentForm, amount: String(balance) }); setShowPaymentModal(true); }}>
                                                        <FiDollarSign /> Record
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredPayments.length === 0 && <div className="empty-state"><p className="empty-state-text">No payment records</p></div>}
                    </div>
                </>
            )}

            {/* Defaulters Tab */}
            {tab === 'defaulters' && (
                <div className="table-container">
                    <table className="table">
                        <thead><tr><th>Student</th><th>Fee</th><th>Amount</th><th>Paid</th><th>Outstanding</th><th>Due Date</th><th>Status</th></tr></thead>
                        <tbody>
                            {defaulters.map(d => (
                                <tr key={d.id}>
                                    <td style={{ fontWeight: 600 }}>{d.studentName}</td>
                                    <td>{d.feeName}</td>
                                    <td>₹{(d.amount || 0).toLocaleString()}</td>
                                    <td>₹{(d.paidAmount || 0).toLocaleString()}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--color-danger)' }}>₹{((d.amount || 0) - (d.paidAmount || 0)).toLocaleString()}</td>
                                    <td>{formatDate(d.dueDate)}</td>
                                    <td><span className={`badge ${d.status === 'Overdue' ? 'badge-danger' : 'badge-warning'}`}>{d.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {defaulters.length === 0 && <div className="empty-state"><div className="empty-state-icon">✅</div><div className="empty-state-title">No defaulters!</div></div>}
                </div>
            )}

            {/* Reports Tab */}
            {tab === 'reports' && (
                <div className="grid-cards">
                    <div className="card">
                        <div className="card-header"><span className="card-title">Collection by Fee Type</span></div>
                        {FEE_TYPES.map(type => {
                            const typePayments = payments.filter(p => p.feeType === type && p.status === 'Paid');
                            const total = typePayments.reduce((s, p) => s + (p.paidAmount || p.amount || 0), 0);
                            if (total === 0) return null;
                            return (
                                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.875rem' }}>
                                    <span>{type}</span>
                                    <span style={{ fontWeight: 600 }}>₹{total.toLocaleString()}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="card">
                        <div className="card-header"><span className="card-title">Collection by Class</span></div>
                        {classes.map(cls => {
                            const clsPayments = payments.filter(p => p.classId === cls.id && p.status === 'Paid');
                            const total = clsPayments.reduce((s, p) => s + (p.paidAmount || p.amount || 0), 0);
                            if (total === 0) return null;
                            return (
                                <div key={cls.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.875rem' }}>
                                    <span>{cls.name}</span>
                                    <span style={{ fontWeight: 600 }}>₹{total.toLocaleString()}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Add/Edit Fee Modal */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editing ? 'Edit Fee Structure' : 'Add Fee Structure'}
                footer={<><button className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button><button className="btn btn-primary" onClick={handleSaveFee}>{editing ? 'Update' : 'Add Fee'}</button></>}>
                <div className="grid-form">
                    <div className="input-group"><label className="input-label">Fee Name *</label><input className="input" placeholder="e.g. Tuition Fee" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                    <div className="input-group"><label className="input-label">Type</label><select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{FEE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                    <div className="input-group"><label className="input-label">Amount (₹) *</label><input className="input" type="number" placeholder="5000" value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || '' })} /></div>
                    <div className="input-group"><label className="input-label">Frequency</label><select className="input" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>{Object.values(FEE_FREQUENCY).map(f => <option key={f}>{f}</option>)}</select></div>
                    <div className="input-group"><label className="input-label">Class (optional)</label><select className="input" value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}><option value="">All Classes</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                    <div className="input-group"><label className="input-label">Academic Year</label><input className="input" value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })} /></div>
                </div>
            </Modal>

            {/* Generate Invoice Modal */}
            <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="📄 Generate Fee Invoices"
                footer={<><button className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleGenerateInvoices} disabled={generating}>{generating ? 'Generating...' : 'Generate'}</button></>}>
                <div className="grid-form">
                    <div className="input-group grid-form-full"><label className="input-label">Fee Structure *</label><select className="input" value={invoiceForm.feeStructureId} onChange={e => setInvoiceForm({ ...invoiceForm, feeStructureId: e.target.value })}><option value="">Select Fee</option>{feeStructures.map(f => <option key={f.id} value={f.id}>{f.name} — ₹{f.amount}</option>)}</select></div>
                    <div className="input-group"><label className="input-label">Class *</label><select className="input" value={invoiceForm.classId} onChange={e => setInvoiceForm({ ...invoiceForm, classId: e.target.value, sectionId: '' })}><option value="">Select</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                    <div className="input-group"><label className="input-label">Section</label><select className="input" value={invoiceForm.sectionId} onChange={e => setInvoiceForm({ ...invoiceForm, sectionId: e.target.value })} disabled={!invoiceForm.classId}><option value="">All</option>{sections.filter(s => s.classId === invoiceForm.classId).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                    <div className="input-group"><label className="input-label">Due Date *</label><input className="input" type="date" value={invoiceForm.dueDate} onChange={e => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} /></div>
                </div>
                <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--color-info-bg)', fontSize: '0.8125rem', color: '#2563eb' }}>
                    💡 This will create a fee payment record for each student in the selected class/section.
                </div>
            </Modal>

            {/* Record Payment Modal */}
            <Modal isOpen={showPaymentModal} onClose={() => { setShowPaymentModal(false); setPaymentTarget(null); }} title="💳 Record Payment"
                footer={<><button className="btn btn-secondary" onClick={() => { setShowPaymentModal(false); setPaymentTarget(null); }}>Cancel</button><button className="btn btn-success" onClick={handleRecordPayment}>Record Payment</button></>}>
                {paymentTarget && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--color-bg)', fontSize: '0.875rem' }}>
                            <strong>{paymentTarget.studentName}</strong> — {paymentTarget.feeName}<br />
                            <span style={{ color: 'var(--color-text-secondary)' }}>Total: ₹{paymentTarget.amount} | Paid: ₹{paymentTarget.paidAmount || 0} | Balance: ₹{(paymentTarget.amount || 0) - (paymentTarget.paidAmount || 0)}</span>
                        </div>
                        <div className="grid-form">
                            <div className="input-group"><label className="input-label">Amount (₹) *</label><input className="input" type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></div>
                            <div className="input-group"><label className="input-label">Method</label><select className="input" value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}><option>Cash</option><option>Online</option><option>Cheque</option><option>Bank Transfer</option><option>UPI</option></select></div>
                            <div className="input-group grid-form-full"><label className="input-label">Transaction ID</label><input className="input" placeholder="Optional" value={paymentForm.transactionId} onChange={e => setPaymentForm({ ...paymentForm, transactionId: e.target.value })} /></div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
