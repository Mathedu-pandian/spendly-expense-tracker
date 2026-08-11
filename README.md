# ◈ Spendly — Personal Expense Tracker & Financial Analytics

> **Track every rupee. Understand your spending patterns. Own your financial future.**

Spendly is a lightweight, modern web application built with **Flask**, **SQLite**, and **Vanilla CSS/JS** designed to provide instant expense logging, deep multi-month inter-category analytics, custom time tracking, and automated AI financial advice.

---

## 🌟 Key Features

### 1. 💳 Full-Featured Expense Tracking
- Log transactions in seconds with amount (₹), category, date, and notes.
- Secure user registration and login with encrypted password hashing (`werkzeug.security`).
- Automatic 7-month sample data seeding for new user IDs to explore analytics instantly.

### 2. 🎯 Monthly Budget Plan & Progress Tracker
- Set custom monthly target budgets (e.g. **₹30,000 / month**).
- **Visual Budget Progress Bar**: Color-coded spending alerts:
  - 🟢 **Safe** (< 75% budget used)
  - 🟡 **Warning** (75% – 95% budget used)
  - 🔴 **Exceeded** (> 95% budget used)
- Real-time calculation of **Remaining Budget** and **Daily Spending Allowance**.

### 3. ⏱️ Custom Time Tracker & Range Filters
- Filter analytics and transaction history by custom date ranges (`start_date` to `end_date`).
- **4 Quick Presets**:
  - ⚡ Last 7 Days
  - ⚡ Last 30 Days
  - ⚡ Last 90 Days
  - ⚡ YTD 2026

### 4. 📊 Inter-Category Statistics Across Months
- Cross-category comparative matrix tracking monthly spending across 7 categories:
  - **Food**, **Bills**, **Transport**, **Health**, **Shopping**, **Entertainment**, **Other**.
- Calculates average monthly spend per category, peak spending months, and fastest-growing category (% MoM).

### 5. 🥧 Multi-Dimensional Analytics Dashboard
- **Category Pie Chart**: Visual percentage distribution of monthly expenses.
- **7-Axis Radar Spidergraph**: Multi-variable expenditure footprint visualization.
- **Monthly Spending Trends Bar Chart**: 7-month historical trend analysis.
- **Smart End-of-Month Advisory Report**: Automated insights highlighting primary spending drivers and tailored savings tips.

### 6. 🤖 AI Ecosystem Ready (MCP, RAG & Agent Skills)
- Ready for integration with **Model Context Protocol (MCP)** servers, **RAG** semantic expense search, and autonomous AI financial agent skills.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.10+, Flask 3.1.3, Gunicorn
- **Database**: SQLite3 (with parameterized queries and foreign keys enabled)
- **Security**: Werkzeug password hashing (`scrypt` / `pbkdf2`)
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Design System with DM Sans & DM Serif typography), Vanilla JavaScript (No heavy frameworks)
- **Deployment**: Production WSGI server ready (`gunicorn app:app`), configured for Render.com and PythonAnywhere.

---

## 📂 Project Architecture

```
expense-tracker/
├── app.py              # Main Flask application & routes
├── wsgi.py             # WSGI entry point for production deployment
├── Procfile            # Gunicorn process file for cloud hosting
├── render.yaml         # Render Infrastructure-as-Code blueprint
├── requirements.txt    # Python dependencies (Flask, Werkzeug, Gunicorn, Pytest)
├── database/
│   ├── __init__.py
│   └── db.py           # SQLite connection, schema, queries & 7-month data seeder
├── templates/
│   ├── base.html       # Shared layout template with navbar & footer
│   ├── landing.html    # Home page with hero section & video modal
│   ├── dashboard.html  # Expense dashboard, custom time tracker & analytics matrix
│   ├── login.html      # User sign-in page
│   ├── register.html   # User account creation page
│   ├── terms.html      # Terms & Conditions page
│   └── privacy.html    # Privacy Policy page
└── static/
    ├── css/
    │   └── style.css   # Global design system, glassmorphism & responsive layouts
    └── js/
        └── main.js     # Vanilla JS modal & interactive features
```

---

## ⚡ Quick Start & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/spendlypractice.git
cd spendlypractice/expense-tracker
```

### 2. Create and Activate Virtual Environment
- **Windows**:
  ```powershell
  python -m venv venv
  .\venv\Scripts\activate
  ```
- **macOS / Linux**:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run Development Server
```bash
python app.py
```
Open your browser and navigate to: **`http://127.0.0.1:5001`**

---

## 🌐 Deploying Live to Render.com (100% Free)

1. Push your repository to GitHub.
2. Sign in to **[Render.com](https://render.com)**.
3. Click **New +** -> **Web Service** and connect your GitHub repo.
4. Render will auto-detect settings from `render.yaml`:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
5. Click **Create Web Service**! Your live app will be published at `https://YOUR-APP.onrender.com`.

---

## 📜 License & Acknowledgments
Built with ❤️ as part of the Spendly personal finance practice series.
