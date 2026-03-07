import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

// --- Classes & Sections ---

export const getClasses = async () => {
    const querySnapshot = await getDocs(query(collection(db, 'classes'), orderBy('order', 'asc')));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addClass = async (classData) => {
    return await addDoc(collection(db, 'classes'), { ...classData, createdAt: serverTimestamp() });
};

export const updateClass = async (id, classData) => {
    return await updateDoc(doc(db, 'classes', id), { ...classData, updatedAt: serverTimestamp() });
};

export const deleteClass = async (id) => {
    return await deleteDoc(doc(db, 'classes', id));
};

export const getSections = async () => {
    const querySnapshot = await getDocs(collection(db, 'sections'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addSection = async (sectionData) => {
    return await addDoc(collection(db, 'sections'), { ...sectionData, createdAt: serverTimestamp() });
};

export const updateSection = async (id, sectionData) => {
    return await updateDoc(doc(db, 'sections', id), { ...sectionData, updatedAt: serverTimestamp() });
};

export const deleteSection = async (id) => {
    return await deleteDoc(doc(db, 'sections', id));
};

// --- Teachers ---

export const getTeachers = async () => {
    const querySnapshot = await getDocs(collection(db, 'teachers'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addTeacher = async (teacherData) => {
    return await setDoc(doc(db, 'teachers', teacherData.id), { ...teacherData, createdAt: serverTimestamp() });
};

export const updateTeacher = async (id, teacherData) => {
    return await updateDoc(doc(db, 'teachers', id), { ...teacherData, updatedAt: serverTimestamp() });
};

export const deleteTeacher = async (id) => {
    return await deleteDoc(doc(db, 'teachers', id));
};

// Update the role field (and optional extra fields) in the 'users' collection for a given email
export const updateUserRoleByEmail = async (email, role, extraData = {}) => {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snapshot = await getDocs(q);
    const updates = [];
    snapshot.docs.forEach(d => {
        updates.push(updateDoc(doc(db, 'users', d.id), { role, ...extraData }));
    });
    return Promise.all(updates);
};

// --- Students ---

export const getStudents = async () => {
    const querySnapshot = await getDocs(collection(db, 'students'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addStudent = async (studentData) => {
    return await setDoc(doc(db, 'students', studentData.id), { ...studentData, createdAt: serverTimestamp() });
};

export const updateStudent = async (id, studentData) => {
    return await updateDoc(doc(db, 'students', id), { ...studentData, updatedAt: serverTimestamp() });
};

export const deleteStudent = async (id) => {
    return await deleteDoc(doc(db, 'students', id));
};

// --- Calendar ---

export const getCalendarEvents = async () => {
    const querySnapshot = await getDocs(query(collection(db, 'calendarEvents'), orderBy('date', 'asc')));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addCalendarEvent = async (eventData) => {
    return await addDoc(collection(db, 'calendarEvents'), { ...eventData, createdAt: serverTimestamp() });
};

export const updateCalendarEvent = async (id, eventData) => {
    return await updateDoc(doc(db, 'calendarEvents', id), { ...eventData, updatedAt: serverTimestamp() });
};

export const deleteCalendarEvent = async (id) => {
    return await deleteDoc(doc(db, 'calendarEvents', id));
};

// --- Subjects ---

export const getSubjects = async () => {
    const querySnapshot = await getDocs(collection(db, 'subjects'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addSubject = async (subjectData) => {
    return await addDoc(collection(db, 'subjects'), { ...subjectData, createdAt: serverTimestamp() });
};

export const updateSubject = async (id, subjectData) => {
    return await updateDoc(doc(db, 'subjects', id), { ...subjectData, updatedAt: serverTimestamp() });
};

export const deleteSubject = async (id) => {
    return await deleteDoc(doc(db, 'subjects', id));
};

// --- Timetable ---

export const getTimetable = async () => {
    const querySnapshot = await getDocs(collection(db, 'timetable'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const setTimetableSlot = async (slotId, slotData) => {
    return await setDoc(doc(db, 'timetable', slotId), slotData);
};

export const deleteTimetableSlot = async (slotId) => {
    return await deleteDoc(doc(db, 'timetable', slotId));
};

// --- Period Timings ---

export const getPeriodTimings = async () => {
    const docSnap = await getDoc(doc(db, 'settings', 'periodTimings'));
    return docSnap.exists() ? docSnap.data() : {};
};

export const setPeriodTimings = async (timings) => {
    return await setDoc(doc(db, 'settings', 'periodTimings'), timings);
};

// --- Leave Requests ---

export const getLeaveRequests = async () => {
    const querySnapshot = await getDocs(collection(db, 'leaveRequests'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addLeaveRequest = async (leaveData) => {
    return await addDoc(collection(db, 'leaveRequests'), { ...leaveData, createdAt: serverTimestamp() });
};

export const updateLeaveRequest = async (id, leaveData) => {
    return await updateDoc(doc(db, 'leaveRequests', id), { ...leaveData, updatedAt: serverTimestamp() });
};

// --- Exams ---

export const getExams = async () => {
    const querySnapshot = await getDocs(query(collection(db, 'exams'), orderBy('startDate', 'desc')));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addExam = async (examData) => {
    return await addDoc(collection(db, 'exams'), { ...examData, createdAt: serverTimestamp() });
};

export const updateExam = async (id, examData) => {
    return await updateDoc(doc(db, 'exams', id), { ...examData, updatedAt: serverTimestamp() });
};

export const deleteExam = async (id) => {
    return await deleteDoc(doc(db, 'exams', id));
};

// --- Syllabus ---

export const getSyllabusCards = async () => {
    const querySnapshot = await getDocs(collection(db, 'syllabus'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addSyllabus = async (syllabusData) => {
    return await addDoc(collection(db, 'syllabus'), { ...syllabusData, uploadedAt: new Date().toISOString(), createdAt: serverTimestamp() });
};

export const deleteSyllabus = async (id) => {
    return await deleteDoc(doc(db, 'syllabus', id));
};

// --- Attendance ---

export const getAttendance = async (classId, sectionId, date) => {
    if (classId && sectionId && date) {
        const q = query(collection(db, 'attendance'), where('classId', '==', classId), where('sectionId', '==', sectionId), where('date', '==', date));
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return docs.length > 0 ? docs[0] : null;
    }
    const q = date ? query(collection(db, 'attendance'), where('date', '==', date)) : collection(db, 'attendance');
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getAttendanceByDate = async (classId, sectionId, date) => {
    const q = query(collection(db, 'attendance'), where('classId', '==', classId), where('sectionId', '==', sectionId), where('date', '==', date));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveAttendance = async (classId, sectionId, date, records) => {
    const recordId = `${classId}_${sectionId}_${date}`;
    return await setDoc(doc(db, 'attendance', recordId), {
        classId,
        sectionId,
        date,
        records,
        updatedAt: serverTimestamp()
    }, { merge: true });
};

export const getAttendanceRecords = async (classId, sectionId) => {
    const q = query(collection(db, 'attendance'), where('classId', '==', classId), where('sectionId', '==', sectionId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateAttendance = async (recordId, attendanceData) => {
    return await setDoc(doc(db, 'attendance', recordId), attendanceData, { merge: true });
};

// --- Leave (aliases / helpers) ---

export const getLeaves = async () => {
    const querySnapshot = await getDocs(collection(db, 'leaveRequests'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateLeaveStatus = async (id, status, remarks) => {
    return await updateDoc(doc(db, 'leaveRequests', id), { status, remarks, updatedAt: serverTimestamp() });
};

export const deleteLeave = async (id) => {
    return await deleteDoc(doc(db, 'leaveRequests', id));
};

// --- Results ---

export const getResults = async () => {
    const querySnapshot = await getDocs(collection(db, 'results'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getResultsForClassSection = async (examId, classId, sectionId) => {
    const q = query(collection(db, 'results'), where('examId', '==', examId), where('classId', '==', classId), where('sectionId', '==', sectionId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveResults = async (examId, classId, sectionId, resultsArray) => {
    const batch = [];
    for (const result of resultsArray) {
        const resultId = result.id || `${examId}_${result.studentId}`;
        batch.push(setDoc(doc(db, 'results', resultId), { ...result, updatedAt: serverTimestamp() }, { merge: true }));
    }
    return await Promise.all(batch);
};

// --- Student Leave Submission ---

export const submitLeaveRequest = async (leaveData) => {
    return await addDoc(collection(db, 'leaveRequests'), { ...leaveData, status: 'Pending', createdAt: serverTimestamp() });
};

// --- Syllabus (student view alias) ---

export const getSyllabuses = async () => {
    const querySnapshot = await getDocs(collection(db, 'syllabus'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- Audit Logs ---

export const addAuditLog = async (action, details = {}) => {
    try {
        // Get current user from cookie (works both in components and service calls)
        let performedBy = 'system';
        if (typeof window !== 'undefined') {
            try {
                const cookie = document.cookie.split('; ').find(c => c.startsWith('school_user='));
                if (cookie) {
                    const userData = JSON.parse(decodeURIComponent(cookie.split('=').slice(1).join('=')));
                    performedBy = userData.name || userData.email || userData.uid || 'unknown';
                }
            } catch (_) {}
        }
        return await addDoc(collection(db, 'auditLogs'), {
            action,
            details,
            performedBy,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error('Audit log failed:', error);
    }
};

export const getAuditLogs = async (limitCount = 100) => {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.slice(0, limitCount).map(doc => ({ id: doc.id, ...doc.data() }));
};
