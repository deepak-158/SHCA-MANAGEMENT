'use client';

import { useState, useCallback, createContext, useContext } from 'react';
import { FiCheck, FiX, FiInfo, FiAlertTriangle } from 'react-icons/fi';

const ToastContext = createContext({});

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success', duration = 3000) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    const toast = {
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        info: (msg) => addToast(msg, 'info'),
        warning: (msg) => addToast(msg, 'warning'),
    };

    const icons = {
        success: <FiCheck />,
        error: <FiX />,
        info: <FiInfo />,
        warning: <FiAlertTriangle />,
    };

    const colors = {
        success: '#059669',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b',
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 200, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className="animate-slide-up"
                        style={{
                            background: colors[t.type],
                            color: '#fff',
                            padding: '0.75rem 1.25rem',
                            borderRadius: '0.75rem',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            maxWidth: '360px',
                        }}
                    >
                        {icons[t.type]} {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
