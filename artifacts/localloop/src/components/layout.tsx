import React from 'react';

export function MobileLayout({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="min-h-[100dvh] w-full bg-black flex justify-center">
      <div className={`w-full max-w-[480px] min-h-[100dvh] bg-background relative flex flex-col shadow-2xl overflow-hidden ${className}`}>
        {children}
      </div>
    </div>
  );
}
