import React from 'react';
import { ArrowRight, Upload } from 'lucide-react';
import { PageId } from '../types/navigation.ts';

interface CtaBandProps {
  onNavigate: (page: PageId) => void;
}

export const CtaBand: React.FC<CtaBandProps> = ({ onNavigate }) => {
  return (
    <section className="border-t border-[#212B36] py-20 bg-[#0A0E12] text-center relative overflow-hidden">
      {/* Soft ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#2FD9C4]/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-semibold text-[#E7EDF3] tracking-tight mb-4">
          Turn your next meeting into definitive action
        </h2>
        <p className="text-base text-[#8B9AA8] max-w-xl mx-auto mb-8 leading-relaxed">
          Process audio recordings through our Mel spectrogram filterbanks and FLAN-T5 transformer pipeline to synthesize verified decisions in seconds.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-3 text-sm font-medium text-[#0A0E12] bg-[#2FD9C4] hover:bg-[#2FD9C4]/90 active:scale-[0.98] rounded-full transition-all duration-150 flex items-center space-x-2 shadow-[0_0_24px_rgba(47,217,196,0.25)] cursor-pointer"
          >
            <span>Open the dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('upload')}
            className="px-6 py-3 text-sm font-medium text-[#E7EDF3] bg-[#121821] border border-[#212B36] hover:border-[#8B9AA8] hover:bg-[#121821]/80 active:scale-[0.98] rounded-full transition-all duration-150 flex items-center space-x-2 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#8B9AA8]" />
            <span>Upload a meeting</span>
          </button>
        </div>
      </div>
    </section>
  );
};
