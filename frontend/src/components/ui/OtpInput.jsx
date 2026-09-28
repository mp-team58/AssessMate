import React, { useRef } from 'react';

const OtpInput = ({ value, onChange, length = 6, disabled = false }) => {
  const inputRefs = useRef([]);

  const handleChange = (e, index) => {
    const val = e.target.value;
    if (/[^0-9]/.test(val)) return; // Only allow numbers

    const newOtp = value.split('');
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
      const newOtp = value.split('');
      if (newOtp[index] === '') {
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
    }
  };

  return (
    <div className="flex gap-2 justify-between">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={length} // Allow longer for paste
          value={value[index] || ''}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          disabled={disabled}
          className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-secondary-200 bg-secondary-50/50 focus:bg-white hover:border-brand-400 focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 disabled:opacity-50 disabled:bg-secondary-100 transition-all duration-300 outline-none text-secondary-900 shadow-sm"
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
};

export default OtpInput;
