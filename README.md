<p align="center">
  <h1 align="center">PhishGuard</h1>
  <p align="center">
    <strong>Enterprise Phishing Simulation & Security Awareness Platform</strong>
  </p>
  <p align="center">
    A full-stack platform for conducting controlled phishing simulations, tracking user behavior, assessing organizational risk, and delivering targeted security awareness training.
  </p>
</p>

<p align="center">
  <a href="#features">Features</a> &nbsp;&bull;&nbsp;
  <a href="#architecture">Architecture</a> &nbsp;&bull;&nbsp;
  <a href="#getting-started">Getting Started</a> &nbsp;&bull;&nbsp;
  <a href="#usage">Usage</a> &nbsp;&bull;&nbsp;
  <a href="#api-reference">API Reference</a> &nbsp;&bull;&nbsp;
  <a href="#troubleshooting">Troubleshooting</a>
</p>

---

## Overview

PhishGuard empowers security teams to proactively assess and improve their organization's resilience against phishing attacks. By simulating real-world phishing scenarios in a controlled environment, the platform identifies vulnerable users and provides data-driven training recommendations — powered by an optional machine learning engine.

> **Disclaimer:** This software is intended strictly for authorized security awareness testing. Unauthorized use against individuals or organizations without explicit consent is illegal and unethical.

---

## Features

| Category | Capability |
|---|---|
| **Campaign Management** | Create, schedule, and manage phishing campaigns targeting specific user groups |
| **Email Delivery** | Send customizable phishing emails via SMTP with HTML template support |
| **Behavioral Tracking** | Track email opens and link clicks with pixel and redirect-based tracking |
| **Risk Scoring** | Compute per-user risk scores based on historical interaction data |
| **ML-Powered Analysis** | Predict training needs using a scikit-learn classification model (optional) |
| **Training Recommendations** | Generate personalized security training plans per user |
| **Scheduled Campaigns** | Automate recurring campaigns with cron-based scheduling |
| **Analytics Dashboard** | Visualize campaign performance, risk distribution, and training progress |
| **Export & Reporting** | Export reports in PDF and CSV formats |
| **JWT Authentication** | Secure admin access with token-based authentication |
| **Rate Limiting** | Protect API endpoints with configurable rate limiting |
| **Caching** | In-memory and Redis-based caching for improved performance |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PhishGuard Platform                      │
├──────────────┬──────────────────┬──────────────┬────────────────┤
│   Frontend   │     Backend      │  ML Service  │   Data Layer   │
│              │                  │  (Optional)  │                │
│  React 18    │  Node.js/Express │  Flask       │  MongoDB       │
│  Chart.js    │  Nodemailer      │  scikit-learn│  Redis (opt.)  │
│  React Router│  Bull Queue      │  pandas      │                │
│  Axios       │  JWT Auth        │  numpy       │                │
│              │  node-cron       │              │                │
│  :3000       │  :5000           │  :8000       │  :27017/:6379  │
└──────────────┴──────────────────┴──────────────┴────────────────┘
```

### Tech Stack

**Backend** — Node.js, Express, Mongoose, Nodemailer, Bull (job queue), JWT, bcryptjs, node-cron, node-cache, express-rate-limit, PDFKit, json2csv

**Frontend** — React 18, React Router v6, Axios, Chart.js, react-chartjs-2

**ML Service** — Python 3.8+, Flask, scikit-learn, pandas, numpy, joblib

**Infrastructure** — MongoDB 4.4+, Redis (optional)

---

## Getting Started

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | v14+ |
| MongoDB | v4.4+ |
| Python | 3.8+ (only for ML service) |
| Redis | Latest (optional) |

### Installation

**1. Clone the repository**

```bash
git clone <repository-url>
cd cyberSecurityProject
```

**2. Install backend dependencies**

```bash
npm install
```

**3. Install frontend dependencies**

```bash
cd frontend
npm install
cd ..
```

**4. Set up ML service (optional)**

```bash
cd ml-service
python3 -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

**5. Configure environment variables**

Copy the example environment file and update it with your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/phishing-sim

# Server
PORT=5000
NODE_ENV=development

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Application URLs
FRONTEND_URL=http://localhost:3000
TRACKING_URL=http://localhost:5000

# Authentication
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=7d

# ML Service (Optional)
ML_SERVICE_URL=http://localhost:8000
ML_SERVICE_API_KEY=your-ml-service-api-key
ML_SERVICE_TIMEOUT=10000

# Redis (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

> **Note:** If using Gmail, you must generate an [App Password](https://support.google.com/accounts/answer/185833) instead of your account password.

---

## Usage

### Starting the Services

Start each service in a separate terminal window:

| Terminal | Service | Command | URL |
|---|---|---|---|
| 1 | MongoDB | `mongod` or `docker run -d -p 27017:27017 --name mongodb mongo` | `localhost:27017` |
| 2 | ML Service (opt.) | `cd ml-service && source venv/bin/activate && python app.py` | `localhost:8000` |
| 3 | Backend | `npm start` (or `npm run dev` for hot-reload) | `localhost:5000` |
| 4 | Frontend | `cd frontend && npm start` | `localhost:3000` |

**Quick start without ML service:**

```bash
# Terminal 1
npm start

# Terminal 2
cd frontend && npm start
```

**Full-stack development mode:**

```bash
npm run dev:full
```

### Initial Setup

1. Navigate to `http://localhost:3000`
2. On first launch, a registration form will appear — create your admin account
3. Log in with your credentials to access the dashboard

> Only one admin account can be registered. Subsequent admin accounts must be created through the database.

### Workflow

1. **Add Users** — Navigate to the Users tab and add target users with name, email, and group
2. **Create Campaign** — Go to Campaigns, configure the email subject, body (HTML supported), and select a template
3. **Launch Campaign** — Click Send on the campaign card and confirm delivery
4. **Monitor Results** — View real-time tracking data in the Reports tab
5. **Analyze Risk** — Check per-user risk scores and identify high-risk individuals
6. **Assign Training** — Review ML-powered training recommendations and track completion

---

## API Reference

All endpoints (except Auth) require a valid JWT token in the `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register initial admin account |
| `POST` | `/api/auth/login` | Authenticate and receive JWT token |
| `GET` | `/api/auth/me` | Get current user profile |
| `GET` | `/api/auth/check` | Check if admin account exists |

### Users

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create a new user |
| `DELETE` | `/api/users/:id` | Delete a user |

### Campaigns

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/campaigns` | List all campaigns |
| `POST` | `/api/campaigns` | Create a new campaign |
| `GET` | `/api/campaigns/:id` | Get campaign details |
| `POST` | `/api/campaigns/:id/send` | Send campaign emails |

### Reports

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/reports` | Get aggregated report data |
| `GET` | `/api/reports/:campaignId` | Get campaign-specific report |
| `GET` | `/api/reports/:campaignId/events` | Get detailed event log |

### Risk Analysis

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/risk-analysis/users` | List users ranked by risk score |
| `GET` | `/api/risk-analysis/user/:userId` | Get individual risk analysis |
| `GET` | `/api/risk-analysis/campaign/:campaignId` | Get campaign risk analysis |
| `POST` | `/api/risk-analysis/calculate` | Trigger risk score recalculation |

### Training

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/training/needs/user/:userId` | Get user training needs |
| `GET` | `/api/training/needs/campaign/:campaignId` | Get campaign-based training needs |
| `GET` | `/api/training/recommendations/:userId` | Get personalized recommendations |
| `GET` | `/api/training/content` | List training content library |
| `POST` | `/api/training/complete` | Mark training as completed |

### Tracking

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/track/open/:campaignId/:userId` | Record email open event |
| `GET` | `/track/click/:campaignId/:userId/:linkId` | Record link click event |

---

## Project Structure

```
cyberSecurityProject/
├── backend/
│   ├── config/          # Database configuration
│   ├── middleware/       # Authentication middleware
│   ├── models/           # Mongoose schemas (User, Campaign, Event, etc.)
│   ├── routes/           # Express route handlers
│   ├── services/         # Business logic (email, risk analysis, caching, etc.)
│   ├── workers/          # Background job workers
│   └── server.js         # Application entry point
├── frontend/
│   ├── public/           # Static assets
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── context/      # React context (AuthContext)
│       ├── data/         # Email templates
│       ├── pages/        # Page components (Dashboard, Campaigns, Reports, etc.)
│       └── services/     # API client
├── ml-service/
│   ├── config/           # ML service configuration
│   ├── data/             # Training data and preprocessing
│   ├── models/           # ML model definitions and artifacts
│   ├── training/         # Model training scripts
│   └── app.py            # Flask application entry point
├── .env.example          # Environment variable template
├── package.json          # Backend dependencies
└── README.md
```

---

## Troubleshooting

### MongoDB connection failure

```bash
# Verify MongoDB is running
sudo systemctl status mongod

# Or start via Docker
docker run -d -p 27017:27017 --name mongodb mongo
```

### SMTP delivery errors

- Verify SMTP credentials in `.env`
- For Gmail: use an [App Password](https://support.google.com/accounts/answer/185833), not your account password
- Check that your SMTP host and port are correct
- Ensure your network allows outbound SMTP traffic

### Port already in use

```bash
# macOS / Linux
lsof -ti:5000 | xargs kill -9   # Backend
lsof -ti:3000 | xargs kill -9   # Frontend
lsof -ti:8000 | xargs kill -9   # ML Service

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### ML service connection issues

The system operates in fallback mode (rule-based recommendations) when the ML service is unavailable. To debug:

- Verify `ML_SERVICE_URL` in `.env` matches the running ML service address
- Ensure the Python virtual environment is activated
- Check ML service logs: `cd ml-service && python app.py`

### Python / ML dependency errors

```bash
python3 --version              # Requires 3.8+
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

## Security Considerations

- Never expose `.env` files or commit them to version control
- Rotate `JWT_SECRET` periodically in production environments
- Use HTTPS in production for all tracking URLs
- Restrict SMTP credentials with least-privilege access
- Ensure all simulation targets have provided explicit consent
- Separate test data from production environments

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

This project is for educational and authorized security testing purposes only. For commercial licensing inquiries, please get in touch.

---

<p align="center">
  <sub>Built for security teams who believe prevention starts with awareness.</sub>
</p>
