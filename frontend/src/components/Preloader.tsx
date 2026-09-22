import React, { useState, useEffect, useId } from 'react';

interface PreloaderProps {
  onComplete: () => void;
  minDuration?: number; // default ~750ms
}

const STAGES = [
  'Decoding audio…',
  'Generating spectrogram…',
  'Encoding latent space…',
  'Transcribing…',
  'Summarizing…'
];

export const Preloader: React.FC<PreloaderProps> = ({ onComplete, minDuration = 800 }) => {
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [progress, setProgress] = useState<number>(10);
  const [isCollapsing, setIsCollapsing] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        setPrefersReducedMotion(true);
        const timer = setTimeout(() => {
          onComplete();
        }, 150);
        return () => clearTimeout(timer);
      }
    }

    const stageIntervalTime = Math.floor(minDuration / STAGES.length);

    // Progress bar and stage ticker
    const interval = setInterval(() => {
      setCurrentStageIdx((prev) => {
        const next = prev + 1;
        if (next < STAGES.length) {
          setProgress(Math.min(95, Math.floor(((next + 1) / STAGES.length) * 100)));
          return next;
        } else {
          return prev;
        }
      });
    }, stageIntervalTime);

    // Complete loader flow
    const completeTimer = setTimeout(() => {
      setProgress(100);
      setIsCollapsing(true);
      // Wait for collapse (200ms) then call onComplete
      setTimeout(() => {
        onComplete();
      }, 200);
    }, minDuration);

    return () => {
      clearInterval(interval);
      clearTimeout(completeTimer);
    };
  }, [minDuration, onComplete]);

  // If user prefers reduced motion, render clean 150ms opacity fade
  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0A0E12] flex items-center justify-center transition-opacity duration-150">
        <div className="text-xs font-mono text-[#8B9AA8]">
          Enterprise AI Meeting Assistant
        </div>
      </div>
    );
  }

  // 28 waveform bars interpolating from teal (#2FD9C4) to violet (#8B7CF5)
  const barCount = 28;
  const barDelays = [
    0.1, 0.4, 0.2, 0.6, 0.8, 0.3, 0.7, 0.5, 0.9, 0.2, 0.4, 0.8, 0.3, 0.6, 0.5,
    0.7, 0.2, 0.9, 0.4, 0.6, 0.3, 0.8, 0.5, 0.7, 0.2, 0.6, 0.4, 0.3
  ];

  return (
    <aside
      role="status"
      aria-label="Loading Enterprise AI Pipeline"
      aria-live="polite"
      className={`fixed inset-0 z-50 bg-[#0A0E12] flex flex-col items-center justify-center transition-opacity duration-200 select-none ${
        isCollapsing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Skip button (top right, non-blocking) */}
      <button
        onClick={() => {
          setIsCollapsing(true);
          setTimeout(onComplete, 120);
        }}
        className="absolute top-6 right-6 px-3 py-1 text-[11px] font-mono text-[#8B9AA8] hover:text-[#E7EDF3] border border-[#212B36] hover:border-[#8B9AA8] rounded-full transition-colors bg-[#121821]/80 backdrop-blur-sm"
      >
        ESC · Skip
      </button>

      {/* Main Preloader Centerpiece */}
      <div className="flex flex-col items-center max-w-sm w-full px-6">
        {/* Waveform audio meter container */}
        <div
          className={`h-16 flex items-center justify-center space-x-1 mb-6 transition-all duration-200 ${
            isCollapsing ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          {Array.from({ length: barCount }).map((_, idx) => {
            const ratio = idx / (barCount - 1);
            // Interpolate color from #2FD9C4 (47, 217, 196) to #8B7CF5 (139, 124, 245)
            const r = Math.round(47 + ratio * (139 - 47));
            const g = Math.round(217 + ratio * (124 - 217));
            const b = Math.round(196 + ratio * (245 - 196));
            const barColor = `rgb(${r}, ${g}, ${b})`;
            const delay = barDelays[idx % barDelays.length];

            return (
              <span
                key={idx}
                className="w-1 rounded-full animate-meter-bar"
                style={{
                  backgroundColor: barColor,
                  animationDelay: `${delay}s`,
                  minHeight: '6px'
                }}
              />
            );
          })}
        </div>

        {/* Collapsing Brand Mark icon (appears right as bars collapse) */}
        <div
          className={`w-7 h-7 rounded-lg bg-gradient-to-br from-[#2FD9C4] via-[#8B7CF5] to-[#121821] p-[1.5px] transition-all duration-200 mb-6 ${
            isCollapsing
              ? 'scale-100 opacity-100 -translate-y-4'
              : 'scale-0 opacity-0 pointer-events-none h-0 mb-0'
          }`}
        >
          <div className="w-full h-full bg-[#0A0E12] rounded-[5.5px] flex items-center justify-center">
            <div className="w-3 h-3 bg-gradient-to-tr from-[#2FD9C4] to-[#8B7CF5] rounded-xs flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-[#0A0E12] rounded-xs" />
            </div>
          </div>
        </div>

        {/* Mono Stage Status readout */}
        <div className="h-6 flex items-center justify-center mb-4">
          <span className="text-xs font-mono text-[#8B9AA8] tracking-wide transition-all duration-150">
            {STAGES[currentStageIdx]}
          </span>
        </div>

        {/* Thin 1px progress track line */}
        <div className="w-56 h-[1.5px] bg-[#212B36] rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-[#2FD9C4] to-[#8B7CF5] transition-all ease-out duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* System telemetry caption */}
        <div className="flex items-center justify-between w-56 mt-2 text-[10px] font-mono text-[#8B9AA8]/60">
          <span>PIPELINE INIT</span>
          <span>{progress}%</span>
        </div>
      </div>
    </aside>
  );
};
