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

