'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword as firebaseUpdatePassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Cookies from 'js-cookie';
import { ROLES } from '@/constants';

const AuthContext = createContext({});

// Helper: if user is a teacher with a teacherId, fetch classTeacherOf from the teachers collection
async function enrichTeacherData(userData) {
    if (!userData?.teacherId) return userData;
    if (userData.role !== ROLES.CLASS_TEACHER && userData.role !== ROLES.SUBJECT_TEACHER) return userData;
    try {
        const teacherDoc = await getDoc(doc(db, 'teachers', userData.teacherId));
        if (teacherDoc.exists()) {
            const td = teacherDoc.data();
            return {
                ...userData,
                classTeacherOf: td.classTeacherOf || userData.classTeacherOf || null,
                isClassTeacher: td.isClassTeacher || userData.isClassTeacher || false,
            };
        }
    } catch (e) {
        console.error('Failed to fetch teacher details:', e);
    }
    return userData;
}

// Helper: if user is a student with a studentId, fetch class/section from the students collection
async function enrichStudentData(userData) {
    if (!userData?.studentId) return userData;
    if (userData.role !== ROLES.STUDENT) return userData;
    try {
        const studentDoc = await getDoc(doc(db, 'students', userData.studentId));
        if (studentDoc.exists()) {
            const sd = studentDoc.data();
            return {
                ...userData,
                class: sd.class || userData.class || null,
                section: sd.section || userData.section || null,
                rollNumber: sd.rollNumber || userData.rollNumber || null,
                admissionNumber: sd.admissionNumber || userData.admissionNumber || null,
            };
        }
    } catch (e) {
        console.error('Failed to fetch student details:', e);
    }
    return userData;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Fetch user role and details from Firestore
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    let userData = null;

                    if (userDoc.exists()) {
                        userData = { uid: firebaseUser.uid, ...userDoc.data() };
                        userData = await enrichTeacherData(userData);
                        userData = await enrichStudentData(userData);
                    } else if (firebaseUser.email === 'dipakshukla158@gmail.com') {
                        // Auto-initialize the first admin user
                        userData = {
                            uid: firebaseUser.uid,
                            name: 'System Admin',
                            email: firebaseUser.email,
                            role: ROLES.ADMIN,
                            createdAt: new Date().toISOString()
                        };
                        await setDoc(userDocRef, userData);
                    }

                    if (userData) {
                        setUser(userData);
                        Cookies.set('school_user', JSON.stringify(userData), { expires: 7 });
                    } else {
                        // User exists in Auth but not in Firestore (and not the default admin)
                        await signOut(auth);
                        setUser(null);
                        Cookies.remove('school_user');
                    }
                } catch (error) {
                    console.error('Error fetching user data from Firestore:', error);
                    setUser(null);
                    Cookies.remove('school_user');
                }
            } else {
                setUser(null);
                Cookies.remove('school_user');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Wait a moment for onAuthStateChanged to pick it up, or fetch directly here to return immediately
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            let userData = null;
            if (userDoc.exists()) {
                userData = { uid: firebaseUser.uid, ...userDoc.data() };
                userData = await enrichTeacherData(userData);
                userData = await enrichStudentData(userData);
            } else if (email === 'dipakshukla158@gmail.com') {
                // Auto-initialize the first admin user
                userData = {
                    uid: firebaseUser.uid,
                    name: 'System Admin',
                    email: firebaseUser.email,
                    role: ROLES.ADMIN,
                    createdAt: new Date().toISOString()
                };
                await setDoc(userDocRef, userData);
            }

            if (!userData) {
                await signOut(auth);
                return { success: false, error: 'Your account is not configured in the system. Please contact the administrator.' };
            }

            setUser(userData);
            Cookies.set('school_user', JSON.stringify(userData), { expires: 7 });

            // Check if password change is required
            if (userData.mustChangePassword) {
                return { success: true, user: userData, mustChangePassword: true };
            }

            return { success: true, user: userData };

        } catch (error) {
            console.error('Login error:', error);
            // Translate common Firebase errors
            let errorMessage = 'Invalid email or password';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = 'Invalid email or password';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed login attempts. Please try again later.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your internet connection.';
            }
            return { success: false, error: errorMessage };
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            Cookies.remove('school_user');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const changePassword = async (newPassword) => {
        if (!user || !auth.currentUser) {
            return { success: false, error: 'Not authenticated' };
        }
        try {
            // Update the actual Firebase Auth password
            await firebaseUpdatePassword(auth.currentUser, newPassword);

            // Clear the mustChangePassword flag in Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, { mustChangePassword: false }, { merge: true });

            const updatedUser = { ...user, mustChangePassword: false };
            setUser(updatedUser);
            Cookies.set('school_user', JSON.stringify(updatedUser), { expires: 7 });
            return { success: true };
        } catch (err) {
            console.error('Password change failed:', err);
            return { success: false, error: err.message || 'Failed to change password' };
        }
    };

    const getDashboardPath = (role) => {
        switch (role) {
            case ROLES.ADMIN: return '/admin';
            case ROLES.CLASS_TEACHER:
            case ROLES.SUBJECT_TEACHER: return '/teacher';
            case ROLES.STUDENT: return '/student';
            default: return '/login';
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
            changePassword,
            getDashboardPath,
            isAdmin: user?.role === ROLES.ADMIN,
            isTeacher: user?.role === ROLES.CLASS_TEACHER || user?.role === ROLES.SUBJECT_TEACHER,
            isClassTeacher: user?.role === ROLES.CLASS_TEACHER,
            isStudent: user?.role === ROLES.STUDENT,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
