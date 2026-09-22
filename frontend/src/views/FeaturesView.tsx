import React from 'react';
import { PageId } from '../types/navigation.ts';
import { CtaBand } from '../components/CtaBand.tsx';

interface FeaturesViewProps {
  onNavigate: (page: PageId) => void;
}

const NINE_FEATURES = [
  {
    eyebrow: 'FEAT 01 // INGEST',
    title: 'Multichannel audio upload',
    desc: 'Ingests stereo and multichannel recordings up to 4 hours with automatic sample rate normalization and jitter buffer correction.'
  },
  {
    eyebrow: 'FEAT 02 // ASR',
    title: 'Speaker-tagged transcript',
    desc: 'Whisper sequence-to-sequence model produces millisecond-accurate timestamped transcripts with automated speaker turn diarization.'
  },
  {
    eyebrow: 'FEAT 03 // ACOUSTICS',
    title: 'Spectrogram visualizer',
    desc: 'Interactive 80-band Mel-scale frequency spectrogram reveals vocal harmonics, room reverberation, and noise floors.'
  },
  {
    eyebrow: 'FEAT 04 // REASONING',
    title: 'FLAN-T5 executive summary',
    desc: 'Condenses forty-five minutes of debate into a single dense briefing paragraph preserving essential architectural context.'
  },
  {
    eyebrow: 'FEAT 05 // CONSENSUS',
    title: 'Verified decisions log',
    desc: 'Extracts formal resolutions, policy agreements, and technical trade-offs anchored to exact audio timestamps.'
  },
  {
    eyebrow: 'FEAT 06 // EXECUTION',
    title: 'Structured action items',
    desc: 'Assigns tasks, deadlines, and urgency classifications directly ready for integration with Jira, Linear, or GitHub Issues.'
  },
  {
    eyebrow: 'FEAT 07 // EXTRACTION',
    title: 'Key points & discussion threads',
    desc: 'Categorizes secondary debate threads and rejected alternative proposals so institutional reasoning is never erased.'
  },
  {
    eyebrow: 'FEAT 08 // TELEMETRY',
    title: 'Model benchmark comparisons',
    desc: 'Evaluates real-time inference latency, PESQ speech fidelity, and ROUGE-L semantic accuracy across all model checkpoints.'
  },
  {
    eyebrow: 'FEAT 09 // CORPUS',
    title: 'Empirical training dataset',
    desc: 'Streams and validates against 14,200 curated audio clips with transparent train/validation/test evaluation splits.'
  }
];

const ETHICAL_CARDS = [
  {
    title: 'Acoustic Fairness & Dialect Resilience',
    desc: 'Models were evaluated across diverse vocal accents and low-fidelity microphone setups to prevent systemic transcription errors against non-native speakers.'
  },
  {
    title: 'Zero Permanent Voiceprint Retention',
    desc: 'Audio buffers and Mel spectrograms are processed in ephemeral memory and discarded immediately after transcription unless explicitly retained by tenant policy.'
  },
  {
    title: 'Deterministic Transparency & Confidence Scoring',
    desc: 'Every generated action item and decision links directly back to its acoustic timestamp so users can audit hallucination risks in real time.'
  },
  {
    title: 'Explicit Boundaries & Known Limitations',
    desc: 'The model acknowledges severe acoustic overlap and prompts for human verification whenever diarization confidence drops below 85%.'
  }
];

export const FeaturesView: React.FC<FeaturesViewProps> = ({ onNavigate }) => {
  return (
    <div className="w-full text-left">
      {/* Hero Strip */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-16">
        <div className="inline-flex items-center px-3 py-1 rounded-full border border-[#212B36] bg-[#121821] text-[#2FD9C4] text-xs font-mono mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2FD9C4] mr-2" />
          Technical Capabilities
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-[#E7EDF3] leading-[1.15] tracking-tight mb-6">
          Everything a meeting produces, in one place.
        </h1>

        <p className="text-base sm:text-lg text-[#8B9AA8] leading-relaxed max-w-[58ch]">
          Nine dedicated architectural subsystems working in concert to convert raw teleconference audio into verified, auditable organizational records.
        </p>
      </section>

      {/* 3-column grid of nine feature cards (no icons needed, just typographic hierarchy) */}
      <section className="border-t border-[#212B36] py-16 bg-[#0A0E12]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {NINE_FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="p-6 bg-[#121821] border border-[#212B36] rounded-xl flex flex-col justify-between hover:border-[#2FD9C4]/40 transition-colors"
              >
                <div>
                  <div className="text-xs font-mono text-[#8B9AA8] mb-3">
                    {feat.eyebrow}
                  </div>
                  <h3 className="text-base font-semibold text-[#E7EDF3] mb-2 tracking-tight">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-[#8B9AA8] leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Second Section: Ethical & responsible AI (2-column grid of four cards, plainer & quieter styling) */}
      <section className="border-t border-[#212B36] py-16 bg-[#0A0E12]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-xs font-mono text-[#8B9AA8] uppercase tracking-wider mb-2">
            GOVERNANCE &amp; SAFETY
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#E7EDF3] tracking-tight mb-3">
            Ethical &amp; responsible AI
          </h2>
          <p className="text-sm text-[#8B9AA8] max-w-2xl mb-8 leading-relaxed">
            Enterprise acoustic processing carries severe privacy and attribution risks. Our system design enforces zero-retention defaults, auditability, and transparent failure boundaries.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ETHICAL_CARDS.map((card) => (
              <div
                key={card.title}
                className="p-6 bg-[#0E131A] border border-[#212B36]/80 rounded-lg text-left"
              >
                <h4 className="text-sm font-semibold text-[#E7EDF3] mb-2">
                  {card.title}
                </h4>
                <p className="text-xs text-[#8B9AA8] leading-relaxed">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Band */}
      <CtaBand onNavigate={onNavigate} />
    </div>
  );
};
