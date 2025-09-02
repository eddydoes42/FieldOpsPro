import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface BottomNavItem {
  icon: LucideIcon | string;
  label: string;
  route: string;
  badge?: number;
  disabled?: boolean;
  onClick?: () => void;
}

interface BottomNavProps {
  items: BottomNavItem[];
  className?: string;
  onItemClick?: (item: BottomNavItem) => void;
}

export function BottomNav({ items, className, onItemClick }: BottomNavProps) {
  const [location] = useLocation();

  // Only show on mobile and tablet
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "lg:hidden", // Hide on desktop
        "bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800",
        "shadow-lg backdrop-blur-sm bg-white/95 dark:bg-gray-900/95",
        "safe-area-inset-bottom", // Handle iPhone notch
        className
      )}
      data-testid="bottom-navigation"
    >
      <div className="flex items-center justify-between h-16 w-full px-1">
        {items.map((item, index) => {
          const isActive = location === item.route || location.startsWith(item.route + '/');
          const IconComponent = typeof item.icon === 'string' ? null : item.icon;
          
          return (
            <Link
              key={index}
              href={item.disabled ? '#' : item.route}
              onClick={(e) => {
                if (item.onClick) {
                  e.preventDefault();
                  item.onClick();
                  onItemClick?.(item);
                }
              }}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "min-w-0 flex-1 px-1 py-2 rounded-lg max-w-20",
                "transition-all duration-200 ease-in-out",
                "touch-manipulation", // Better touch responsiveness
                {
                  "text-primary dark:text-primary-400 bg-primary/10 dark:bg-primary/20": isActive,
                  "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200": !isActive,
                  "opacity-50 cursor-not-allowed": item.disabled,
                  "active:scale-95": !item.disabled,
                }
              )}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {/* Icon with optional badge */}
              <div className="relative mb-0.5">
                {IconComponent ? (
                  <IconComponent className="h-4 w-4" />
                ) : (
                  <i className={`${item.icon} text-base`} />
                )}
                
                {/* Badge for notifications */}
                {item.badge && item.badge > 0 && (
                  <div className={cn(
                    "absolute -top-1 -right-1",
                    "bg-red-500 text-white text-xs font-bold",
                    "rounded-full h-4 w-4 flex items-center justify-center",
                    "border border-white dark:border-gray-900"
                  )}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </div>
                )}
              </div>
              
              {/* Label */}
              <span className={cn(
                "text-xs font-medium leading-tight",
                "truncate w-full text-center"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}