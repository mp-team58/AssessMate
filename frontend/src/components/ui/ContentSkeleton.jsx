import React from 'react';

const ContentSkeleton = () => {
  return (
    <div className="w-full space-y-8 animate-pulse font-sans">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-8 w-48 bg-secondary-200/80 rounded-xl" />
        <div className="h-4 w-72 bg-secondary-200/50 rounded-lg" />
      </div>

      {/* Metric Cards Skeleton Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/80 rounded-3xl p-6 border border-secondary-200/60 space-y-4 shadow-sm">
            <div className="w-12 h-12 bg-secondary-200/60 rounded-2xl" />
            <div className="space-y-2">
              <div className="h-7 w-20 bg-secondary-200/80 rounded-lg" />
              <div className="h-3 w-32 bg-secondary-200/50 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Card Skeleton */}
      <div className="bg-white/80 rounded-3xl p-6 md:p-8 border border-secondary-200/60 space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 bg-secondary-200/70 rounded-lg" />
          <div className="h-8 w-24 bg-secondary-200/50 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-secondary-100/70 rounded-2xl border border-secondary-200/40" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContentSkeleton;
