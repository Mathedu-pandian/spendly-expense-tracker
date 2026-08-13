import os
from datetime import date as dt_date
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, session, g, flash
from werkzeug.security import check_password_hash
from database.db import (
    init_db, seed_db, create_user, get_user_by_email, get_user_by_id,
    get_user_expenses, get_expense_summary, get_category_totals, add_expense_db,
    get_available_months, get_monthly_trends, get_monthly_analytics_summary,
    get_inter_category_stats, get_user_budgets, set_user_budget, get_budget_performance,
    get_expense_by_id, update_expense_db, delete_expense_db
)


app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "spendly-secret-key-dev-mode-2026")

# Initialize and seed SQLite database safely on app startup
try:
    with app.app_context():
        init_db()
        seed_db()
except Exception as e:
    app.logger.warning(f"Database startup auto-init note: {e}")


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
    selected_month = request.args.get("month", "All")
    category_filter = request.args.get("category", "All")
    search_query = request.args.get("search", "").strip()
    start_date = request.args.get("start_date", "").strip()
    end_date = request.args.get("end_date", "").strip()

    expenses = get_user_expenses(g.user["id"], month=selected_month, category=category_filter, search=search_query, start_date=start_date, end_date=end_date)
    summary = get_expense_summary(g.user["id"], month=selected_month, start_date=start_date, end_date=end_date)
    category_totals = get_category_totals(g.user["id"], month=selected_month, start_date=start_date, end_date=end_date)
    available_months = get_available_months(g.user["id"])
    monthly_trends = get_monthly_trends(g.user["id"])
    analytics_summary = get_monthly_analytics_summary(g.user["id"], month=selected_month)
    inter_category_stats = get_inter_category_stats(g.user["id"])
    budget_perf = get_budget_performance(g.user["id"], month=selected_month)

    return render_template(
        "dashboard.html",
        expenses=expenses,
        summary=summary,
        category_totals=category_totals,
        available_months=available_months,
        monthly_trends=monthly_trends,
        analytics_summary=analytics_summary,
        inter_category_stats=inter_category_stats,
        budget_perf=budget_perf,
        selected_month=selected_month,
        selected_category=category_filter,
        selected_search=search_query,
        selected_start_date=start_date,
        selected_end_date=end_date
    )


@app.route("/budgets", methods=["GET", "POST"])
@login_required
def budgets():
    if request.method == "POST":
        category = request.form.get("category", "").strip()
        limit = request.form.get("monthly_limit", 0)
        if category and limit:
            try:
                set_user_budget(g.user["id"], category, float(limit))
            except ValueError:
                pass
        return redirect(url_for("budgets"))

    selected_month = request.args.get("month", "All")
    budget_perf = get_budget_performance(g.user["id"], month=selected_month)
    available_months = get_available_months(g.user["id"])

    return render_template("budgets.html", budget_perf=budget_perf, available_months=available_months, selected_month=selected_month)


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

@app.route("/expenses/<int:id>/edit", methods=["GET", "POST"])
@login_required
def edit_expense(id):
    expense = get_expense_by_id(id, g.user["id"])
    if not expense:
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        try:
            amount = float(request.form.get("amount", 0))
        except ValueError:
            amount = 0.0

        category = request.form.get("category", "Other").strip()
        expense_date = request.form.get("date", "").strip()
        description = request.form.get("description", "").strip()

        if amount <= 0:
            return render_template("edit_expense.html", expense=expense, error="Please enter a valid positive amount.")

        if not expense_date:
            expense_date = dt_date.today().isoformat()

        update_expense_db(id, g.user["id"], amount, category, expense_date, description)
        return redirect(url_for("dashboard"))

    return render_template("edit_expense.html", expense=expense)


@app.route("/expenses/<int:id>/delete", methods=["POST"])
@login_required
def delete_expense(id):
    delete_expense_db(id, g.user["id"])
    return redirect(url_for("dashboard"))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
