import React from 'react';
import { AlertCircle } from 'lucide-react';

// Inline error that stays on screen (a toast disappears before people finish reading it).
const FormAlert = ({ children }) =>
  children ? (
    <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-3 text-sm font-medium text-red-700">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  ) : null;

export default FormAlert;

