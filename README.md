# SecureSite Auditor AI: Intelligent Privacy Compliance & Risk Analysis Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Privacy](https://img.shields.io/badge/Privacy-First-blue.svg)]()
[![AI Powered](https://img.shields.io/badge/AI-Powered-ff69b4.svg)]()

> **An automated, AI-driven auditing framework designed to evaluate websites for tracking technologies, data privacy compliance (GDPR/CCPA/ePrivacy), and security vulnerabilities.**

---

## � Table of Contents
- [Abstract](#-abstract)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Installation & Setup](#-installation--setup)
- [Methodology](#-methodology)
- [API Reference](#-api-reference)
- [Roadmap](#-roadmap)

---

## 📝 Abstract

In an era of increasing digital surveillance and stringent data protection regulations, ensuring website privacy compliance is critical. **SecureSite Auditor AI** is a sophisticated scanning engine that automates the detection of third-party trackers, unauthorized cookies, and data leakage points. Leveraging **Headless Browser Automation (Puppeteer)** and **Large Language Models (Gemini/OpenAI)**, the system performs deep content analysis of privacy policies and cross-references them with actual site behavior to identify discrepancies and compliance risks.

---

## ✨ Key Features

- **🕷️ Deep Web Scanning**: Autonomous crawling of websites to detect cookies, local storage usage, and external script injections.
- **🤖 AI-Powered Analysis**: Utilizes LLMs to analyze privacy policies and generate risk scores based on heuristic discrepancies.
- **🛡️ Compliance Checks**: Automated validation against GDPR, CCPA, and ePrivacy Directive requirements.
- **📊 Interactive Dashboard**: Real-time visualization of risk scores, detected trackers, and historical audit reports.
- **🔌 Multi-Provider AI Support**: Seamlessly switch between **Google Gemini** and **OpenAI GPT-4** for analysis.
- **📉 Privacy Scoring Algorithm**: Proprietary scoring metric (0-100) based on cookie lifespan, tracker invasiveness, and policy clarity.

---

## 🏗️ System Architecture

The application follows a **Microservices-inspired Monorepo** architecture, separating the scanning engine, API gateway, and frontend visualization layer.

### High-Level Data Flow

1.  **User Request**: User submits a URL via the React Dashboard.
2.  **API Gateway**: NestJS backend validates the request and initiates a scan job.
3.  **Scanner Engine**: Puppeteer launches a headless browser to scrape DOM, capture network traffic, and extract cookies.
4.  **AI Analysis**: Extracted metadata and privacy policy text are sent to the AI Service (Gemini/OpenAI) for NLP-based risk assessment.
5.  **Persistence**: Results are stored in **SQLite** (via Prisma ORM) for historical tracking.
6.  **Visualization**: Frontend fetches analysis results and renders interactive charts.

---

## 💻 Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Tailwind CSS v4, Vite | High-performance, responsive UI with modern styling. |
| **Backend** | Node.js, NestJS | Scalable, modular server-side framework. |
| **Database** | SQLite, Prisma ORM | Lightweight, relational database with type-safe queries. |
| **Scanning** | Puppeteer, Cheerio | Headless browser automation and DOM parsing. |
| **AI / NLP** | Google Gemini SDK, OpenAI SDK | Intelligent text analysis and risk reasoning. |
| **DevOps** | Docker, Docker Compose | Containerization for consistent deployment. |

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js**: v18.17.0 or higher
- **npm**: v9.0.0 or higher
- **Git**: Version control

### 1. Clone the Repository
```bash
git clone https://github.com/sudeshsudhii/SecureSite-Auditor-AI.git
cd SecureSite-Auditor-AI
```

### 2. Install Dependencies
This project uses a monorepo structure. Install dependencies from the root:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (or update existing one) with the following keys:

```env
# Database
DATABASE_URL="file:./dev.db"

# AI Providers (At least one is required)
GEMINI_API_KEY="your_gemini_key_here"
OPENAI_API_KEY="your_openai_key_here"

# Security
JWT_SECRET="super-secret-key"
```

### 4. Database Migration
Initialize the SQLite database schema:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Running the Application

**Development Mode:**
```bash
# Start Backend (API) - Port 3000
npm run api:dev

# Start Frontend (Web) - Port 5173
npm run web:dev
```

Access the dashboard at `http://localhost:5173`.

---

## 🔬 Methodology

### Privacy Scoring Matrix
The **Privacy Score (0-100)** is calculated using a weighted average of three factors:

1.  **Tracker Count (40%)**: Normalized score based on the number of third-party domains and tracking cookies identified.
2.  **Policy Clarity (30%)**: AI-evaluated readability and specificity of the provided Privacy Policy.
3.  **Cookie Hygiene (30%)**: Assessment of cookie expiration times, `Secure` flags, and `SameSite` attributes.

### AI Analysis Workflow
The `AiService` constructs a structured prompt containing:
- Extracted Cookie Data (Names, Domains, Duration)
- Detected Third-Party Scripts
- Raw Privacy Policy Text

The LLM is instructed to act as a **Privacy Compliance Officer**, returning a structured JSON object with identified risks, a human-readable summary, and actionable remediation steps.

---

## 📡 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/scan` | Initiate a new privacy audit for a URL. |
| `GET` | `/api/scan/stats` | Retrieve aggregate statistics (Total Scans, High Risks). |
| `GET` | `/api/scan/:id` | Fetch detailed report for a specific scan ID. |

---

## 🗺️ Roadmap

- [ ] **PDF Report Generation**: Export audit results as professional PDF documents.
- [ ] **User Accounts**: Multi-user support with saved history and preferences.
- [ ] **Scheduled Scans**: cron-job based periodic auditing for continuous compliance.
- [ ] **Dark Web Monitoring**: Check if the domain has been involved in known data breaches.

---

