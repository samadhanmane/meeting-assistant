import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#212B36] py-8 bg-[#0A0E12]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#8B9AA8]">
        <div>
          Enterprise AI Meeting Assistant · End-to-end audio engineering and neural pipeline.
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#2FD9C4]/80" />
          <span>Team project · 4 members</span>
        </div>
      </div>
    </footer>
  );
};
