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


def get_user_expenses(user_id, month=None, category=None, search=None, start_date=None, end_date=None):
    """Fetches expenses for a user with optional month, category, keyword, and date range filters."""
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM expenses WHERE user_id = ?"
    params = [user_id]

    if month and month != "All":
        query += " AND strftime('%Y-%m', date) = ?"
        params.append(month)
    
    if category and category != "All":
        query += " AND category = ?"
        params.append(category)
        
    if search:
        query += " AND (description LIKE ? OR category LIKE ?)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")
        
    if start_date:
        query += " AND date >= ?"
        params.append(start_date)

    if end_date:
        query += " AND date <= ?"
        params.append(end_date)
        
    query += " ORDER BY date DESC, id DESC"
    
    cursor.execute(query, params)
    expenses = cursor.fetchall()
    conn.close()
    return expenses


def get_expense_summary(user_id, month=None, start_date=None, end_date=None):
    """Calculates summary metrics (total spending, count, top category) with optional date range filter."""
    conn = get_db()
    cursor = conn.cursor()
    
    query_total = "SELECT SUM(amount) AS total, COUNT(*) AS count FROM expenses WHERE user_id = ?"
    params = [user_id]
    
    if month and month != "All":
        query_total += " AND strftime('%Y-%m', date) = ?"
        params.append(month)

    if start_date:
        query_total += " AND date >= ?"
        params.append(start_date)

    if end_date:
        query_total += " AND date <= ?"
        params.append(end_date)
        
    cursor.execute(query_total, params)
    row = cursor.fetchone()
    total_spent = row["total"] or 0.0
    total_count = row["count"] or 0

    query_top = """
        SELECT category, SUM(amount) AS cat_total 
        FROM expenses WHERE user_id = ? 
    """
    params_top = [user_id]

    if month and month != "All":
        query_top += " AND strftime('%Y-%m', date) = ?"
        params_top.append(month)

    if start_date:
        query_top += " AND date >= ?"
        params_top.append(start_date)

    if end_date:
        query_top += " AND date <= ?"
        params_top.append(end_date)
        
    query_top += " GROUP BY category ORDER BY cat_total DESC LIMIT 1"

    cursor.execute(query_top, params_top)
    top_row = cursor.fetchone()
    top_category = top_row["category"] if top_row else "None"

    conn.close()
    return {
        "total_spent": total_spent,
        "total_count": total_count,
        "top_category": top_category
    }


def get_category_totals(user_id, month=None, start_date=None, end_date=None):
    """Calculates category breakdown with totals and percentages with optional date range filter."""
    conn = get_db()
    cursor = conn.cursor()
    
    query_grand = "SELECT SUM(amount) AS total FROM expenses WHERE user_id = ?"
    params = [user_id]
    
    if month and month != "All":
        query_grand += " AND strftime('%Y-%m', date) = ?"
        params.append(month)

    if start_date:
        query_grand += " AND date >= ?"
        params.append(start_date)

    if end_date:
        query_grand += " AND date <= ?"
        params.append(end_date)
        
    cursor.execute(query_grand, params)
    grand_total = cursor.fetchone()["total"] or 0.0

    query_cats = """
        SELECT category, SUM(amount) AS total, COUNT(*) AS count 
        FROM expenses WHERE user_id = ? 
    """
    params_cats = [user_id]

    if month and month != "All":
        query_cats += " AND strftime('%Y-%m', date) = ?"
        params_cats.append(month)

    if start_date:
        query_cats += " AND date >= ?"
        params_cats.append(start_date)

    if end_date:
        query_cats += " AND date <= ?"
        params_cats.append(end_date)
        
    query_cats += " GROUP BY category ORDER BY total DESC"

    cursor.execute(query_cats, params_cats)
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


def get_available_months(user_id):
    """Fetches unique YYYY-MM months from user expenses for dropdown selection."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT strftime('%Y-%m', date) AS month_str
        FROM expenses
        WHERE user_id = ?
        ORDER BY month_str DESC
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()

    month_names = {
        "01": "January", "02": "February", "03": "March", "04": "April",
        "05": "May", "06": "June", "07": "July", "08": "August",
        "09": "September", "10": "October", "11": "November", "12": "December"
    }

    result = []
    for r in rows:
        m_str = r["month_str"]
        if m_str and len(m_str.split("-")) == 2:
            yr, mo = m_str.split("-")
            result.append({
                "value": m_str,
                "label": f"{month_names.get(mo, mo)} {yr}"
            })
    return result


def get_monthly_trends(user_id):
    """Returns monthly spending totals for the past months for analytics trend visualization."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT strftime('%Y-%m', date) AS month_str, SUM(amount) AS total, COUNT(*) AS count
        FROM expenses
        WHERE user_id = ?
        GROUP BY month_str
        ORDER BY month_str ASC
        LIMIT 12
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()

    month_names = {
        "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
        "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
        "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec"
    }

    max_total = max([r["total"] for r in rows], default=1.0) or 1.0

    trends = []
    for r in rows:
        m_str = r["month_str"]
        if m_str and len(m_str.split("-")) == 2:
            yr, mo = m_str.split("-")
            pct = (r["total"] / max_total) * 100
            trends.append({
                "month_value": m_str,
                "month_label": f"{month_names.get(mo, mo)} '{yr[2:]}",
                "total": r["total"],
                "count": r["count"],
                "height_pct": max(14, round(pct, 1))
            })
    return trends


def get_monthly_analytics_summary(user_id, month=None):
    """Generates monthly summary insights, MoM comparison, and spidergraph axis values."""
    conn = get_db()
    cursor = conn.cursor()

    if not month or month == "All":
        cursor.execute("SELECT strftime('%Y-%m', MAX(date)) AS latest_month FROM expenses WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        target_month = row["latest_month"] if row and row["latest_month"] else "2026-08"
    else:
        target_month = month

    month_names = {
        "01": "January", "02": "February", "03": "March", "04": "April",
        "05": "May", "06": "June", "07": "July", "08": "August",
        "09": "September", "10": "October", "11": "November", "12": "December"
    }

    parts = target_month.split("-")
    yr = int(parts[0]) if len(parts) == 2 else 2026
    mo = int(parts[1]) if len(parts) == 2 else 8
    month_label = f"{month_names.get(f'{mo:02d}', str(mo))} {yr}"

    if mo == 1:
        prev_yr, prev_mo = yr - 1, 12
    else:
        prev_yr, prev_mo = yr, mo - 1
    prev_month_str = f"{prev_yr}-{prev_mo:02d}"

    cursor.execute("""
        SELECT SUM(amount) AS total, COUNT(*) AS count 
        FROM expenses WHERE user_id = ? AND strftime('%Y-%m', date) = ?
    """, (user_id, target_month))
    cur_row = cursor.fetchone()
    cur_total = cur_row["total"] or 0.0
    cur_count = cur_row["count"] or 0

    cursor.execute("""
        SELECT SUM(amount) AS total 
        FROM expenses WHERE user_id = ? AND strftime('%Y-%m', date) = ?
    """, (user_id, prev_month_str))
    prev_total = cursor.fetchone()["total"] or 0.0

    if prev_total > 0:
        mom_diff = cur_total - prev_total
        mom_pct = round((mom_diff / prev_total) * 100, 1)
        mom_direction = "up" if mom_diff >= 0 else "down"
    else:
        mom_diff = 0.0
        mom_pct = 0.0
        mom_direction = "neutral"

    daily_avg = round(cur_total / 30.0, 2)

    all_categories = ["Food", "Bills", "Transport", "Health", "Shopping", "Entertainment", "Other"]
    cursor.execute("""
        SELECT category, SUM(amount) AS total
        FROM expenses WHERE user_id = ? AND strftime('%Y-%m', date) = ?
        GROUP BY category
    """, (user_id, target_month))
    cat_rows = cursor.fetchall()
    cat_map = {r["category"]: r["total"] for r in cat_rows}

    top_cat = "None"
    top_cat_amount = 0.0
    if cat_map:
        top_cat = max(cat_map, key=cat_map.get)
        top_cat_amount = cat_map[top_cat]

    max_cat_val = max(cat_map.values(), default=1.0) or 1.0
    spider_nodes = []
    for cat in all_categories:
        amt = cat_map.get(cat, 0.0)
        score = round((amt / max_cat_val) * 100, 1) if max_cat_val > 0 else 0
        spider_nodes.append({
            "category": cat,
            "amount": amt,
            "score": max(10, score)
        })

    if top_cat != "None":
        pct_of_total = round((top_cat_amount / cur_total * 100), 1) if cur_total > 0 else 0
        advisory_tip = f"In {month_label}, your highest expenditure was on **{top_cat}** totaling ₹{top_cat_amount:,.2f} ({pct_of_total}% of your monthly budget)."
        if top_cat == "Food":
            advisory_tip += " Cooking at home or planning meal prep could reduce food costs by up to 15% next month."
        elif top_cat == "Bills":
            advisory_tip += " Check utility usage and annual subscriptions to see if any dormant recurring plans can be cancelled."
        elif top_cat == "Shopping":
            advisory_tip += " Implementing a 48-hour pause before major non-essential purchases can help curb impulse spending."
        elif top_cat == "Entertainment":
            advisory_tip += " Look out for bundled event passes or weekend deals to optimize recreation spending."
        else:
            advisory_tip += " Setting category spending targets will keep your total monthly budget balanced."
    else:
        advisory_tip = f"No expenses logged for {month_label} yet."

    conn.close()

    return {
        "month_label": month_label,
        "target_month": target_month,
        "cur_total": cur_total,
        "cur_count": cur_count,
        "prev_total": prev_total,
        "mom_pct": mom_pct,
        "mom_direction": mom_direction,
        "daily_avg": daily_avg,
        "top_cat": top_cat,
        "top_cat_amount": top_cat_amount,
        "spider_nodes": spider_nodes,
        "advisory_tip": advisory_tip
    }


def get_inter_category_stats(user_id):
    """Calculates cross-category spending matrix across months and inter-category growth trends."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT DISTINCT strftime('%Y-%m', date) AS month_str
        FROM expenses WHERE user_id = ?
        ORDER BY month_str ASC
    """, (user_id,))
    month_rows = cursor.fetchall()
    
    month_names = {
        "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
        "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
        "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec"
    }

    months = []
    for r in month_rows:
        m_str = r["month_str"]
        if m_str and len(m_str.split("-")) == 2:
            yr, mo = m_str.split("-")
            months.append({
                "key": m_str,
                "label": f"{month_names.get(mo, mo)} '{yr[2:]}"
            })

    all_categories = ["Food", "Bills", "Transport", "Health", "Shopping", "Entertainment", "Other"]

    cursor.execute("""
        SELECT category, strftime('%Y-%m', date) AS month_str, SUM(amount) AS total
        FROM expenses WHERE user_id = ?
        GROUP BY category, month_str
    """, (user_id,))
    grid_rows = cursor.fetchall()
    conn.close()

    grid_map = {}
    for r in grid_rows:
        grid_map[(r["category"], r["month_str"])] = r["total"]

    matrix_rows = []
    category_totals = {}
    category_averages = {}

    for cat in all_categories:
        m_vals = []
        cat_grand_total = 0.0
        max_m_val = 0.0
        max_m_label = "N/A"

        for m in months:
            val = grid_map.get((cat, m["key"]), 0.0)
            m_vals.append({
                "month_key": m["key"],
                "amount": val
            })
            cat_grand_total += val
            if val > max_m_val:
                max_m_val = val
                max_m_label = m["label"]

        avg_val = round(cat_grand_total / len(months), 2) if months else 0.0
        category_totals[cat] = cat_grand_total
        category_averages[cat] = avg_val

        matrix_rows.append({
            "category": cat,
            "monthly_values": m_vals,
            "total": cat_grand_total,
            "avg": avg_val,
            "max_month": max_m_label,
            "max_amount": max_m_val
        })

    highest_avg_cat = max(category_averages, key=category_averages.get) if category_averages else "None"
    
    growth_cat = "None"
    max_growth_pct = -999.0
    if len(months) >= 2:
        first_m = months[0]["key"]
        last_m = months[-1]["key"]
        for cat in all_categories:
            val_start = grid_map.get((cat, first_m), 0.0)
            val_end = grid_map.get((cat, last_m), 0.0)
            if val_start > 0:
                pct = ((val_end - val_start) / val_start) * 100
                if pct > max_growth_pct:
                    max_growth_pct = pct
                    growth_cat = cat

    return {
        "months_header": months,
        "matrix_rows": matrix_rows,
        "highest_avg_cat": highest_avg_cat,
        "highest_avg_amount": category_averages.get(highest_avg_cat, 0.0),
        "growth_cat": growth_cat,
        "growth_pct": round(max_growth_pct, 1) if max_growth_pct != -999.0 else 0.0
    }


# ------------------------------------------------------------------ #
# Synthetic 7-Month Data Seeder                                       #
# ------------------------------------------------------------------ #

def seed_synthetic_7_months(user_id):
    """Seeds 7 months (Feb 2026 to Aug 2026) of realistic synthetic expense data."""
    conn = get_db()
    cursor = conn.cursor()

    # Check if user already has 7 months of data
    cursor.execute("SELECT COUNT(DISTINCT strftime('%Y-%m', date)) FROM expenses WHERE user_id = ?", (user_id,))
    month_count = cursor.fetchone()[0]

    if month_count >= 6:
        conn.close()
        return

    synthetic_expenses = [
        # Feb 2026
        (user_id, 12000.0, "Bills", "2026-02-02", "Apartment Rent & Maintenance"),
        (user_id, 3400.0, "Food", "2026-02-05", "Monthly Supermarket Groceries"),
        (user_id, 1500.0, "Transport", "2026-02-10", "Metro Pass & Cab Rides"),
        (user_id, 1850.0, "Entertainment", "2026-02-14", "Valentine's Day Dinner & Movie"),
        (user_id, 1200.0, "Health", "2026-02-18", "Dental Checkup & Cleaning"),
        (user_id, 2450.0, "Shopping", "2026-02-22", "Winter Jacket & Boots Sale"),
        (user_id, 650.0, "Other", "2026-02-26", "Cloud Storage & App Subscriptions"),

        # Mar 2026
        (user_id, 2800.0, "Bills", "2026-03-03", "Electricity & Water Bill"),
        (user_id, 4100.0, "Food", "2026-03-07", "Organic Grocery Pantry"),
        (user_id, 1150.0, "Transport", "2026-03-12", "Fuel Refill & Tolls"),
        (user_id, 3200.0, "Shopping", "2026-03-16", "Spring Apparel & Shoes"),
        (user_id, 850.0, "Health", "2026-03-20", "Multivitamins & Pharmacy"),
        (user_id, 2500.0, "Entertainment", "2026-03-25", "Music Concert Tickets"),
        (user_id, 1650.0, "Food", "2026-03-28", "Weekend Family Brunch"),

        # Apr 2026
        (user_id, 1499.0, "Bills", "2026-04-02", "Broadband Fiber & DTH"),
        (user_id, 2900.0, "Food", "2026-04-06", "Weekly Farm Fresh Produce"),
        (user_id, 3500.0, "Transport", "2026-04-11", "Car Service & Engine Oil"),
        (user_id, 2100.0, "Health", "2026-04-15", "Eye Examination & Lenses"),
        (user_id, 4200.0, "Shopping", "2026-04-20", "Home Decor & Kitchenware"),
        (user_id, 999.0, "Entertainment", "2026-04-24", "Streaming Services Annual Plan"),
        (user_id, 1500.0, "Other", "2026-04-28", "Birthday Gift for Friend"),

        # May 2026
        (user_id, 4800.0, "Bills", "2026-05-03", "AC Maintenance & Summer Electricity"),
        (user_id, 4600.0, "Food", "2026-05-08", "Gourmet Dining & Fine Dine Outings"),
        (user_id, 1400.0, "Transport", "2026-05-13", "Fastag Recharge & Toll Fares"),
        (user_id, 5900.0, "Shopping", "2026-05-18", "Wireless Noise-Canceling Headphones"),
        (user_id, 3000.0, "Health", "2026-05-22", "Comprehensive Health Checkup"),
        (user_id, 6500.0, "Entertainment", "2026-05-27", "Weekend Beach Resort Staycation"),

        # Jun 2026
        (user_id, 1299.0, "Bills", "2026-06-02", "Mobile Postpaid Family Plan"),
        (user_id, 5200.0, "Food", "2026-06-06", "Wholesale Supermarket Shopping"),
        (user_id, 2800.0, "Transport", "2026-06-11", "Interstate Train & Bus Tickets"),
        (user_id, 3800.0, "Shopping", "2026-06-16", "Summer Collection Clothes"),
        (user_id, 750.0, "Health", "2026-06-21", "Pharmacy Prescription Refill"),
        (user_id, 1450.0, "Entertainment", "2026-06-25", "Bowling & Arcade Weekend"),
        (user_id, 1800.0, "Other", "2026-06-29", "Plumbing & Appliance Repairs"),

        # Jul 2026
        (user_id, 3500.0, "Bills", "2026-07-02", "Society Maintenance Charges"),
        (user_id, 2100.0, "Food", "2026-07-07", "Artisanal Coffee & Bakery"),
        (user_id, 1800.0, "Transport", "2026-07-12", "Monthly Metro Pass Renewal"),
        (user_id, 2300.0, "Shopping", "2026-07-17", "Books & Ergonomic Office Deskware"),
        (user_id, 1950.0, "Health", "2026-07-22", "Skincare & Wellness Essentials"),
        (user_id, 1200.0, "Entertainment", "2026-07-27", "IMAX Movie & Popcorn"),
        (user_id, 1450.0, "Food", "2026-07-30", "Family Pizza & Ice Cream Night")
    ]

    cursor.executemany(
        "INSERT INTO expenses (user_id, amount, category, date, description) VALUES (?, ?, ?, ?, ?)",
        synthetic_expenses
    )

    conn.commit()
    conn.close()


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
    """Seeds initial demo user and 7 months of sample synthetic expenses strictly for Demo User."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE LOWER(email) = 'demo@spendly.com'")
    demo_user = cursor.fetchone()

    if demo_user is None:
        demo_password_hash = generate_password_hash("demo123")
        cursor.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            ("Demo User", "demo@spendly.com", demo_password_hash)
        )
        conn.commit()
        demo_user_id = cursor.lastrowid
    else:
        demo_user_id = demo_user["id"]

    conn.close()

    # Seed 7 months of synthetic data strictly for Demo User
    seed_synthetic_7_months(demo_user_id)
