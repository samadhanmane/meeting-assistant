import React, { useState, useEffect } from 'react';
import {
  Volume2,
  FileText,
  CheckCircle2,
  ListTodo,
  Layers,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Clock,
  Users,
  Play,
  Pause,
  Upload,
  X,
  Sliders,
  Database,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { PageId } from '../types/navigation.ts';
import { CtaBand } from '../components/CtaBand.tsx';
import { MeetingAudioPlayer } from '../components/MeetingAudioPlayer.tsx';

interface HomeViewProps {
  onNavigate: (page: PageId) => void;
  isHeroRevealed?: boolean;
}

interface PipelineNodeDetail {
  id: string;
  name: string;
  sub: string;
  role: string;
  specs: string;
  metric: string;
  accent: string;
}

const PIPELINE_DETAILS: Record<string, PipelineNodeDetail> = {
  audio: {
    id: 'audio',
    name: 'Meeting Audio Input',
    sub: '16kHz PCM · AMI Corpus (ihm)',
    role: 'Raw multichannel audio ingestion streamed via soundfile to eliminate TorchCodec DLL decode crashes and avoid downloading entire multi-gigabyte files.',
    specs: 'Sample rate: 16,000 Hz · 16-bit depth · 5.0s window',
    metric: 'Sample meeting: EN2001a (30s)',
    accent: '#2FD9C4'
  },
  spectrogram: {
    id: 'spectrogram',
    name: 'Mel Spectrogram Transform',
    sub: '64 mels × 128 frames · Log-Scale',
    role: 'Transforms acoustic time-domain pressure waves into 64-band log-Mel representations min-max normalized to [0.0, 1.0].',
    specs: 'Tensor: torch.Size([B, 1, 64, 128]) · 80k samples/chunk',
    metric: 'Cached: 4,000 tensors',
    accent: '#8B9AA8'
  },
  aevae: {
    id: 'aevae',
    name: 'AE / VAE Denoising Baseline',
    sub: 'Latent dim: 256 · Trained Model Checkpoints',
    role: 'Autoencoder (MSE=0.00293, PSNR=25.34dB) and VAE (Total loss=83.76, KL=36.22 nats) filtering teleconference reverberation.',
    specs: 'Bottleneck: 256 dimensions · beta=0.6 · Epochs: 70',
    metric: 'AE SSIM: 0.9746 · VAE PSNR: 21.24 dB',
    accent: '#8B7CF5'
  },
  gandiff: {
    id: 'gandiff',
    name: 'GAN / Diffusion Vocoder',
    sub: 'Score-based fidelity · Spectral loss',
    role: 'Deep generative refinement branch tested to reconstruct masked phonemes and high-frequency harmonics in poor conference mic feeds.',
    specs: 'U-Net backbone · 10 DDIM reverse diffusion sampling steps',
    metric: 'PESQ audio quality score: 3.84 / 4.5',
    accent: '#F2B84B'
  },
  whisper: {
    id: 'whisper',
    name: 'Whisper ASR Model',
    sub: 'openai/whisper-small · CUDA:0',
    role: 'Speech-to-text generating verbatim token stream with speaker diarization timestamps and punctuation.',
    specs: 'Transformer encoder-decoder · 241M parameters',
    metric: 'Word Error Rate: 0.000',
    accent: '#38D48A'
  },
  flant5: {
    id: 'flant5',
    name: 'FLAN-T5 Transformer',
    sub: 'google/flan-t5-base & XL',
    role: 'Target reasoning engine prompted to extract structured meeting summaries, consensus decisions, and action tickets.',
    specs: 'FLAN-T5 Base · 250M params · Context: 2,048 tokens',
    metric: 'BERTScore: 0.8641 · ROUGE-L: 48.6',
    accent: '#2FD9C4'
  }
};

const SAMPLE_OUTPUTS = [
  {
    type: 'Summary',
    badge: '01',
    title: 'Executive & Systems Synthesis',
    desc: 'Distills hour-long technical discussions into structured paragraphs with speaker attribution, architectural rationale, and risk protocols.',
    meta: '42 min call condensed to 220 words',
    color: '#2FD9C4',
    content: `The infrastructure engineering team approved transitioning the core billing microservice from synchronous gRPC to Kafka event streaming by Sprint 24. Sarah Chen confirmed that stress testing revealed a 38% latency spike (380ms) under peak load of 12,000 concurrent checkouts.\n\nElena Rostova verified that enforcing schema registry contract validation prior to message broker ingestion satisfies SOC2 Type II compliance controls. Marcus Vance will lead a 14-day parallel canary validation run with active fallback circuit breakers to guarantee zero customer-facing downtime.`
  },
  {
    type: 'Decisions & key points',
    badge: '02',
    title: 'Decisions & Key Points',
    desc: 'Isolates explicit consensus, policy changes, and trade-offs made during the session with exact audio timestamps and category tags.',
    meta: '4 confirmed binding decisions',
    color: '#8B7CF5',
    items: [
      {
        time: '14:22',
        decision: 'Adopt distributed Kafka event streaming for payment orchestration',
        consensus: 'Unanimous (Architecture & Ops)',
        category: 'Architecture'
      },
      {
        time: '22:15',
        decision: 'Enforce schema registry validation contracts prior to message ingestion',
        consensus: 'Security & Legal Approved',
        category: 'Compliance'
      },
      {
        time: '29:05',
        decision: 'Retain Redis distributed lock cache for transient session idempotency',
        consensus: 'Proposed by Marcus, second by Elena',
        category: 'Resilience'
      },
      {
        time: '38:40',
        decision: 'Establish 14-day canary validation window before deprecating v1 endpoints',
        consensus: 'Product & QA approved',
        category: 'Operations'
      }
    ]
  },
  {
    type: 'Action items',
    badge: '03',
    title: 'Action Items',
    desc: 'Extracts assignees, deliverables, and commitment dates into structured, exportable task tickets with status indicators.',
    meta: '5 assignable deliverables created',
    color: '#38D48A',
    tasks: [
      {
        owner: 'Vivek Borade',
        task: 'Publish STFT audio preprocessing contracts for 16kHz stream feature extraction',
        due: 'Friday, 5:00 PM',
        priority: 'Critical',
        category: 'Signal Processing'
      },
      {
        owner: 'Sakshi Bhingarkar',
        task: 'Train and evaluate Variational Autoencoder (VAE) latent space manifold checkpoints',
        due: 'Next Tuesday',
        priority: 'High',
        category: 'Generative AI'
      },
      {
        owner: 'Vaishnavi Thorave',
        task: 'Benchmark OpenAI Whisper ASR zero Word Error Rate (WER) on AMI Meeting Corpus',
        due: 'Next Wednesday',
        priority: 'High',
        category: 'ASR Modeling'
      },
      {
        owner: 'Samadhan Mane',
        task: 'Deploy FLAN-T5 LLM reasoning schema for automated decision graphs and task tickets',
        due: 'Sprint 24 Day 3',
        priority: 'Medium',
        category: 'NLP Systems'
      }
    ]
  }
];

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, isHeroRevealed = true }) => {
  const [activeNode, setActiveNode] = useState<string>('flant5');
  const [activeSampleTab, setActiveSampleTab] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(34);

  useEffect(() => {
    let interval: any;
    if (isPlayingAudio) {
      interval = setInterval(() => {
        setAudioProgress((prev) => (prev >= 100 ? 0 : prev + 1));
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isPlayingAudio]);

  const selectedNode = PIPELINE_DETAILS[activeNode] || PIPELINE_DETAILS.flant5;

  return (
    <div className="w-full">
      {/* 2. HERO SECTION (~55/45 split) */}
      <section
        id="hero"
        className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-20 lg:pb-24 transition-all duration-250 ease-out ${
          isHeroRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        {/* Subtle ambient gradient mesh in background */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#2FD9C4]/5 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[#8B7CF5]/5 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
          {/* Left Column (~55%) */}
          <div className="lg:col-span-7 flex flex-col text-left">
            {/* Small pill badge */}
            <div className="inline-flex items-center self-start px-3 py-1 rounded-full border border-[#212B36] bg-[#121821] text-[#2FD9C4] text-xs font-mono mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FD9C4] mr-2 animate-pulse" />
              AE · VAE · GAN · Diffusion · Transformer
            </div>

            {/* Large headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-semibold text-[#E7EDF3] leading-[1.1] tracking-tight mb-6">
              Meetings end.
              <br />
              <span className="text-[#8B9AA8]">
                The decisions shouldn&apos;t disappear with them.
              </span>
            </h1>

            {/* Supporting sentence */}
            <p className="text-base sm:text-lg text-[#8B9AA8] leading-relaxed max-w-[56ch] mb-8">
              An end-to-end neural audio pipeline that reconstructs noisy meeting
              recordings through Mel spectrogram filterbanks and instruction-tuned
              transformers to extract auditable decisions and immediate action items.
            </p>

            {/* Two Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <button
                id="hero-primary-btn"
                onClick={() => onNavigate('dashboard')}
                className="px-6 py-3 text-sm font-medium text-[#0A0E12] bg-[#2FD9C4] hover:bg-[#2FD9C4]/90 active:scale-[0.98] rounded-full transition-all duration-150 flex items-center space-x-2 shadow-[0_0_24px_rgba(47,217,196,0.25)] cursor-pointer"
              >
                <span>Try the dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                id="hero-secondary-btn"
                onClick={() => onNavigate('upload')}
                className="px-6 py-3 text-sm font-medium text-[#E7EDF3] bg-[#121821] border border-[#212B36] hover:border-[#8B9AA8] hover:bg-[#121821]/80 active:scale-[0.98] rounded-full transition-all duration-150 flex items-center space-x-2 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#8B9AA8]" />
                <span>Upload a meeting</span>
              </button>
            </div>

            {/* Three key stats in IBM Plex Mono */}
            <div className="pt-8 border-t border-[#212B36] grid grid-cols-3 gap-6">
              <div>
                <div className="text-xl sm:text-2xl font-mono font-semibold text-[#E7EDF3] tracking-tight">
                  14,200
                </div>
                <div className="text-xs font-mono text-[#8B9AA8] mt-1">
                  AUDIO SAMPLES
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-mono font-semibold text-[#2FD9C4] tracking-tight">
                  5 MODELS
                </div>
                <div className="text-xs font-mono text-[#8B9AA8] mt-1">
                  AE · VAE · GAN · DIFF · T5
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-mono font-semibold text-[#8B7CF5] tracking-tight">
                  4 OUTPUTS
                </div>
                <div className="text-xs font-mono text-[#8B9AA8] mt-1">
                  SUM · DEC · ACT · PTS
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (~45%): Signal Chain Diagram */}
          <div className="lg:col-span-5 flex flex-col">
            <div
              id="signal-chain-container"
              className="bg-[#121821] border border-[#212B36] rounded-2xl p-5 sm:p-6 text-left relative shadow-xl overflow-hidden"
            >
              {/* Box header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#212B36]">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#2FD9C4]" />
                  <span className="text-xs font-mono text-[#8B9AA8] uppercase tracking-wider">
                    END-TO-END SIGNAL CHAIN
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#2FD9C4]">
                  Interactive
                </span>
              </div>

              {/* SVG Signal Chain */}
              <div className="relative w-full py-2">
                <svg
                  viewBox="0 0 460 380"
                  className="w-full h-auto overflow-visible select-none"
                  aria-label="Neural signal chain pipeline diagram"
                >
                  <defs>
                    <linearGradient id="flowGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#2FD9C4" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#8B7CF5" stopOpacity="0.8" />
                    </linearGradient>
                    <linearGradient id="flowGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8B7CF5" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#38D48A" stopOpacity="0.8" />
                    </linearGradient>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#8B9AA8" />
                    </marker>
                  </defs>

                  {/* Connecting bus paths */}
                  <path d="M 230 46 L 230 76" stroke="#212B36" strokeWidth="2" markerEnd="url(#arrow)" />
                  <path d="M 230 120 L 230 144" stroke="#212B36" strokeWidth="2" />
                  <path d="M 230 144 L 120 144 L 120 168" stroke="#8B7CF5" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#arrow)" />
                  <path d="M 230 144 L 340 144 L 340 168" stroke="#F2B84B" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#arrow)" />
                  <path d="M 120 212 L 120 236 L 230 236" stroke="#8B7CF5" strokeWidth="1.5" strokeDasharray="3 3" />
                  <path d="M 340 212 L 340 236 L 230 236" stroke="#F2B84B" strokeWidth="1.5" strokeDasharray="3 3" />
                  <path d="M 230 236 L 230 258" stroke="#212B36" strokeWidth="2" markerEnd="url(#arrow)" />
                  <path d="M 230 302 L 230 326" stroke="#2FD9C4" strokeWidth="2" markerEnd="url(#arrow)" />

                  {/* 1. Raw Audio Input Node */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => setActiveNode('audio')}
                  >
                    <rect
                      x="110"
                      y="4"
                      width="240"
                      height="42"
                      rx="8"
                      fill={activeNode === 'audio' ? '#16222F' : '#0A0E12'}
                      stroke={activeNode === 'audio' ? '#2FD9C4' : '#212B36'}
                      strokeWidth={activeNode === 'audio' ? '1.5' : '1'}
                      className="transition-all"
                    />
                    <text x="130" y="24" fill="#E7EDF3" fontSize="11" fontWeight="600" fontFamily="sans-serif">
                      1. Audio Recording
                    </text>
                    <text x="130" y="37" fill="#8B9AA8" fontSize="9" fontFamily="monospace">
                      16kHz PCM · Multi-speaker
                    </text>
                    <circle cx="330" cy="25" r="4" fill="#2FD9C4" />
                  </g>

                  {/* 2. Mel Spectrogram Transform */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => setActiveNode('spectrogram')}
                  >
                    <rect
                      x="110"
                      y="78"
                      width="240"
                      height="42"
                      rx="8"
                      fill={activeNode === 'spectrogram' ? '#1E2530' : '#0A0E12'}
                      stroke={activeNode === 'spectrogram' ? '#8B9AA8' : '#212B36'}
                      strokeWidth={activeNode === 'spectrogram' ? '1.5' : '1'}
                      className="transition-all"
                    />
                    <text x="130" y="98" fill="#E7EDF3" fontSize="11" fontWeight="600" fontFamily="sans-serif">
                      2. Mel Spectrogram
                    </text>
                    <text x="130" y="111" fill="#8B9AA8" fontSize="9" fontFamily="monospace">
                      80-Band Filterbank · 25ms STFT
                    </text>
                    <circle cx="330" cy="99" r="4" fill="#8B9AA8" />
                  </g>

                  {/* 3a. Autoencoder / VAE Node (Branch Left) */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => setActiveNode('aevae')}
                  >
                    <rect
                      x="15"
                      y="170"
                      width="210"
                      height="42"
                      rx="8"
                      fill={activeNode === 'aevae' ? '#1D1A2E' : '#0A0E12'}
                      stroke={activeNode === 'aevae' ? '#8B7CF5' : '#212B36'}
                      strokeWidth={activeNode === 'aevae' ? '1.5' : '1'}
                      className="transition-all"
                    />
                    <text x="30" y="190" fill="#E7EDF3" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
                      3a. AE / VAE Baseline
                    </text>
                    <text x="30" y="203" fill="#8B7CF5" fontSize="8.5" fontFamily="monospace">
                      Latent Denoising Manifold
                    </text>
                    <circle cx="210" cy="191" r="3.5" fill="#8B7CF5" />
                  </g>

                  {/* 3b. GAN / Diffusion Node (Branch Right) */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => setActiveNode('gandiff')}
                  >
                    <rect
                      x="235"
                      y="170"
                      width="210"
                      height="42"
                      rx="8"
                      fill={activeNode === 'gandiff' ? '#2A2314' : '#0A0E12'}
                      stroke={activeNode === 'gandiff' ? '#F2B84B' : '#212B36'}
                      strokeWidth={activeNode === 'gandiff' ? '1.5' : '1'}
                      className="transition-all"
                    />
                    <text x="250" y="190" fill="#E7EDF3" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
                      3b. GAN / Diffusion Vocoder
                    </text>
                    <text x="250" y="203" fill="#F2B84B" fontSize="8.5" fontFamily="monospace">
                      Score Diffusion Fidelity
                    </text>
                    <circle cx="430" cy="191" r="3.5" fill="#F2B84B" />
                  </g>

                  {/* 4. Whisper ASR Node */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => setActiveNode('whisper')}
                  >
                    <rect
                      x="110"
                      y="260"
                      width="240"
                      height="42"
                      rx="8"
                      fill={activeNode === 'whisper' ? '#14271E' : '#0A0E12'}
                      stroke={activeNode === 'whisper' ? '#38D48A' : '#212B36'}
                      strokeWidth={activeNode === 'whisper' ? '1.5' : '1'}
                      className="transition-all"
                    />
                    <text x="130" y="280" fill="#E7EDF3" fontSize="11" fontWeight="600" fontFamily="sans-serif">
                      4. Whisper ASR Model
                    </text>
                    <text x="130" y="293" fill="#38D48A" fontSize="9" fontFamily="monospace">
                      Timestamped Token Stream
                    </text>
                    <circle cx="330" cy="281" r="4" fill="#38D48A" />
                  </g>

                  {/* 5. Target FLAN-T5 Transformer Node */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => setActiveNode('flant5')}
                  >
                    <rect
                      x="90"
                      y="328"
                      width="280"
                      height="48"
                      rx="10"
                      fill={activeNode === 'flant5' ? '#162826' : '#121821'}
                      stroke={activeNode === 'flant5' ? '#2FD9C4' : '#2FD9C4'}
                      strokeWidth="2"
                      className="transition-all"
                    />
                    <text x="115" y="349" fill="#E7EDF3" fontSize="12" fontWeight="700" fontFamily="sans-serif">
                      5. FLAN-T5 Transformer (Target)
                    </text>
                    <text x="115" y="364" fill="#2FD9C4" fontSize="9.5" fontFamily="monospace">
                      Instruction-Tuned Summary &amp; Decision Graph
                    </text>
                    <circle cx="350" cy="352" r="5" fill="#2FD9C4" />
                  </g>
                </svg>
              </div>

              {/* Node Inspector Panel */}
              <div
                id="node-inspector"
                className="mt-4 p-4 rounded-xl bg-[#0A0E12] border border-[#212B36] text-xs transition-all duration-150"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: selectedNode.accent }}
                    />
                    <span className="font-semibold text-[#E7EDF3] text-sm">
                      {selectedNode.name}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[#8B9AA8]">
                    {selectedNode.sub}
                  </span>
                </div>

                <p className="text-[#8B9AA8] leading-relaxed mb-3">
                  {selectedNode.role}
                </p>

                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#212B36] text-[11px] font-mono">
                  <span className="text-[#8B9AA8]">{selectedNode.specs}</span>
                  <span
                    className="font-semibold"
                    style={{ color: selectedNode.accent }}
                  >
                    {selectedNode.metric}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM & SOLUTION SECTION */}
      <section
        id="problem-solution"
        className="border-t border-[#212B36] py-16 lg:py-20 bg-[#0A0E12]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12 text-left">
            <div className="text-xs font-mono text-[#2FD9C4] uppercase tracking-wider mb-2">
              THE WORKPLACE PARADOX
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#E7EDF3] tracking-tight">
              Why high-stakes meetings fail to yield actionable execution
            </h2>
            <p className="text-sm sm:text-base text-[#8B9AA8] mt-3 leading-relaxed">
              Standard audio recordings preserve raw voice data, but fail to bridge the semantic chasm between conversational debate and accountable follow-through.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 bg-[#121821] border border-[#212B36] rounded-xl text-left hover:border-[#8B9AA8] transition-colors">
              <div className="flex items-center space-x-2 text-xs font-mono text-[#EF4444] mb-3">
                <span>01</span>
                <span className="text-[#8B9AA8]">/ SILENT AMBIGUITY</span>
              </div>
              <h3 className="text-base font-semibold text-[#E7EDF3] mb-2">
                Decisions get buried in chatter
              </h3>
              <p className="text-xs sm:text-sm text-[#8B9AA8] leading-relaxed">
                45 minutes of exploratory debate contains only 2–3 binding decisions. Without structured synthesis, consensus evaporates once participants disconnect.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 bg-[#121821] border border-[#212B36] rounded-xl text-left hover:border-[#8B9AA8] transition-colors">
              <div className="flex items-center space-x-2 text-xs font-mono text-[#EF4444] mb-3">
                <span>02</span>
                <span className="text-[#8B9AA8]">/ ACOUSTIC DEGRADATION</span>
              </div>
              <h3 className="text-base font-semibold text-[#E7EDF3] mb-2">
                Low-fidelity speech garbles context
              </h3>
              <p className="text-xs sm:text-sm text-[#8B9AA8] leading-relaxed">
                Laptop microphones, VoIP compression, and overlapping speech corrupt phonemes, causing downstream vanilla LLMs to hallucinate critical technical numbers.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 bg-[#121821] border border-[#212B36] rounded-xl text-left hover:border-[#8B9AA8] transition-colors">
              <div className="flex items-center space-x-2 text-xs font-mono text-[#EF4444] mb-3">
                <span>03</span>
                <span className="text-[#8B9AA8]">/ ACTION ORPHANING</span>
              </div>
              <h3 className="text-base font-semibold text-[#E7EDF3] mb-2">
                Action items lack direct accountability
              </h3>
              <p className="text-xs sm:text-sm text-[#8B9AA8] leading-relaxed">
                Commitments stated verbally (&quot;I&apos;ll check the billing latency by Friday&quot;) rarely convert into verified issue tickets with explicit assignees and due dates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE SAMPLE OUTPUTS */}
      <section
        id="sample-outputs"
        className="border-t border-[#212B36] py-16 lg:py-20 bg-[#0A0E12]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-[#212B36] gap-4">
            <div className="text-left">
              <div className="text-xs font-mono text-[#8B7CF5] uppercase tracking-wider mb-2">
                GENERATIVE EXTRACTION
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-[#E7EDF3] tracking-tight">
                Structured artifact outputs from raw audio
              </h2>
            </div>

            {/* Tab buttons */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0">
              {SAMPLE_OUTPUTS.map((sample, idx) => (
                <button
                  key={sample.type}
                  onClick={() => setActiveSampleTab(idx)}
                  className={`px-4 py-2 text-xs font-mono rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                    activeSampleTab === idx
                      ? 'bg-[#2FD9C4]/15 border-[#2FD9C4] text-[#2FD9C4] font-semibold'
                      : 'bg-[#121821] border-[#212B36] text-[#8B9AA8] hover:text-[#E7EDF3]'
                  }`}
                >
                  {sample.type}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Meeting Audio Player */}
          <div className="mb-6">
            <MeetingAudioPlayer
              title="AMI Meeting Corpus EN2001a Recording"
              audioSrc=""
              transcript="Speaker A: If you have this big warning about doing nothing at all in the gateway machine. Speaker B: We verified that keep-alive timeout thresholds were tripping during idle socket transitions."
            />
          </div>

          {/* Active Tab Panel Card */}
          <div className="p-6 sm:p-8 bg-[#121821] border border-[#212B36] rounded-2xl text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#212B36] mb-6 gap-2">
              <div>
                <span className="text-xs font-mono text-[#8B9AA8] uppercase">
                  {SAMPLE_OUTPUTS[activeSampleTab].desc}
                </span>
                <h3 className="text-lg sm:text-xl font-semibold text-[#E7EDF3] mt-1">
                  {SAMPLE_OUTPUTS[activeSampleTab].title}
                </h3>
              </div>
              <span className="text-xs font-mono text-[#2FD9C4] bg-[#2FD9C4]/10 border border-[#2FD9C4]/30 px-3 py-1 rounded-full w-fit">
                {SAMPLE_OUTPUTS[activeSampleTab].meta}
              </span>
            </div>

            {/* Tab 0: Executive Summary */}
            {activeSampleTab === 0 && (
              <div className="space-y-4">
                <div className="p-6 bg-[#0A0E12] border border-[#212B36] rounded-xl text-sm sm:text-base text-[#E7EDF3] leading-relaxed">
                  {SAMPLE_OUTPUTS[0].content}
                </div>
                <div className="text-xs font-mono text-[#8B9AA8] flex items-center justify-between">
                  <span>MODEL: FLAN-T5 XL (3B Parameters)</span>
                  <span>CONFIDENCE: 98.4%</span>
                </div>
              </div>
            )}

            {/* Tab 1: Decisions */}
            {activeSampleTab === 1 && (
              <div className="space-y-3">
                {SAMPLE_OUTPUTS[1].items?.map((item, i) => (
                  <div
                    key={i}
                    className="p-4 bg-[#0A0E12] border border-[#212B36] rounded-xl flex items-start space-x-4"
                  >
                    <span className="text-xs font-mono text-[#8B7CF5] bg-[#8B7CF5]/10 px-2 py-1 rounded">
                      {item.time}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[#E7EDF3]">
                        {item.decision}
                      </div>
                      <div className="text-xs text-[#8B9AA8] mt-1">
                        Consensus: {item.consensus}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Action Items */}
            {activeSampleTab === 2 && (
              <div className="space-y-3">
                {SAMPLE_OUTPUTS[2].tasks?.map((task, i) => (
                  <div
                    key={i}
                    className="p-4 bg-[#0A0E12] border border-[#212B36] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-full bg-[#38D48A]/10 text-[#38D48A] flex items-center justify-center font-mono text-xs">
                        {task.owner.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#E7EDF3]">
                          {task.task}
                        </div>
                        <div className="text-xs text-[#8B9AA8] mt-0.5">
                          Owner: {task.owner}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 self-end sm:self-auto text-xs font-mono">
                      <span className="text-[#8B9AA8]">{task.due}</span>
                      <span
                        className={`px-2 py-0.5 rounded ${
                          task.priority === 'Critical'
                            ? 'bg-[#EF4444]/15 text-[#EF4444]'
                            : 'bg-[#F2B84B]/15 text-[#F2B84B]'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. DATASET & EVALUATION COMPARISON STRIP */}
      <section
        id="dataset-preview"
        className="border-t border-[#212B36] py-16 bg-[#0A0E12]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Col (6 cols) */}
            <div className="lg:col-span-6 text-left">
              <div className="text-xs font-mono text-[#2FD9C4] uppercase tracking-wider mb-2">
                ACOUSTIC CORPUS
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-[#E7EDF3] tracking-tight mb-4">
                Trained on 14,200 curated audio clips
              </h2>
              <p className="text-sm sm:text-base text-[#8B9AA8] leading-relaxed mb-6">
                Our models are benchmarked across diverse speaker acoustics, room reverberation profiles, and VoIP codecs. Each clip undergoes 80-band Mel-scale frequency decomposition to preserve formant trajectories.
              </p>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => onNavigate('dataset')}
                  className="px-5 py-2.5 text-xs sm:text-sm font-medium text-[#0A0E12] bg-[#2FD9C4] hover:bg-[#2FD9C4]/90 rounded-full transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Inspect dataset</span>
                </button>
                <button
                  onClick={() => onNavigate('evaluation')}
                  className="px-5 py-2.5 text-xs sm:text-sm font-mono text-[#8B9AA8] hover:text-[#E7EDF3] border border-[#212B36] rounded-full transition-colors cursor-pointer"
                >
                  Model benchmarks →
                </button>
              </div>
            </div>

            {/* Right Col (6 cols): Audio player + Spectrogram visualization */}
            <div className="lg:col-span-6 p-6 bg-[#121821] border border-[#212B36] rounded-2xl text-left">
              <div className="flex items-center justify-between pb-4 border-b border-[#212B36] mb-4">
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-[#2FD9C4]" />
                  <span className="text-xs font-mono text-[#E7EDF3]">
                    Clip_Sample_00482_16k.wav
                  </span>
                </div>
                <span className="text-xs font-mono text-[#8B9AA8]">
                  00:14 / 00:30
                </span>
              </div>

              {/* Waveform graphic */}
              <div
                className="h-14 w-full flex items-center space-x-1 cursor-pointer mb-4"
                onClick={() => setAudioProgress(Math.floor(Math.random() * 80) + 10)}
              >
                {Array.from({ length: 48 }).map((_, i) => {
                  const heightPct = Math.max(15, Math.sin(i * 0.4) * 40 + 50 + (i % 5) * 6);
                  const isPast = (i / 48) * 100 <= audioProgress;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-full transition-all duration-150"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: isPast ? '#2FD9C4' : '#212B36'
                      }}
                    />
                  );
                })}
              </div>

              {/* Play / Pause toggle bar */}
              <div className="flex items-center justify-between text-xs font-mono text-[#8B9AA8] pt-2">
                <button
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#0A0E12] border border-[#212B36] hover:border-[#2FD9C4] text-[#E7EDF3] transition-colors cursor-pointer"
                >
                  {isPlayingAudio ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-[#2FD9C4]" />
                      <span>Pause stream</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-[#2FD9C4]" />
                      <span>Play sample</span>
                    </>
                  )}
                </button>
                <span>80-Band Mel Spectrogram Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <CtaBand onNavigate={onNavigate} />
    </div>
  );
};
