import { db } from './firebase';
import { collection, doc, getDocs, updateDoc, deleteDoc, query, where, orderBy, addDoc, serverTimestamp, limit } from 'firebase/firestore';

// --- Announcements ---

export const getAnnouncements = async (filters = {}) => {
    let constraints = [orderBy('createdAt', 'desc')];
    if (filters.limit) constraints.push(limit(filters.limit));

    const q = query(collection(db, 'announcements'), ...constraints);
    const snapshot = await getDocs(q);
    let announcements = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Client-side filter by target role if provided
    if (filters.targetRole) {
        announcements = announcements.filter(a =>
            !a.targetRoles || a.targetRoles.length === 0 || a.targetRoles.includes(filters.targetRole)
        );
    }
    // Client-side filter by class if provided
    if (filters.classId) {
        announcements = announcements.filter(a =>
            !a.targetClasses || a.targetClasses.length === 0 || a.targetClasses.includes(filters.classId)
        );
    }
    return announcements;
};

export const addAnnouncement = async (data) => {
    return await addDoc(collection(db, 'announcements'), {
        ...data,
        createdAt: serverTimestamp(),
    });
};

export const updateAnnouncement = async (id, data) => {
    return await updateDoc(doc(db, 'announcements', id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteAnnouncement = async (id) => {
    return await deleteDoc(doc(db, 'announcements', id));
};

// --- Notifications ---

export const getNotifications = async (userId, unreadOnly = false) => {
    let constraints = [where('userId', '==', userId), orderBy('createdAt', 'desc')];
    if (unreadOnly) {
        constraints.push(where('isRead', '==', false));
    }
    const q = query(collection(db, 'notifications'), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addNotification = async (userId, data) => {
    return await addDoc(collection(db, 'notifications'), {
        userId,
        ...data,
        isRead: false,
        createdAt: serverTimestamp(),
    });
};

export const markNotificationRead = async (id) => {
    return await updateDoc(doc(db, 'notifications', id), { isRead: true });
};

export const markAllNotificationsRead = async (userId) => {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('isRead', '==', false));
    const snapshot = await getDocs(q);
    const updates = snapshot.docs.map(d => updateDoc(doc(db, 'notifications', d.id), { isRead: true }));
    return await Promise.all(updates);
};

// --- Bulk notification helper ---

export const sendBulkNotifications = async (userIds, data) => {
    const batch = userIds.map(userId =>
        addDoc(collection(db, 'notifications'), {
            userId,
            ...data,
            isRead: false,
            createdAt: serverTimestamp(),
        })
    );
    return await Promise.all(batch);
};

// --- Messages (Teacher-Parent direct messaging) ---

export const getMessages = async (userId) => {
    // Get messages where user is sender or receiver
    const sentQ = query(collection(db, 'messages'), where('senderId', '==', userId), orderBy('createdAt', 'desc'));
    const recvQ = query(collection(db, 'messages'), where('receiverId', '==', userId), orderBy('createdAt', 'desc'));

    const [sentSnap, recvSnap] = await Promise.all([getDocs(sentQ), getDocs(recvQ)]);

    const sent = sentSnap.docs.map(d => ({ id: d.id, ...d.data(), direction: 'sent' }));
    const received = recvSnap.docs.map(d => ({ id: d.id, ...d.data(), direction: 'received' }));

    return [...sent, ...received].sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB - dateA;
    });
};

export const sendMessage = async (data) => {
    return await addDoc(collection(db, 'messages'), {
        ...data,
        readAt: null,
        createdAt: serverTimestamp(),
    });
};

export const markMessageRead = async (id) => {
    return await updateDoc(doc(db, 'messages', id), { readAt: new Date().toISOString() });
};
