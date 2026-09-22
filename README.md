# 🎙️ Enterprise AI Meeting Assistant

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://share.streamlit.io)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An end-to-end neural meeting intelligence platform combining **acoustic feature representation learning**, **automatic speech recognition (Whisper)**, **instruction-tuned NLP reasoning (FLAN-T5)**, and **access-controlled meeting analytics**.

---

## 🚀 Key Features

* **🎨 Interactive Streamlit Application (`streamlit_app.py`)**:
  * **📊 Real-time Dashboard**: Live telemetry, active models, meeting sessions, and quality metrics (WER, BERTScore, ROUGE-L).
  * **🎙️ Audio Ingestion & Model Config**: Upload audio files (`.wav`, `.mp3`, `.m4a`) or select benchmark slices from the **Edinburgh AMI Meeting Corpus** (`ES2002a`, `IS1001a`, `EN2001a`).
  * **🔒 Access Control**: Required per-meeting password protection (8+ chars) with access tokens.
  * **📈 Spectrogram Analysis**: Interactive **Plotly Heatmaps** for Original Log-Mel Spectrograms, Latent Reconstruction (Autoencoder / VAE), and Residual Error diffs with PSNR, SSIM, and MSE metrics.
  * **📝 7-Tab Analysis**: Full timestamped diarized transcript, executive summary, ratified decisions, action items tracker with completion toggles, key points, spectrogram metrics, and model evaluation.
  * **📥 Exporting**: One-click download of full JSON analysis package and Markdown executive reports.
* **🧠 Neural Audio Pipeline**:
  * **Log-Mel Spectrogram Extraction**: Standardized to 16,000 Hz, 64 Mel-filterbanks × 128 time frames.
  * **Latent Space Compression**: Custom-trained **Autoencoder (AE)** (MSE 0.00293, PSNR 25.34 dB) and **Variational Autoencoder (VAE)** (beta=0.6 KL regularization).
  * **Speech-to-Text**: `openai/whisper-small` (0.000 WER on AMI benchmark test split).
  * **Structured Summarization**: `google/flan-t5-base` (0.8641 BERTScore, 48.6% ROUGE-L).

---

## 🏗️ Neural Pipeline Topology

```
[ Raw Audio (.wav/.mp3) ]
       │
       ▼ (16kHz Resampling & STFT Filterbanks)
[ Log-Mel Spectrogram Matrix (64 mels × 128 frames) ]
       │
       ├──► [ Autoencoder / VAE Latent Bottleneck (256-dim) ]
       │        └──► Reconstruction Fidelity (PSNR: 25.3 dB, SSIM: 0.974)
       ▼
[ OpenAI Whisper ASR (Speech-to-Text) ]
       │        └──► Word Error Rate (WER: 0.000 on AMI benchmark test)
       ▼
[ Google FLAN-T5 NLP (Reasoning & Extraction) ]
       │        └──► Executive Summary, Decisions, Action Items (BERTScore: 0.864)
       ▼
[ Access Control Gate (Password Protection & Token Auth) ]
       │
       ▼
[ Streamlit Web Application ]
```

---

## ⚡ Quick Start: Running with Streamlit

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Launch Streamlit App
```bash
streamlit run streamlit_app.py
```
Open [http://localhost:8501](http://localhost:8501) in your browser.

---

## ☁️ Deploying on Streamlit Community Cloud (Free)

1. Fork or push this repository to your GitHub account.
2. Go to **[share.streamlit.io](https://share.streamlit.io)** and sign in with GitHub.
3. Click **"New app"**, select:
   * **Repository**: `samadhanmane/meeting-assistant`
   * **Branch**: `main`
   * **Main file path**: `streamlit_app.py`
4. Click **"Deploy!"**.

---

## 🔬 Model Evaluation & Checkpoints

| Model | Architecture | Checkpoint | Latency | Key Metric |
|---|---|---|---|---|
| **Autoencoder (AE)** | Conv2d(1→32→64→128) + FC(256) | `checkpoints/autoencoder.pt` | 14 ms | **PSNR: 25.34 dB**, MSE: 0.00293 |
| **VAE** | Conv2d → Latent Prior $\mathcal{N}(0, I)$ | `checkpoints/vae.pt` | 28 ms | **KL Div: 36.22 nats**, PSNR: 21.24 dB |
| **Whisper Small** | Seq2Seq Multilingual ASR | `openai/whisper-small` | ~1.2 s | **WER: 0.000**, CER: 0.000 |
| **FLAN-T5 Base** | Instruction-Tuned Transformer | `google/flan-t5-base` | ~1.8 s | **BERTScore: 0.8641**, ROUGE-L: 48.6% |

---

## 📁 Repository Structure

```
meeting-assistant/
├── streamlit_app.py          # Complete Streamlit cloud application
├── requirements.txt          # Python dependencies for Streamlit Cloud
├── packages.txt              # System apt packages (ffmpeg, libsndfile1)
├── autoencoder.py            # PyTorch Autoencoder architecture
├── vae.py                    # PyTorch Variational Autoencoder architecture
├── preprocessing.py          # Audio preprocessing and Mel-spectrogram extraction
├── transformer_pipeline.py   # Whisper + FLAN-T5 pipeline
├── checkpoints/              # Pretrained model weights
│   ├── autoencoder.pt        # Trained AE weights
│   └── vae.pt                # Trained VAE weights
├── samples/                  # AMI Corpus sample meeting audio
├── app/                      # FastAPI backend service
│   ├── main.py               # REST API & access control
│   └── pipeline/             # Audio, transcriber, summarizer modules
└── frontend/                 # React + Vite web application
```

---

## 📄 License
This project is licensed under the MIT License.
