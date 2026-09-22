/**
 * Real Pipeline and Model Types:
 * Preprocessing -> Autoencoder -> VAE -> Whisper ASR -> FLAN-T5
 */

export interface ModelMetadata {
  id: string;
  name: string;
  category: 'representation' | 'asr' | 'transformer';
  checkpoint: string;
  architecture: string;
  parameters: string;
  latencyMs: number;
  color: string;
  description: string;
  metrics: Record<string, string | number>;
}

export interface PipelineConfig {
  representationModel: 'none' | 'autoencoder' | 'vae' | 'gan' | 'diffusion';
  asrModel: 'whisper-small' | 'whisper-base' | 'whisper-large-v3';
  transformerModel: 'flan-t5-base' | 'flan-t5-xl';
  spectrogramMels?: number; // 64 mels
  spectrogramFrames?: number; // 128 frames
  audioSampleRate?: number; // 16000 Hz
}

export interface TranscriptLine {
  speaker: string;
  time: string;
  color: string;
  text: string;
}

export interface DecisionItem {
  id: string;
  title: string;
  context: string;
  timestamp: string;
  category?: string;
  consensus?: string;
  impact?: 'Critical' | 'High' | 'Medium';
}

export interface ActionTicket {
  task: string;
  owner: string;
  avatar: string;
  color: string;
  deadline: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  category?: string;
  status?: 'Pending' | 'Completed' | 'In Progress';
}

export interface PipelineProcessResult {
  sessionId: string;
  meetingTitle: string;
  durationSeconds: number;
  durationFormatted: string;
  audioSampleRate: number;
  datasetOrigin: string;
  config: PipelineConfig;
  spectrogram: {
    tensorShape: string; // "[1, 64, 128]"
    melBins: number; // 64
    frames: number; // 128
    normalizedRange: string; // "[0.0, 1.0]"
  };
  metrics: {
    representationLoss?: string;
    psnr?: string;
    ssim?: string;
    klDivergence?: string;
    wer: string; // "0.000"
    cer: string; // "0.000"
    rougeL: string; // "48.6%"
    bertScore: string; // "0.8641"
    latencyWallClockSeconds: number;
  };
  transcript: TranscriptLine[];
  rawTranscript: string;
  summary: string;
  decisions: DecisionItem[];
  actionItems: ActionTicket[];
  keyPoints: string[];
}

export interface MeetingSessionSummary {
  id: string;
  title: string;
  meetingId: string; // e.g. "EN2001a" from AMI
  date: string;
  duration: string;
  participants: number;
  status: 'Completed' | 'Processing';
  summary: string;
  modelsUsed: {
    representation: string;
    asr: string;
    transformer: string;
  };
  scores: {
    wer: string;
    bertScore: string;
    rougeL: string;
  };
}

export interface MeetingAccessRequest {
  password: string;
}

export interface MeetingAccessResponse {
  meetingId: string;
  token: string;
  role: 'member' | 'admin';
  expiresIn: number;
}

export interface AuthSession {
  meetingId: string;
  token: string;
  role: 'member' | 'admin';
  adminToken?: string;
  expiresAt: number;
}

export interface UploadMeetingResponse {
  jobId: string;
  meetingId: string;
  adminToken: string;
  adminJwt: string;
  status: string;
  message: string;
}
