import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

// --- Fee Structures ---

export const getFeeStructures = async (classId) => {
    let q;
    if (classId) {
        q = query(collection(db, 'feeStructures'), where('classId', '==', classId), orderBy('name', 'asc'));
    } else {
        q = query(collection(db, 'feeStructures'), orderBy('name', 'asc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addFeeStructure = async (data) => {
    return await addDoc(collection(db, 'feeStructures'), { ...data, isActive: true, createdAt: serverTimestamp() });
};

export const updateFeeStructure = async (id, data) => {
    return await updateDoc(doc(db, 'feeStructures', id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteFeeStructure = async (id) => {
    return await deleteDoc(doc(db, 'feeStructures', id));
};

// --- Fee Payments ---

export const getFeePayments = async (filters = {}) => {
    let q = collection(db, 'feePayments');
    const constraints = [];
    if (filters.studentId) constraints.push(where('studentId', '==', filters.studentId));
    if (filters.classId) constraints.push(where('classId', '==', filters.classId));
    if (filters.status) constraints.push(where('status', '==', filters.status));

    if (constraints.length > 0) {
        q = query(q, ...constraints);
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addFeePayment = async (data) => {
    return await addDoc(collection(db, 'feePayments'), { ...data, createdAt: serverTimestamp() });
};

export const updateFeePayment = async (id, data) => {
    return await updateDoc(doc(db, 'feePayments', id), { ...data, updatedAt: serverTimestamp() });
};

export const recordPayment = async (paymentId, paymentData) => {
    return await updateDoc(doc(db, 'feePayments', paymentId), {
        ...paymentData,
        paidDate: new Date().toISOString(),
        updatedAt: serverTimestamp(),
    });
};

// --- Fee Invoices (Bulk Generation) ---

export const generateFeeInvoices = async (students, feeStructure, dueDate) => {
    const batch = [];
    for (const student of students) {
        const invoiceId = `${feeStructure.id}_${student.id}_${dueDate}`;
        batch.push(
            setDoc(doc(db, 'feePayments', invoiceId), {
                studentId: student.id,
                studentName: student.name,
                classId: student.class,
                sectionId: student.section,
                feeStructureId: feeStructure.id,
                feeName: feeStructure.name,
                feeType: feeStructure.type,
                amount: feeStructure.amount,
                paidAmount: 0,
                dueDate,
                status: 'Pending',
                academicYear: feeStructure.academicYear || '',
                createdAt: serverTimestamp(),
            }, { merge: true })
        );
    }
    return await Promise.all(batch);
};

// --- Fee Discounts ---

export const getFeeDiscounts = async (studentId) => {
    const q = query(collection(db, 'feeDiscounts'), where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addFeeDiscount = async (data) => {
    return await addDoc(collection(db, 'feeDiscounts'), { ...data, createdAt: serverTimestamp() });
};

// --- Reports ---

export const getDefaulters = async () => {
    const q = query(collection(db, 'feePayments'), where('status', 'in', ['Pending', 'Overdue', 'Partial']));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getFeeCollectionReport = async (startDate, endDate) => {
    const q = query(collection(db, 'feePayments'), where('status', '==', 'Paid'));
    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Filter by date range client-side (Firestore limitation with multiple conditions)
    return payments.filter(p => {
        if (!p.paidDate) return false;
        return p.paidDate >= startDate && p.paidDate <= endDate;
    });
};
