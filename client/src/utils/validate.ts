// Shared validators — each returns an error string or '' (no error)

export const required = (v: any): string =>
  String(v ?? '').trim() ? '' : 'Required';

export const minLen = (n: number) => (v: string): string =>
  !v || v.trim().length >= n ? '' : `Must be at least ${n} characters`;

export const maxLen = (n: number) => (v: string): string =>
  !v || v.trim().length <= n ? '' : `Must be at most ${n} characters`;

export const email = (v: string): string => {
  if (!v) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter a valid email address';
};

// Indian mobile: 10 digits starting 6-9 (strips spaces, dashes, +91, 0)
export const phone = (v: string): string => {
  if (!v) return '';
  const digits = v.replace(/[\s\-+()/]/g, '').replace(/^(0|91)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? '' : 'Enter a valid 10-digit mobile number';
};

// GSTIN: 15-char format 22AAAAA0000A1Z5
export const gstin = (v: string): string => {
  if (!v) return '';
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v.toUpperCase())
    ? '' : 'Invalid GSTIN — expected 15-char format (e.g. 22AAAAA0000A1Z5)';
};

// Academic year YYYY-YY (e.g. 2025-26)
export const academicYear = (v: string): string => {
  if (!v) return '';
  if (!/^\d{4}-\d{2}$/.test(v)) return 'Format: YYYY-YY (e.g. 2025-26)';
  const [start, end] = v.split('-');
  if (Number(end) !== (Number(start) + 1) % 100) return 'End year should be start year + 1 (e.g. 2025-26)';
  return '';
};

export const positiveNumber = (v: any): string => {
  if (v === '' || v === undefined || v === null) return '';
  return Number(v) > 0 ? '' : 'Must be greater than 0';
};

export const nonNegativeNumber = (v: any): string => {
  if (v === '' || v === undefined || v === null) return '';
  return Number(v) >= 0 ? '' : 'Must be 0 or greater';
};

export const percentage = (v: any): string => {
  if (v === '' || v === undefined || v === null) return '';
  const n = Number(v);
  return n >= 0 && n <= 100 ? '' : 'Must be between 0 and 100';
};

export const password = (v: string): string => {
  if (!v) return '';
  return v.length >= 8 ? '' : 'Password must be at least 8 characters';
};

// Run multiple validators in sequence — returns first error found
export const chain = (...fns: ((v: any) => string)[]) => (v: any): string => {
  for (const fn of fns) {
    const err = fn(v);
    if (err) return err;
  }
  return '';
};

// Utility: given a record of { field → validator(value) }, returns { field → error }
export const runAll = (rules: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(rules).filter(([, v]) => !!v));

// CSS class helpers
export const fieldCls = (touched: boolean, error: string) =>
  `w-full px-3 py-2 border rounded-xl text-sm outline-none transition-colors ${
    touched && error
      ? 'border-red-400 bg-red-50 focus:border-red-400'
      : 'border-gray-200 focus:border-indigo-400'
  }`;

export const FieldError = ({ msg }: { msg?: string }) =>
  msg ? `<p class="text-xs text-red-500 mt-1">${msg}</p>` : '';
