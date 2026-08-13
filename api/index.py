import sys
import os

# Add parent directory to path so app.py and database imports resolve seamlessly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app

# Vercel WSGI Handler
app = app
