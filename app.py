import os
from datetime import date as dt_date
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, session, g, flash
from werkzeug.security import check_password_hash
from database.db import (
    init_db, seed_db, create_user, get_user_by_email, get_user_by_id,
    get_user_expenses, get_expense_summary, get_category_totals, add_expense_db
)

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "spendly-secret-key-dev-mode-2026")

# Initialize and seed SQLite database on app startup
with app.app_context():
    init_db()
    seed_db()


@app.before_request
def load_logged_in_user():
    """Loads current logged-in user record into g.user before each request."""
    user_id = session.get("user_id")
    if user_id is None:
        g.user = None
    else:
        g.user = get_user_by_id(user_id)


def login_required(f):
    """Decorator to require login for protected routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if g.user is None:
            return redirect(url_for("login", next=request.url))
        return f(*args, **kwargs)
    return decorated_function


# ------------------------------------------------------------------ #
# Public Routes                                                       #
# ------------------------------------------------------------------ #

@app.route("/")
def landing():
    return render_template("landing.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if g.user:
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")

        if not name or not email or not password:
            return render_template("register.html", error="All fields are required.")

        if len(password) < 8:
            return render_template("register.html", error="Password must be at least 8 characters long.")

        user_id = create_user(name, email, password)
        if user_id is None:
            return render_template("register.html", error="An account with this email address already exists.")

        # Log in newly registered user
        session.clear()
        session["user_id"] = user_id
        return redirect(url_for("dashboard"))

    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if g.user:
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")

        if not email or not password:
            return render_template("login.html", error="Please provide both email address and password.")

        user = get_user_by_email(email)
        if user is None or not check_password_hash(user["password_hash"], password):
            return render_template("login.html", error="Invalid email or password. Please try again.")

        # Authentication successful
        session.clear()
        session["user_id"] = user["id"]

        next_page = request.args.get("next")
        if next_page and next_page.startswith("/"):
            return redirect(next_page)
        return redirect(url_for("dashboard"))

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/terms")
def terms():
    return render_template("terms.html")


@app.route("/privacy")
def privacy():
    return render_template("privacy.html")


# ------------------------------------------------------------------ #
# Protected Routes                                                    #
# ------------------------------------------------------------------ #

@app.route("/dashboard")
@login_required
def dashboard():
    category_filter = request.args.get("category", "All")
    search_query = request.args.get("search", "").strip()

    expenses = get_user_expenses(g.user["id"], category=category_filter, search=search_query)
    summary = get_expense_summary(g.user["id"])
    category_totals = get_category_totals(g.user["id"])

    return render_template(
        "dashboard.html",
        expenses=expenses,
        summary=summary,
        category_totals=category_totals,
        selected_category=category_filter,
        selected_search=search_query
    )


@app.route("/profile")
@login_required
def profile():
    return render_template("profile.html")


@app.route("/expenses/add", methods=["GET", "POST"])
@login_required
def add_expense():
    if request.method == "POST":
        try:
            amount = float(request.form.get("amount", 0))
        except ValueError:
            amount = 0.0

        category = request.form.get("category", "Other").strip()
        expense_date = request.form.get("date", "").strip()
        description = request.form.get("description", "").strip()

        if amount <= 0:
            return render_template("add_expense.html", error="Please enter a valid positive amount.", today_date=dt_date.today().isoformat())

        if not expense_date:
            expense_date = dt_date.today().isoformat()

        add_expense_db(g.user["id"], amount, category, expense_date, description)
        return redirect(url_for("dashboard"))

    return render_template("add_expense.html", today_date=dt_date.today().isoformat())


# ------------------------------------------------------------------ #
# Placeholder routes — upcoming steps                                #
# ------------------------------------------------------------------ #

@app.route("/expenses/<int:id>/edit")
@login_required
def edit_expense(id):
    return "Edit expense — coming in Step 8"


@app.route("/expenses/<int:id>/delete")
@login_required
def delete_expense(id):
    return "Delete expense — coming in Step 9"


if __name__ == "__main__":
    app.run(debug=True, port=5001)
