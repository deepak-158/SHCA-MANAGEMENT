'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getChildrenByParentEmail, getChildFees } from '@/lib/parentService';
import { getClasses } from '@/lib/dataService';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FiDollarSign, FiDownload, FiCreditCard, FiCheckCircle } from 'react-icons/fi';
import { formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export default function ParentFeesPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [classes, setClasses] = useState([]);
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Payment Gateway Simulator state
    const [payingFee, setPayingFee] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [kids, cls] = await Promise.all([getChildrenByParentEmail(user?.email), getClasses()]);
                setChildren(kids); setClasses(cls);
                if (kids.length > 0) setSelectedChild(kids[0]);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (user?.email) fetch();
    }, [user]);

    useEffect(() => {
        if (!selectedChild) return;
        const fetchFees = async () => {
            try {
                const data = await getChildFees(selectedChild.id);
                setFees(data);
            } catch (e) { console.error(e); }
        };
        fetchFees();
    }, [selectedChild]);

    const getClassName = (id) => classes.find(c => c.id === id)?.name || id;

    const pending = fees.filter(f => f.status === 'Pending' || f.status === 'Overdue' || f.status === 'Partial');
    const paid = fees.filter(f => f.status === 'Paid');
    const totalDue = pending.reduce((sum, f) => sum + (f.amount - (f.paidAmount || 0)), 0);
    const totalPaid = paid.reduce((sum, f) => sum + (f.paidAmount || f.amount || 0), 0);

    const statusBadge = (status) => {
        const map = { Pending: 'badge-warning', Paid: 'badge-success', Overdue: 'badge-danger', Partial: 'badge-info' };
        return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
    };

    const handleSimulatePayment = async () => {
        if (!payingFee) return;
        setIsProcessing(true);
        try {
            const balance = (payingFee.amount || 0) - (payingFee.paidAmount || 0);
            const newPaid = (payingFee.paidAmount || 0) + balance;
            
            // Artificial delay to simulate banking gateway
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Update in Firestore
            await updateDoc(doc(db, 'feePayments', payingFee.id), {
                paidAmount: newPaid,
                status: 'Paid',
                method: 'Online Target Gateway (Simulated)',
                transactionId: 'TXN' + Math.floor(Math.random() * 1000000000),
                paidDate: new Date().toISOString(),
                updatedAt: serverTimestamp(),
            });

            setPaymentSuccess(true);
            setTimeout(() => {
                setPayingFee(null);
                setPaymentSuccess(false);
                setIsProcessing(false);
                const fetchFees = async () => {
                    const data = await getChildFees(selectedChild.id);
                    setFees(data);
                };
                fetchFees();
                toast.success('Payment successful!');
            }, 2500);

        } catch (e) {
            console.error(e);
            toast.error('Payment failed');
            setIsProcessing(false);
        }
    };

    if (loading) return <div className="loading-overlay" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Fee Payments</h1>
                    <p className="page-subtitle">View fee details and payment history</p>
                </div>
                {children.length > 1 && (
                    <select className="input" style={{ width: 'auto', minWidth: 200 }} value={selectedChild?.id || ''} onChange={e => setSelectedChild(children.find(c => c.id === e.target.value))}>
                        {children.map(c => <option key={c.id} value={c.id}>{c.name} — {getClassName(c.class)} {c.section}</option>)}
                    </select>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card" style={{ borderLeft: '3px solid var(--color-danger)' }}>
                    <div className="stat-icon stat-icon-danger"><FiDollarSign /></div>
                    <div className="stat-info">
                        <div className="stat-value">₹{totalDue.toLocaleString()}</div>
                        <div className="stat-label">Total Due</div>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeft: '3px solid var(--color-success)' }}>
                    <div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}><FiDollarSign /></div>
                    <div className="stat-info">
                        <div className="stat-value">₹{totalPaid.toLocaleString()}</div>
                        <div className="stat-label">Total Paid</div>
                    </div>
                </div>
            </div>

            {/* Pending Fees */}
            {pending.length > 0 && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <span className="card-title" style={{ color: 'var(--color-danger)' }}>⚠ Pending / Overdue Fees</span>
                        <span className="badge badge-danger">{pending.length}</span>
                    </div>
                    <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                        <table className="table">
                            <thead><tr><th>Fee Name</th><th>Type</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {pending.map(f => {
                                    const balance = ((f.amount || 0) - (f.paidAmount || 0));
                                    return (
                                    <tr key={f.id}>
                                        <td style={{ fontWeight: 600 }}>{f.feeName}</td>
                                        <td>{f.feeType}</td>
                                        <td>₹{(f.amount || 0).toLocaleString()}</td>
                                        <td>₹{(f.paidAmount || 0).toLocaleString()}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--color-danger)' }}>₹{balance.toLocaleString()}</td>
                                        <td>{formatDate(f.dueDate)}</td>
                                        <td>{statusBadge(f.status)}</td>
                                        <td>
                                            <button className="btn btn-sm btn-primary" onClick={() => setPayingFee(f)}>
                                                <FiCreditCard /> Pay Now
                                            </button>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-border)' }}>
                        💡 Online payments are processed securely via our automated payment gateway.
                    </div>
                </div>
            )}

            {/* Payment History */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title">Payment History</span>
                    <span className="badge badge-success">{paid.length} Payments</span>
                </div>
                {paid.length === 0 ? (
                    <div className="empty-state"><p className="empty-state-text">No payments recorded yet</p></div>
                ) : (
                    <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                        <table className="table">
                            <thead><tr><th>Fee Name</th><th>Amount</th><th>Paid Date</th><th>Method</th><th>Status</th></tr></thead>
                            <tbody>
                                {paid.map(f => (
                                    <tr key={f.id}>
                                        <td style={{ fontWeight: 500 }}>{f.feeName}</td>
                                        <td>₹{(f.paidAmount || f.amount || 0).toLocaleString()}</td>
                                        <td>{formatDate(f.paidDate)}</td>
                                        <td>{f.method || 'Cash'}</td>
                                        <td>{statusBadge(f.status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Simulated Payment Gateway Modal */}
            <Modal isOpen={!!payingFee} onClose={() => !isProcessing && setPayingFee(null)} title={paymentSuccess ? "Payment Successful" : "Secure Payment Gateway"}
                footer={
                    !paymentSuccess ? (
                        <>
                            <button className="btn btn-secondary" onClick={() => setPayingFee(null)} disabled={isProcessing}>Cancel</button>
                            <button className="btn btn-primary" disabled={isProcessing} onClick={handleSimulatePayment} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {isProcessing ? <div className="spinner" style={{ width: 14, height: 14, borderBottomColor: '#fff' }} /> : <FiCreditCard />}
                                {isProcessing ? 'Processing...' : `Pay ₹${((payingFee?.amount || 0) - (payingFee?.paidAmount || 0)).toLocaleString()}`}
                            </button>
                        </>
                    ) : null
                }
            >
                {payingFee && !paymentSuccess && (
                    <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px dashed #cbd5e1' }}>
                            <div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{payingFee.feeName}</div>
                                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>For {selectedChild?.name}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>₹{((payingFee.amount || 0) - (payingFee.paidAmount || 0)).toLocaleString()}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Due</div>
                            </div>
                        </div>

                        {/* Faux Card Details form */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="input-group">
                                <label className="input-label">Card Number</label>
                                <input className="input" placeholder="0000 0000 0000 0000" disabled={isProcessing} defaultValue="4242 4242 4242 4242" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="input-group">
                                    <label className="input-label">Expiry</label>
                                    <input className="input" placeholder="MM/YY" disabled={isProcessing} defaultValue="12/28" />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">CVV</label>
                                    <input className="input" type="password" placeholder="***" disabled={isProcessing} defaultValue="123" />
                                </div>
                            </div>
                        </div>

                        {isProcessing && (
                            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                                <div className="spinner" style={{ width: 24, height: 24 }} />
                                <div style={{ fontSize: '0.875rem', fontWeight: 500, animation: 'pulse 1.5s infinite' }}>Connecting to Bank...</div>
                            </div>
                        )}
                    </div>
                )}
                
                {paymentSuccess && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 1rem' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
                            <FiCheckCircle size={32} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0f172a' }}>Payment Successful!</h3>
                            <p style={{ margin: 0, color: '#64748b' }}>A receipt has been generated.</p>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
