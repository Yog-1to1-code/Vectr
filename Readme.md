# Vectr

**The AI-Powered Mentor for Open Source Contributors**

Vectr is an intelligent platform that bridges the gap between aspiring open-source contributors and complex project repositories. By leveraging Amazon Nova (via Amazon Bedrock), Vectr analyzes live GitHub issues and repository data to provide personalized, step-by-step guidance -- helping developers overcome the "first-contribution hurdle" in major open source projects.

---

## Table of Contents

- [The Problem](#the-problem)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Configuration Reference](#configuration-reference)
- [Deployment](#deployment)
- [Team](#team)
- [License](#license)

---

## The Problem

The jump from learning a programming language to contributing to a major project like Django or FastAPI is a "cold start" problem. Beginners face:

- **Information Overload** -- Struggling to parse long, technical issue threads with dozens of comments.
- **Directionless Coding** -- Having the skills to write code but not knowing which files to modify or where to start.
- **Friction for Maintainers** -- A high volume of low-quality pull requests from contributors who lacked proper guidance.

Vectr solves this by acting as an AI mentor that understands the codebase, the issue context, and the contributor's skill level.

---

## Features

- **AI Issue Summarization** -- Uses Amazon Nova to reason through GitHub issue context and produce a beginner-friendly breakdown of what needs to be done.
- **Technical Roadmaps** -- Generates high-level action plans for specific issues, suggesting relevant directories, files, and implementation logic.
- **Auto Draft PRs** -- AI-assisted pull request drafting with diff previews and commit analysis, so contributors can see exactly what changes are suggested.
- **Smart Code Guidance** -- Provides testing steps, code walkthroughs, and contextual hints tailored to the contributor's experience level.
- **Persistent Chat History** -- A stateful chat system backed by AWS RDS that supports deep, ongoing technical mentorship across sessions.
- **Live GitHub Integration** -- Securely fetches real-time repository data, issues, and pull requests using Personal Access Tokens (PAT).
- **Multi-Provider Authentication** -- Sign in with Google, GitHub, or email/password via Firebase Authentication.
- **Experience-Level Matching** -- Filters and recommends issues based on the contributor's self-reported skill level (Beginner, Intermediate, Expert).

---

## Tech Stack

| Layer          | Technology                                  |
|----------------|---------------------------------------------|
| AI / ML        | Amazon Bedrock (Nova 2 Lite)                |
| Backend        | FastAPI (Python)                            |
| Database       | AWS RDS (PostgreSQL) via SQLAlchemy         |
| Frontend       | React 19 + Vite, Tailwind CSS              |
| Authentication | Firebase Auth (Google, GitHub, Email)       |
| Infrastructure | Boto3 (AWS SDK), Docker, Nginx             |

---

## Project Structure

```
Vectr-FInal/
|
|-- backend/                    # FastAPI backend
|   |-- app/
|   |   |-- agents/             # AI agent modules (scout, mentor, architect, validator)
|   |   |-- core/               # App configuration
|   |   |-- routers/            # API route handlers
|   |   |   |-- auth.py         # User authentication (Google, GitHub, email)
|   |   |   |-- dashboard.py    # Dashboard data aggregation
|   |   |   |-- ask_nova.py     # Amazon Nova AI chat and summarization
|   |   |   |-- contribution_flow.py  # Issue selection and contribution workflow
|   |   |   |-- repos.py        # Repository and issue fetching
|   |   |   |-- progress.py     # User progress tracking
|   |   |   +-- PAT_auth.py     # GitHub PAT validation
|   |   |-- services/           # Business logic (AI service, GitHub service)
|   |   |-- utils/              # Helpers (AWS client, encryption, repo analyzer)
|   |   |-- schemas.py          # Pydantic request/response models
|   |   +-- main.py             # FastAPI application entry point
|   |-- database.py             # SQLAlchemy engine and session setup
|   |-- models.py               # ORM models (User, Contributions, Progress, Chat)
|   |-- tests/                  # Backend test suite
|   |-- Dockerfile
|   |-- .env.example
|   +-- requirements.txt
|
|-- frontend/
|   |-- vectr-app/              # React + Vite application
|   |   |-- src/
|   |   |   |-- components/     # Reusable UI components
|   |   |   |   |-- VectrLogo.jsx
|   |   |   |   |-- FeaturesSection.jsx
|   |   |   |   |-- NovaChat.jsx
|   |   |   |   |-- Sidebar.jsx
|   |   |   |   |-- ShapeGrid.jsx
|   |   |   |   +-- ...
|   |   |   |-- pages/          # Route-level page components
|   |   |   |   |-- LoginPage.jsx
|   |   |   |   |-- DashboardPage.jsx
|   |   |   |   |-- ContributePage.jsx
|   |   |   |   |-- IssueDashboardPage.jsx
|   |   |   |   |-- DraftPRPage.jsx
|   |   |   |   |-- PATPage.jsx
|   |   |   |   +-- SettingsPage.jsx
|   |   |   |-- config/         # Firebase configuration
|   |   |   |-- constants/      # App-wide constants and enums
|   |   |   |-- context/        # React context providers (Auth)
|   |   |   |-- services/       # API client (axios)
|   |   |   |-- lib/            # Utility functions
|   |   |   |-- index.css       # Global styles and design system
|   |   |   |-- App.jsx         # Root component with routing
|   |   |   +-- main.jsx        # Application entry point
|   |   |-- public/             # Static assets
|   |   |-- Dockerfile
|   |   |-- nginx.conf
|   |   +-- .env.example
|   +-- Vectr-Screens/          # Application screenshots
|
|-- docker-compose.yml          # Multi-container deployment
+-- .gitignore
```

---

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Node.js 18+ and npm
- AWS Account with Amazon Bedrock model access (Nova 2 Lite) enabled in `us-east-1`
- Firebase project with Authentication enabled (Google and GitHub providers)
- PostgreSQL database (AWS RDS or local)

### 1. Clone the Repository

```bash
git clone https://github.com/SnippyCodes/Vectr-FInal.git
cd Vectr-FInal
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory (see `.env.example`):

```
DB_PASSWORD=your_aws_rds_password
ENDPOINT=your_rds_endpoint
DB_NAME=postgres

AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

FIREBASE_API_KEY=your_firebase_api_key
ENCRYPTION_KEY=your_fernet_encryption_key
```

Start the backend server:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### 3. Frontend Setup

```bash
cd frontend/vectr-app
npm install
```

Create a `.env` file in `frontend/vectr-app/` (see `.env.example`):

```
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## Architecture

Vectr uses a modular API architecture. The React frontend communicates with specialized FastAPI routers through a centralized Axios client:

```
Browser (React + Vite)
    |
    v
FastAPI Backend
    |-- /user          Authentication (Google, GitHub, email sign-in)
    |-- /user/dashboard Dashboard data aggregation
    |-- /contribution   Issue discovery and contribution workflow
    |-- /repos          GitHub repository and issue fetching
    |-- /nova           AI hub connecting GitHub context to Amazon Bedrock
    |-- /progress       User progress persistence
    |
    v
Amazon Bedrock (Nova 2 Lite)   <-->   GitHub API   <-->   AWS RDS (PostgreSQL)
```

### Key Design Decisions

- **Firebase for Auth, Backend for Data** -- Firebase handles OAuth flows (Google, GitHub) and token verification. The backend validates Firebase ID tokens and manages user records in PostgreSQL.
- **PAT-Based GitHub Access** -- Users provide a GitHub Personal Access Token, which is encrypted (Fernet) and stored in RDS. This allows Vectr to fetch private repository data on the user's behalf.
- **Stateful AI Chat** -- Conversation history is persisted in PostgreSQL, enabling Amazon Nova to maintain context across sessions and provide increasingly relevant guidance.
- **Connection Pool Resilience** -- SQLAlchemy is configured with `pool_pre_ping` and `pool_recycle` to handle cloud database idle timeouts gracefully.

---

## Configuration Reference

### Backend Environment Variables

| Variable              | Description                                       |
|-----------------------|---------------------------------------------------|
| `DB_PASSWORD`         | PostgreSQL database password                      |
| `ENDPOINT`            | RDS endpoint hostname                             |
| `DB_NAME`             | Database name (default: `postgres`)               |
| `AWS_ACCESS_KEY_ID`   | AWS IAM access key for Bedrock                    |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key                              |
| `AWS_REGION`          | AWS region (default: `us-east-1`)                 |
| `FIREBASE_API_KEY`    | Firebase project API key for token verification   |
| `ENCRYPTION_KEY`      | Fernet key for encrypting GitHub PATs             |

### Frontend Environment Variables

| Variable                    | Description                          |
|-----------------------------|--------------------------------------|
| `VITE_API_URL`              | Backend API base URL                 |
| `VITE_FIREBASE_API_KEY`     | Firebase API key                     |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain                 |
| `VITE_FIREBASE_PROJECT_ID`  | Firebase project ID                  |
| `VITE_FIREBASE_APP_ID`      | Firebase app ID                      |

---

## Deployment

A `docker-compose.yml` is provided for containerized deployment:

```bash
docker-compose up --build
```

This starts both the backend (port 8000) and frontend (port 80 via Nginx) containers. Update the `VITE_API_URL` build argument in `docker-compose.yml` to point to your production backend URL.

---

## Team

- **Aaryan** ([@SnippyCodes](https://github.com/SnippyCodes)) -- Backend Architecture, AWS RDS Integration, AI Prompt Engineering
- **Yogesh** ([@Yog-1to1-code](https://github.com/Yog-1to1-code)) -- Frontend Development, PAT Authentication, UI/UX

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.

Built for the Amazon Nova AI Hackathon.