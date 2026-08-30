# 🏙️ KopargaonPriority: Resource-Constrained Civic Decision Engine

![React](https://img.shields.io/badge/react-19.0.0-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-Backend-green?style=for-the-badge&logo=nodedotjs)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![Leaflet](https://img.shields.io/badge/Leaflet-GIS_Mapping-199900?style=for-the-badge&logo=leaflet)

**KopargaonPriority** is a resource-constrained decision and response platform built for the Kopargaon Municipal Council. This repository represents **Part B** of Team UrbanLoop's submission for the Smart Kopargaon Hackathon 2026.

While traditional civic systems merely log complaints, KopargaonPriority acts as an intelligent municipal brain. It helps authorities make defensible decisions about what gets acted on, when, and with which limited resources, maximizing the civic ROI for every taxpayer rupee and crew-hour.

---

## ✨ Key Technical Features

### 🧠 Two-Stage Knapsack Allocation Engine
Greedy algorithms fail when faced with dual constraints (budget + time). We implemented a multi-dimensional **0/1 Knapsack Algorithm** to mathematically maximize the cumulative "urgency score" of selected civic issues without exceeding the municipal cycle's budget or crew-hour limits.

### 🏛️ Algorithmic Overrides (Bulletproof Governance)
Real-world governance requires human flexibility. Our **Two-Stage Pipeline** allows authorized municipal admins to mandate specific issues (Stage 1). The algorithm deducts their costs first, then optimizes the remaining budget against the remaining non-overridden issues (Stage 2)—ensuring zero rank collisions and maintaining absolute systemic stability.

### 🗺️ Spatial Intelligence GIS Dashboard
Integrated **OpenStreetMap (Leaflet)** web map visually plots all civic issues. The system dynamically renders color-coded markers based on the AI-calculated urgency score, allowing municipal officers to visually identify critical hazard clusters (e.g., deep red for safety risks) instantly.

### 🛡️ AI Pre-Screening & Fail-Open Architecture
Leverages the Gemini AI API to filter spam and validate incoming citizen complaints. Designed with a strict "fail-open" heuristic: if the AI proxy drops, the issue is safely ingested and flagged for manual review rather than blocking citizen voices.

---

## 🚀 Local Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas (or local MongoDB instance)

### 1. Clone the Repository
```bash
git clone https://github.com/maheshsb-built3545/civicB.git
cd civicB
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory (refer to `.env.example`):
```env
PORT=3000
MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.mongodb.net/?appName=Cluster0"
GEMINI_API_KEY="your_gemini_api_key"
JWT_SECRET="your_jwt_secret"
SEED_ADMIN_PASSWORD="KopargaonAdmin2026!Pass"
SEED_OFFICER_PASSWORD="KopargaonOfficer2026!Pass"
```

### 4. Seed Initial Accounts & Mock Data
```bash
npx tsx src/server/seed.ts
```

### 5. Start Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to access the platform.

---

## 🧪 Integration Testing & Automated Verification
Run the backend lifecycle verification suite:
```bash
node test-api.js
```

---

## 🛡️ License
Built for the Smart Kopargaon Hackathon 2026 by Team UrbanLoop.
