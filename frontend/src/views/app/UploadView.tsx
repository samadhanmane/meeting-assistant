import React, { useState } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  Sliders,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw,
  Info,
  Check,
  AlertCircle,
  Lock,
  Key,
  Copy,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';
import { PageId } from '../../types/navigation.ts';
import { PipelineConfig, PipelineProcessResult, AuthSession } from '../../types/pipeline.ts';
import { ApiService } from '../../services/api.ts';
import { MeetingAudioPlayer } from '../../components/MeetingAudioPlayer.tsx';

interface UploadViewProps {
  onNavigate: (page: PageId) => void;
  onPipelineProcessed?: (result: PipelineProcessResult, session?: AuthSession) => void;
}

const RECORDING_TIPS = [
  'Position microphones at least 6 inches from direct ventilation or keyboard chatter.',
  'Export in 16,000 Hz 16-bit mono WAV or high-bitrate MP3 for optimum Mel-filterbank fidelity.',
  'In the AMI Meeting Corpus, 5.0s sliding windows with 64 mels × 128 frames provide the optimal acoustic density.',
  'Avoid simultaneous cross-talk during opening remarks to enable baseline noise floor calibration.'
];

export const UploadView: React.FC<UploadViewProps> = ({
  onNavigate,
  onPipelineProcessed
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [showModelSelection, setShowModelSelection] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Security & Password state (Step 2)
  const [meetingPassword, setMeetingPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    meetingId: string;
    adminToken: string;
    adminJwt: string;
    password: string;
    result: PipelineProcessResult;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Model selection state with real defaults
  const [config, setConfig] = useState<PipelineConfig>({
    representationModel: 'vae',
    asrModel: 'whisper-small',
    transformerModel: 'flan-t5-base',
    spectrogramMels: 64,
    spectrogramFrames: 128,
    audioSampleRate: 16000
  });

  const handleFileChosen = (file: File) => {
    setSelectedFile(file);
    setSelectedFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(0)} KB`);
    setAudioUrl(URL.createObjectURL(file));
    setShowModelSelection(true);
    setError(null);
  };

  const startPipelineRun = async () => {
    if (!selectedFile) {
      setError('No audio file selected');
      return;
    }

    if (!meetingPassword || meetingPassword.length < 8) {
      setError('A password of at least 8 characters is required to protect access to this meeting.');
      return;
    }

    setIsProcessing(true);
    setProgress(5);
    setCurrentStage('Uploading audio file and initializing access control...');
    setError(null);

    try {
      const { result, meetingId, adminToken, adminJwt } = await ApiService.processAudioWithPolling(
        selectedFile,
        config,
        meetingPassword,
        (stage: string, progressPct: number) => {
          setCurrentStage(stage);
          setProgress(progressPct);
        }
      );

      const session: AuthSession = {
        meetingId,
        token: adminJwt || adminToken,
        role: 'admin',
        adminToken,
        expiresAt: Date.now() + 30 * 86400 * 1000
      };

      setCreatedCredentials({
        meetingId,
        adminToken,
        adminJwt: adminJwt || adminToken,
        password: meetingPassword,
        result
      });

      if (onPipelineProcessed) {
        onPipelineProcessed(result, session);
      }
    } catch (err: any) {
      setError(err.message || 'Pipeline processing failed');
      setIsProcessing(false);
      setProgress(0);
      setCurrentStage('');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
      {/* LEFT COLUMN (2:1 split -> 8 cols) */}
      <div className="lg:col-span-8 space-y-6">
        {/* Large Dropzone Panel */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) {
              handleFileChosen(file);
            }
          }}
          className={`p-8 sm:p-10 bg-[#121821] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
            dragOver
              ? 'border-[#2FD9C4] bg-[#121821]/90'
              : 'border-[#212B36] hover:border-[#8B9AA8]'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-[#0A0E12] border border-[#212B36] flex items-center justify-center mb-4">
            <UploadCloud className="w-8 h-8 text-[#2FD9C4]" />
          </div>

          <h2 className="text-lg sm:text-xl font-semibold text-[#E7EDF3] tracking-tight mb-2">
            Upload meeting audio recording
          </h2>
          <p className="text-xs sm:text-sm text-[#8B9AA8] max-w-md mx-auto mb-6 leading-relaxed">
            Drag and drop your audio file (WAV, MP3, M4A, FLAC) to get started with analysis.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <label className="px-5 py-2.5 text-xs sm:text-sm font-medium text-[#0A0E12] bg-[#2FD9C4] hover:bg-[#2FD9C4]/90 rounded-full transition-all cursor-pointer shadow-[0_0_20px_rgba(47,217,196,0.2)]">
              <span>Browse audio files</span>
              <input
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileChosen(file);
                  }
                }}
              />
            </label>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[#EF4444]">Processing Error</div>
              <div className="text-xs text-[#EF4444]/80 mt-1">{error}</div>
              <button
                onClick={() => setError(null)}
                className="text-xs text-[#8B9AA8] hover:text-[#E7EDF3] mt-2 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* MODEL SELECTION STUDIO (Appears after file is chosen) */}
        {showModelSelection && !isProcessing && (
          <div className="p-6 sm:p-8 bg-[#121821] border border-[#2FD9C4]/40 rounded-2xl text-left space-y-6 animate-fadeIn shadow-[0_0_30px_rgba(47,217,196,0.05)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#212B36] gap-3">
              <div>
                <div className="inline-flex items-center space-x-2 text-[10px] font-mono text-[#2FD9C4] uppercase mb-1">
                  <Sliders className="w-3 h-3" />
                  <span>STEP 2 // SELECT NEURAL PIPELINE ARCHITECTURE</span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-[#E7EDF3]">
                  Select models to run on {selectedFileName}
                </h3>
              </div>
              <div className="text-xs font-mono text-[#8B9AA8] bg-[#0A0E12] px-3 py-1.5 rounded-lg border border-[#212B36]">
                FILE SIZE: <span className="text-[#E7EDF3]">{fileSize}</span> ·
                PCM: 16,000Hz
              </div>
            </div>

            {/* Audio Playback Player */}
            {audioUrl && (
              <MeetingAudioPlayer
                audioSrc={audioUrl}
                title={selectedFileName || 'Selected Audio'}
                transcript="Audio loaded — select models and run the pipeline to generate transcript."
              />
            )}

            {/* Model Selector 1: Acoustic Representation / Denoising */}
            <div>
              <label className="block text-xs font-mono text-[#8B9AA8] uppercase mb-2">
                1. Acoustic Representation / Latent Denoising Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* VAE Option */}
                <div
                  onClick={() =>
                    setConfig({ ...config, representationModel: 'vae' })
                  }
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                    config.representationModel === 'vae'
                      ? 'bg-[#8B7CF5]/15 border-[#8B7CF5] text-[#E7EDF3]'
                      : 'bg-[#0A0E12] border-[#212B36] hover:border-[#8B9AA8]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#E7EDF3]">
                      Variational Autoencoder (VAE)
                    </span>
                    {config.representationModel === 'vae' && (
                      <Check className="w-3.5 h-3.5 text-[#8B7CF5]" />
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-[#8B9AA8] leading-tight">
                    KL: 36.22 nats · beta=0.6 · PSNR: 21.24 dB
                  </div>
                </div>

                {/* Autoencoder Option */}
                <div
                  onClick={() =>
                    setConfig({
                      ...config,
                      representationModel: 'autoencoder'
                    })
                  }
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                    config.representationModel === 'autoencoder'
                      ? 'bg-[#2FD9C4]/15 border-[#2FD9C4] text-[#E7EDF3]'
                      : 'bg-[#0A0E12] border-[#212B36] hover:border-[#8B9AA8]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#E7EDF3]">
                      Autoencoder (AE)
                    </span>
                    {config.representationModel === 'autoencoder' && (
                      <Check className="w-3.5 h-3.5 text-[#2FD9C4]" />
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-[#8B9AA8] leading-tight">
                    MSE: 0.00293 · PSNR: 25.34 dB · SSIM: 0.975
                  </div>
                </div>

                {/* Score-Based Diffusion */}
                <div
                  onClick={() =>
                    setConfig({ ...config, representationModel: 'diffusion' })
                  }
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                    config.representationModel === 'diffusion'
                      ? 'bg-[#3B82F6]/15 border-[#3B82F6] text-[#E7EDF3]'
                      : 'bg-[#0A0E12] border-[#212B36] hover:border-[#8B9AA8]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#E7EDF3]">
                      Diffusion Vocoder
                    </span>
                    {config.representationModel === 'diffusion' && (
                      <Check className="w-3.5 h-3.5 text-[#3B82F6]" />
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-[#8B9AA8] leading-tight">
                    PESQ: 3.84 · DDIM 10 steps · Noise MSE: 0.019
                  </div>
                </div>

                {/* GAN */}
                <div
                  onClick={() =>
                    setConfig({ ...config, representationModel: 'gan' })
                  }
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                    config.representationModel === 'gan'
                      ? 'bg-[#F2B84B]/15 border-[#F2B84B] text-[#E7EDF3]'
                      : 'bg-[#0A0E12] border-[#212B36] hover:border-[#8B9AA8]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#E7EDF3]">
                      GAN Generator
                    </span>
                    {config.representationModel === 'gan' && (
                      <Check className="w-3.5 h-3.5 text-[#F2B84B]" />
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-[#8B9AA8] leading-tight">
                    FAD: 2.14 · KID: 0.008 · Precision: 0.88
                  </div>
                </div>
              </div>
            </div>

            {/* Model Selector 2: Speech-to-Text (ASR) */}
            <div>
              <label className="block text-xs font-mono text-[#8B9AA8] uppercase mb-2">
                2. Speech-to-Text ASR Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() =>
                    setConfig({ ...config, asrModel: 'whisper-small' })
                  }
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    config.asrModel === 'whisper-small'
                      ? 'bg-[#38D48A]/15 border-[#38D48A]'
                      : 'bg-[#0A0E12] border-[#212B36] hover:border-[#8B9AA8]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#E7EDF3]">
                      openai/whisper-small (Recommended)
                    </span>
                    {config.asrModel === 'whisper-small' && (
                      <Check className="w-3.5 h-3.5 text-[#38D48A]" />
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-[#8B9AA8]">
                    Default ASR Checkpoint · 241M params · High Accuracy
                  </div>
                </div>

                <div
                  onClick={() =>
                    setConfig({ ...config, asrModel: 'whisper-base' })
                  }
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    config.asrModel === 'whisper-base'
                      ? 'bg-[#38D48A]/15 border-[#38D48A]'
                      : 'bg-[#0A0E12] border-[#212B36] hover:border-[#8B9AA8]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#E7EDF3]">
                      openai/whisper-base (Fast Edge)
                    </span>
                    {config.asrModel === 'whisper-base' && (
                      <Check className="w-3.5 h-3.5 text-[#38D48A]" />
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-[#8B9AA8]">
                    Ultra-fast latency · 74M params
                  </div>
                </div>
              </div>
            </div>

            {/* Model Selector 3: Reasoning Transformer */}
            <div>
              <label className="block text-xs font-mono text-[#8B9AA8] uppercase mb-2">
                3. Summarization &amp; Decision Extraction Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() =>
                    setConfig({
                      ...config,
                      transformerModel: 'flan-t5-base'
                    })
                  }
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    config.transformerModel === 'flan-t5-base'
                      ? 'bg-[#2FD9C4]/15 border-[#2FD9C4]'
                      : 'bg-[#0A0E12] border-[#212B36] hover:border-[#8B9AA8]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#E7EDF3]">
                      google/flan-t5-base (Recommended)
                    </span>
                    {config.transformerModel === 'flan-t5-base' && (
                      <Check className="w-3.5 h-3.5 text-[#2FD9C4]" />
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-[#8B9AA8]">
                    BERTScore: 0.8641 · ROUGE-L: 48.6% · 250M params
                  </div>
                </div>

                <div
                  onClick={() =>
                    setConfig({ ...config, transformerModel: 'flan-t5-small' })
                  }
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    config.transformerModel === 'flan-t5-small'
                      ? 'bg-[#2FD9C4]/15 border-[#2FD9C4]'
                      : 'bg-[#0A0E12] border-[#212B36] hover:border-[#8B9AA8]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#E7EDF3]">
                      google/flan-t5-small (Ultra Fast)
                    </span>
                    {config.transformerModel === 'flan-t5-small' && (
                      <Check className="w-3.5 h-3.5 text-[#2FD9C4]" />
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-[#8B9AA8]">
                    Low memory overhead · 60M params
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Per-Meeting Password Requirement */}
            <div className="p-4 bg-[#0A0E12] border border-[#212B36] rounded-xl space-y-2">
              <label className="block text-xs font-mono text-[#2FD9C4] uppercase flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-[#2FD9C4]" />
                <span>4. Set Meeting Access Password (Required)</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={meetingPassword}
                  onChange={(e) => {
                    setMeetingPassword(e.target.value);
                    if (e.target.value.length >= 8) setError(null);
                  }}
                  placeholder="Enter a secure password (min 8 characters)..."
                  className="w-full px-4 py-2.5 pr-10 bg-[#121821] border border-[#212B36] focus:border-[#2FD9C4] rounded-lg text-sm text-[#E7EDF3] placeholder-[#8B9AA8]/50 outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#8B9AA8] hover:text-[#E7EDF3] cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-[#8B9AA8] leading-relaxed">
                Members must enter this exact meeting ID &amp; password to view summary and transcript results.
              </p>
            </div>

            {/* Run Button */}
            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowModelSelection(false);
                  setSelectedFile(null);
                  setSelectedFileName(null);
                }}
                className="text-xs font-mono text-[#8B9AA8] hover:text-[#E7EDF3] transition-colors cursor-pointer"
              >
                ← Reselect audio file
              </button>

              <button
                onClick={startPipelineRun}
                disabled={isProcessing || !meetingPassword || meetingPassword.length < 8}
                className="px-6 py-3 text-xs sm:text-sm font-semibold text-[#0A0E12] bg-[#2FD9C4] hover:bg-[#2FD9C4]/90 rounded-full transition-all flex items-center space-x-2 cursor-pointer shadow-[0_0_20px_rgba(47,217,196,0.25)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Process &amp; Protect Meeting</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Created Meeting Credentials Card (Step 5) */}
        {createdCredentials && (
          <div className="p-6 sm:p-8 bg-[#121821] border border-[#38D48A]/50 rounded-2xl text-left space-y-6 animate-fadeIn shadow-[0_0_30px_rgba(56,212,138,0.1)]">
            <div className="flex items-center space-x-3 pb-4 border-b border-[#212B36]">
              <div className="w-10 h-10 rounded-xl bg-[#38D48A]/10 border border-[#38D48A]/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-[#38D48A]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#E7EDF3]">
                  Meeting Successfully Created &amp; Encrypted
                </h3>
                <p className="text-xs text-[#8B9AA8]">
                  Share these credentials with authorized members to grant access.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#0A0E12] border border-[#212B36] rounded-xl space-y-1">
                <div className="text-[10px] font-mono text-[#8B9AA8] uppercase">Meeting ID</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-[#2FD9C4] font-semibold">{createdCredentials.meetingId}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdCredentials.meetingId);
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                    className="p-1.5 text-xs text-[#8B9AA8] hover:text-[#2FD9C4] cursor-pointer"
                  >
                    {copiedId ? <Check className="w-4 h-4 text-[#38D48A]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-[#0A0E12] border border-[#212B36] rounded-xl space-y-1">
                <div className="text-[10px] font-mono text-[#8B9AA8] uppercase">Access Password</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-[#E7EDF3] font-semibold">{createdCredentials.password}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdCredentials.password);
                      setCopiedPass(true);
                      setTimeout(() => setCopiedPass(false), 2000);
                    }}
                    className="p-1.5 text-xs text-[#8B9AA8] hover:text-[#2FD9C4] cursor-pointer"
                  >
                    {copiedPass ? <Check className="w-4 h-4 text-[#38D48A]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#0A0E12] border border-[#212B36] rounded-xl space-y-1">
              <div className="text-[10px] font-mono text-[#8B7CF5] uppercase">Admin Token (Keep Secret)</div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#8B9AA8] truncate max-w-[280px] sm:max-w-md">{createdCredentials.adminToken}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredentials.adminToken);
                    setCopiedToken(true);
                    setTimeout(() => setCopiedToken(false), 2000);
                  }}
                  className="p-1.5 text-xs text-[#8B9AA8] hover:text-[#8B7CF5] cursor-pointer"
                >
                  {copiedToken ? <Check className="w-4 h-4 text-[#38D48A]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={() => onNavigate('results')}
              className="w-full py-3 bg-[#2FD9C4] hover:bg-[#2FD9C4]/90 text-[#0A0E12] font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 text-sm shadow-[0_0_20px_rgba(47,217,196,0.2)] cursor-pointer"
            >
              <span>View Meeting Results</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Real-time Progress Bar & Stage Indicator */}
        {isProcessing && (
          <div className="p-8 bg-[#121821] border border-[#2FD9C4] rounded-2xl text-left space-y-4 shadow-[0_0_30px_rgba(47,217,196,0.1)]">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#2FD9C4] font-medium flex items-center space-x-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{currentStage || 'Processing...'}</span>
              </span>
              <span className="text-[#8B9AA8] font-bold">{progress}%</span>
            </div>

            <div className="w-full h-2 bg-[#0A0E12] rounded-full overflow-hidden border border-[#212B36]">
              <div
                className="h-full bg-gradient-to-r from-[#2FD9C4] via-[#8B7CF5] to-[#38D48A] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[10px] font-mono text-[#8B9AA8]">
              <div>
                FILE: <span className="text-[#E7EDF3]">{selectedFileName}</span>
              </div>
              <div>
                MEL BINS: <span className="text-[#2FD9C4]">64 Mels × 128</span>
              </div>
              <div>
                ASR:{' '}
                <span className="text-[#38D48A]">{config.asrModel}</span>
              </div>
              <div>
                LLM:{' '}
                <span className="text-[#8B7CF5]">
                  {config.transformerModel}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* What Happens After You Upload Panel */}
        <div className="p-6 bg-[#121821] border border-[#212B36] rounded-2xl text-left">
          <div className="text-xs font-mono text-[#8B9AA8] uppercase tracking-wider mb-2">
            NEURAL PIPELINE EXECUTION
          </div>
          <h3 className="text-base font-semibold text-[#E7EDF3] tracking-tight mb-4">
            Pipeline transformation steps
          </h3>

          <div className="divide-y divide-[#212B36]">
            <div className="py-3.5 first:pt-0 flex items-start space-x-4">
              <span className="text-xs font-mono font-semibold text-[#2FD9C4] bg-[#2FD9C4]/10 px-2 py-0.5 rounded mt-0.5">
                [01]
              </span>
              <div>
                <h4 className="text-sm font-semibold text-[#E7EDF3]">
                  Streaming Audio Decode (soundfile)
                </h4>
                <p className="text-xs text-[#8B9AA8] mt-1 leading-relaxed">
                  Streams AMI Meeting Corpus or user WAV/MP3 bytes without
                  loading entire gigabyte datasets, bypassing TorchCodec DLL
                  errors.
                </p>
              </div>
            </div>

            <div className="py-3.5 flex items-start space-x-4">
              <span className="text-xs font-mono font-semibold text-[#2FD9C4] bg-[#2FD9C4]/10 px-2 py-0.5 rounded mt-0.5">
                [02]
              </span>
              <div>
                <h4 className="text-sm font-semibold text-[#E7EDF3]">
                  64-Mel Spectrogram Normalization
                </h4>
                <p className="text-xs text-[#8B9AA8] mt-1 leading-relaxed">
                  Transforms waveform into fixed-size log-Mel spectrogram (64
                  mels × 128 frames) and min-max normalizes tensor values to
                  [0.0, 1.0].
                </p>
              </div>
            </div>

            <div className="py-3.5 flex items-start space-x-4">
              <span className="text-xs font-mono font-semibold text-[#8B7CF5] bg-[#8B7CF5]/10 px-2 py-0.5 rounded mt-0.5">
                [03]
              </span>
              <div>
                <h4 className="text-sm font-semibold text-[#E7EDF3]">
                  Latent Compression (Selected AE / VAE)
                </h4>
                <p className="text-xs text-[#8B9AA8] mt-1 leading-relaxed">
                  Compresses tensor into 256-dimensional latent space
                  (Autoencoder MSE=0.00293 or VAE KL=36.22 nats) to suppress
                  background conference noise.
                </p>
              </div>
            </div>

            <div className="py-3.5 last:pb-0 flex items-start space-x-4">
              <span className="text-xs font-mono font-semibold text-[#38D48A] bg-[#38D48A]/10 px-2 py-0.5 rounded mt-0.5">
                [04]
              </span>
              <div>
                <h4 className="text-sm font-semibold text-[#E7EDF3]">
                  Whisper ASR + FLAN-T5 Synthesis
                </h4>
                <p className="text-xs text-[#8B9AA8] mt-1 leading-relaxed">
                  Speech-to-text generates timestamped token stream; FLAN-T5
                  synthesizes summary, consensus decisions, action tickets, and
                  ROUGE/BERTScore evaluation metrics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN (4 cols) */}
      <div className="lg:col-span-4 space-y-6">
        {/* Short "Recording Tips" Checklist Card */}
        <div className="p-6 bg-[#121821] border border-[#212B36] rounded-2xl text-left">
          <div className="flex items-center space-x-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#F2B84B]" />
            <h3 className="text-sm font-semibold text-[#E7EDF3]">
              Acoustic engineering tips
            </h3>
          </div>
          <div className="space-y-3 text-xs text-[#8B9AA8]">
            {RECORDING_TIPS.map((tip, idx) => (
              <div key={idx} className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#38D48A] mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Connection Status Card */}
        <div className="p-6 bg-[#121821] border border-[#212B36] rounded-2xl text-left">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono text-[#8B9AA8] uppercase">
              BACKEND STATUS
            </h3>
            <span className="w-2 h-2 rounded-full bg-[#38D48A] animate-pulse" />
          </div>
          <div className="space-y-2 text-xs font-mono text-[#8B9AA8]">
            <div className="flex justify-between">
              <span>API Endpoint</span>
              <span className="text-[#2FD9C4]">localhost:8000</span>
            </div>
            <div className="flex justify-between">
              <span>Pipeline</span>
              <span className="text-[#38D48A]">FastAPI + Whisper + FLAN-T5</span>
            </div>
            <div className="flex justify-between">
              <span>Processing</span>
              <span className="text-[#E7EDF3]">Async (job polling)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
