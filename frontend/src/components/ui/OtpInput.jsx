import React, { useRef } from 'react';

const OtpInput = ({ value = '', onChange, length = 6, disabled = false, isDark = false }) => {
  const inputRefs = useRef([]);

  const handleChange = (e, index) => {
    const val = e.target.value;
    if (/[^0-9]/.test(val)) return; // Only allow numbers

    const newOtp = (value || '').split('');
    // Handle pasting
    if (val.length > 1) {
      const pastedData = val.slice(0, length).split('');
      for (let i = 0; i < pastedData.length; i++) {
        if (index + i < length) {
          newOtp[index + i] = pastedData[i];
        }
      }
      onChange(newOtp.join(''));

      // Focus the next empty input or the last one
      const focusIndex = Math.min(index + pastedData.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    newOtp[index] = val;
    onChange(newOtp.join(''));

    // Move to next input if filled
    if (val !== '' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      const newOtp = (value || '').split('');
      if (!newOtp[index]) {
        // Move to previous input and clear it
        if (index > 0) {
          newOtp[index - 1] = '';
          onChange(newOtp.join(''));
          inputRefs.current[index - 1]?.focus();
        }
      } else {
        // Clear current input
        newOtp[index] = '';
        onChange(newOtp.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  return (
    <div
      role="group"
      aria-label="Verification code input"
      className="flex items-center justify-between gap-1 xs:gap-1.5 sm:gap-2.5 w-full max-w-sm mx-auto select-none"
    >
      {Array.from({ length }).map((_, index) => {
        const digit = (value || '')[index] || '';
        return (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={length} // Allow paste on any field
            value={digit}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={disabled}
            className={`
              flex-1 min-w-0 max-w-[42px] sm:max-w-[48px] h-11 sm:h-14 min-h-[44px]
              text-center text-base sm:text-xl font-bold rounded-xl outline-none shadow-sm
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isDark
                ? 'bg-[#111915] text-white border border-secondary-700 focus:bg-[#16241F] hover:border-brand-500 focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/20 disabled:bg-secondary-900/20'
                : 'bg-secondary-50/50 text-secondary-900 border border-secondary-200 focus:bg-white hover:border-brand-400 focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 disabled:bg-secondary-100'
              }
            `.trim()}
            aria-label={`Digit ${index + 1} of ${length}`}
          />
        );
      })}
    </div>
  );
};

export default OtpInput;
