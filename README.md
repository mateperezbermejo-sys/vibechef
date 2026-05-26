# 🍳 VibeChef

> Zero food waste cooking — detect ingredients with your camera, get instant recipe recommendations.

VibeChef is a full-stack web app that uses a **locally-run YOLOv8-nano model** to detect food items from your webcam or photos, then matches them against a recipe database using a deterministic scoring engine. No external AI APIs. Everything runs on your own infrastructure.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER                            │
│                                                         │
│  ┌──────────────┐   ┌────────────────┐   ┌──────────┐  │
│  │ Vision Agent │──▶│ Confirmation   │──▶│ Recipes  │  │
│  │ YOLOv8-nano  │   │ Agent (UX)     │   │ Page     │  │
│  │ onnxruntime  │   │ ingredient     │   │          │  │
│  │ -web (WASM)  │   │ list + filters │   │          │  │
│  └──────────────┘   └───────┬────────┘   └──────────┘  │
└──────────────────────────────┼──────────────────────────┘
                               │ REST /api
┌──────────────────────────────▼──────────────────────────┐
│                    EXPRESS BACKEND                       │
│                                                         │
│   /api/auth     /api/pantry     /api/recipes/match      │
│       │               │                  │              │
│       └───────────────▼──────────────────┘              │
│                   SQLite DB                             │
│         users · recipes · ingredients · pantry_logs     │
└─────────────────────────────────────────────────────────┘
```

### Agents

| Agent | Where | Responsibility |
|-------|-------|----------------|
| **Vision Agent** | Browser (WASM) | Runs YOLOv8-nano inference locally, returns detected food items with confidence scores |
| **Confirmation Agent** | Browser (React) | Validates & normalizes the ingredient list, allows manual edits before submission |
| **Recipe Matching Agent** | Backend (Express) | Queries SQLite, scores recipes with `Score = (Match×10) - (Missing×2)`, applies filters |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + React Router |
| Vision | `onnxruntime-web/wasm` · YOLOv8n ONNX |
| Backend | Node.js 26 + Express |
| Database | SQLite via `node:sqlite` (built-in, no native deps) |
| Auth | JWT + bcrypt |

---

## Getting Started

### Prerequisites

- Node.js ≥ 22
- The YOLOv8n ONNX model file (see below)

### 1. Clone & install

```bash
git clone https://github.com/mateperezbermejo-sys/vibechef.git
cd vibechef

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Download the ONNX model

The model is not committed (binary, ~12 MB). Place it at:

```
frontend/public/models/yolov8n.onnx
```

Download with curl:

```bash
curl -L -o frontend/public/models/yolov8n.onnx \
  "https://huggingface.co/Kalray/yolov8/resolve/main/yolov8n.onnx"
```

### 3. Copy WASM runtime files

```bash
cp frontend/node_modules/onnxruntime-web/dist/ort-wasm-* frontend/public/ort-wasm/
```

### 4. Set up the database

```bash
cd backend
npm run setup   # runs migrate + seed
```

This creates `backend/db.sqlite` with 30 ingredients and 10 seeded recipes.

### 5. Run

```bash
# Terminal 1 — backend (port 3001)
cd backend && npm run dev

# Terminal 2 — frontend (port 5173)
cd frontend && npm run dev
```

Open **http://localhost:5173**.

---

## API Reference

### Auth

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | `{ email, password }` | Create account |
| `POST` | `/api/auth/login` | `{ email, password }` | Login, returns JWT |

### Pantry

> All pantry routes require `Authorization: Bearer <token>`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/pantry/log` | Upsert confirmed ingredients (increments frequency) |
| `GET` | `/api/pantry/predict` | Top-5 most frequent ingredients for the user |
| `GET` | `/api/pantry/history` | Full ingredient history |

### Recipes

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/api/recipes` | — | All recipes |
| `POST` | `/api/recipes/match` | `{ ingredients[], filters[] }` | Ranked recipe recommendations |

#### Scoring formula

```
Score = (Match_Count × 10) - (Missing_Count × 2)
```

#### Available filters

`vegetarian` · `vegan` · `quick` · `high-protein` · `healthy` · `spanish` · `italian`

---

## Vision Agent — How it works

1. **Load** — `yolov8n.onnx` is fetched from `/models/` and loaded into an `onnxruntime-web` WASM session (single-threaded, runs entirely in the browser).
2. **Preprocess** — the image/webcam frame is drawn onto a 640×640 offscreen canvas, converted to a CHW float32 tensor normalized to [0, 1].
3. **Inference** — the tensor is fed to the ONNX session. Output shape: `[1, 84, 8400]` (4 bbox coords + 80 COCO class scores × 8400 anchors).
4. **Postprocess** — confidence threshold (0.30) → NMS (IoU 0.45) → map COCO class to ingredient vocabulary.
5. **Confirm** — detected ingredients appear in the Confirmation Agent UI for manual review before submission.

### COCO → Ingredient mapping

| COCO class | Ingredient |
|-----------|-----------|
| banana, apple, orange | direct |
| broccoli, carrot | direct |
| sandwich | bread |
| hot dog, cow, sheep | beef |
| bird | chicken |
| bottle | milk |

---

## Database Schema

```sql
users        (id, email, password_hash, created_at)
ingredients  (id, name_en, name_es)
recipes      (id, name, ingredients JSON, instructions, prep_time, difficulty, tags JSON)
pantry_logs  (id, user_id, ingredient_id, frequency_count, last_seen)
             UNIQUE(user_id, ingredient_id)
```

---

## Project Structure

```
vibechef/
├── backend/
│   ├── server.js               # Express entry point
│   ├── db/
│   │   ├── database.js         # node:sqlite singleton
│   │   ├── migrate.js          # table creation
│   │   └── seed.js             # initial data
│   ├── controllers/            # business logic
│   ├── routes/                 # Express routers
│   └── middleware/auth.js      # JWT guard
└── frontend/
    ├── vite.config.js          # proxy + COEP/CORP headers + .mjs middleware
    ├── public/
    │   ├── models/             # yolov8n.onnx (not committed)
    │   └── ort-wasm/           # WASM runtime (not committed)
    └── src/
        ├── services/
        │   ├── api.js          # fetch client
        │   └── visionAgent.js  # ONNX pipeline (preprocess → infer → NMS)
        ├── components/
        │   ├── VisionScanner.jsx  # webcam + bounding box overlay
        │   ├── RecipeCard.jsx
        │   └── Navbar.jsx
        ├── pages/
        │   ├── DashboardPage.jsx  # pantry predictions
        │   ├── ScanPage.jsx       # confirmation agent
        │   ├── RecipesPage.jsx    # ranked results
        │   └── HistoryPage.jsx    # pantry history table
        └── context/AuthContext.jsx
```

---

## Rules

- **No external AI APIs at runtime.** YOLOv8 inference runs 100% in the browser via WASM. Recipe matching is a deterministic SQL query.
- **No state in prompts.** All application state lives in SQLite.
