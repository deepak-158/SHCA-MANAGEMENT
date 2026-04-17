import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// --- Children ---

export const getChildrenByParentEmail = async (email) => {
    if (!email) return [];
    const q = query(collection(db, 'students'), where('parentEmail', '==', email));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getChildrenByParentId = async (parentId) => {
    if (!parentId) return [];
    // Parent document stores childrenIds array, or we query via parentEmail
    // For now, we use the email from the users collection
    return [];
};

// --- Child Attendance ---

export const getChildAttendanceSummary = async (studentId, classId, sectionId) => {
    const q = query(
        collection(db, 'attendance'),
        where('classId', '==', classId),
        where('sectionId', '==', sectionId)
    );
    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    let present = 0, absent = 0, leave = 0, total = 0;
    const dailyRecords = [];

    records.forEach(rec => {
        if (rec.records) {
            const studentRec = rec.records.find(r => r.studentId === studentId);
            if (studentRec) {
                total++;
                if (studentRec.status === 'Present') present++;
                else if (studentRec.status === 'Absent') absent++;
                else if (studentRec.status === 'Leave') leave++;
                dailyRecords.push({ date: rec.date, status: studentRec.status });
            }
        }
    });

    return {
        present, absent, leave, total,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        dailyRecords: dailyRecords.sort((a, b) => new Date(b.date) - new Date(a.date)),
    };
};

// --- Child Results ---

export const getChildResults = async (studentId) => {
    const q = query(collection(db, 'results'), where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

// --- Child Fees ---

export const getChildFees = async (studentId) => {
    const q = query(collection(db, 'feePayments'), where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

// --- Child Leave Requests ---

export const getChildLeaves = async (studentId) => {
    const q = query(collection(db, 'leaveRequests'), where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};
