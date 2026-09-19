"""WSGI entry point for cPanel (CloudLinux) Python app hosting.

cPanel → Software → Setup Python App → point the app root at the
`backend/` folder. Set the Application Startup File to
`passenger_wsgi.py` and the Callable Object to `application`.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.main import app as application  # noqa: E402
