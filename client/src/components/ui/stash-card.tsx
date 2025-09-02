import { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StashCardProps {
  title?: string;
  subtitle?: string;
  description?: string;
  image?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "compact" | "featured";
  testId?: string;
}

export function StashCard({
  title,
  subtitle,
  description,
  image,
  icon,
  actions,
  children,
  className,
  onClick,
  disabled = false,
  variant = "default",
  testId,
}: StashCardProps) {
  const isClickable = !!onClick && !disabled;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
        "shadow-sm hover:shadow-md",
        {
          // Default card styling
          "": variant === "default",
          // Compact variant for smaller spaces
          "max-w-sm": variant === "compact",
          // Featured variant for important cards
          "ring-2 ring-primary/20 border-primary": variant === "featured",
        },
        {
          // Interactive states
          "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50": isClickable,
          "active:scale-[0.98]": isClickable,
          "opacity-60 cursor-not-allowed": disabled,
        },
        className
      )}
      onClick={isClickable ? onClick : undefined}
      data-testid={testId}
    >
      {/* Image/Icon Section */}
      {(image || icon) && (
        <div className="flex items-center justify-center p-6 pb-4">
          {image && (
            <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              {image}
            </div>
          )}
          {!image && icon && (
            <div className="text-primary dark:text-primary-400">
              {icon}
            </div>
          )}
        </div>
      )}

      {/* Content Section */}
      {(title || subtitle || description || children) && (
        <CardHeader className="space-y-2 pb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 line-clamp-1">
              {subtitle}
            </p>
          )}
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-500 line-clamp-3">
              {description}
            </p>
          )}
          {children && <div className="mt-2">{children}</div>}
        </CardHeader>
      )}

      {/* Actions Section */}
      {actions && (
        <CardContent className="pt-0 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
          </div>
        </CardContent>
      )}
    </Card>
  );
}