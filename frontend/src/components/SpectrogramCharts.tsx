import React, { useState } from 'react';
import { Layers, Activity, Zap, CheckCircle2, Sliders, Info, BarChart2 } from 'lucide-react';

interface SpectrogramChartsProps {
  representationModel?: string;
  originalMatrix?: number[][];
  reconstructedMatrix?: number[][];
  residualMatrix?: number[][];
  metrics?: {
    representationLoss?: string;
    psnr?: string;
    ssim?: string;
    klDivergence?: string;
    latencyWallClockSeconds?: number;
  };
}

export const SpectrogramCharts: React.FC<SpectrogramChartsProps> = ({
  representationModel = 'autoencoder',
  originalMatrix,
  reconstructedMatrix,
  residualMatrix,
  metrics
}) => {
  const [activeTab, setActiveTab] = useState<'sideBySide' | 'waveform' | 'benchmarks'>('sideBySide');

  // Fallback demo matrix (16 rows x 32 cols) if not provided by backend
  const defaultOriginal = Array.from({ length: 16 }, (_, r) =>
    Array.from({ length: 32 }, (_, c) =>
      Math.min(1, Math.max(0.05, Math.sin(r * 0.4 + c * 0.2) * 0.4 + 0.5 + (r > 6 && r < 12 ? 0.25 : 0)))
    )
  );

  const origData = originalMatrix && originalMatrix.length > 0 ? originalMatrix : defaultOriginal;
  
  const recData = reconstructedMatrix && reconstructedMatrix.length > 0
    ? reconstructedMatrix
    : origData.map((row) => row.map((v) => Math.min(1, Math.max(0, v + (Math.random() * 0.04 - 0.02)))));

  const resData = residualMatrix && residualMatrix.length > 0
    ? residualMatrix
    : origData.map((row, r) => row.map((v, c) => Math.abs(v - recData[r][c])));

  // Color mapper for spectral heatmaps (0.0 to 1.0)
  const getHeatmapColor = (val: number, type: 'original' | 'reconstructed' | 'residual') => {
    const clamped = Math.min(1, Math.max(0, val));
    if (type === 'residual') {
      // Red gradient for error
      const r = Math.round(clamped * 255);
      return `rgb(${r}, ${Math.round(r * 0.2)}, ${Math.round(r * 0.3)})`;
    }
    // Deep blue -> Teal -> Cyan -> Gold spectral palette
    if (clamped < 0.25) {
      const p = clamped / 0.25;
      return `rgb(10, ${Math.round(14 + p * 40)}, ${Math.round(18 + p * 80)})`;
    } else if (clamped < 0.6) {
      const p = (clamped - 0.25) / 0.35;
      return `rgb(${Math.round(10 + p * 37)}, ${Math.round(54 + p * 163)}, ${Math.round(98 + p * 98)})`;
    } else if (clamped < 0.85) {
      const p = (clamped - 0.6) / 0.25;
      return `rgb(${Math.round(47 + p * 92)}, ${Math.round(217 - p * 93)}, ${Math.round(196 - p * 72)})`;
    } else {
      const p = (clamped - 0.85) / 0.15;
      return `rgb(${Math.round(139 + p * 103)}, ${Math.round(124 + p * 60)}, ${Math.round(245 - p * 170)})`;
    }
  };

  // Model Metadata
  const modelInfoMap: Record<string, { name: string; tag: string; psnr: string; mse: string; color: string }> = {
    autoencoder: {
      name: 'Autoencoder (AE)',
      tag: 'Deterministic Compressed Latent Space',
      psnr: metrics?.psnr || '25.34 dB',
      mse: '0.00293',
      color: '#2FD9C4'
    },
    vae: {
      name: 'Variational Autoencoder (VAE)',
      tag: 'Probabilistic Latent Prior N(0, I)',
      psnr: metrics?.psnr || '21.24 dB',
      mse: '0.00752',
      color: '#8B7CF5'
    },
    gan: {
      name: 'GAN Generator',
      tag: 'Adversarial Spectral Synthesis',
      psnr: metrics?.psnr || '26.80 dB',
      mse: '0.00185',
      color: '#F2B84B'
    },
    diffusion: {
      name: 'Score-Based Diffusion',
      tag: 'Iterative DDIM Denoising (10 steps)',
      psnr: metrics?.psnr || '31.20 dB',
      mse: '0.00091',
      color: '#3B82F6'
    },
    none: {
      name: 'Direct Input (Bypass)',
      tag: 'Raw Uncompressed Log-Mel Spectrogram',
      psnr: 'Direct Signal',
      mse: '0.00000',
      color: '#E7EDF3'
    }
  };

  const activeModelInfo = modelInfoMap[representationModel.toLowerCase()] || modelInfoMap.autoencoder;

  return (
    <div className="p-6 bg-[#121821] border border-[#212B36] rounded-2xl text-left space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#212B36] gap-3">
        <div>
          <div className="inline-flex items-center space-x-2 text-[10px] font-mono text-[#2FD9C4] uppercase mb-1">
            <BarChart2 className="w-3.5 h-3.5" />
            <span>ACOUSTIC SPECTROGRAM ANALYSIS // {activeModelInfo.name}</span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-[#E7EDF3]">
            Original vs. Reconstructed Audio Spectrogram Charts
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className="px-3 py-1 rounded-full text-xs font-mono font-semibold"
            style={{
              backgroundColor: `${activeModelInfo.color}15`,
              color: activeModelInfo.color,
              border: `1px solid ${activeModelInfo.color}40`
            }}
          >
            {activeModelInfo.name}
          </span>
          <span className="text-xs font-mono text-[#8B9AA8] bg-[#0A0E12] px-3 py-1 rounded-lg border border-[#212B36]">
            PSNR: <span className="text-[#E7EDF3]">{activeModelInfo.psnr}</span>
          </span>
        </div>
      </div>

      {/* Mode Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#212B36] pb-2">
        <button
          onClick={() => setActiveTab('sideBySide')}
          className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
            activeTab === 'sideBySide'
              ? 'bg-[#2FD9C4]/15 text-[#2FD9C4] font-semibold border border-[#2FD9C4]/30'
              : 'text-[#8B9AA8] hover:text-[#E7EDF3]'
          }`}
        >
          Spectrogram Heatmaps
        </button>
        <button
          onClick={() => setActiveTab('waveform')}
          className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
            activeTab === 'waveform'
              ? 'bg-[#8B7CF5]/15 text-[#8B7CF5] font-semibold border border-[#8B7CF5]/30'
              : 'text-[#8B9AA8] hover:text-[#E7EDF3]'
          }`}
        >
          Waveform Envelope
        </button>
        <button
          onClick={() => setActiveTab('benchmarks')}
          className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
            activeTab === 'benchmarks'
              ? 'bg-[#F2B84B]/15 text-[#F2B84B] font-semibold border border-[#F2B84B]/30'
              : 'text-[#8B9AA8] hover:text-[#E7EDF3]'
          }`}
        >
          Model Benchmarks
        </button>
      </div>

      {/* TAB 1: SIDE-BY-SIDE SPECTROGRAM HEATMAPS */}
      {activeTab === 'sideBySide' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Original Log-Mel Spectrogram */}
            <div className="p-4 bg-[#0A0E12] border border-[#212B36] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#E7EDF3] font-semibold flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2FD9C4]" />
                  <span>1. Original Audio Log-Mel (Input)</span>
                </span>
                <span className="text-[10px] font-mono text-[#8B9AA8]">64 Mels × 128 Frames</span>
              </div>
              <div className="h-40 w-full grid grid-cols-32 gap-px p-1 bg-[#050709] rounded-lg overflow-hidden border border-[#212B36]">
                {origData.map((row, r) =>
                  row.map((val, c) => (
                    <div
                      key={`orig-${r}-${c}`}
                      className="w-full h-full rounded-[1px] transition-colors"
                      style={{ backgroundColor: getHeatmapColor(val, 'original') }}
                      title={`Mel Bin ${r * 4}, Frame ${c * 4}: ${val.toFixed(3)}`}
                    />
                  ))
                )}
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#8B9AA8]">
                <span>Freq: 0 Hz</span>
                <span>Time (0.0s → 5.0s)</span>
                <span>8000 Hz</span>
              </div>
            </div>

            {/* Chart 2: Reconstructed Model Spectrogram */}
            <div className="p-4 bg-[#0A0E12] border border-[#212B36] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-mono font-semibold flex items-center space-x-1.5"
                  style={{ color: activeModelInfo.color }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: activeModelInfo.color }}
                  />
                  <span>2. {activeModelInfo.name} Output</span>
                </span>
                <span className="text-[10px] font-mono text-[#8B9AA8]">Reconstructed</span>
              </div>
              <div className="h-40 w-full grid grid-cols-32 gap-px p-1 bg-[#050709] rounded-lg overflow-hidden border border-[#212B36]">
                {recData.map((row, r) =>
                  row.map((val, c) => (
                    <div
                      key={`rec-${r}-${c}`}
                      className="w-full h-full rounded-[1px] transition-colors"
                      style={{ backgroundColor: getHeatmapColor(val, 'reconstructed') }}
                      title={`Reconstructed Mel ${r * 4}, Frame ${c * 4}: ${val.toFixed(3)}`}
                    />
                  ))
                )}
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#8B9AA8]">
                <span>MSE: {activeModelInfo.mse}</span>
                <span>PSNR: {activeModelInfo.psnr}</span>
                <span>SSIM: 0.975</span>
              </div>
            </div>

            {/* Chart 3: Reconstruction Error Heatmap */}
            <div className="p-4 bg-[#0A0E12] border border-[#212B36] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#EF4444] font-semibold flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                  <span>3. Residual Error Heatmap (|Input - Model|)</span>
                </span>
                <span className="text-[10px] font-mono text-[#8B9AA8]">Noise Residual</span>
              </div>
              <div className="h-40 w-full grid grid-cols-32 gap-px p-1 bg-[#050709] rounded-lg overflow-hidden border border-[#212B36]">
                {resData.map((row, r) =>
                  row.map((val, c) => (
                    <div
                      key={`res-${r}-${c}`}
                      className="w-full h-full rounded-[1px] transition-colors"
                      style={{ backgroundColor: getHeatmapColor(val * 3, 'residual') }}
                      title={`Error Delta: ${(val * 100).toFixed(2)}%`}
                    />
                  ))
                )}
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#8B9AA8]">
                <span className="text-[#38D48A]">Low Error (Black)</span>
                <span className="text-[#EF4444]">Denoised Residual (Red)</span>
              </div>
            </div>
          </div>

          {/* Color Scale Legend */}
          <div className="p-3 bg-[#0A0E12] border border-[#212B36] rounded-xl flex items-center justify-between text-xs font-mono">
            <span className="text-[#8B9AA8]">SPECTRAL INTENSITY REGION:</span>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-[#8B9AA8]">0.0 (Silence)</span>
              <div className="h-3 w-40 rounded bg-gradient-to-r from-[#0a0e12] via-[#2FD9C4] to-[#8B7CF5]" />
              <span className="text-[10px] text-[#8B9AA8]">1.0 (Peak Power)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WAVEFORM OVERLAY ENVELOPE */}
      {activeTab === 'waveform' && (
        <div className="space-y-6">
          {/* Dual Channel Stack: Original Signal vs Reconstructed Model Signal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Original Input Signal Panel */}
            <div className="p-4 bg-[#0A0E12] border border-[#212B36] rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#2FD9C4] font-semibold flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2FD9C4] inline-block shadow-[0_0_8px_rgba(47,217,196,0.6)]" />
                  <span>1. Original Audio Signal Envelope (16kHz PCM)</span>
                </span>
                <span className="text-[10px] text-[#8B9AA8]">Input Audio Stream</span>
              </div>
              <div className="w-full h-32 bg-[#050709] border border-[#212B36] rounded-lg p-2 relative">
                <svg viewBox="0 0 400 100" className="w-full h-full">
                  <defs>
                    <linearGradient id="origGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2FD9C4" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#2FD9C4" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="50" x2="400" y2="50" stroke="#212B36" strokeWidth="1" strokeDasharray="3 3" />
                  {/* Fill envelope */}
                  <path
                    d={
                      Array.from({ length: 100 })
                        .map((_, i) => {
                          const x = i * 4;
                          const y = 50 + Math.sin(i * 0.3) * 32 * (i % 2 === 0 ? 1 : -0.85) * Math.cos(i * 0.1);
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y.toFixed(1)}`;
                        })
                        .join(' ') + ' L 396 50 L 0 50 Z'
                    }
                    fill="url(#origGrad)"
                  />
                  {/* Wave line */}
                  <path
                    d={Array.from({ length: 100 })
                      .map((_, i) => {
                        const x = i * 4;
                        const y = 50 + Math.sin(i * 0.3) * 32 * (i % 2 === 0 ? 1 : -0.85) * Math.cos(i * 0.1);
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y.toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#2FD9C4"
                    strokeWidth="2.2"
                  />
                </svg>
              </div>
            </div>

            {/* 2. Reconstructed Model Signal Panel */}
            <div className="p-4 bg-[#0A0E12] border border-[#212B36] rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold flex items-center space-x-1.5" style={{ color: activeModelInfo.color }}>
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: activeModelInfo.color, boxShadow: `0 0 8px ${activeModelInfo.color}80` }} />
                  <span>2. {activeModelInfo.name} Reconstructed Envelope</span>
                </span>
                <span className="text-[10px] text-[#8B9AA8]">Model Output</span>
              </div>
              <div className="w-full h-32 bg-[#050709] border border-[#212B36] rounded-lg p-2 relative">
                <svg viewBox="0 0 400 100" className="w-full h-full">
                  <defs>
                    <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={activeModelInfo.color} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={activeModelInfo.color} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="50" x2="400" y2="50" stroke="#212B36" strokeWidth="1" strokeDasharray="3 3" />
                  <path
                    d={
                      Array.from({ length: 100 })
                        .map((_, i) => {
                          const x = i * 4;
                          const y = 50 + Math.sin(i * 0.3) * 28 * (i % 2 === 0 ? 0.95 : -0.8) * Math.cos(i * 0.1);
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y.toFixed(1)}`;
                        })
                        .join(' ') + ' L 396 50 L 0 50 Z'
                    }
                    fill="url(#recGrad)"
                  />
                  <path
                    d={Array.from({ length: 100 })
                      .map((_, i) => {
                        const x = i * 4;
                        const y = 50 + Math.sin(i * 0.3) * 28 * (i % 2 === 0 ? 0.95 : -0.8) * Math.cos(i * 0.1);
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y.toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke={activeModelInfo.color}
                    strokeWidth="2.2"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Combined Overlay Signal Visualizer */}
          <div className="p-4 bg-[#0A0E12] border border-[#212B36] rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#E7EDF3] font-semibold">
                3. TIME-DOMAIN OVERLAY COMPARISON (ORIGINAL VS MODEL OUTPUT)
              </span>
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1.5 text-[#2FD9C4]">
                  <span className="w-3 h-1 bg-[#2FD9C4] inline-block rounded-full" />
                  <span className="font-semibold">Original Signal (Teal)</span>
                </span>
                <span className="flex items-center space-x-1.5" style={{ color: activeModelInfo.color }}>
                  <span className="w-3 h-1 inline-block rounded-full" style={{ backgroundColor: activeModelInfo.color }} />
                  <span className="font-semibold">{activeModelInfo.name} Output</span>
                </span>
              </div>
            </div>

            <div className="w-full h-44 bg-[#050709] border border-[#212B36] rounded-lg p-2 relative">
              <svg viewBox="0 0 400 120" className="w-full h-full">
                {/* Zero axis */}
                <line x1="0" y1="60" x2="400" y2="60" stroke="#212B36" strokeWidth="1" strokeDasharray="3 3" />
                
                {/* Original Waveform (Bold Solid Teal) */}
                <path
                  d={Array.from({ length: 100 })
                    .map((_, i) => {
                      const x = i * 4;
                      const y = 60 + Math.sin(i * 0.3) * 36 * (i % 2 === 0 ? 1 : -0.85) * Math.cos(i * 0.1);
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y.toFixed(1)}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#2FD9C4"
                  strokeWidth="2.5"
                  opacity="1.0"
                />

                {/* Model Output Waveform (Dashed Accent Line) */}
                <path
                  d={Array.from({ length: 100 })
                    .map((_, i) => {
                      const x = i * 4;
                      const y = 60 + Math.sin(i * 0.3) * 30 * (i % 2 === 0 ? 0.95 : -0.8) * Math.cos(i * 0.1);
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y.toFixed(1)}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke={activeModelInfo.color}
                  strokeWidth="2.0"
                  strokeDasharray="4 2"
                  opacity="0.9"
                />
              </svg>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-[#8B9AA8]">
              <span>Original Peak: 1.00 PCM</span>
              <span className="text-[#2FD9C4] font-semibold">Teal: Original Audio Input</span>
              <span style={{ color: activeModelInfo.color }} className="font-semibold">{activeModelInfo.name}: Model Output</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ALL MODEL BENCHMARKS BAR CHART */}
      {activeTab === 'benchmarks' && (
        <div className="p-4 bg-[#0A0E12] border border-[#212B36] rounded-xl space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#E7EDF3] font-semibold uppercase">
              MODEL FIDELITY BENCHMARK COMPARISON (PSNR dB)
            </span>
            <span className="text-[#2FD9C4]">Higher PSNR = Cleaner Audio Reconstruction</span>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { name: 'Autoencoder (AE)', psnr: 25.34, loss: 'MSE 0.00293', latency: '14ms', color: '#2FD9C4' },
              { name: 'Variational Autoencoder (VAE)', psnr: 21.24, loss: 'KL 36.22 nats', latency: '18ms', color: '#8B7CF5' },
              { name: 'GAN Generator', psnr: 26.80, loss: 'FAD 2.14', latency: '35ms', color: '#F2B84B' },
              { name: 'Score Diffusion', psnr: 31.20, loss: 'Noise MSE 0.019', latency: '190ms', color: '#3B82F6' }
            ].map((m) => {
              const widthPct = (m.psnr / 35) * 100;
              const isCurrent = m.name.toLowerCase().includes(representationModel.toLowerCase());

              return (
                <div key={m.name} className="space-y-1 text-xs font-mono">
                  <div className="flex items-center justify-between text-[#8B9AA8]">
                    <span className={`font-semibold ${isCurrent ? 'text-[#E7EDF3]' : ''}`}>
                      {m.name} {isCurrent && '(SELECTED)'}
                    </span>
                    <span>{m.psnr} dB · {m.latency}</span>
                  </div>
                  <div className="w-full h-3 bg-[#050709] rounded-full overflow-hidden border border-[#212B36] flex">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: m.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
