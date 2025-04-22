#!/bin/sh

# Ensure data directory exists and has proper permissions
mkdir -p /app/data
chmod -R 777 /app/data

# Wait for database file to be accessible
while ! sqlite3 /app/data/db.sqlite3 "SELECT 1" >/dev/null 2>&1; do
    echo "Waiting for database to be ready..."
    sleep 1
done

# Run migrations
echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

# Start server
echo "Starting server..."
gunicorn --bind 0.0.0.0:8000 core.wsgi:application 