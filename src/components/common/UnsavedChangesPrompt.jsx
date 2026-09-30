import React from 'react';
import { AlertTriangle, Edit3, Trash2 } from 'lucide-react';

/**
 * Universal ERP Unsaved Changes Confirmation Dialog
 * Displayed whenever a user attempts to close a form with modified data.
 */
export const UnsavedChangesPrompt = ({ isOpen, onKeepEditing, onDiscard }) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '450px',
          width: '90vw',
          border: '1px solid #fca5a5',
          borderRadius: '12px',
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out'
        }}
      >
        <div
          style={{
            background: '#fef2f2',
            borderBottom: '1px solid #fee2e2',
            padding: '1.1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <AlertTriangle size={20} color="#dc2626" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#991b1b' }}>
              Unsaved Changes
            </h4>
            <span style={{ fontSize: '0.76rem', color: '#b91c1c' }}>
              Your entered information will be lost if discarded
            </span>
          </div>
        </div>

        <div style={{ padding: '1.25rem' }}>
          <p style={{ margin: 0, color: '#334155', fontSize: '0.9rem', lineHeight: 1.5, fontWeight: 500 }}>
            You have unsaved changes. Are you sure you want to close?
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '0.85rem 1.25rem'
          }}
        >
          <button
            type="button"
            onClick={onKeepEditing}
            className="btn btn-secondary"
            style={{
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem'
            }}
            autoFocus
          >
            <Edit3 size={15} /> Keep Editing
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="btn btn-danger"
            style={{
              background: '#dc2626',
              borderColor: '#dc2626',
              color: '#ffffff',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem'
            }}
          >
            <Trash2 size={15} /> Discard Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesPrompt;
