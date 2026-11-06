import React from 'react';

/**
 * Shared StatusBadge Component for AssessMate
 * Provides consistent status styling across Admin, Host, and Candidate portals.
 */
const STATUS_VARIANTS = {
  // Emerald / Green - Active & Successful States
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PASS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PASSED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  EASY: 'bg-emerald-50 text-emerald-700 border-emerald-200',

  // Neutral / Slate - Inactive & Archived States
  DRAFT: 'bg-secondary-100 text-secondary-600 border-secondary-200',
  ENDED: 'bg-secondary-100 text-secondary-600 border-secondary-200',
  DEACTIVATED: 'bg-secondary-100 text-secondary-600 border-secondary-200',
  DELETED: 'bg-secondary-100 text-secondary-500 border-secondary-200',
  ARCHIVED: 'bg-secondary-100 text-secondary-500 border-secondary-200',
  INACTIVE: 'bg-secondary-100 text-secondary-600 border-secondary-200',

  // Amber / Warning - Pending & Caution States
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  ONGOING: 'bg-amber-50 text-amber-700 border-amber-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  FLAGGED: 'bg-amber-50 text-amber-700 border-amber-200',
  WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
  UPCOMING: 'bg-amber-50 text-amber-700 border-amber-200',

  // Red / Critical - Failed & Suspended States
  FAIL: 'bg-red-50 text-red-700 border-red-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
  TERMINATED: 'bg-red-50 text-red-700 border-red-200',
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  HARD: 'bg-red-50 text-red-700 border-red-200',
  EXPIRED: 'bg-red-50 text-red-700 border-red-200',

  // Blue / Info
  INFO: 'bg-blue-50 text-blue-700 border-blue-200',
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  ENROLLED: 'bg-brand-50 text-brand-700 border-brand-200'
};

const DOT_COLORS = {
  ACTIVE: 'bg-emerald-500',
  LIVE: 'bg-emerald-500',
  PASS: 'bg-emerald-500',
  PASSED: 'bg-emerald-500',
  COMPLETED: 'bg-emerald-500',
  VERIFIED: 'bg-emerald-500',
  SUCCESS: 'bg-emerald-500',
  PUBLISHED: 'bg-emerald-500',
  EASY: 'bg-emerald-500',

  DRAFT: 'bg-secondary-400',
  ENDED: 'bg-secondary-400',
  DEACTIVATED: 'bg-secondary-400',
  DELETED: 'bg-secondary-400',
  ARCHIVED: 'bg-secondary-400',
  INACTIVE: 'bg-secondary-400',

  PENDING: 'bg-amber-500',
  IN_PROGRESS: 'bg-amber-500',
  ONGOING: 'bg-amber-500',
  MEDIUM: 'bg-amber-500',
  FLAGGED: 'bg-amber-500',
  WARNING: 'bg-amber-500',
  UPCOMING: 'bg-amber-500',

  FAIL: 'bg-red-500',
  FAILED: 'bg-red-500',
  SUSPENDED: 'bg-red-500',
  TERMINATED: 'bg-red-500',
  HIGH: 'bg-red-500',
  HARD: 'bg-red-500',
  EXPIRED: 'bg-red-500',

  INFO: 'bg-blue-500',
  SUBMITTED: 'bg-blue-500',
  ENROLLED: 'bg-brand-500'
};

export default function StatusBadge({
  status,
  variant,
  size = 'md',
  showDot = true,
  pulse,
  className = '',
  children
}) {
  const normalizedKey = String(variant || status || '').trim().toUpperCase();
  const badgeStyle = STATUS_VARIANTS[normalizedKey] || 'bg-secondary-100 text-secondary-600 border-secondary-200';
  const dotColor = DOT_COLORS[normalizedKey] || 'bg-secondary-400';
  const shouldPulse = pulse !== undefined ? pulse : (normalizedKey === 'LIVE' || normalizedKey === 'IN_PROGRESS' || normalizedKey === 'ONGOING');

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-xs sm:text-sm'
  };

  const displayText = children || (status ? String(status).replace(/_/g, ' ') : '');

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full border transition-colors select-none tracking-wide ${sizeClasses[size] || sizeClasses.md} ${badgeStyle} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor} ${shouldPulse ? 'animate-pulse' : ''}`}
        />
      )}
      <span>{displayText}</span>
    </span>
  );
}
