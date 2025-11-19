# Use official Python image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies (for Pillow + PostgreSQL)
RUN apt-get update && \
    apt-get install -y build-essential libpq-dev libjpeg-dev zlib1g-dev libpng-dev && \
    rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /code

# Copy requirements and install
COPY backend/requirements.txt /code/
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY backend/ /code/

# Default command
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
