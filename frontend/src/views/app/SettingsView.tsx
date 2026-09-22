import React, { useState } from 'react';
import { PageId } from '../../types/navigation.ts';
import { Check, Shield, Bell, User, CheckCircle2 } from 'lucide-react';

interface SettingsViewProps {
  onNavigate: (page: PageId) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate }) => {
  const [fullName, setFullName] = useState('Sarah Chen');
  const [email, setEmail] = useState('sarah.chen@enterprise.io');
  const [transcriptionModel, setTranscriptionModel] = useState('whisper-large-v3');
  const [summarizationModel, setSummarizationModel] = useState('flan-t5-xl');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Notification toggles
  const [emailOnComplete, setEmailOnComplete] = useState(true);
  const [slackWebhook, setSlackWebhook] = useState(true);
  const [errorAlerts, setErrorAlerts] = useState(false);

  // Privacy toggles
  const [zeroAudioRetention, setZeroAudioRetention] = useState(true);
  const [anonymizeBiometrics, setAnonymizeBiometrics] = useState(true);
  const [telemetryOptIn, setTelemetryOptIn] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left">
      {/* LEFT COLUMN (2:1 split -> 7 or 8 cols): Profile & Model Config Form */}
      <div className="lg:col-span-7 p-6 sm:p-8 bg-[#121821] border border-[#212B36] rounded-2xl">
        <div className="pb-4 border-b border-[#212B36] mb-6">
          <div className="text-xs font-mono text-[#2FD9C4] uppercase">
            WORKSPACE PREFERENCES
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-[#E7EDF3] mt-0.5">
            Profile &amp; Model Pipeline Configuration
          </h2>
          <p className="text-xs text-[#8B9AA8] mt-1">
            Customize default ASR checkpoints and transformer inference weights.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-mono text-[#8B9AA8] uppercase mb-1.5">
              FULL NAME
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A0E12] border border-[#212B36] rounded-xl text-xs sm:text-sm text-[#E7EDF3] focus:outline-none focus:border-[#2FD9C4]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#8B9AA8] uppercase mb-1.5">
              CORPORATE EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A0E12] border border-[#212B36] rounded-xl text-xs sm:text-sm text-[#E7EDF3] focus:outline-none focus:border-[#2FD9C4]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#8B9AA8] uppercase mb-1.5">
              DEFAULT TRANSCRIPTION MODEL (ASR)
            </label>
            <select
              value={transcriptionModel}
              onChange={(e) => setTranscriptionModel(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A0E12] border border-[#212B36] rounded-xl text-xs sm:text-sm text-[#E7EDF3] focus:outline-none focus:border-[#2FD9C4] cursor-pointer"
            >
              <option value="whisper-large-v3">Whisper Large v3 (Recommended · Multilingual · 4.2% WER)</option>
              <option value="whisper-medium">Whisper Medium (2x faster · 5.8% WER)</option>
              <option value="whisper-small-edge">Whisper Small (Low resource · Edge)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#8B9AA8] uppercase mb-1.5">
              DEFAULT SUMMARIZATION MODEL
            </label>
            <select
              value={summarizationModel}
              onChange={(e) => setSummarizationModel(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A0E12] border border-[#212B36] rounded-xl text-xs sm:text-sm text-[#E7EDF3] focus:outline-none focus:border-[#2FD9C4] cursor-pointer"
            >
              <option value="flan-t5-xl">Google FLAN-T5 XL (3B params · Instruction fine-tuned)</option>
              <option value="flan-t5-base">Google FLAN-T5 Base (Fast latency)</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash API (Cloud proxy fallback)</option>
            </select>
          </div>

          <div className="pt-4 flex items-center space-x-4">
            <button
              type="submit"
              className="px-6 py-2.5 text-xs sm:text-sm font-medium text-[#0A0E12] bg-[#2FD9C4] hover:bg-[#2FD9C4]/90 rounded-full transition-all flex items-center space-x-2 cursor-pointer shadow-[0_0_15px_rgba(47,217,196,0.2)]"
            >
              <span>Save workspace preferences</span>
            </button>

            {savedSuccess && (
              <div className="flex items-center space-x-1.5 text-xs font-mono text-[#38D48A]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Configuration saved successfully</span>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN (5 cols): Notifications & Privacy Panels (stacked) */}
      <div className="lg:col-span-5 space-y-6">
        {/* Notifications Panel */}
        <div className="p-6 bg-[#121821] border border-[#212B36] rounded-2xl text-left">
          <div className="flex items-center space-x-2 mb-4">
            <Bell className="w-4 h-4 text-[#8B7CF5]" />
            <h3 className="text-sm font-semibold text-[#E7EDF3]">
              Notifications &amp; Alerts
            </h3>
          </div>

          <div className="divide-y divide-[#212B36]">
            {/* Toggle Row 1 */}
            <div className="py-3.5 first:pt-0 flex items-center justify-between">
              <div className="pr-4">
                <div className="text-xs font-semibold text-[#E7EDF3]">
                  Email on pipeline completion
                </div>
                <div className="text-[11px] text-[#8B9AA8] mt-0.5">
                  Receive summary PDF and action tickets via email.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmailOnComplete(!emailOnComplete)}
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
                  emailOnComplete ? 'bg-[#2FD9C4]' : 'bg-[#212B36]'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full bg-[#0A0E12] absolute top-[3px] transition-transform ${
                    emailOnComplete ? 'left-[22px]' : 'left-[3px]'
                  }`}
                />
              </button>
            </div>

            {/* Toggle Row 2 */}
            <div className="py-3.5 flex items-center justify-between">
              <div className="pr-4">
                <div className="text-xs font-semibold text-[#E7EDF3]">
                  Slack channel dispatch
                </div>
                <div className="text-[11px] text-[#8B9AA8] mt-0.5">
                  Broadcast verified decisions to #eng-architecture.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSlackWebhook(!slackWebhook)}
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
                  slackWebhook ? 'bg-[#2FD9C4]' : 'bg-[#212B36]'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full bg-[#0A0E12] absolute top-[3px] transition-transform ${
                    slackWebhook ? 'left-[22px]' : 'left-[3px]'
                  }`}
                />
              </button>
            </div>

            {/* Toggle Row 3 */}
            <div className="py-3.5 last:pb-0 flex items-center justify-between">
              <div className="pr-4">
                <div className="text-xs font-semibold text-[#E7EDF3]">
                  Urgent action item alerts
                </div>
                <div className="text-[11px] text-[#8B9AA8] mt-0.5">
                  SMS alerts if critical security tickets are identified.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorAlerts(!errorAlerts)}
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
                  errorAlerts ? 'bg-[#2FD9C4]' : 'bg-[#212B36]'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full bg-[#0A0E12] absolute top-[3px] transition-transform ${
                    errorAlerts ? 'left-[22px]' : 'left-[3px]'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Panel */}
        <div className="p-6 bg-[#121821] border border-[#212B36] rounded-2xl text-left">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="w-4 h-4 text-[#38D48A]" />
            <h3 className="text-sm font-semibold text-[#E7EDF3]">
              Privacy &amp; Data Governance
            </h3>
          </div>

          <div className="divide-y divide-[#212B36]">
            {/* Toggle Row 1 */}
            <div className="py-3.5 first:pt-0 flex items-center justify-between">
              <div className="pr-4">
                <div className="text-xs font-semibold text-[#E7EDF3]">
                  Zero audio retention mode
                </div>
                <div className="text-[11px] text-[#8B9AA8] mt-0.5">
                  Discard PCM files and spectrograms post-inference.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setZeroAudioRetention(!zeroAudioRetention)}
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
                  zeroAudioRetention ? 'bg-[#38D48A]' : 'bg-[#212B36]'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full bg-[#0A0E12] absolute top-[3px] transition-transform ${
                    zeroAudioRetention ? 'left-[22px]' : 'left-[3px]'
                  }`}
                />
              </button>
            </div>

            {/* Toggle Row 2 */}
            <div className="py-3.5 flex items-center justify-between">
              <div className="pr-4">
                <div className="text-xs font-semibold text-[#E7EDF3]">
                  Anonymize biometric speaker prints
                </div>
                <div className="text-[11px] text-[#8B9AA8] mt-0.5">
                  Strip pitch and formant contours from diarization logs.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAnonymizeBiometrics(!anonymizeBiometrics)}
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
                  anonymizeBiometrics ? 'bg-[#38D48A]' : 'bg-[#212B36]'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full bg-[#0A0E12] absolute top-[3px] transition-transform ${
                    anonymizeBiometrics ? 'left-[22px]' : 'left-[3px]'
                  }`}
                />
              </button>
            </div>

            {/* Toggle Row 3 */}
            <div className="py-3.5 last:pb-0 flex items-center justify-between">
              <div className="pr-4">
                <div className="text-xs font-semibold text-[#E7EDF3]">
                  Continuous model telemetry
                </div>
                <div className="text-[11px] text-[#8B9AA8] mt-0.5">
                  Share anonymized loss metrics to tune enterprise checkpoints.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTelemetryOptIn(!telemetryOptIn)}
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
                  telemetryOptIn ? 'bg-[#38D48A]' : 'bg-[#212B36]'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full bg-[#0A0E12] absolute top-[3px] transition-transform ${
                    telemetryOptIn ? 'left-[22px]' : 'left-[3px]'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
