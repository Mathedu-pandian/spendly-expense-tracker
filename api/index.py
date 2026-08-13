import os
import sys

# Ensure root directory is at the head of sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Import Flask app instance
from app import app

# Export for Vercel Serverless Function WSGI handler
app = app
