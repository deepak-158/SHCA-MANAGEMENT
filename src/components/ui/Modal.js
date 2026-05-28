'use client';

import { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

export default function Modal({ isOpen, onClose, title, children, footer, size = 'default' }) {
    const modalRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        // Escape Key Listener
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        // Focus Trap and initial focus
        const focusableElementsString = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const modalElement = modalRef.current;
        let focusableElements = [];
        if (modalElement) {
            focusableElements = Array.from(modalElement.querySelectorAll(focusableElementsString));
        }
        
        // Focus the first focusable element (or close button)
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        const handleFocusTrap = (e) => {
            if (e.key !== 'Tab') return;
            
            // Get fresh list of focusable elements in case dynamic forms changed them
            const freshElements = Array.from(modalElement.querySelectorAll(focusableElementsString));
            if (freshElements.length === 0) return;

            const firstElement = freshElements[0];
            const lastElement = freshElements[freshElements.length - 1];

            if (e.shiftKey) { // Shift + Tab
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else { // Tab
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        };

        modalElement?.addEventListener('keydown', handleFocusTrap);

        // Prevent body scrolling
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            modalElement?.removeEventListener('keydown', handleFocusTrap);
            document.body.style.overflow = originalStyle;
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div 
            className="modal-overlay" 
            onClick={(e) => e.target === e.currentTarget && onClose()}
            role="presentation"
        >
            <div 
                ref={modalRef}
                className={`modal ${size === 'lg' ? 'modal-lg' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title-id"
            >
                <div className="modal-header">
                    <h3 id="modal-title-id" className="modal-title">{title}</h3>
                    <button 
                        onClick={onClose} 
                        className="btn btn-ghost btn-icon btn-sm"
                        aria-label="Close dialog"
                    >
                        <FiX />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
}
