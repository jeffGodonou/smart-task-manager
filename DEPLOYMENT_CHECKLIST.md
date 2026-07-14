# Smart Task Manager Deployment Checklist

Updated: 2026-07-14

## Current Status Snapshot

- [x] Render deployment config exists for backend in render.yaml
- [x] Backend start command points to built artifact target/backend.jar
- [x] Backend can read PORT from environment (Render-compatible)
- [x] Frontend has SPA rewrite config for Vercel
- [x] Frontend API base URL is environment-variable based (VITE_API_URL)
- [x] CORS headers exist for backend API endpoints
- [x] target/ and dist/ are ignored by git
- [x] JavaFX Windows-specific classifier lock removed from pom.xml
- [ ] Frontend production environment variable not yet documented for Vercel project settings
- [ ] Deployment flow is not documented as an execution checklist in README
- [ ] GitHub Actions CI/CD workflow files are not present in this repository

## Phase A: Fix portability before deployment

### A1. Remove Windows-only JavaFX classifier (required)

- [x] In pom.xml, remove the javafx.platform property
- [x] In pom.xml, remove classifier entries under:
  - javafx-controls
  - javafx-fxml
  - javafx-graphics
- [x] Run local verification:
  - ./mvnw package -DskipTests
- [x] Confirm target/backend.jar is produced

Note:
- On Windows, ./mvnw clean package -DskipTests can fail if a file lock prevents deleting target/. If this happens, close any process using target/ and rerun clean, or run ./mvnw package -DskipTests for verification.

Success criteria:
- Build works without platform-locked JavaFX classifier entries.

## Phase B: Backend deploy on Render

### B1. Render service setup

- [ ] Create Render Web Service linked to repo root
- [ ] Configure:
  - Build command: ./mvnw clean package -DskipTests
  - Start command: java -jar target/backend.jar
- [ ] Add required environment variables in Render dashboard:
  - PORT (Render injects this automatically, keep app support)
  - JWT or any secrets used by your backend
- [ ] Trigger first deployment

### B2. Backend validation

- [ ] Open deployed backend URL
- [ ] Test auth endpoints:
  - POST /api/auth/register
  - POST /api/auth/login
- [ ] Test tasks endpoint with bearer token

Success criteria:
- API is reachable at https://<render-app>.onrender.com and endpoints respond correctly.

## Phase C: Frontend deploy on Vercel

### C1. Vercel project setup

- [ ] Import frontend project from folder frontend/frontend
- [ ] Framework preset should auto-detect Vite
- [ ] Set environment variable in Vercel:
  - VITE_API_URL = https://<render-app>.onrender.com

Important:
- Do not use REACT_APP_API_URL for this project; code uses Vite env naming (VITE_*).

### C2. Frontend validation

- [ ] Deploy and open Vercel URL
- [ ] Register/login from UI
- [ ] Create/update/delete task from UI
- [ ] Confirm browser network calls target Render URL (not localhost)

Success criteria:
- Frontend is fully functional against deployed backend.

## Phase D: Hardening and polish

### D1. CORS tightening

- [ ] Replace wildcard Access-Control-Allow-Origin (*) with your Vercel domain in production
- [ ] Keep local dev origin support if needed

### D2. Repo hygiene

- [ ] Ensure no secrets are committed
- [ ] Add deployment section to README with both URLs
- [ ] Add quick smoke-test section for post-deploy checks

### D3. Optional CI/CD

- [ ] Add GitHub Actions workflow for backend build/test
- [ ] Add frontend build/lint workflow

## Phase E: Desktop packaging track (optional, separate from web deploy)

This is independent from Render/Vercel and can be done after web deployment is stable.

### E1. Package app

- [ ] Build artifact:
  - ./mvnw clean package
- [ ] Run jpackage for installer generation
- [ ] Confirm installer starts app correctly

### E2. GitHub Releases

- [ ] Draft release (v1.0.0)
- [ ] Upload installer artifact from dist/
- [ ] Add release notes and screenshots

## Order of Execution (recommended)

1. A1 (remove JavaFX classifier lock)
2. B1-B2 (deploy and verify backend)
3. C1-C2 (deploy and verify frontend)
4. D1-D3 (tighten CORS, docs, CI)
5. E1-E2 (optional desktop installer/release)

## Quick Go/No-Go Gate Before Going Live

- [ ] Backend deployed and auth tested
- [ ] Frontend deployed with VITE_API_URL set
- [ ] No localhost API calls in production
- [ ] CORS restricted to production frontend domain
- [ ] No secrets in repository history
