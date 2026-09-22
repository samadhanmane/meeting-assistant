import React from 'react';
import { ArrowRight, Key, Lock, LogOut } from 'lucide-react';
import { PageId } from '../types/navigation.ts';
import { AuthSession } from '../types/pipeline.ts';

interface HeaderProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  activeSession?: AuthSession | null;
  onLogoutSession?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  activeSession,
  onLogoutSession
}) => {
  return (
    <header
      id="site-header"
      className="sticky top-0 z-40 w-full border-b border-[#212B36] bg-[#0A0E12]/90 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo mark + wordmark left */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center space-x-3 text-left group focus:outline-none cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2FD9C4] via-[#8B7CF5] to-[#121821] p-[1.5px] flex items-center justify-center shadow-sm transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-[#0A0E12] rounded-[6.5px] flex items-center justify-center">
              <div className="w-3.5 h-3.5 bg-gradient-to-tr from-[#2FD9C4] to-[#8B7CF5] rounded-sm flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-[#0A0E12] rounded-xs" />
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight text-[#E7EDF3] leading-none group-hover:text-white transition-colors">
              Enterprise AI
            </span>
            <span className="text-xs font-mono text-[#8B9AA8] tracking-wider mt-0.5">
              MEETING ASSISTANT
            </span>
          </div>
        </button>

        {/* Nav links center */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
          <button
            onClick={() => onNavigate('home')}
            className={`transition-colors py-1 cursor-pointer ${
              currentPage === 'home'
                ? 'text-[#2FD9C4] font-semibold'
                : 'text-[#8B9AA8] hover:text-[#E7EDF3]'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('about')}
            className={`transition-colors py-1 cursor-pointer ${
              currentPage === 'about'
                ? 'text-[#2FD9C4] font-semibold'
                : 'text-[#8B9AA8] hover:text-[#E7EDF3]'
            }`}
          >
            Problem &amp; Team
          </button>
          <button
            onClick={() => onNavigate('features')}
            className={`transition-colors py-1 cursor-pointer ${
              currentPage === 'features'
                ? 'text-[#2FD9C4] font-semibold'
                : 'text-[#8B9AA8] hover:text-[#E7EDF3]'
            }`}
          >
            Features
          </button>
          <button
            onClick={() => onNavigate('dataset')}
            className={`transition-colors py-1 cursor-pointer ${
              currentPage === 'dataset'
                ? 'text-[#2FD9C4] font-semibold'
                : 'text-[#8B9AA8] hover:text-[#E7EDF3]'
            }`}
          >
            Dataset
          </button>
          <button
            onClick={() => onNavigate('join')}
            className={`transition-colors py-1 flex items-center space-x-1.5 cursor-pointer ${
              currentPage === 'join'
                ? 'text-[#2FD9C4] font-semibold'
                : 'text-[#8B9AA8] hover:text-[#E7EDF3]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Join Meeting</span>
          </button>
        </nav>

        {/* Active Session & Primary CTA right */}
        <div className="flex items-center space-x-3">
          {activeSession ? (
            <div className="flex items-center space-x-2 bg-[#121821] border border-[#212B36] px-3 py-1.5 rounded-full text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-[#38D48A]" />
              <span className="text-[#2FD9C4] font-semibold">{activeSession.meetingId}</span>
              <span className="text-[#8B9AA8]">({activeSession.role})</span>
              <button
                onClick={onLogoutSession}
                title="Leave Meeting Session"
                className="ml-1 text-[#8B9AA8] hover:text-[#EF4444] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}

          <button
            id="header-cta"
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2 text-xs sm:text-sm font-medium text-[#0A0E12] bg-[#2FD9C4] hover:bg-[#2FD9C4]/90 active:scale-[0.98] rounded-full transition-all duration-150 flex items-center space-x-1.5 shadow-[0_0_20px_rgba(47,217,196,0.2)] cursor-pointer"
          >
            <span>Open dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
