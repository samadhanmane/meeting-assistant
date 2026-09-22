import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Mic,
  RotateCcw,
  Sparkles,
  Sliders
} from 'lucide-react';
import { audioPlayer, PlaybackState } from '../utils/audioPlayer.ts';

interface MeetingAudioPlayerProps {
  title?: string;
  transcript?: string;
  audioSrc?: string;
  className?: string;
}

export const MeetingAudioPlayer: React.FC<MeetingAudioPlayerProps> = ({
  title = 'AMI Corpus EN2001a Recording',
  transcript = 'Speaker A: If you have this big warning about doing nothing at all in the gateway machine. Speaker B: We verified that keep-alive timeout thresholds were tripping during idle socket transitions.',
  audioSrc = '',
  className = ''
}) => {
  const [state, setState] = useState<PlaybackState>(audioPlayer.getState());

  useEffect(() => {
    audioPlayer.setAudioSource(audioSrc, transcript);
    const unsubscribe = audioPlayer.subscribe((s) => setState(s));
    return () => {
      unsubscribe();
    };
  }, [audioSrc, transcript]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    audioPlayer.seek(val);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    audioPlayer.setVolume(val);
  };

  return (
    <div
      className={`p-4 sm:p-5 bg-[#121821] border border-[#212B36] rounded-2xl space-y-3 ${className}`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#212B36]">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#2FD9C4] animate-pulse" />
          <span className="text-xs font-mono font-medium text-[#E7EDF3]">
            {title}
          </span>
          <span className="text-[10px] font-mono text-[#2FD9C4] bg-[#2FD9C4]/10 border border-[#2FD9C4]/30 px-2 py-0.5 rounded-full">
            16kHz PCM
          </span>
        </div>

        {/* Voice Narrator Switch */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => audioPlayer.setVoiceMode(!state.voiceMode)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-colors cursor-pointer border ${
              state.voiceMode
                ? 'bg-[#8B7CF5]/20 text-[#8B7CF5] border-[#8B7CF5]/50 font-semibold'
                : 'bg-[#0A0E12] text-[#8B9AA8] border-[#212B36] hover:text-[#E7EDF3]'
            }`}
            title="Toggle speech synthesis narrative"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Spoken Speech {state.voiceMode ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Center Controls: Play Button + Waveform / Scrub Bar + Volume */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={() => audioPlayer.togglePlay()}
          className="w-12 h-12 rounded-xl bg-[#2FD9C4] hover:bg-[#2FD9C4]/90 text-[#0A0E12] flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-[0_0_15px_rgba(47,217,196,0.3)] cursor-pointer"
          aria-label={state.isPlaying ? 'Pause' : 'Play'}
        >
          {state.isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Scrubber & Waveform */}
        <div className="flex-1 w-full space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#8B9AA8]">
            <span className="text-[#2FD9C4] font-semibold">
              {state.isPlaying ? 'Playing Audio & Spoken Dialogue' : 'Audio Ready'}
            </span>
            <span>
              {formatTime(state.currentTime)} / {formatTime(state.duration || 15)}
            </span>
          </div>

          {/* Interactive Range Scrubber */}
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={state.duration || 15}
              step={0.1}
              value={state.currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-[#0A0E12] rounded-lg appearance-none cursor-pointer accent-[#2FD9C4] border border-[#212B36]"
            />
          </div>

          {/* Animated Waveform Visualizer */}
          <div className="h-6 w-full flex items-center space-x-0.5 overflow-hidden">
            {Array.from({ length: 48 }).map((_, i) => {
              const progressPct = (state.currentTime / (state.duration || 15)) * 100;
              const barPosPct = (i / 48) * 100;
              const isPast = barPosPct <= progressPct;
              const heightPct = state.isPlaying
                ? Math.max(15, Math.sin(i * 0.45 + state.currentTime * 6) * 45 + 50)
                : Math.max(20, Math.sin(i * 0.45) * 35 + 40);

              return (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all duration-100"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: isPast ? '#2FD9C4' : '#212B36'
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Volume & Reset Controls */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => audioPlayer.toggleMute()}
            className="text-[#8B9AA8] hover:text-[#E7EDF3] transition-colors cursor-pointer"
            title={state.isMuted ? 'Unmute' : 'Mute'}
          >
            {state.isMuted || state.volume === 0 ? (
              <VolumeX className="w-4 h-4 text-[#EF4444]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#2FD9C4]" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={state.isMuted ? 0 : state.volume}
            onChange={handleVolumeChange}
            className="w-16 h-1.5 bg-[#0A0E12] rounded-lg appearance-none cursor-pointer accent-[#2FD9C4] border border-[#212B36]"
            title={`Volume: ${Math.round((state.isMuted ? 0 : state.volume) * 100)}%`}
          />

          <button
            onClick={() => audioPlayer.seek(0)}
            className="p-1.5 rounded-lg bg-[#0A0E12] border border-[#212B36] text-[#8B9AA8] hover:text-[#E7EDF3] transition-colors cursor-pointer"
            title="Restart Audio"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
