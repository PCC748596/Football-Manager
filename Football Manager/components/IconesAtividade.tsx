import React from 'react';

// Icones SVG das atividades (traco com currentColor: seguem a cor do cartao e ficam brancos no hover).
export const IconeAmistoso: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="24" cy="24" r="17" />
    <path d="M24 16.5l7 5.1-2.7 8.2h-8.6l-2.7-8.2z" fill="currentColor" fillOpacity="0.25" />
    <path d="M24 16.5V7.2M31 21.6l8.6-2.8M28.3 29.8l5.3 7.2M19.7 29.8l-5.3 7.2M17 21.6l-8.6-2.8" />
  </svg>
);
export const IconeTreino: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M4 38l13-21 7 11 5-7 15 17z" fill="currentColor" fillOpacity="0.2" />
    <path d="M13.5 22.5l3.5 3 3-4.5M27.5 24.2l2.5 2.3 2.6-3.6" />
    <circle cx="36" cy="10" r="3.4" />
  </svg>
);
export const IconeFesta: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M6 42l8-24 16 16z" fill="currentColor" fillOpacity="0.2" />
    <path d="M11 30l9 9M15.5 20.5l12 12" />
    <path d="M29 12l1.6 3.4L34 17l-3.4 1.6L29 22l-1.6-3.4L24 17l3.4-1.6zM39 24l1 2.2 2.2 1-2.2 1L39 30.4l-1-2.2-2.2-1 2.2-1zM22 5l.8 1.8L24.6 7.6l-1.8.8L22 10.2l-.8-1.8-1.8-.8 1.8-.8z" fill="currentColor" fillOpacity="0.35" strokeWidth="1.6" />
  </svg>
);
