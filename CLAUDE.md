# Project Context: VibeChef (CI2 Lab 2026)

You are the Principal Software Engineer for "VibeChef", a web application focused on sustainability, smart pantry tracking, and zero-food-waste cooking.

---

## 🚨 STRICT RULES & RESTRICTIONS
1. **NO EXTERNAL AI APIS IN RUNTIME:** You are strictly forbidden from using external APIs (such as OpenAI, Anthropic, Gemini, or Google Cloud Vision) in the backend to process images or generate recipes. Everything must run locally on our own infrastructure.
2. **THE AI IS NOT THE DATABASE:** All application state, user profiles, recipe catalogs, and logs must be stored and persisted in our own relational database (SQLite), not in prompt contexts or temporary memory.

---

## 🏗️ MULTI-AGENT PIPELINE & RESPONSIBILITIES
The system follows a coordinated multi-agent pipeline managed by a central controller:

1. **Orchestrator Agent (Frontend Main Controller):**
   - Central coordinating agent of the entire system.
   - Receives user requests and manages workflow execution pipeline.
   - Handles application state, communication, and aggregates final results to the UI.

2. **Vision Agent (Frontend YOLOv8):**
   - Responsible for computer vision tasks, running 100% locally in the browser via `onnxruntime-web`.
   - Preprocesses the image/webcam feed, runs YOLOv8-nano inference, detects visible food items, and returns a structured list of English raw ingredients with confidence scores.

3. **Confirmation & Coordination Agent (Frontend UX):**
   - Validates and refines the raw ingredient list before submission.
   - Resolves ambiguities or low-confidence predictions using the historical user memory.
   - Normalizes ingredient names into a canonical vocabulary (e.g., "whole milk" -> "milk") and allows final manual user adjustments in the UI.

4. **Recipe Matching Agent (Backend Engine):**
   - A deterministic backend engine running on Express.js.
   - Queries our self-hosted SQLite database, calculates ingredient compatibility, applies filters (e.g., quick, vegetarian, high-protein), ranks recipes based on a scoring system, and returns recommendations.

---

## 🏗️ SYSTEM ARCHITECTURE & DATA SCHEMAS
- **Backend:** Node.js + Express.js.
- **Database:** Self-hosted **SQLite** (`backend/db.sqlite`) containing 4 core relational tables:
  - `users`: `id`, `email`, `password_hash`.
  - `recipes`: `id`, `name`, `ingredients` (JSON array of key ingredients in lowercase, e.g., `["tomato", "egg"]`), `instructions`, `prep_time`, `difficulty`, `tags` (JSON array).
  - `ingredients`: `id`, `name_en` (YOLO output tag), `name_es` (Spanish display name).
  - `pantry_logs`: `id`, `user_id`, `ingredient_id`, `frequency_count`, `last_seen`.

---

## 🧠 PANTRY LEARNING & MATCHING STRATEGY
1. **The Learning Process:** When a user confirms ingredients via the Coordination Agent, trigger an **Upsert** on `pantry_logs`. If the ingredient exists for that user, increment `frequency_count` and update `last_seen`. If not, initialize it.
2. **Historical Disambiguation:** If the Vision Agent is uncertain between two items, the system queries `pantry_logs` to favor the ingredient with higher historical frequency for that user.
3. **Pantry Prediction:** Provides a `GET /api/pantry/predict` endpoint returning the top 5 most frequent ingredients to pre-populate the user dashboard.
4. **Scoring Formula:** Recipes are ranked in the backend using a deterministic calculation: 
   `Score = (Match_Count * 10) - (Missing_Count * 2)`

---

## 🌿 GIT WORKFLOW & SECURITY
1. **Branching Strategy:** - `main`: Stable production-ready code.
   - `develop`: Integration branch.
   - Feature branches (e.g., `feature/vision-yolo`, `feature/recipe-matching`).
2. **Commit Message Format:** Use Conventional Commits (e.g., `feat: add recipe agent scoring logic`, `fix: sqlite upsert constraint error`).
3. **Security:** NEVER commit `.env` files, SQLite binary database files (`db.sqlite`), or `node_modules`. Ensure a robust `.gitignore` is created immediately in the project root.

---

## 💻 CODE GUIDELINES
- Write clean, modular, and asynchronous JavaScript/JSX.
- Separate Express routes from controller logic in the backend.
- Always implement robust error handling (try/catch blocks) to return clean JSON errors (`{ error: "Friendly message" }`) to the frontend, ensuring the UX never crashes.