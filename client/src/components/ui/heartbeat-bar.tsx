import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EKGWaveform } from "@/components/ui/ekg-waveform";

interface HeartbeatBarProps {
  label: string;
  percentage: number;
  projectCount?: number;
  className?: string;
  variant?: "company" | "global";
  trend?: "up" | "down" | "stable";
  showTrend?: boolean;
  onClick?: () => void;
}

export function HeartbeatBar({
  label,
  percentage,
  projectCount,
  className,
  variant = "company",
  trend = "stable",
  showTrend = true,
  onClick,
}: HeartbeatBarProps) {
  const getPercentageColor = (percent: number) => {
    if (percent >= 90) return "text-green-600 dark:text-green-400";
    if (percent >= 75) return "text-yellow-600 dark:text-yellow-400";
    if (percent >= 60) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getBarColor = (percent: number) => {
    if (percent >= 90) return "bg-green-500";
    if (percent >= 75) return "bg-yellow-500";
    if (percent >= 60) return "bg-orange-500";
    return "bg-red-500";
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const content = (
    <div className="w-full px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          {/* Left side: Label and activity icon */}
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary dark:text-primary-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
            {variant === "global" && (
              <span className="text-xs bg-primary/20 text-primary dark:text-primary-400 px-2 py-1 rounded-full">
                Global
              </span>
            )}
          </div>

          {/* Right side: Percentage and project count */}
          <div className="flex items-center gap-3">
            {projectCount !== undefined && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {projectCount} {projectCount === 1 ? 'project' : 'projects'}
              </span>
            )}
            
            <div className="flex items-center gap-1">
              <span className={cn("text-lg font-bold", getPercentageColor(percentage))}>
                {Math.round(percentage)}%
              </span>
              {showTrend && getTrendIcon()}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300 ease-out",
              getBarColor(percentage)
            )}
            style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
          />
        </div>

        {/* Clean EKG Display */}
        <div className="bg-black rounded-lg overflow-hidden mb-2 p-2 border border-green-500/30">
          <EKGWaveform
            bpm={75 + (percentage < 60 ? Math.random() * 40 : Math.random() * 20)}
            status={percentage >= 80 ? 'normal' : percentage >= 60 ? 'at_risk' : 'delayed'}
            severity={percentage >= 80 ? 'none' : percentage >= 60 ? 'mild' : percentage >= 40 ? 'moderate' : 'severe'}
            frequency={percentage >= 60 ? 'occasional' : 'frequent'}
            width={240}
            height={50}
            className="w-full max-w-xs mx-auto"
          />
        </div>

        {/* Additional context text */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {variant === "global" 
            ? "Average health across all companies and projects"
            : "Average health across company projects"
          }
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <Button
        variant="ghost"
        className={cn(
          "w-full bg-white dark:bg-gray-800 h-auto p-0",
          "border-b border-gray-200 dark:border-gray-700",
          "rounded-none hover:bg-gray-50 dark:hover:bg-gray-700/50",
          "transition-colors duration-200 cursor-pointer",
          className
        )}
        onClick={onClick}
        data-testid="heartbeat-bar"
      >
        {content}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "w-full bg-white dark:bg-gray-800",
        "border-b border-gray-200 dark:border-gray-700",
        className
      )}
      data-testid="heartbeat-bar"
    >
      {content}
    </div>
  );
}