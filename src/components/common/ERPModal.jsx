import React from 'react';
import { X } from 'lucide-react';
import { useERPModalSafeClose } from '../../hooks/useERPModalSafeClose';
import { UnsavedChangesPrompt } from './UnsavedChangesPrompt';

/**
 * Standard ERP Modal Component
 * 
 * Guarantees:
 * - Outside click DOES NOT close the modal.
 * - Explicit close via X button, Cancel, or Esc key checks for unsaved changes.
 * - If form is dirty, prompts: "Unsaved Changes" with [Keep Editing] and [Discard Changes].
 * - Double-click protection via isSubmitting.
 * - Accessible, responsive, and scrolls internally for long forms.
 */
export const ERPModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  maxWidth = '680px',
  zIndex = 10000,
  isDirty = false,
  isSubmitting = false,
  headerExtra = null,
  headerStyle = {},
  children
}) => {
  const {
    showUnsavedPrompt,
    requestClose,
    handleKeepEditing,
    handleDiscard
  } = useERPModalSafeClose({
    isOpen,
    isDirty,
    onClose,
    isSubmitting
  });

  if (!isOpen) return null;

  return (
    <>
      {/* 
        ERP Global Standard:
        Clicking on .modal-overlay does NOTHING.
        No onClick handler on overlay.
      */}
      <div
        className="modal-overlay"
        style={{ zIndex }}
      >
        <div
          className="modal-content"
          style={{ maxWidth, width: '95vw', position: 'relative' }}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="modal-header" style={headerStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {Icon && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Icon size={20} color="#2563eb" />
                  </div>
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    {title}
                  </h3>
                  {subtitle && (
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {subtitle}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {headerExtra}
                <button
                  type="button"
                  onClick={requestClose}
                  className="btn-secondary btn-icon"
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    padding: '0.3rem',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px'
                  }}
                  disabled={isSubmitting}
                  title="Close (Esc)"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          )}

          {typeof children === 'function' ? children({ requestClose, isSubmitting }) : children}
        </div>
      </div>

      <UnsavedChangesPrompt
        isOpen={showUnsavedPrompt}
        onKeepEditing={handleKeepEditing}
        onDiscard={handleDiscard}
      />
    </>
  );
};

export default ERPModal;
