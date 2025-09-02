import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import QuickActionMenu from "@/components/quick-action-menu";
import { useAuth } from "@/hooks/useAuth";
import { hasAnyRole } from "../../../shared/schema";
import { useLocation } from "wouter";

export default function FloatingQuickAction() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Don't show on landing page or if not authenticated
  if (location === "/" || !isAuthenticated || !user) return null;

  const canShowQuickActions = hasAnyRole(user as any, ['administrator', 'manager', 'dispatcher', 'operations_director']);

  if (!canShowQuickActions) return null;

  const handleOpenMenu = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({
      x: rect.left - 280, // Position menu to the left of the button
      y: rect.top - 300,  // Position menu above the button
    });
    setIsMenuOpen(true);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-24 lg:bottom-6 right-6 z-50">
        <Button
          onClick={handleOpenMenu}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-primary hover:bg-primary/90 p-0"
          title="Quick Actions (Right-click anywhere for menu)"
        >
          <Zap className="h-6 w-6" />
        </Button>
      </div>

      {/* Quick Action Menu */}
      <QuickActionMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        position={menuPosition}
      />
    </>
  );
}