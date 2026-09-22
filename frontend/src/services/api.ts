import {
  ModelMetadata,
  PipelineConfig,
  PipelineProcessResult,
  MeetingSessionSummary,
  MeetingAccessResponse,
  UploadMeetingResponse
} from '../types/pipeline.ts';

/**
 * API base URL — read from environment variable, defaults to empty (relative) or localhost:8000.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Job status response from the backend.
 */
export interface JobStatus {
  id: string;
  meetingId?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  fileName?: string;
  createdAt?: string;
  result?: PipelineProcessResult;
  adminToken?: string;
  adminJwt?: string;
  error?: string;
}

import { REAL_MODELS } from '../server/api.ts';

export const ApiService = {
  /**
   * Get all registered models with their real architecture and evaluation metrics.
   */
  async getModels(): Promise<ModelMetadata[]> {
    try {
      const response = await fetch(`${API_BASE}/api/models/evaluation`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      // Fall back to catalog models if backend endpoint is unavailable
    }
    return REAL_MODELS;
  },

  /**
   * Get list of processed meetings from backend.
   */
  async getMeetings(): Promise<MeetingSessionSummary[]> {
    try {
      const response = await fetch(`${API_BASE}/api/meetings`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      // Return empty array if backend endpoint is unavailable
    }
    return [];
  },

  /**
   * Authenticate a member with meeting ID + password -> returns short-lived JWT.
   */
  async accessMeeting(meetingId: string, password: str): Promise<MeetingAccessResponse> {
    const response = await fetch(`${API_BASE}/api/meetings/${meetingId}/access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.detail || 'Invalid meeting ID or password');
    }

    return await response.json();
  },

  /**
   * Get a single meeting's full result. Requires Authorization Bearer token.
   */
  async getMeeting(meetingId: string, token?: string): Promise<PipelineProcessResult> {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/api/meetings/${meetingId}`, {
      headers
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const err = new Error(errBody.detail || `Failed to fetch meeting: ${response.status}`);
      (err as any).status = response.status;
      throw err;
    }
    return await response.json();
  },

  /**
   * Upload an audio file with required password (min 8 chars).
   */
  async uploadAudio(
    file: File,
    config: PipelineConfig,
    password: string
  ): Promise<UploadMeetingResponse> {
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('password', password);
    formData.append('representationModel', config.representationModel);
    formData.append('asrModel', config.asrModel);
    formData.append('transformerModel', config.transformerModel);

    const response = await fetch(`${API_BASE}/api/meetings/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(
        errBody.detail || `Upload failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  },

  /**
   * Poll job status.
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await fetch(`${API_BASE}/api/jobs/${jobId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch job status: ${response.status}`);
    }
    return await response.json();
  },

  /**
   * Upload audio with required password and poll until completion.
   */
  async processAudioWithPolling(
    file: File,
    config: PipelineConfig,
    password: string,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<{ result: PipelineProcessResult; meetingId: string; adminToken: string; adminJwt: string }> {
    if (onProgress) onProgress('Uploading audio file...', 5);
    const uploadRes = await this.uploadAudio(file, config, password);

    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const status = await this.getJobStatus(uploadRes.jobId);

          if (onProgress) {
            onProgress(status.stage, status.progress);
          }

          if (status.status === 'completed' && status.result) {
            clearInterval(pollInterval);
            resolve({
              result: status.result,
              meetingId: uploadRes.meetingId,
              adminToken: uploadRes.adminToken,
              adminJwt: uploadRes.adminJwt || status.adminJwt || ''
            });
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            reject(new Error(status.error || 'Pipeline processing failed'));
          }
        } catch (err) {
          clearInterval(pollInterval);
          reject(err);
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(pollInterval);
        reject(new Error('Processing timed out after 10 minutes'));
      }, 600_000);
    });
  },

  /**
   * Admin endpoint: Delete meeting.
   */
  async deleteMeeting(meetingId: string, token: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.detail || 'Failed to delete meeting');
    }
  },

  /**
   * Admin endpoint: Change meeting password.
   */
  async changePassword(meetingId: string, newPassword: string, token: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/meetings/${meetingId}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ new_password: newPassword })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.detail || 'Failed to update meeting password');
    }
  },

  /**
   * Get dataset telemetry (AMI Meeting Corpus).
   */
  async getDatasetInfo() {
    const response = await fetch(`${API_BASE}/api/dataset`);
    if (!response.ok) {
      throw new Error(`Failed to fetch dataset info: ${response.status}`);
    }
    return await response.json();
  }
};
