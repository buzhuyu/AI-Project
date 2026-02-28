# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
# Add newspaper3k dependencies (libxml2, libxslt) if needed for slim image
RUN apt-get update && apt-get install -y libxml2-dev libxslt-dev gcc && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install newspaper3k lxml_html_clean

# Copy the current directory contents into the container at /app
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run app.py when the container launches
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
