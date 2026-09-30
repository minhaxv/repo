import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to enforce global ERP modal closing rules:
 * 1. Outside click does NOT close.
 * 2. Explicit close (X button, Cancel button, ESC key) triggers unsaved changes confirmation if form is dirty.
 * 3. Double-click save protection: disables actions when isSubmitting.
 * 4. Locks background body scroll while modal is active.
 */
export function useERPModalSafeClose({
  isOpen,
  isDirty,
  onClose,
  isSubmitting = false
}) {
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

  // Safely request closing
  const requestClose = useCallback(() => {
    if (isSubmitting) return; // Prevent closing while operation is saving

    const dirty = typeof isDirty === 'function' ? isDirty() : Boolean(isDirty);
    if (dirty) {
      setShowUnsavedPrompt(true);
    } else {
      if (onClose) onClose();
    }
  }, [isDirty, onClose, isSubmitting]);

  // Keep editing
  const handleKeepEditing = useCallback(() => {
    setShowUnsavedPrompt(false);
  }, []);

  // Discard changes and close
  const handleDiscard = useCallback(() => {
    setShowUnsavedPrompt(false);
    if (onClose) onClose();
  }, [onClose]);

  // Handle ESC key safely (only top-most modal handles ESC)
  useEffect(() => {
    if (!isOpen) {
      setShowUnsavedPrompt(false);
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // If the unsaved prompt is open, ESC closes the prompt (keep editing)
        if (showUnsavedPrompt) {
          e.stopPropagation();
          e.preventDefault();
          setShowUnsavedPrompt(false);
          return;
        }

        e.stopPropagation();
        e.preventDefault();
        requestClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, showUnsavedPrompt, requestClose]);

  // Lock body scroll while modal is mounted
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  return {
    showUnsavedPrompt,
    requestClose,
    handleKeepEditing,
    handleDiscard
  };
}

export default useERPModalSafeClose;
