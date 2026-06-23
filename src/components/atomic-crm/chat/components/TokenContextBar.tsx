import { useState } from 'react';
import { useTokenUsage } from '../contexts/TokenUsageContext';

export function TokenContextBar() {
  const { tokenData } = useTokenUsage();
  const [isExpanded, setIsExpanded] = useState(false);

  const getGradientStyle = (percentage: number) => {
    if (percentage < 25) return 'from-blue-100 to-blue-200';
    else if (percentage < 50) return 'from-blue-200 to-violet-200';
    else if (percentage < 75) return 'from-violet-200 to-violet-300';
    else if (percentage < 90) return 'from-violet-300 to-amber-200';
    else return 'from-amber-300 to-red-300';
  };

  const percentage = tokenData.percentage || 0;
  const gradientClass = getGradientStyle(percentage);

  const formatTokens = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${Math.round(num / 1000)}K`;
    return num.toString();
  };

  return (
    <div className="w-full bg-neutral-50 dark:bg-neutral-950 px-4">
      <div
        className="py-2 cursor-pointer hover:bg-accent/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="relative h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full bg-gradient-to-r ${gradientClass} transition-all duration-300 ease-[cubic-bezier(0.4,0,0.25,1)] rounded-full`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="pb-2 animate-in slide-in-from-top-1 duration-200">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-muted-foreground">
              {percentage.toFixed(1)}% used
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTokens(tokenData.tokens_used)} / {formatTokens(tokenData.max_tokens)} tokens
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
