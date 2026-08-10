import os
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash

DB_NAME = "spendly.db"


def get_db():
    """Opens connection to SQLite database with Row factory and foreign keys enabled."""
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), DB_NAME)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def create_user(name, email, password):
    """Hashes password and inserts a new user record. Returns new user_id or None if email exists."""
    conn = get_db()
    cursor = conn.cursor()
    password_hash = generate_password_hash(password)
    try:
        cursor.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name.strip(), email.strip().lower(), password_hash)
        )
        conn.commit()
        user_id = cursor.lastrowid
        return user_id
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()


def get_user_by_email(email):
    """Fetches user record by email address."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email.strip().lower(),))
    user = cursor.fetchone()
    conn.close()
    return user


def get_user_by_id(user_id):
    """Fetches user record by user_id."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    return user


def add_expense_db(user_id, amount, category, date, description):
    """Inserts a new expense record into the SQLite database."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO expenses (user_id, amount, category, date, description) VALUES (?, ?, ?, ?, ?)",
        (user_id, amount, category, date, description)
    )
    conn.commit()
    expense_id = cursor.lastrowid
    conn.close()
    return expense_id


def get_user_expenses(user_id, category=None, search=None):
    """Fetches all expenses for a user with optional category filter and keyword search."""
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM expenses WHERE user_id = ?"
    params = [user_id]
    
    if category and category != "All":
        query += " AND category = ?"
        params.append(category)
        
    if search:
        query += " AND (description LIKE ? OR category LIKE ?)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")
        
    query += " ORDER BY date DESC, id DESC"
    
    cursor.execute(query, params)
    expenses = cursor.fetchall()
    conn.close()
    return expenses


def get_expense_summary(user_id):
    """Calculates overall metrics (total spending, count, top category)."""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT SUM(amount) AS total, COUNT(*) AS count FROM expenses WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    total_spent = row["total"] or 0.0
    total_count = row["count"] or 0

    cursor.execute("""
        SELECT category, SUM(amount) AS cat_total 
        FROM expenses WHERE user_id = ? 
        GROUP BY category 
        ORDER BY cat_total DESC 
        LIMIT 1
    """, (user_id,))
    top_row = cursor.fetchone()
    top_category = top_row["category"] if top_row else "None"

    conn.close()
    return {
        "total_spent": total_spent,
        "total_count": total_count,
        "top_category": top_category
    }


def get_category_totals(user_id):
    """Calculates category breakdown with totals and percentage values."""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT SUM(amount) AS total FROM expenses WHERE user_id = ?", (user_id,))
    grand_total = cursor.fetchone()["total"] or 0.0

    cursor.execute("""
        SELECT category, SUM(amount) AS total, COUNT(*) AS count 
        FROM expenses WHERE user_id = ? 
        GROUP BY category 
        ORDER BY total DESC
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()

    breakdown = []
    for r in rows:
        pct = (r["total"] / grand_total * 100) if grand_total > 0 else 0
        breakdown.append({
            "category": r["category"],
            "total": r["total"],
            "count": r["count"],
            "percentage": round(pct, 1)
        })
    return breakdown


def init_db():
    """Creates database tables if they do not already exist."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    conn.commit()
    conn.close()


def seed_db():
    """Seeds initial demo user and 8 sample expenses if database is empty."""
    conn = get_db()
    cursor = conn.cursor()

    # Check if users table already has data
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]

    if user_count > 0:
        conn.close()
        return

    # Insert Demo User
    demo_password_hash = generate_password_hash("demo123")
    cursor.execute(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        ("Demo User", "demo@spendly.com", demo_password_hash)
    )
    user_id = cursor.lastrowid

    # Insert 8 sample expenses across all required categories
    sample_expenses = [
        (user_id, 450.0, "Food", "2026-08-01", "Grocery shopping"),
        (user_id, 180.0, "Transport", "2026-08-02", "Metro card refill"),
        (user_id, 2500.0, "Bills", "2026-08-03", "Electricity & Wi-Fi bill"),
        (user_id, 650.0, "Health", "2026-08-04", "Pharmacy medicines"),
        (user_id, 800.0, "Entertainment", "2026-08-05", "Movie tickets"),
        (user_id, 1200.0, "Shopping", "2026-08-06", "New shirt & shoes"),
        (user_id, 300.0, "Other", "2026-08-07", "Books & stationery"),
        (user_id, 520.0, "Food", "2026-08-08", "Dinner with friends")
    ]

    cursor.executemany(
        "INSERT INTO expenses (user_id, amount, category, date, description) VALUES (?, ?, ?, ?, ?)",
        sample_expenses
    )

    conn.commit()
    conn.close()

