/**
 * Audio playback and Speech Synthesis engine for meeting recordings
 */

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  voiceMode: boolean; // Speak transcript text using speech synthesis
}

type StateListener = (state: PlaybackState) => void;

class AudioPlaybackService {
  private audioElement: HTMLAudioElement | null = null;
  private currentAudioSrc: string = '';
  private state: PlaybackState = {
    isPlaying: false,
    currentTime: 0,
    duration: 15,
    volume: 0.8,
    isMuted: false,
    voiceMode: false // disabled by default so real audio file plays without TTS interference
  };
  private listeners: Set<StateListener> = new Set();
  private transcriptText: string =
    'Speaker A: If you have this big warning about doing nothing at all in the gateway machine. Speaker B: We verified that keep-alive timeout thresholds were tripping during idle socket transitions.';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudio();
    }
  }

  private initAudio() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }

    this.audioElement = new Audio();
    this.audioElement.src = this.currentAudioSrc;
    this.audioElement.preload = 'metadata';
    this.audioElement.volume = this.state.volume;

    this.audioElement.addEventListener('loadedmetadata', () => {
      if (this.audioElement && this.audioElement.duration && !isNaN(this.audioElement.duration)) {
        this.state.duration = this.audioElement.duration;
        this.notify();
      }
    });

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.audioElement) {
        this.state.currentTime = this.audioElement.currentTime;
        this.notify();
      }
    });

    this.audioElement.addEventListener('ended', () => {
      this.state.isPlaying = false;
      this.state.currentTime = 0;
      this.stopSpeech();
      this.notify();
    });
  }

  public setAudioSource(src: string, transcript?: string) {
    this.currentAudioSrc = src;
    if (transcript) {
      this.transcriptText = transcript;
    }
    const wasPlaying = this.state.isPlaying;
    if (wasPlaying) {
      this.pause();
    }
    this.initAudio();
    if (wasPlaying) {
      this.play();
    }
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const copy = { ...this.state };
    this.listeners.forEach((fn) => fn(copy));
  }

  public async play(): Promise<void> {
    if (!this.audioElement) {
      this.initAudio();
    }

    try {
      if (this.audioElement) {
        this.audioElement.volume = this.state.isMuted ? 0 : this.state.volume;
        await this.audioElement.play();
      }
      this.state.isPlaying = true;
      this.notify();

      // If voiceMode is active and speech synthesis is supported, speak the transcript aloud
      if (this.state.voiceMode && 'speechSynthesis' in window && !this.state.isMuted) {
        this.speakTranscript();
      }
    } catch (err) {
      console.warn('Audio play error, falling back to SpeechSynthesis or WebAudio:', err);
      // Fallback: try SpeechSynthesis if audio element was blocked
      if ('speechSynthesis' in window && !this.state.isMuted) {
        this.speakTranscript();
        this.state.isPlaying = true;
        this.notify();
      }
    }
  }

  public pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.stopSpeech();
    this.state.isPlaying = false;
    this.notify();
  }

  public togglePlay(): void {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(seconds: number): void {
    if (this.audioElement) {
      this.audioElement.currentTime = seconds;
      this.state.currentTime = seconds;
      this.notify();
    }
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.state.volume = clamped;
    this.state.isMuted = clamped === 0;
    if (this.audioElement) {
      this.audioElement.volume = clamped;
    }
    this.notify();
  }

  public toggleMute(): void {
    this.state.isMuted = !this.state.isMuted;
    if (this.audioElement) {
      this.audioElement.volume = this.state.isMuted ? 0 : this.state.volume;
    }
    if (this.state.isMuted) {
      this.stopSpeech();
    }
    this.notify();
  }

  public setVoiceMode(enabled: boolean): void {
    this.state.voiceMode = enabled;
    if (!enabled) {
      this.stopSpeech();
    } else if (this.state.isPlaying) {
      this.speakTranscript();
    }
    this.notify();
  }

  private speakTranscript() {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // stop previous
    const utterance = new SpeechSynthesisUtterance(this.transcriptText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = this.state.isMuted ? 0 : this.state.volume;

    // Pick an English voice if available
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang.startsWith('en') && v.name.includes('Natural')) ||
                    voices.find((v) => v.lang.startsWith('en'));
    if (enVoice) {
      utterance.voice = enVoice;
    }

    utterance.onend = () => {
      // Finished speaking
    };

    window.speechSynthesis.speak(utterance);
  }

  private stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public getState(): PlaybackState {
    return { ...this.state };
  }
}

export const audioPlayer = new AudioPlaybackService();
