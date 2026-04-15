import React from 'react';

const Spinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const s = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }[size];
  return <div className={`${s} border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin`} />;
};

export default Spinner;
