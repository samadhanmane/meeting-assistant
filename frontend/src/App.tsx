import React, { useState } from 'react';
import { Preloader } from './components/Preloader.tsx';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { AppShell } from './components/AppShell.tsx';
import { PageId } from './types/navigation.ts';
import { AuthSession, PipelineProcessResult } from './types/pipeline.ts';

// Views
import { HomeView } from './views/HomeView.tsx';
import { AboutView } from './views/AboutView.tsx';
import { FeaturesView } from './views/FeaturesView.tsx';
import { DashboardView } from './views/app/DashboardView.tsx';
import { UploadView } from './views/app/UploadView.tsx';
import { ResultsView } from './views/app/ResultsView.tsx';
import { EvaluationView } from './views/app/EvaluationView.tsx';
import { DatasetView } from './views/app/DatasetView.tsx';
import { SettingsView } from './views/app/SettingsView.tsx';
import { JoinMeetingView } from './views/app/JoinMeetingView.tsx';

export default function App() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHeroRevealed, setIsHeroRevealed] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [selectedMeetingTitle, setSelectedMeetingTitle] = useState<string>(
    'AMI Corpus EN2001a Recording'
  );
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | undefined>(undefined);

  // In-memory Auth Session state (Step 5: not stored in localStorage)
  const [activeSession, setActiveSession] = useState<AuthSession | null>(null);
  const [latestProcessedResult, setLatestProcessedResult] = useState<PipelineProcessResult | null>(null);
  const [processedMeetings, setProcessedMeetings] = useState<PipelineProcessResult[]>([]);

  const handlePreloaderComplete = () => {
    setIsLoading(false);
    requestAnimationFrame(() => {
      setIsHeroRevealed(true);
    });
  };

  const handleNavigate = (page: PageId) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthenticated = (session: AuthSession) => {
    setActiveSession(session);
    setSelectedMeetingId(session.meetingId);
    setCurrentPage('results');
  };

  const handleLogoutSession = () => {
    setActiveSession(null);
    setSelectedMeetingId(undefined);
    setLatestProcessedResult(null);
  };

  // Determine whether current page uses the Marketing layout or App Shell
  const isAppShellPage = [
    'dashboard',
    'upload',
    'results',
    'evaluation',
    'dataset',
    'settings',
    'join'
  ].includes(currentPage);

  return (
    <div className="min-h-screen bg-[#0A0E12] text-[#E7EDF3] flex flex-col font-sans selection:bg-[#2FD9C4]/20 selection:text-[#2FD9C4]">
      {/* 1. AUDIO-ENGINEERING PRELOADER (Runs on first mount) */}
      {isLoading && (
        <Preloader onComplete={handlePreloaderComplete} minDuration={850} />
      )}

      {/* 2. PAGE ROUTING */}
      {!isAppShellPage ? (
        // PUBLIC / MARKETING PAGES (Home, About / Problem & Team, Features)
        <div className="min-h-screen flex flex-col justify-between">
          <Header
            currentPage={currentPage}
            onNavigate={handleNavigate}
            activeSession={activeSession}
            onLogoutSession={handleLogoutSession}
          />

          <main className="flex-1 w-full">
            {currentPage === 'home' && (
              <HomeView
                onNavigate={handleNavigate}
                isHeroRevealed={!isLoading && isHeroRevealed}
              />
            )}
            {currentPage === 'about' && <AboutView onNavigate={handleNavigate} />}
            {currentPage === 'features' && (
              <FeaturesView onNavigate={handleNavigate} />
            )}
          </main>

          <Footer />
        </div>
      ) : (
        // APP SHELL PAGES (Dashboard, Upload, Results, Evaluation, Dataset, Settings, Join)
        <>
          {currentPage === 'dashboard' && (
            <AppShell
              currentPage={currentPage}
              onNavigate={handleNavigate}
              title="Dashboard"
              subtitle="Real-time acoustic analysis and enterprise meetings"
            >
              <DashboardView onNavigate={handleNavigate} processedMeetings={processedMeetings} />
            </AppShell>
          )}

          {currentPage === 'join' && (
            <AppShell
              currentPage={currentPage}
              onNavigate={handleNavigate}
              title="Join Protected Meeting"
              subtitle="Authenticate with Meeting ID & Password to view results"
            >
              <JoinMeetingView
                onNavigate={handleNavigate}
                onAuthenticated={handleAuthenticated}
                initialMeetingId={selectedMeetingId}
              />
            </AppShell>
          )}

          {currentPage === 'upload' && (
            <AppShell
              currentPage={currentPage}
              onNavigate={handleNavigate}
              title="Upload Meeting"
              subtitle="Ingest audio recording with required password protection"
            >
              <UploadView
                onNavigate={handleNavigate}
                onPipelineProcessed={(result, session) => {
                  setLatestProcessedResult(result);
                  setProcessedMeetings((prev) => [result, ...prev.filter((m) => m.sessionId !== result.sessionId)]);
                  setSelectedMeetingId(result.sessionId);
                  setSelectedMeetingTitle(result.meetingTitle);
                  if (session) {
                    setActiveSession(session);
                  }
                  setCurrentPage('results');
                }}
              />
            </AppShell>
          )}

          {currentPage === 'results' && (
            <AppShell
              currentPage={currentPage}
              onNavigate={handleNavigate}
              title="Meeting Results"
              subtitle="Verified decisions, action items, and diarized transcripts"
            >
              <ResultsView
                onNavigate={handleNavigate}
                selectedMeetingId={selectedMeetingId}
                selectedMeetingTitle={selectedMeetingTitle}
                initialResult={latestProcessedResult}
                onSelectMeeting={(id, title) => {
                  setSelectedMeetingId(id);
                  setSelectedMeetingTitle(title);
                  setLatestProcessedResult(null);
                }}
                session={activeSession}
                onSessionExpired={handleLogoutSession}
              />
            </AppShell>
          )}

          {currentPage === 'evaluation' && (
            <AppShell
              currentPage={currentPage}
              onNavigate={handleNavigate}
              title="Model Evaluation"
              subtitle="Empirical latency benchmarks, MSE, ROUGE-L, and vocoder scores"
            >
              <EvaluationView onNavigate={handleNavigate} />
            </AppShell>
          )}

          {currentPage === 'dataset' && (
            <AppShell
              currentPage={currentPage}
              onNavigate={handleNavigate}
              title="Corpus & Dataset"
              subtitle="14,200 curated teleconference audio segments with Mel filterbanks"
            >
              <DatasetView onNavigate={handleNavigate} />
            </AppShell>
          )}

          {currentPage === 'settings' && (
            <AppShell
              currentPage={currentPage}
              onNavigate={handleNavigate}
              title="Workspace Settings"
              subtitle="Model checkpoints, notification alerts, and privacy governance"
            >
              <SettingsView onNavigate={handleNavigate} />
            </AppShell>
          )}
        </>
      )}
    </div>
  );
}
