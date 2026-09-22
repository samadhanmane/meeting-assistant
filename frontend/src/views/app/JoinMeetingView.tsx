import React, { useState } from 'react';
import { Lock, Key, ArrowRight, AlertCircle, Eye, EyeOff, ShieldCheck, Check } from 'lucide-react';
import { PageId } from '../../types/navigation.ts';
import { ApiService } from '../../services/api.ts';
import { AuthSession } from '../../types/pipeline.ts';

interface JoinMeetingViewProps {
  onNavigate: (page: PageId) => void;
  onAuthenticated: (session: AuthSession) => void;
  initialMeetingId?: string;
}

export const JoinMeetingView: React.FC<JoinMeetingViewProps> = ({
  onNavigate,
  onAuthenticated,
  initialMeetingId = ''
}) => {
  const [meetingId, setMeetingId] = useState<string>(initialMeetingId);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = meetingId.trim();
    if (!cleanId) {
      setError('Please enter a valid Meeting ID.');
      return;
    }

    if (!password) {
      setError('Please enter the meeting password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await ApiService.accessMeeting(cleanId, password);
      
      const session: AuthSession = {
        meetingId: res.meetingId,
        token: res.token,
        role: res.role,
        expiresAt: Date.now() + res.expiresIn * 1000
      };

      onAuthenticated(session);
    } catch (err: any) {
      setError(err.message || 'Invalid meeting ID or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 text-left space-y-6">
      {/* Header card */}
      <div className="p-6 sm:p-8 bg-[#121821] border border-[#212B36] rounded-2xl shadow-xl space-y-6 animate-fadeIn">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-[#2FD9C4]/10 border border-[#2FD9C4]/30 flex items-center justify-center">
            <Lock className="w-6 h-6 text-[#2FD9C4]" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#E7EDF3] tracking-tight">
              Join Meeting Session
            </h2>
            <p className="text-xs text-[#8B9AA8]">
              Enter the unique Meeting ID and Password provided by the uploader.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl flex items-start space-x-3 text-xs text-[#EF4444] animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[#8B9AA8] uppercase mb-1.5">
              Meeting ID
            </label>
            <input
              type="text"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              placeholder="e.g. m_x8a9b2c3d4e5"
              className="w-full px-4 py-2.5 bg-[#0A0E12] border border-[#212B36] focus:border-[#2FD9C4] rounded-xl text-sm font-mono text-[#E7EDF3] placeholder-[#8B9AA8]/50 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#8B9AA8] uppercase mb-1.5">
              Meeting Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-4 py-2.5 pr-10 bg-[#0A0E12] border border-[#212B36] focus:border-[#2FD9C4] rounded-xl text-sm text-[#E7EDF3] placeholder-[#8B9AA8]/50 outline-none transition-all"
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
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#2FD9C4] hover:bg-[#2FD9C4]/90 disabled:opacity-50 text-[#0A0E12] font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 text-sm shadow-[0_0_20px_rgba(47,217,196,0.2)] cursor-pointer mt-2"
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Access Meeting Results'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-[#212B36] flex items-center justify-between text-xs font-mono text-[#8B9AA8]">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#38D48A]" />
            <span>Per-meeting token security</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="text-[#2FD9C4] hover:underline cursor-pointer"
          >
            Upload new meeting →
          </button>
        </div>
      </div>
    </div>
  );
};
