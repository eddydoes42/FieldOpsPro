import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
}

export function SearchBar({
  value = "",
  onChange,
  onClear,
  placeholder = "Search...",
  className,
  disabled = false,
  onFocus,
  onBlur,
  autoFocus = false,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  const handleClear = () => {
    setInternalValue("");
    onChange?.("");
    onClear?.();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      handleClear();
    }
  };

  return (
    <div
      className={cn(
        "relative flex items-center w-full max-w-2xl mx-auto",
        "bg-white dark:bg-gray-800 rounded-xl shadow-sm",
        "border border-gray-200 dark:border-gray-700",
        "transition-all duration-200 ease-in-out",
        "hover:shadow-md focus-within:shadow-md",
        "focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary",
        className
      )}
      data-testid="search-bar"
    >
      {/* Search Icon */}
      <div className="flex items-center justify-center w-10 h-full pl-4">
        <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
      </div>

      {/* Input Field */}
      <Input
        ref={inputRef}
        type="text"
        value={internalValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          "flex-1 border-0 bg-transparent",
          "focus-visible:ring-0 focus-visible:ring-offset-0",
          "text-gray-900 dark:text-gray-100",
          "placeholder:text-gray-500 dark:placeholder:text-gray-400",
          "text-base font-medium", // Poppins will be applied via global CSS
          "px-2 py-3"
        )}
        data-testid="search-input"
      />

      {/* Clear Button */}
      {internalValue && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={disabled}
          className={cn(
            "h-8 w-8 p-0 mr-2 flex-shrink-0",
            "hover:bg-gray-100 dark:hover:bg-gray-700",
            "rounded-full transition-colors"
          )}
          data-testid="search-clear"
        >
          <X className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  );
}