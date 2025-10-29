# GymPlanner

> **MVP web application** for planning, executing, and tracking strength workouts with AI-powered personalized training plans.

## Table of Contents

1. [Project Description](#project-description)  
2. [Tech Stack](#tech-stack)  
3. [Getting Started](#getting-started)  
   3.1 [Prerequisites](#prerequisites)  
   3.2 [Installation](#installation)  
   3.3 [Configuration](#configuration)  
   3.4 [Running the App](#running-the-app)  
4. [Available Scripts](#available-scripts)  
5. [Project Scope](#project-scope)  
   5.1 [In-Scope Features](#in-scope-features)  
   5.2 [Out-of-Scope](#out-of-scope)  
6. [Project Status](#project-status)  
7. [License](#license)  

## Project Description

GymPlanner is an MVP web application designed to simplify the process of planning, executing, and tracking strength-training workouts. It enables users to:

- Generate AI-personalized training plans based on goals, training systems (e.g., PPL, FBW), available days, session duration, cycle length, and notes.
- Create and edit training plans from scratch (days, exercises, sets, reps, rest).
- Execute “live” workouts with checkboxes for sets, input actual weights/reps, and control rest timers with notifications.
- Automatically save completed sessions to history and review progress.
- Generate next-cycle progression plans via AI analysis or continue an existing plan unchanged.

## Tech Stack

- **Frontend**:  
  - Astro 5  
  - React 19 (interactive components)  
  - TypeScript 5  
  - Tailwind CSS 4  
  - shadcn/ui  

- **Backend & Services**:  
  - Supabase (PostgreSQL, Auth)  
  - Openrouter.ai (AI model providers & API cost limits)  

- **CI/CD & Hosting**:  
  - GitHub Actions  
  - Docker & DigitalOcean  

## Getting Started

### Prerequisites

- Node.js v22.14.0 (see [`.nvmrc`](.nvmrc))  
- npm (or yarn)  
- Supabase account & project  
- Openrouter.ai API key  

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ai-gym-planner.git
cd ai-gym-planner

# Install dependencies
npm install
```

### Configuration

Create a `.env` file in the project root with the following variables (example names):

```dotenv
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
OPENROUTER_API_KEY=your-openrouter-api-key
```

> **Note**: Add any additional environment variables required by your setup.

### Running the App

```bash
npm run dev
```

Visit `http://localhost:3000` (or the port shown) to view the application.

## Available Scripts

In the project directory, you can run:

| Command           | Description                 |
| ----------------- | --------------------------- |
| `npm run dev`     | Start Astro dev server      |
| `npm run build`   | Build for production        |
| `npm run preview` | Preview production build    |
| `npm run astro`   | Astro CLI                   |
| `npm run lint`    | Run ESLint                  |
| `npm run lint:fix`| Run ESLint with `--fix`     |
| `npm run format`  | Run Prettier to format code |

## Project Scope

### In-Scope Features

- **User Auth**: Email/password registration, login, logout (Supabase).  
- **AI Plan Generation**: Form-driven plan creation and on-screen editing.  
- **Manual Plan Builder**: Create days, exercises, sets, reps, rest.  
- **Plan Management**: List, edit, delete saved plans.  
- **Workout Execution**: Mark completed sets, record actuals, use rest timer with notifications, end session and save to history.  
- **History & Progression**: Chronological workout log; AI-driven next-cycle suggestions or plan continuation.

### Out-of-Scope (MVP Boundaries)

- Advanced statistics & graphical analysis  
- Import/export (PDF, CSV)  
- Social or plan-sharing features  
- Dedicated mobile app (responsive web only)  
- Integrations with external fitness devices or apps  
- Built-in exercise library with videos/descriptions  

## Project Status

**MVP / Alpha** – Actively in development. Core features implemented; polish and testing ongoing.

## License

MIT
