import React from 'react';

interface MotoRouteLogoProps {
  className?: string;
}

export const MotoRouteLogo: React.FC<MotoRouteLogoProps> = ({ className = 'w-7 h-7' }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill="var(--accent)" />
      <rect
        x="3.5"
        y="3.5"
        width="57"
        height="57"
        rx="11"
        stroke="#FAF9F6"
        strokeOpacity="0.28"
        strokeWidth="2"
      />
      <path
        d="M17 48C17 37 28 36 33 30C38 24 27 18 46 16"
        stroke="#FAF9F6"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 48C17 37 28 36 33 30C38 24 27 18 46 16"
        stroke="#141413"
        strokeOpacity="0.28"
        strokeWidth="1.5"
        strokeDasharray="3 4"
        strokeLinecap="round"
      />
      <circle cx="17" cy="48" r="6.5" fill="var(--forest)" stroke="#FAF9F6" strokeWidth="2.5" />
      <circle cx="33" cy="30" r="4.5" fill="var(--ochre)" stroke="#FAF9F6" strokeWidth="2" />
      <circle cx="47" cy="16" r="6.5" fill="#FAF9F6" />
      <circle cx="47" cy="16" r="2.8" fill="var(--accent)" />
    </svg>
  );
};
