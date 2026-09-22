import React from 'react';
import { PageId } from '../types/navigation.ts';
import { CtaBand } from '../components/CtaBand.tsx';

interface AboutViewProps {
  onNavigate: (page: PageId) => void;
}

interface TeamMember {
  initials: string;
  name: string;
  role: string;
  built: string;
  accent: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    initials: 'VB',
    name: 'Vivek Borade',
    role: 'Acoustic Signal & Preprocessing Lead',
    built: 'Engineered the real-time multichannel STFT, Mel-filterbank feature extraction (64 mels × 128 frames), and adaptive acoustic noise calibration pipeline.',
    accent: '#2FD9C4'
  },
  {
    initials: 'SB',
    name: 'Sakshi Bhingarkar',
    role: 'Deep Generative & VAE Architect',
    built: 'Designed comparative Autoencoder vs. Variational Autoencoder (VAE) topologies, KL divergence loss regularization (beta=0.6), and latent representation models.',
    accent: '#8B7CF5'
  },
  {
    initials: 'VT',
    name: 'Vaishnavi Thorave',
    role: 'ASR & Speech-to-Text Modeling Engineer',
    built: 'Fine-tuned OpenAI Whisper ASR checkpoints on multi-speaker meeting audio and benchmarked zero Word Error Rate (WER: 0.000) performance.',
    accent: '#F2B84B'
  },
  {
    initials: 'SM',
    name: 'Samadhan Mane',
    role: 'NLP & Transformer Reasoning Systems Lead',
    built: 'Engineered the FLAN-T5 instruction prompting schema, structured decision extraction graphs, action ticket generators, and continuous evaluation benchmarks.',
    accent: '#38D48A'
  }
];

const PIPELINE_STAGES = [
  {
    idx: '01',
    label: 'Preprocessing',
    desc: '16kHz resample, multichannel beamforming, 80-band Mel-scale filterbank generation.'
  },
  {
    idx: '02',
    label: 'Autoencoder',
    desc: 'Deterministic latent compression baseline for high-frequency spectral noise rejection.'
  },
  {
    idx: '03',
    label: 'VAE',
    desc: 'Probabilistic latent space modeling for speech variation and acoustic regularisation.'
  },
  {
    idx: '04',
    label: 'GAN / Diffusion',
    desc: 'Score-based generative synthesis tested to recover clipped harmonics in teleconferencing.'
  },
  {
    idx: '05',
    label: 'Transformer',
    desc: 'Whisper token stream fed to FLAN-T5 for structured decision graphs and task tickets.'
  }
];

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  return (
    <div className="w-full text-left">
      {/* Hero Strip (no diagram) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-16">
        <div className="inline-flex items-center px-3 py-1 rounded-full border border-[#212B36] bg-[#121821] text-[#2FD9C4] text-xs font-mono mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2FD9C4] mr-2" />
          Team of four
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-[#E7EDF3] leading-[1.15] tracking-tight mb-6">
          The moment a conference call terminates, institutional knowledge begins to decay.
        </h1>

        <p className="text-base sm:text-lg text-[#8B9AA8] leading-relaxed max-w-[58ch]">
          We built this system because modern enterprise productivity tools treat meeting audio
          as disposable byproduct rather than high-density organizational telemetry.
        </p>
      </section>

      {/* Two-column list of four numbered problem statements with dash-style index marks */}
      <section className="border-t border-[#212B36] py-16 bg-[#0A0E12]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-xs font-mono text-[#8B9AA8] uppercase tracking-wider mb-8">
            SYSTEMIC FAILURE MODES
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 1 */}
            <div className="p-6 bg-[#121821] border border-[#212B36] rounded-xl text-left">
              <div className="flex items-center space-x-2 text-xs font-mono text-[#EF4444] mb-2">
                <span>— 01</span>
                <span className="text-[#8B9AA8]">/ LOSS OF RECORD</span>
              </div>
              <h3 className="text-base font-semibold text-[#E7EDF3] mb-2">
                Missing notes
              </h3>
              <p className="text-sm text-[#8B9AA8] leading-relaxed">
                Attendees rely on disjointed local docs and personal notes that disappear the instant an engineer leaves the call.
              </p>
            </div>

            {/* 2 */}
            <div className="p-6 bg-[#121821] border border-[#212B36] rounded-xl text-left">
              <div className="flex items-center space-x-2 text-xs font-mono text-[#EF4444] mb-2">
                <span>— 02</span>
                <span className="text-[#8B9AA8]">/ CONFLICTING RECOLLECTIONS</span>
              </div>
              <h3 className="text-base font-semibold text-[#E7EDF3] mb-2">
                Blurred decisions
              </h3>
              <p className="text-sm text-[#8B9AA8] leading-relaxed">
                Subtle consensus agreements and verbal compromises morph into conflicting assumptions between departments within days.
              </p>
            </div>

            {/* 3 */}
            <div className="p-6 bg-[#121821] border border-[#212B36] rounded-xl text-left">
              <div className="flex items-center space-x-2 text-xs font-mono text-[#EF4444] mb-2">
                <span>— 03</span>
                <span className="text-[#8B9AA8]">/ EXECUTION GAPS</span>
              </div>
              <h3 className="text-base font-semibold text-[#E7EDF3] mb-2">
                Dropped action items
              </h3>
              <p className="text-sm text-[#8B9AA8] leading-relaxed">
                Critical commitments made informally in the final wrap-up never get codified into tickets, assignees, or verified deadlines.
              </p>
            </div>

            {/* 4 */}
            <div className="p-6 bg-[#121821] border border-[#212B36] rounded-xl text-left">
              <div className="flex items-center space-x-2 text-xs font-mono text-[#EF4444] mb-2">
                <span>— 04</span>
                <span className="text-[#8B9AA8]">/ COLD STORAGE SINK</span>
              </div>
              <h3 className="text-base font-semibold text-[#E7EDF3] mb-2">
                Unwatched recordings
              </h3>
              <p className="text-sm text-[#8B9AA8] leading-relaxed">
                Hours of raw 4K video and stereo WAV files accumulate in cloud buckets because replaying full sessions is cognitively prohibitive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution paragraph block */}
      <section className="border-t border-[#212B36] py-16 bg-[#0A0E12]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-xs font-mono text-[#2FD9C4] uppercase tracking-wider mb-4">
            ARCHITECTURAL SOLUTION
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#E7EDF3] tracking-tight mb-6">
            A pipeline engineered from raw waveform to executive verdict.
          </h2>
          <div className="bg-[#121821] border border-[#212B36] p-8 rounded-2xl">
            <p className="text-base text-[#8B9AA8] leading-relaxed mb-4">
              Rather than feeding degraded VoIP audio directly into general-purpose LLMs, our architecture treats meeting recovery as an acoustic engineering problem first. We isolate vocal tracts via Mel-spectrogram filterbanks, test generative denoising manifolds (comparing Autoencoders, VAEs, GANs, and Diffusion models), and only then feed high-integrity tokens into Whisper and instruction-tuned FLAN-T5 transformers.
            </p>
            <p className="text-base text-[#8B9AA8] leading-relaxed">
              The result is a fourfold structured output: concise executive synthesis, auditable time-aligned decisions, assigned task tickets, and an empirical signal-quality scorecard.
            </p>
          </div>
        </div>
      </section>

      {/* Five-column horizontal stage strip (thin 1px dividers between cells, not cards) */}
      <section className="border-t border-[#212B36] py-16 bg-[#0A0E12]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-xs font-mono text-[#8B9AA8] uppercase tracking-wider mb-6">
            SIGNAL TRANSFORMATION STAGES
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border border-[#212B36] rounded-xl overflow-hidden bg-[#121821]">
            {PIPELINE_STAGES.map((stage, idx) => (
              <div
                key={stage.idx}
                className={`p-5 flex flex-col justify-between ${
                  idx !== PIPELINE_STAGES.length - 1
                    ? 'border-b lg:border-b-0 lg:border-r border-[#212B36]'
                    : ''
                } hover:bg-[#0A0E12]/50 transition-colors`}
              >
                <div>
                  <div className="text-xs font-mono text-[#2FD9C4] mb-2">
                    [{stage.idx}]
                  </div>
                  <h4 className="text-sm font-semibold text-[#E7EDF3] mb-2">
                    {stage.label}
                  </h4>
                  <p className="text-xs text-[#8B9AA8] leading-relaxed">
                    {stage.desc}
                  </p>
                </div>
                <div className="mt-4 text-[10px] font-mono text-[#8B9AA8]/60">
                  STAGE {stage.idx} / 05
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Four-card team grid */}
      <section className="border-t border-[#212B36] py-16 bg-[#0A0E12]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-xs font-mono text-[#8B9AA8] uppercase tracking-wider mb-2">
            THE ENGINEERS BEHIND THE SYSTEM
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#E7EDF3] tracking-tight mb-8">
            Team of four researchers &amp; systems engineers
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM_MEMBERS.map((member) => (
              <div
                key={member.name}
                className="p-5 bg-[#121821] border border-[#212B36] rounded-xl flex flex-col text-left hover:border-[#8B9AA8] transition-colors"
              >
                {/* Small square avatar placeholder with initials */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-mono text-xs font-semibold mb-4"
                  style={{
                    backgroundColor: `${member.accent}15`,
                    color: member.accent,
                    border: `1px solid ${member.accent}30`
                  }}
                >
                  {member.initials}
                </div>

                <div className="text-sm font-semibold text-[#E7EDF3] mb-0.5">
                  {member.name}
                </div>
                <div className="text-xs font-mono text-[#8B9AA8] mb-3 leading-snug">
                  {member.role}
                </div>
                <p className="text-xs text-[#8B9AA8] leading-relaxed flex-1">
                  {member.built}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Centered CTA band */}
      <CtaBand onNavigate={onNavigate} />
    </div>
  );
};
