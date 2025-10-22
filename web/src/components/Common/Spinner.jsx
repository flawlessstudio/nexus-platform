import React from 'react';
const Spinner = ({ fullPage }) => {
  const wrapperClass = fullPage ? "fixed inset-0 z-50 flex items-center justify-center bg-white" : "flex justify-center items-center py-4";
  return (
    <div className={wrapperClass}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
};
export default Spinner;
