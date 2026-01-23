import { createPortal } from 'react-dom';
import type { ReactNode, MouseEvent } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Overlay opacity: 30, 50, or 60 percent */
  overlayOpacity?: 30 | 50 | 60;
  /** Whether clicking overlay closes modal (default: true) */
  closeOnOverlayClick?: boolean;
}

const overlayOpacityClasses = {
  30: 'bg-black/30',
  50: 'bg-black/50',
  60: 'bg-black/60',
} as const;

/**
 * Portal-based Modal component.
 *
 * Renders to #modal-root which appears after #root in the DOM,
 * ensuring modals always appear above the sidebar without z-index.
 */
export function Modal({
  open,
  onClose,
  children,
  overlayOpacity = 50,
  closeOnOverlayClick = true,
}: ModalProps) {
  if (!open) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) {
    console.error('Modal root element not found');
    return null;
  }

  const handleOverlayClick = (e: MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleContentClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return createPortal(
    <div
      className={`fixed inset-0 ${overlayOpacityClasses[overlayOpacity]} flex items-center justify-center overflow-auto p-4`}
      onClick={handleOverlayClick}
    >
      <div onClick={handleContentClick}>
        {children}
      </div>
    </div>,
    modalRoot
  );
}

export default Modal;
