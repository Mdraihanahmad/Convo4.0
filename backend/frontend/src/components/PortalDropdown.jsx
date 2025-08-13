import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Reusable portal-based dropdown that positions near an anchor element
// Props:
// - anchorRef: ref of the button or element that triggers the dropdown
// - isOpen: boolean
// - onClose: function to close on outside click or ESC
// - children: dropdown content
// - offset: {x, y} pixel offset from anchor (default {x: 0, y: 8})
// - align: 'right' | 'left' — horizontal alignment relative to anchor (default 'right')
const PortalDropdown = ({ anchorRef, isOpen, onClose, children, offset = { x: 0, y: 8 }, align = 'right' }) => {
  const portalRoot = document.getElementById('portal-root');
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, maxWidth: 280 });

  // Compute position relative to viewport
  const computePosition = () => {
    const anchor = anchorRef?.current;
    const dropdown = dropdownRef?.current;
    if (!anchor || !dropdown) return;

    const rect = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Default horizontal alignment
    let left = align === 'right' ? rect.right - dropdown.offsetWidth : rect.left;
    let top = rect.bottom + offset.y;

    // Ensure within viewport horizontally
    if (left + dropdown.offsetWidth > vw - 8) {
      left = vw - dropdown.offsetWidth - 8;
    }
    if (left < 8) left = 8;

    // If not enough space below, open above
    if (top + dropdown.offsetHeight > vh - 8) {
      const above = rect.top - dropdown.offsetHeight - offset.y;
      if (above > 8) top = above;
    }

    setPosition({ top: Math.max(8, top), left: Math.max(8, left), maxWidth: Math.min(320, vw - 16) });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    computePosition();
    // Slight delay to ensure layout after render
    const id = setTimeout(computePosition, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onResizeScroll = () => computePosition();
    const onClick = (e) => {
      const anchor = anchorRef?.current;
      const dropdown = dropdownRef?.current;
      if (!anchor || !dropdown) return;
      if (anchor.contains(e.target) || dropdown.contains(e.target)) return;
      onClose?.();
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('resize', onResizeScroll);
    window.addEventListener('scroll', onResizeScroll, true);
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResizeScroll);
      window.removeEventListener('scroll', onResizeScroll, true);
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!portalRoot || !isOpen) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] bg-gray-800 text-white rounded-md shadow-xl border border-gray-700 p-2 w-40 sm:w-44"
      style={{ top: position.top, left: position.left, maxWidth: position.maxWidth }}
    >
      {children}
    </div>,
    portalRoot
  );
};

export default PortalDropdown;


