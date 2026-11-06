import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Shared EmptyState Component for AssessMate
 * Provides visual consistency, clear iconography, semantic headings,
 * and contextual action buttons across Admin, Host, and Candidate portals.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  actionIcon: ActionIcon,
  actionTo,
  onAction,
  secondaryActionText,
  secondaryActionTo,
  onSecondaryAction,
  className = '',
  iconVariant = 'brand'
}) {
  const iconVariants = {
    brand: 'bg-brand-50 text-brand-600 border-brand-100',
    secondary: 'bg-secondary-100 text-secondary-500 border-secondary-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100'
  };

  const selectedVariant = iconVariants[iconVariant] || iconVariants.brand;

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border border-secondary-200/60 bg-white/70 backdrop-blur-sm max-w-xl mx-auto space-y-4 font-sans ${className}`}
    >
      {Icon && (
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-sm ${selectedVariant}`}
          aria-hidden="true"
        >
          <Icon className="w-8 h-8" />
        </div>
      )}

      <div className="space-y-1.5 max-w-md">
        {title && (
          <h3 className="text-lg sm:text-xl font-bold text-secondary-900 tracking-tight">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-xs sm:text-sm text-secondary-500 leading-relaxed max-w-sm mx-auto font-medium">
            {description}
          </p>
        )}
      </div>

      {(actionText || secondaryActionText) && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {actionText && (
            actionTo ? (
              <Link
                to={actionTo}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm hover:shadow cursor-pointer"
              >
                {ActionIcon && <ActionIcon className="w-4 h-4" />}
                <span>{actionText}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm hover:shadow cursor-pointer"
              >
                {ActionIcon && <ActionIcon className="w-4 h-4" />}
                <span>{actionText}</span>
              </button>
            )
          )}

          {secondaryActionText && (
            secondaryActionTo ? (
              <Link
                to={secondaryActionTo}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <span>{secondaryActionText}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={onSecondaryAction}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <span>{secondaryActionText}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

