import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus } from 'lucide-react';

interface NumberStepperProps {
  value: number;
  onChange: (newValue: number) => void;
  step?: number;
  min?: number;
  max?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  inputWidth?: string;
  title?: string;
  disabled?: boolean;
}

export const NumberStepper: React.FC<NumberStepperProps> = ({
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  prefix,
  suffix,
  className = '',
  inputWidth = 'w-20',
  title,
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [textValue, setTextValue] = useState<string>(
    Number.isFinite(value) ? String(value) : '0'
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize textValue with prop value when NOT actively editing
  useEffect(() => {
    if (!isFocused) {
      setTextValue(Number.isFinite(value) ? String(value) : '0');
    }
  }, [value, isFocused]);

  const roundPrecision = (num: number): number => {
    return Math.round(num * 10000) / 10000;
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const current = Number.isFinite(value) ? value : min;
    const next = roundPrecision(current - step);
    const clamped = Math.max(min, next);
    setTextValue(String(clamped));
    onChange(clamped);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const current = Number.isFinite(value) ? value : min;
    const next = roundPrecision(current + step);
    const clamped = max !== undefined ? Math.min(max, next) : next;
    setTextValue(String(clamped));
    onChange(clamped);
  };

  const selectAll = (input: HTMLInputElement) => {
    // Select all text so the user can immediately overwrite the number with one keystroke
    input.select();
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setTextValue(Number.isFinite(value) ? String(value) : '');
    // Slight timeout ensures selection works across all browser focus sequences
    setTimeout(() => {
      if (inputRef.current) {
        selectAll(inputRef.current);
      }
    }, 20);
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    selectAll(e.currentTarget);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow comma as decimal separator for Latin/Venezuelan keyboard convenience
    const normalized = raw.replace(',', '.');

    // Only allow valid numeric characters (digits, minus, at most one dot)
    if (!/^-?\d*\.?\d*$/.test(normalized)) {
      return;
    }

    setTextValue(raw);

    // If it's a complete valid number, trigger onChange immediately
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed) && isFinite(parsed)) {
      const clamped = max !== undefined ? Math.min(max, parsed) : parsed;
      onChange(clamped);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const normalized = textValue.replace(',', '.').trim();
    const parsed = parseFloat(normalized);

    if (isNaN(parsed) || !isFinite(parsed) || parsed < min) {
      const fallback = Math.max(min, isNaN(parsed) ? (min > 0 ? min : 0) : parsed);
      setTextValue(String(fallback));
      onChange(fallback);
    } else {
      const clamped = max !== undefined ? Math.min(max, parsed) : parsed;
      setTextValue(String(clamped));
      onChange(clamped);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement(e as unknown as React.MouseEvent);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement(e as unknown as React.MouseEvent);
    }
  };

  return (
    <div
      className={`inline-flex items-center border border-slate-300 rounded-md bg-white overflow-hidden shadow-2xs hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all ${className} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      title={title}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className="px-2 py-1 bg-slate-50 hover:bg-slate-200 active:bg-slate-300 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border-r border-slate-200 text-xs font-bold transition-colors select-none flex items-center justify-center cursor-pointer"
        title="Disminuir valor (-)"
      >
        <Minus className="w-3 h-3" />
      </button>

      {prefix && (
        <span className="pl-1 text-slate-500 font-mono text-[10px] select-none font-semibold">
          {prefix}
        </span>
      )}

      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        value={textValue}
        onFocus={handleFocus}
        onClick={handleClick}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${inputWidth} px-1.5 py-1 text-center font-mono text-xs font-bold text-slate-900 bg-transparent focus:outline-none focus:bg-blue-50/70 select-all transition-colors`}
      />

      {suffix && (
        <span className="pr-1 text-slate-500 font-mono text-[10px] select-none font-semibold">
          {suffix}
        </span>
      )}

      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || (max !== undefined && value >= max)}
        className="px-2 py-1 bg-slate-50 hover:bg-slate-200 active:bg-slate-300 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border-l border-slate-200 text-xs font-bold transition-colors select-none flex items-center justify-center cursor-pointer"
        title="Aumentar valor (+)"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
};
