'use client';

import { FiX } from 'react-icons/fi';

export default function Modal({ isOpen, onClose, title, children, footer, size = 'default' }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm">
                        <FiX />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
}
