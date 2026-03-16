# 🚀 Vectr

**The AI-Powered Mentor for Open Source & GSoC Beginners.**

Vectr is an intelligent bridge between aspiring open-source contributors and complex project repositories. By leveraging **Amazon Nova 2 Lite**, Vectr analyzes live GitHub issues and repository data to provide beginners with personalized, step-by-step guidance, helping them overcome the "first-contribution hurdle" in major projects.

---

## 🧠 The Problem

The jump from learning a language to contributing to a major project like Django or FastAPI is a "cold start" problem. Beginners face:

- **Information Overload:** Struggling to parse long technical issue threads.
    
- **Directionless Coding:** Having the skills to code but not knowing which files to modify first.
    
- **Friction for Maintainers:** High volume of low-quality PRs due to lack of guidance.
    

## ✨ Features

- **AI Issue Summarization:** Uses **Amazon Nova 2 Lite** to reason through GitHub issue context and provide a beginner-friendly breakdown.
    
- **Technical Roadmaps:** Generates a high-level "Action Plan" for specific issues, suggesting relevant directories and logic.
    
- **Persistent Chat History:** A stateful chat system stored in **AWS RDS** that allows for deep, ongoing technical mentorship.
    
- **Live GitHub Integration:** Securely fetches real-time data from the GitHub API using Personal Access Tokens (PAT).
    

## 🛠️ Tech Stack

- **AI/ML:** Amazon Bedrock (**Nova 2 Lite**)
    
- **Backend:** FastAPI (Python)
    
- **Database:** AWS RDS (PostgreSQL)
    
- **Frontend:** React + Vite (Tailwind CSS)
    
- **Infrastructure:** Boto3 (AWS SDK)
    

---

## 🚀 Getting Started

### 1. Prerequisites

- Python 3.10+
    
- Node.js & npm
    
- AWS Account with **Amazon Bedrock** model access (Nova 2 Lite) enabled in `us-east-1`.
    

### 2. Backend Setup

Bash

```
cd backend
python -m venv .venv
source .venv/Scripts/activate  # On Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a `.env` file in the `backend` folder:

Code snippet

```
DB_USER=postgres
DB_PASSWORD=your_aws_rds_password
ENDPOINT=your_rds_endpoint
DB_NAME=postgres

AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
```

Run the server:

Bash

```
uvicorn app.main:app --reload
```

### 3. Frontend Setup

Bash

```
cd frontend/vectr-app
npm install
npm run dev
```

---

## 🏗️ Architecture

Vectr uses a modular API architecture. The frontend communicates with specialized FastAPI routers:

- `/auth`: Handles user registration and Google Sign-In.
    
- `/dashboard`: Orchestrates GitHub API calls for issue recommendations.
    
- `/ai`: The "Agentic" hub that connects GitHub context to **Amazon Bedrock**.
    

---

## 👥 Meet the Team

- **Aaryan ([@SnippyCodes](https://www.google.com/search?q=https://github.com/SnippyCodes&authuser=3))**: Backend Architecture, AWS RDS Integration, & AI Prompt Engineering.
    
- **Yogesh ([@Yog-1to1-code](https://github.com/Yog-1to1-code))**: Frontend Development, PAT Authentication, & UI/UX.
    

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](https://www.google.com/search?q=LICENSE&authuser=3) file for details.

_Built with ❤️ for the Amazon Nova AI Hackathon._