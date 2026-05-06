import { db } from './firebase';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

// --- Homework ---

export const getHomework = async (filters = {}) => {
    // Fetch all homework and filter client-side to avoid composite index requirements
    const q = query(collection(db, 'homework'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Apply filters client-side
    if (filters.classId) results = results.filter(h => h.classId === filters.classId);
    if (filters.sectionId) results = results.filter(h => h.sectionId === filters.sectionId);
    if (filters.teacherId) results = results.filter(h => h.teacherId === filters.teacherId);

    return results;
};

export const addHomework = async (data) => {
    return await addDoc(collection(db, 'homework'), {
        ...data,
        createdAt: serverTimestamp(),
    });
};

export const updateHomework = async (id, data) => {
    return await updateDoc(doc(db, 'homework', id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteHomework = async (id) => {
    // Also delete all submissions for this homework
    const subs = await getDocs(query(collection(db, 'homeworkSubmissions'), where('homeworkId', '==', id)));
    const deletes = subs.docs.map(d => deleteDoc(doc(db, 'homeworkSubmissions', d.id)));
    deletes.push(deleteDoc(doc(db, 'homework', id)));
    return await Promise.all(deletes);
};

// --- Homework Submissions ---

export const getSubmissions = async (homeworkId) => {
    const q = query(collection(db, 'homeworkSubmissions'), where('homeworkId', '==', homeworkId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getStudentSubmissions = async (studentId) => {
    const q = query(collection(db, 'homeworkSubmissions'), where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const submitHomework = async (data) => {
    const submissionId = `${data.homeworkId}_${data.studentId}`;
    return await setDoc(doc(db, 'homeworkSubmissions', submissionId), {
        ...data,
        status: 'Submitted',
        submittedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
    }, { merge: true });
};

export const gradeSubmission = async (submissionId, grade, feedback) => {
    return await updateDoc(doc(db, 'homeworkSubmissions', submissionId), {
        grade,
        feedback,
        status: 'Graded',
        gradedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
    });
};

export const markResubmit = async (submissionId, feedback) => {
    return await updateDoc(doc(db, 'homeworkSubmissions', submissionId), {
        feedback,
        status: 'Resubmit',
        updatedAt: serverTimestamp(),
    });
};
