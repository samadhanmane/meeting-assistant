import React from 'react';
import {
  LayoutDashboard,
  Upload,
  FileCheck2,
  BarChart3,
  Database,
  Settings,
  Search,
  ArrowLeft,
  ChevronDown,
  Key
} from 'lucide-react';
import { PageId } from '../types/navigation.ts';

interface AppShellProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  title: string;
  subtitle: string;
  topbarRightSlot?: React.ReactNode;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { id: 'dashboard' as PageId, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload' as PageId, label: 'Upload', icon: Upload },
  { id: 'results' as PageId, label: 'Results', icon: FileCheck2 },
  { id: 'join' as PageId, label: 'Join Meeting', icon: Key },
  { id: 'evaluation' as PageId, label: 'Evaluation', icon: BarChart3 },
  { id: 'dataset' as PageId, label: 'Dataset', icon: Database },
  { id: 'settings' as PageId, label: 'Settings', icon: Settings }
];

export const AppShell: React.FC<AppShellProps> = ({
  currentPage,
  onNavigate,
  title,
  subtitle,
  topbarRightSlot,
  children
}) => {
  return (
    <div className="min-h-screen bg-[#0A0E12] text-[#E7EDF3] flex font-sans antialiased selection:bg-[#2FD9C4]/20 selection:text-[#2FD9C4]">
      {/* FIXED 230px DARK SIDEBAR */}
      <aside
        id="app-sidebar"
        className="w-[230px] flex-shrink-0 bg-[#0A0E12] border-r border-[#212B36] flex flex-col justify-between h-screen sticky top-0 z-30"
      >
        {/* Top: Brand mark + wordmark */}
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-[#212B36]">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center space-x-2.5 text-left group focus:outline-none"
              title="Return to Public Site"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2FD9C4] via-[#8B7CF5] to-[#121821] p-[1px] flex items-center justify-center">
                <div className="w-full h-full bg-[#0A0E12] rounded-[6px] flex items-center justify-center">
                  <div className="w-3 h-3 bg-gradient-to-tr from-[#2FD9C4] to-[#8B7CF5] rounded-xs flex items-center justify-center">
                    <div className="w-1 h-1 bg-[#0A0E12] rounded-xs" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-[#E7EDF3] leading-none">
                  Enterprise AI
                </span>
                <span className="text-[10px] font-mono text-[#8B9AA8] tracking-wider mt-0.5">
                  ASSISTANT
                </span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('home')}
              className="text-[#8B9AA8] hover:text-[#E7EDF3] p-1 rounded transition-colors"
              title="Exit to Homepage"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Six nav links with line icons */}
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-medium rounded-full transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#2FD9C4]/15 text-[#2FD9C4] font-semibold border border-[#2FD9C4]/30'
                      : 'text-[#8B9AA8] hover:text-[#E7EDF3] hover:bg-[#121821]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#2FD9C4]' : 'text-[#8B9AA8]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Pinned: Dataset mini-stats card and green 'systems operational' status dot */}
        <div className="p-3 border-t border-[#212B36] space-y-3">
          {/* Dataset mini-stats card */}
          <div className="p-3 bg-[#121821] border border-[#212B36] rounded-xl text-left">
            <div className="text-[10px] font-mono text-[#8B9AA8] uppercase mb-1">
              DATASET STATUS
            </div>
            <div className="text-xs font-mono font-semibold text-[#E7EDF3]">
              14,200 Clips
            </div>
            <div className="text-[10px] font-mono text-[#2FD9C4] mt-0.5">
              80-band Mel Spectrograms
            </div>
          </div>

          {/* Green 'systems operational' status dot */}
          <div className="flex items-center space-x-2 px-1 text-[11px] font-mono text-[#8B9AA8]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38D48A] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#38D48A]" />
            </span>
            <span>Systems operational</span>
          </div>
        </div>
      </aside>

      {/* FLUID MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOPBAR */}
        <header className="h-16 border-b border-[#212B36] px-6 flex items-center justify-between bg-[#0A0E12]/80 backdrop-blur-md sticky top-0 z-20">
          {/* Page title + subtitle left */}
          <div className="flex flex-col text-left">
            <h1 className="text-base font-semibold text-[#E7EDF3] tracking-tight leading-none">
              {title}
            </h1>
            <p className="text-xs font-mono text-[#8B9AA8] mt-1 leading-none">
              {subtitle}
            </p>
          </div>

          {/* Topbar Right Slot (search box + user avatar chip by default) */}
          <div className="flex items-center space-x-4">
            {topbarRightSlot ? (
              topbarRightSlot
            ) : (
              <>
                {/* Search box */}
                <div className="relative hidden sm:block">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B9AA8]" />
                  <input
                    type="text"
                    placeholder="Search transcripts, decisions..."
                    className="w-56 pl-8 pr-3 py-1.5 text-xs bg-[#121821] border border-[#212B36] rounded-full text-[#E7EDF3] placeholder-[#8B9AA8]/60 focus:outline-none focus:border-[#2FD9C4]"
                  />
                </div>

                {/* User avatar chip */}
                <div className="flex items-center space-x-2.5 pl-2 border-l border-[#212B36]">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#2FD9C4] to-[#8B7CF5] p-[1px] flex items-center justify-center">
                    <div className="w-full h-full bg-[#0A0E12] rounded-full flex items-center justify-center text-[11px] font-mono font-semibold text-[#2FD9C4]">
                      EA
                    </div>
                  </div>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-xs font-medium text-[#E7EDF3] leading-none">
                      Enterprise Admin
                    </span>
                    <span className="text-[10px] font-mono text-[#8B9AA8] mt-0.5">
                      Workspace #04
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto text-left">
          {children}
        </main>
      </div>
    </div>
  );
};
