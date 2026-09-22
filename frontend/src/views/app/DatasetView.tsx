import React from 'react';
import { PageId } from '../../types/navigation.ts';
import { Database, FileCode, CheckCircle, ArrowRight, Layers, Cpu } from 'lucide-react';

interface DatasetViewProps {
  onNavigate: (page: PageId) => void;
}

const PREPROCESSING_STEPS = [
  {
    step: '01',
    name: 'Streaming Mode',
    desc: 'Streams edinburghcstr/ami (ihm config) with automatic decoding disabled (Audio(decode=False)) to avoid TorchCodec DLL errors and avoid downloading entire multi-gigabyte files.'
  },
  {
    step: '02',
    name: 'Manual Soundfile Decode',
    desc: 'Audio bytes for raw train/val/test splits are pulled per chunk and decoded directly via soundfile into clean numpy waveforms.'
  },
  {
    step: '03',
    name: '16kHz Resampling',
    desc: 'Resamples multi-channel conference audio to a standardized 16,000 Hz single-channel pulse-code modulation (PCM) stream.'
  },
  {
    step: '04',
    name: 'Peak-Normalization & Chunking',
    desc: 'Normalizes peak amplitudes and segments audio into uniform 5.0-second windows (80,000 samples per slice).'
  },
  {
    step: '05',
    name: '64x128 Mel Spectrogram',
    desc: 'Short-Time Fourier Transform (STFT) generates fixed-size log-frequency Mel-scale filterbanks with 64 mels × 128 time frames.'
  },
  {
    step: '06',
    name: 'Min-Max [0, 1] Normalization',
    desc: 'Scales raw decibel values linearly into [0.0, 1.0] interval, producing cached PyTorch tensors: X_train.pt, X_val.pt, and X_test.pt.'
  }
];

const TENSOR_METRICS = [
  { label: 'HuggingFace Dataset', value: 'edinburghcstr/ami (ihm)' },
  { label: 'Sample Rate', value: '16,000 Hz' },
  { label: 'Audio Chunk Window', value: '5.00 seconds (80,000 samples)' },
  { label: 'Mel-Filterbank Bands', value: '64 Mel bins' },
  { label: 'Time Domain Frames', value: '128 frames' },
  { label: 'Spectrogram Tensor Shape', value: 'torch.Size([B, 1, 64, 128])' },
  { label: 'Normalization Interval', value: 'Min-Max [0.0, 1.0]' },
  { label: 'Cached Training Tensors', value: '3,000 slices (X_train.pt)' },
  { label: 'Cached Validation Tensors', value: '500 slices (X_val.pt)' },
  { label: 'Cached Test Tensors', value: '500 slices (X_test.pt)' },
  { label: 'Benchmark Dataset Source', value: 'AMI Corpus Meeting EN2001a' }
];

export const DatasetView: React.FC<DatasetViewProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-8 text-left">
      {/* WIDE PANEL UP TOP */}
      <div className="p-6 sm:p-8 bg-[#121821] border border-[#212B36] rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#212B36] gap-3">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg sm:text-xl font-semibold text-[#E7EDF3] tracking-tight">
              AMI Meeting Corpus (edinburghcstr/ami)
            </h2>
            <span className="text-xs font-mono bg-[#2FD9C4]/15 text-[#2FD9C4] border border-[#2FD9C4]/30 px-2.5 py-0.5 rounded-full font-medium">
              Config: ihm (Individual Headset Mic)
            </span>
          </div>
          <div className="text-xs font-mono text-[#8B9AA8]">
            4,000 CACHED TENSORS · 16,000 HZ
          </div>
        </div>

        {/* Paragraph on the streaming/decode approach */}
        <p className="text-sm sm:text-base text-[#8B9AA8] leading-relaxed my-6 max-w-4xl">
          The pipeline loads the AMI Meeting Corpus in streaming mode with automatic
          audio decoding deferred (<code className="text-[#2FD9C4]">Audio(decode=False)</code>)
          to prevent downloading the full multi-gigabyte corpus and avoid TorchCodec
          DLL decode crashes. Slices are manually decoded with <code className="text-[#8B7CF5]">soundfile</code>,
          resampled to 16kHz, peak-normalized, partitioned into 5.0-second chunks,
          and converted to 64-band × 128-frame log-Mel spectrograms saved as{' '}
          <span className="text-[#E7EDF3] font-mono">X_train.pt</span>,{' '}
          <span className="text-[#E7EDF3] font-mono">X_val.pt</span>, and{' '}
          <span className="text-[#E7EDF3] font-mono">X_test.pt</span>.
        </p>

        {/* Counts above the split bar */}
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#2FD9C4]" />
            <span className="text-[#E7EDF3] font-medium">
              Train: 3,000 tensors (75%)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#8B7CF5]" />
            <span className="text-[#E7EDF3] font-medium">
              Validation: 500 tensors (12.5%)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#F2B84B]" />
            <span className="text-[#E7EDF3] font-medium">
              Test: 500 tensors (12.5%)
            </span>
          </div>
        </div>

        {/* Labeled horizontal split-bar (teal / violet / amber) */}
        <div className="w-full h-3 bg-[#0A0E12] rounded-full overflow-hidden flex border border-[#212B36]">
          <div
            className="h-full bg-[#2FD9C4] transition-all hover:opacity-90"
            style={{ width: '75%' }}
            title="Train: 75% (3,000 clips)"
          />
          <div
            className="h-full bg-[#8B7CF5] transition-all hover:opacity-90"
            style={{ width: '12.5%' }}
            title="Val: 12.5% (500 clips)"
          />
          <div
            className="h-full bg-[#F2B84B] transition-all hover:opacity-90"
            style={{ width: '12.5%' }}
            title="Test: 12.5% (500 clips)"
          />
        </div>
      </div>

      {/* 2-COLUMN SPLIT BELOW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols): Numbered "preprocessing steps" list */}
        <div className="lg:col-span-7 p-6 sm:p-8 bg-[#121821] border border-[#212B36] rounded-2xl">
          <div className="text-xs font-mono text-[#2FD9C4] uppercase tracking-wider mb-2">
            STREAMING PREPROCESSING PIPELINE (preprocessing.py)
          </div>
          <h3 className="text-base font-semibold text-[#E7EDF3] tracking-tight mb-6">
            Raw audio to normalized Mel spectrogram tensors
          </h3>

          <div className="space-y-4">
            {PREPROCESSING_STEPS.map((s) => (
              <div
                key={s.step}
                className="p-4 bg-[#0A0E12] border border-[#212B36] rounded-xl flex items-start space-x-4"
              >
                <div className="text-xs font-mono font-bold text-[#2FD9C4] bg-[#2FD9C4]/10 px-2.5 py-1 rounded-md">
                  {s.step}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#E7EDF3]">
                    {s.name}
                  </h4>
                  <p className="text-xs text-[#8B9AA8] mt-1 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): Compact "cached tensors" metrics panel */}
        <div className="lg:col-span-5 p-6 sm:p-8 bg-[#121821] border border-[#212B36] rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#212B36]">
            <div>
              <div className="text-xs font-mono text-[#8B7CF5] uppercase">
                TENSOR SPECS
              </div>
              <h3 className="text-base font-semibold text-[#E7EDF3] mt-0.5">
                Cached dataset tensors
              </h3>
            </div>
            <FileCode className="w-5 h-5 text-[#8B7CF5]" />
          </div>

          <div className="divide-y divide-[#212B36]">
            {TENSOR_METRICS.map((item) => (
              <div
                key={item.label}
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs font-mono"
              >
                <span className="text-[#8B9AA8]">{item.label}</span>
                <span className="text-[#E7EDF3] font-medium text-right">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Quick action button */}
          <div className="pt-4 border-t border-[#212B36]">
            <button
              onClick={() => onNavigate('upload')}
              className="w-full py-2.5 text-xs font-mono text-[#0A0E12] bg-[#2FD9C4] hover:bg-[#2FD9C4]/90 rounded-xl transition-colors font-semibold flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Upload Meeting Audio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
