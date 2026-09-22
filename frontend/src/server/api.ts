import {
  ModelMetadata,
  PipelineConfig,
  PipelineProcessResult,
  MeetingSessionSummary
} from '../types/pipeline.ts';

// Real Model Catalog
export const REAL_MODELS: ModelMetadata[] = [
  {
    id: 'autoencoder',
    name: 'Autoencoder (AE)',
    category: 'representation',
    checkpoint: 'autoencoder.pt',
    architecture: 'Conv2d(1->32->64->128) + Latent FC(256) + ConvTranspose2d',
    parameters: '3.4M parameters',
    latencyMs: 14,
    color: '#2FD9C4',
    description:
      'Deterministic latent compression with MSE loss and 256-dim bottleneck. Restored at epoch 68 (best val_MSE=0.00364).',
    metrics: {
      MSE: '0.00293',
      MAE: '0.03345',
      RMSE: '0.05409',
      PSNR: '25.338 dB',
      SSIM: '0.9746'
    }
  },
  {
    id: 'vae',
    name: 'Variational Autoencoder (VAE)',
    category: 'representation',
    checkpoint: 'vae.pt',
    architecture: 'Conv2d -> mu & logvar (256-dim) -> Reparameterization -> ConvTranspose2d',
    parameters: '3.8M parameters',
    latencyMs: 28,
    color: '#8B7CF5',
    description:
      'Probabilistic latent space with beta=0.6 KL regularization. Restored at epoch 68 (best val_Total_Loss=100.0520). Generates synthetic spectrograms from N(0, I) prior.',
    metrics: {
      Total_Loss: '83.758',
      Recon_Loss: '62.023',
      KL_Divergence: '36.225 nats',
      KL_Per_Dim: '0.1415 nats',
      MSE: '0.00752',
      PSNR: '21.238 dB'
    }
  },
  {
    id: 'gan',
    name: 'Generative Adversarial Network (GAN)',
    category: 'representation',
    checkpoint: 'checkpoints/gan.pt',
    architecture: 'PatchGAN Discriminator + Multi-Scale Residual Generator',
    parameters: '18.2M parameters',
    latencyMs: 65,
    color: '#F2B84B',
    description:
      'Adversarial spectrogram reconstruction targeting clipped teleconference phonemes and high-frequency speech harmonics.',
    metrics: {
      FAD: '2.14',
      KID: '0.008',
      Precision: '0.88',
      Recall: '0.82'
    }
  },
  {
    id: 'diffusion',
    name: 'Score-Based Diffusion Vocoder',
    category: 'representation',
    checkpoint: 'checkpoints/diffusion.pt',
    architecture: 'Conditional U-Net with 10-step DDIM Reverse Diffusion',
    parameters: '32.6M parameters',
    latencyMs: 180,
    color: '#3B82F6',
    description:
      'Iterative score-based denoising manifold applied when teleconference audio SNR drops below 12dB.',
    metrics: {
      Noise_MSE: '0.019',
      PESQ: '3.84 / 4.5',
      Sampling_Time: '180 ms'
    }
  },
  {
    id: 'whisper-small',
    name: 'Whisper Small (ASR)',
    category: 'asr',
    checkpoint: 'openai/whisper-small',
    architecture: 'Transformer Encoder-Decoder with Audio Spectrogram Frontend',
    parameters: '241M parameters',
    latencyMs: 85,
    color: '#38D48A',
    description:
      'Speech-to-text model transcribing 16kHz audio with zero-shot multilingual diarization.',
    metrics: {
      WER: '0.000',
      CER: '0.000',
      Target_Language: 'English (en)',
      Device: 'cuda:0'
    }
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base (ASR)',
    category: 'asr',
    checkpoint: 'openai/whisper-base',
    architecture: 'Transformer Encoder-Decoder lightweight checkpoint',
    parameters: '74M parameters',
    latencyMs: 45,
    color: '#38D48A',
    description:
      'Ultra-fast streaming speech-to-text for resource-constrained inference.',
    metrics: {
      WER: '0.048',
      CER: '0.018',
      Latency: '45 ms'
    }
  },
  {
    id: 'whisper-large-v3',
    name: 'Whisper Large v3 (ASR)',
    category: 'asr',
    checkpoint: 'openai/whisper-large-v3',
    architecture: 'High-density sequence-to-sequence model',
    parameters: '1.5B parameters',
    latencyMs: 240,
    color: '#38D48A',
    description:
      'State-of-the-art multilingual transcription with fine turn diarization across overlapped acoustic speech.',
    metrics: {
      WER: '0.042',
      CER: '0.012',
      Accuracy: '98.4%'
    }
  },
  {
    id: 'flan-t5-base',
    name: 'Google FLAN-T5 Base',
    category: 'transformer',
    checkpoint: 'google/flan-t5-base',
    architecture: 'Encoder-Decoder Transformer instruction-tuned on 1,800+ tasks',
    parameters: '250M parameters',
    latencyMs: 120,
    color: '#E7EDF3',
    description:
      'Summarization and reasoning model producing structured summaries, decisions, and action items.',
    metrics: {
      ROUGE_1: '0.0606',
      ROUGE_2: '0.0000',
      ROUGE_L: '48.6%',
      BERTScore: '0.8641'
    }
  },
  {
    id: 'flan-t5-xl',
    name: 'Google FLAN-T5 XL',
    category: 'transformer',
    checkpoint: 'google/flan-t5-xl',
    architecture: 'Instruction-tuned sequence transformer with 3B parameters',
    parameters: '3B parameters',
    latencyMs: 310,
    color: '#2FD9C4',
    description:
      'High-capacity transformer for complex architectural debates and multi-speaker consensus parsing.',
    metrics: {
      ROUGE_1: '54.2%',
      ROUGE_2: '31.8%',
      ROUGE_L: '51.4%',
      BERTScore: '0.9124'
    }
  }
];

// Pre-indexed Meeting Sessions
export const SESSIONS: MeetingSessionSummary[] = [
  {
    id: 'session-en2001a',
    title: 'AMI Meeting Corpus EN2001a Recording',
    meetingId: 'EN2001a',
    date: '2026-09-15',
    duration: '00:30 (30 seconds)',
    participants: 2,
    status: 'Completed',
    summary:
      'The team reviewed the gateway machine configuration and addressed the critical warning regarding idle daemon states and load balancer buffer timeout limits.',
    modelsUsed: {
      representation: 'VAE (Latent 256)',
      asr: 'openai/whisper-small',
      transformer: 'google/flan-t5-base'
    },
    scores: {
      wer: '0.000',
      bertScore: '0.8641',
      rougeL: '48.6%'
    }
  },
  {
    id: 'session-is1003b',
    title: 'Sprint 24 Architecture Review (42m 15s)',
    meetingId: 'IS1003b',
    date: '2026-09-14',
    duration: '42m 15s',
    participants: 4,
    status: 'Completed',
    summary:
      'The infrastructure team approved migrating the billing service from synchronous gRPC to Kafka event streaming by Sprint 24, resolving 380ms latency spikes with 14-day canary validation.',
    modelsUsed: {
      representation: 'Autoencoder (MSE 0.00293)',
      asr: 'openai/whisper-small',
      transformer: 'google/flan-t5-base'
    },
    scores: {
      wer: '0.042',
      bertScore: '0.9124',
      rougeL: '48.6%'
    }
  },
  {
    id: 'session-es2002a',
    title: 'SOC2 Compliance & Retention Audit (28m 40s)',
    meetingId: 'ES2002a',
    date: '2026-09-13',
    duration: '28m 40s',
    participants: 3,
    status: 'Completed',
    summary:
      'Ratified schema registry contract validation to fulfill SOC2 Type II auditable event lineage for payment records and enforced ephemeral memory audio discard policies.',
    modelsUsed: {
      representation: 'Diffusion (PESQ 3.84)',
      asr: 'openai/whisper-large-v3',
      transformer: 'google/flan-t5-xl'
    },
    scores: {
      wer: '0.021',
      bertScore: '0.9250',
      rougeL: '52.1%'
    }
  }
];

// Mock audio pipeline processor
export function processAudioPipeline(
  fileName: string,
  config: PipelineConfig
): PipelineProcessResult {
  const isSampleMeeting =
    fileName.toLowerCase().includes('sample') ||
    fileName.toLowerCase().includes('en2001');

  const defaultSampleTranscript =
    'if you have this big warning about doing nothing at all in the gateway machine.';

  // Determine model metrics based on selected representation model
  let repLoss = 'MSE: 0.00293';
  let repPsnr = '25.338 dB';
  let repSsim = '0.9746';
  let klDiv: string | undefined = undefined;

  if (config.representationModel === 'vae') {
    repLoss = 'Total Loss: 83.758';
    repPsnr = '21.238 dB';
    klDiv = '36.225 nats';
  } else if (config.representationModel === 'gan') {
    repLoss = 'FAD: 2.14';
    repPsnr = '26.80 dB';
  } else if (config.representationModel === 'diffusion') {
    repLoss = 'Noise MSE: 0.019';
    repPsnr = '31.20 dB';
  } else if (config.representationModel === 'none') {
    repLoss = 'Direct Spectrogram Input';
    repPsnr = 'N/A';
  }

  if (isSampleMeeting) {
    return {
      sessionId: 'session-en2001a',
      meetingTitle: `AMI Meeting Corpus: ${fileName}`,
      durationSeconds: 30,
      durationFormatted: '00:30',
      audioSampleRate: 16000,
      datasetOrigin: 'edinburghcstr/ami (ihm)',
      config,
      spectrogram: {
        tensorShape: '[1, 64, 128]',
        melBins: 64,
        frames: 128,
        normalizedRange: '[0.0, 1.0]'
      },
      metrics: {
        representationLoss: repLoss,
        psnr: repPsnr,
        ssim: repSsim,
        klDivergence: klDiv,
        wer: '0.000',
        cer: '0.000',
        rougeL: config.transformerModel === 'flan-t5-xl' ? '51.4%' : '48.6%',
        bertScore: config.transformerModel === 'flan-t5-xl' ? '0.9124' : '0.8641',
        latencyWallClockSeconds: 3.4
      },
      rawTranscript: defaultSampleTranscript,
      transcript: [
        {
          speaker: 'Speaker A (Audio Engineer)',
          time: '00:00:04',
          color: '#2FD9C4',
          text: 'If you have this big warning about doing nothing at all in the gateway machine...'
        },
        {
          speaker: 'Speaker B (Systems Lead)',
          time: '00:00:14',
          color: '#8B7CF5',
          text: 'We should check the timeout thresholds and keep-alive buffers immediately.'
        },
        {
          speaker: 'Speaker A (Audio Engineer)',
          time: '00:00:22',
          color: '#2FD9C4',
          text: 'Agreed, routing through the broker partition prevents gateway retry loops.'
        }
      ],
      // Enhanced structured output from FLAN-T5 reasoning engine
      summary:
        'The engineering leadership session addressed gateway machine warning alerts during low-activity socket transitions. Audio Engineer (Speaker A) and Systems Lead (Speaker B) established that adjusting socket keep-alive thresholds eliminates duplicate packet capture intents caused by external gateway broker retry loops.\n\nIn addition, teleconference audio streams were standardized to 16kHz 16-bit mono PCM, producing optimal [1, 64, 128] log-Mel spectrogram slices for Variational Autoencoder (VAE) latent space encoding. End-to-end evaluation confirmed zero word error rate (0.000 WER) with Whisper small and high semantic alignment (0.8641 BERTScore, 48.6% ROUGE-L) with FLAN-T5 base.',
      decisions: [
        {
          id: '01',
          title: 'Update Gateway Machine Keep-Alive Timeout Thresholds',
          context: 'Recalibrates idle socket threshold handlers to prevent duplicate message capture and external retry loops.',
          timestamp: '00:00:04',
          category: 'Infrastructure',
          consensus: 'Unanimous Approval',
          impact: 'Critical'
        },
        {
          id: '02',
          title: 'Standardize Audio Stream Sampling to 16kHz 16-bit Mono PCM',
          context: 'Formats teleconference audio into standardized 5-second sliding windows with [1, 64, 128] log-Mel spectrogram dimensions.',
          timestamp: '00:00:14',
          category: 'Signal Processing',
          consensus: 'Audio Engineering Consensus',
          impact: 'High'
        },
        {
          id: '03',
          title: 'Enforce Continuous Neural Pipeline Evaluation Thresholds',
          context: 'Mandates minimum 0.850 BERTScore and maximum 0.05 WER quality benchmarks across all processed meetings.',
          timestamp: '00:00:22',
          category: 'Model Governance',
          consensus: 'Model Evaluation Team',
          impact: 'High'
        },
        {
          id: '04',
          title: 'Isolate Gateway Broker Retry Intent Partitions',
          context: 'Separates control plane telemetry from raw speech payload partitions to eliminate cross-talk buffer overhead.',
          timestamp: '00:00:28',
          category: 'Networking',
          consensus: 'Systems Lead Ratified',
          impact: 'Medium'
        }
      ],
      actionItems: [
        {
          task: 'Configure gateway machine timeout parameters and deploy keep-alive threshold patches',
          owner: 'Speaker 1',
          avatar: 'S1',
          color: '#2FD9C4',
          deadline: 'Friday, 5:00 PM',
          priority: 'Critical',
          category: 'Infrastructure',
          status: 'In Progress'
        },
        {
          task: 'Validate VAE latent space reconstruction fidelity and PSNR bounds',
          owner: 'Speaker 2',
          avatar: 'S2',
          color: '#8B7CF5',
          deadline: 'Wednesday, 2:00 PM',
          priority: 'Critical',
          category: 'Neural Compression',
          status: 'Completed'
        },
        {
          task: 'Verify Whisper small ASR WER and CER metrics on 16kHz audio slices',
          owner: 'Speaker 3',
          avatar: 'S3',
          color: '#F2B84B',
          deadline: 'Next Tuesday',
          priority: 'High',
          category: 'ASR Evaluation',
          status: 'Pending'
        },
        {
          task: 'Automate FLAN-T5 summarization evaluation pipelines in production CI/CD',
          owner: 'Speaker 4',
          avatar: 'S4',
          color: '#38D48A',
          deadline: 'Next Thursday',
          priority: 'High',
          category: 'DevOps',
          status: 'In Progress'
        }
      ],
      keyPoints: [
        'Verified full neural pipeline stack: 16kHz PCM audio → [1, 64, 128] Mel Spectrogram → VAE Latent Space → Whisper ASR → FLAN-T5 LLM.',
        'Gateway machine warnings were isolated to socket timeout thresholds under idle streaming conditions.',
        'Achieved perfect 0.000 Word Error Rate (WER) and 0.000 Character Error Rate (CER) on AMI benchmark test slices.',
        'FLAN-T5 base reasoning model achieved 0.8641 BERTScore and 48.6% ROUGE-L against reference human meeting summaries.',
        'Variational Autoencoder (VAE) demonstrated stable KL divergence (36.22 nats, beta=0.6) with zero reconstruction mode collapse.',
        'Real-time streaming pipeline processed 42 minutes of teleconference audio in under 13 seconds wall-clock time.'
      ]
    };
  }

  // Custom audio processing
  return {
    sessionId: `session-${Date.now()}`,
    meetingTitle: fileName.replace(/\.[^/.]+$/, ''),
    durationSeconds: 2535,
    durationFormatted: '42m 15s',
    audioSampleRate: 16000,
    datasetOrigin: 'Enterprise Teleconference Upload',
    config,
    spectrogram: {
      tensorShape: '[1, 64, 128]',
      melBins: 64,
      frames: 128,
      normalizedRange: '[0.0, 1.0]'
    },
    metrics: {
      representationLoss: repLoss,
      psnr: repPsnr,
      ssim: repSsim,
      klDivergence: klDiv,
      wer: '0.042',
      cer: '0.012',
      rougeL: config.transformerModel === 'flan-t5-xl' ? '51.4%' : '48.6%',
      bertScore: config.transformerModel === 'flan-t5-xl' ? '0.9124' : '0.8641',
      latencyWallClockSeconds: 12.8
    },
    rawTranscript:
      'Speaker 1: Synchronous gRPC between billing and account services hit 380ms under 12k concurrent checkouts. Speaker 2: Variational Autoencoder (VAE) latent space manifold reconstructed audio with high fidelity. Speaker 3: Route through Kafka cluster partitions. Speaker 4: Schema registry validation enforces SOC2 compliance.',
    transcript: [
      {
        speaker: 'Speaker 1',
        time: '00:04:12',
        color: '#2FD9C4',
        text: 'Looking at peak latency metrics from our stress test, synchronous gRPC between billing and account services hit 380ms under 12k concurrent checkouts.'
      },
      {
        speaker: 'Speaker 2',
        time: '00:04:30',
        color: '#8B7CF5',
        text: 'Variational Autoencoder (VAE) latent space compression achieved high PSNR and low MSE, preserving acoustic clarity for Whisper transcription.'
      },
      {
        speaker: 'Speaker 3',
        time: '00:04:45',
        color: '#F2B84B',
        text: 'I concur. We should route through Kafka cluster partitions with at-least-once semantics to isolate the billing thread.'
      },
      {
        speaker: 'Speaker 4',
        time: '00:05:18',
        color: '#38D48A',
        text: 'From an audit stance, so long as schema registry validation is strictly enforced before messages hit the payment broker, SOC2 compliance is satisfied.'
      }
    ],
    summary:
      'Executive Architecture & Systems Synthesis:\nThe engineering leadership team approved migrating core microservices to a scalable Kafka event-streaming architecture. Stress testing confirmed high-concurrency latency bottlenecks. Signal processing teams validated Variational Autoencoder (VAE) spectrogram reconstruction fidelity.\n\nRisk & Compliance Protocol:\nEnforcing schema registry contract validation satisfies SOC2 Type II audit requirements. Operations will lead a 14-day parallel canary validation run with automated failovers.',
    decisions: [
      {
        id: '01',
        title: 'Migrate Billing Microservice to Kafka Event Streaming',
        context: 'Unanimous decision to eliminate 380ms latency spikes under 12k concurrent checkout load.',
        timestamp: '00:04:45',
        category: 'Architecture',
        consensus: 'Unanimous (Architecture & Ops)',
        impact: 'Critical'
      },
      {
        id: '02',
        title: 'Enforce Schema Registry Validation Contracts on Broker Ingestion',
        context: 'Mandated by security & legal compliance to maintain SOC2 Type II auditable event lineage.',
        timestamp: '00:05:18',
        category: 'Compliance',
        consensus: 'Security & Legal Approved',
        impact: 'High'
      },
      {
        id: '03',
        title: 'Mandate 14-Day Canary Verification Period Prior to V1 API Sunset',
        context: 'Prevents customer-facing payment regressions across enterprise billing tiers.',
        timestamp: '00:05:40',
        category: 'Operations',
        consensus: 'Product & QA Approved',
        impact: 'High'
      },
      {
        id: '04',
        title: 'Deploy Redis Idempotency Filters on Consumer Event Handlers',
        context: 'Guarantees zero duplicate transaction executions during broker partition failovers.',
        timestamp: '00:06:12',
        category: 'Resilience',
        consensus: 'Lead Architect Mandated',
        impact: 'Medium'
      }
    ],
    actionItems: [
      {
        task: 'Publish Kafka schema registry contract for order and billing event payloads',
        owner: 'Speaker 1',
        avatar: 'S1',
        color: '#2FD9C4',
        deadline: 'Friday, 5:00 PM',
        priority: 'Critical',
        category: 'Architecture',
        status: 'In Progress'
      },
      {
        task: 'Train and evaluate Variational Autoencoder (VAE) latent space manifold checkpoints',
        owner: 'Speaker 2',
        avatar: 'S2',
        color: '#8B7CF5',
        deadline: 'Wednesday, 2:00 PM',
        priority: 'Critical',
        category: 'Neural Compression',
        status: 'Completed'
      },
      {
        task: 'Provision staging Kafka broker partition cluster in us-east4 with multi-AZ failover',
        owner: 'Speaker 3',
        avatar: 'S3',
        color: '#F2B84B',
        deadline: 'Next Tuesday',
        priority: 'High',
        category: 'DevOps',
        status: 'Pending'
      },
      {
        task: 'Configure SOC2 audit log validation interceptors in Kafka schema registry',
        owner: 'Speaker 4',
        avatar: 'S4',
        color: '#38D48A',
        deadline: 'Next Wednesday',
        priority: 'High',
        category: 'Security',
        status: 'In Progress'
      }
    ],
    keyPoints: [
      'Synchronous gRPC bottleneck was identified as the root cause of 38% checkout latency degradation.',
      'Kafka partition streams will decouple user-facing API responses from downstream payment gateway acknowledgments.',
      'Schema registry validation ensures backward compatibility and satisfies SOC2 Type II non-repudiation audit controls.',
      'Redis distributed lock filters guarantee exact-once message execution semantics during broker failover events.',
      'Canary deployment strategy provides continuous telemetry monitoring for 14 days before sunsetting v1 endpoints.',
      'Whisper small ASR and FLAN-T5 LLM achieved 0.042 WER and 0.8641 BERTScore on meeting speech input.'
    ]
  };
}
