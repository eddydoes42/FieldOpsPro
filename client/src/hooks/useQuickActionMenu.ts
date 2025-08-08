import { useState, useCallback, useEffect } from "react";

export function useQuickActionMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const openMenu = useCallback((x: number, y: number) => {
    setPosition({ x, y });
    setIsOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle right-click context menu
  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      // Only trigger on right-click in main content areas, not on specific elements
      const target = event.target as HTMLElement;
      
      // Skip if clicked on input, button, or other interactive elements
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('[role="button"]') ||
        target.closest('.context-menu-disabled')
      ) {
        return;
      }

      // Check if we're in a main content area
      if (
        target.closest('.quick-action-zone') ||
        target.closest('main') ||
        target.closest('[data-quick-actions="true"]')
      ) {
        event.preventDefault();
        openMenu(event.clientX, event.clientY);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [openMenu]);

  return {
    isOpen,
    position,
    openMenu,
    closeMenu,
  };
}