# 🧠 NovaMind: AI Cognitive Workflow Assistant

NovaMind is an intelligent co-pilot designed to reduce cognitive overload by transforming scattered notes, images, and documents into structured, actionable intelligence.

## 🚀 Key Features

- **Multimodal Intelligence**: Processes text, images (typed/handwritten), and PDFs using **Llama 4 Vision via Groq**.
- **Interactive Notifications**: Real-time system-level alerts with "Mark as Done" actions that work even when the site is closed.
- **Context-Aware Automation**: Automatically predicts deadlines (e.g., "in 2 minutes") and drafts proactive emails or actions.
- **Semantic Knowledge Linking**: Visualizes connections between tasks and notes through an interactive knowledge map.
- **AI Agent (Auto-Plan)**: Breaks down high-level goals into manageable sub-tasks.

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Service Workers (for background sync).
- **Backend**: FastAPI (Python), SQLAlchemy, SQLite.
- **AI Engine**: Groq Cloud (Llama 3.3 70B & Llama 4 Scout Vision).

## 🏃 How to Run

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd "SGU hackathon"
   ```

2. **Backend Setup**:
   - Navigate to `backend/`
   - Create a `.env` file and add your `GROQ_API_KEY`.
   - Install dependencies: `pip install -r requirements.txt`

3. **Frontend Setup**:
   - Navigate to `frontend/`
   - Install dependencies: `npm install`

4. **Run the Application**:
   - From the root directory, run the starter script:
     ```bash
     python start.py
     ```
   - Open `http://localhost:5173` in your browser.

## 🔔 Important
To use background notifications, please click the **"Enable Notifications"** button on the dashboard and allow permissions in your browser.
