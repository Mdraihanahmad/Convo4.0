import React from 'react';

const formatCount = (count) => {
  if (count > 99) return '99+';
  return String(count);
};

// Reusable unread badge component
// Props: count: number
const UnreadBadge = ({ count = 0 }) => {
  if (!count || count <= 0) return null;
  return (
    <span
      className="ml-2 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-[#25D366] px-1 text-[10px] font-semibold text-white"
      aria-label={`${count} unread messages`}
    >
      {formatCount(count)}
    </span>
  );
};

export default UnreadBadge;


