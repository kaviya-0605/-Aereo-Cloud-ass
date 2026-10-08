# Bulk Certificate Generator

A full-stack application for generating personalized PDF certificates in bulk.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS + Axios + Lucide React |
| Backend | FastAPI + SQLAlchemy + PostgreSQL + ReportLab |
| Database | PostgreSQL |
| PDF Generation | ReportLab |

---

## 1. Create the Database

Create the PostgreSQL database:

```sql
CREATE DATABASE cerificatedb;
```

---

## 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install the required Python packages:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
uvicorn app.main:app --reload
```

The backend API will be available at:

**http://localhost:8000**

FastAPI Swagger documentation:

**http://localhost:8000/docs**

---

## 3. Frontend Setup

Navigate to the frontend directory:

```bash
cd frontend
```

Install the required packages:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The frontend application will be available at:

**http://localhost:5173**

---

## Application Pages

| Route | Page | Description |
|---|---|---|
| `/` | Create Certificate Job | Upload CSV, enter event details, select certificate type, and start bulk certificate generation |
| `/results/:jobId` | Generation Results | View generation progress, successful/failed certificates, and download generated PDFs |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/jobs` | Create a new certificate generation job |
| `GET` | `/api/jobs/{job_id}` | Get job status and generation summary |
| `GET` | `/api/jobs/{job_id}/certificates` | Get all certificates generated for a specific job |
| `GET` | `/api/certificates/{cert_id}/download` | Download an individual PDF certificate |

---

## Project Structure

```text
certificate/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── routes.py
│   │   ├── certificate_generator.py
│   │   └── job_processor.py
│   │
│   ├── generated_certificates/
│   ├── requirements.txt
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── CreateJobPage.jsx
    │   │   └── ResultsPage.jsx
    │   │
    │   ├── App.jsx
    │   ├── api.js
    │   └── index.css
    │
    ├── index.html
    └── vite.config.js
```

### Backend Files

| File | Purpose |
|---|---|
| `main.py` | FastAPI application entry point |
| `database.py` | SQLAlchemy database configuration |
| `models.py` | Defines Job and Certificate database models |
| `schemas.py` | Pydantic request and response schemas |
| `routes.py` | Defines all REST API endpoints |
| `certificate_generator.py` | Generates personalized PDF certificates using ReportLab |
| `job_processor.py` | Processes bulk certificate generation in the background |
| `.env` | Stores database configuration and environment variables |

### Frontend Files

| File | Purpose |
|---|---|
| `CreateJobPage.jsx` | Certificate job creation and CSV upload page |
| `ResultsPage.jsx` | Displays generation progress and certificate results |
| `App.jsx` | React application routing |
| `api.js` | Axios API client |
| `index.css` | Global styles |
| `vite.config.js` | Vite configuration and backend proxy |

---

## CSV Format

The application accepts a CSV file containing recipient information.

```csv
name,email
Kaviya,kaviya@gmail.com
Anu,anu@gmail.com
Ravi,ravi@gmail.com
```

### CSV Columns

| Column | Required | Description | Example |
|---|---|---|---|
| `name` | Yes | Recipient's name | `Kaviya` |
| `email` | Yes | Recipient's email address | `kaviya@gmail.com` |

---

## Certificate Generation

The application allows users to generate personalized certificates using recipient data from the CSV file.

| Input | Description |
|---|---|
| Recipient Name | Name printed on the certificate |
| Email | Recipient email address |
| Event Name | Name of the event/course/program |
| Event Date | Date displayed on the certificate |
| Certificate Type | Appreciation, Participation, or Course Completion |
| Certificate ID | Automatically generated unique certificate identifier |

Each generated certificate is saved as a PDF inside:

```text
backend/generated_certificates/
```

---

## Certificate Types

| Certificate Type | Heading |
|---|---|
| Appreciation | `CERTIFICATE OF APPRECIATION` |
| Participation | `CERTIFICATE OF PARTICIPATION` |
| Course Completion | `CERTIFICATE OF COURSE COMPLETION` |

---

## Generation Workflow

```text
CSV Upload
     ↓
Create Certificate Job
     ↓
Store Job in PostgreSQL
     ↓
Background Job Processor
     ↓
Read Recipient Data
     ↓
Generate Personalized PDF
     ↓
Save PDF
     ↓
Store Certificate Details
     ↓
Update Job Progress
     ↓
Results Page
     ↓
Download Certificates
```

---

## Database

The application uses PostgreSQL with SQLAlchemy.

The database stores information about certificate generation jobs and individual certificates.

### Jobs

| Field | Description |
|---|---|
| `id` | Unique job identifier |
| `event_name` | Name of the event |
| `event_date` | Event date |
| `status` | Current job status |
| `total_recipients` | Total number of recipients |
| `successful_count` | Number of successfully generated certificates |
| `failed_count` | Number of failed certificates |
| `created_at` | Job creation timestamp |
| `completed_at` | Job completion timestamp |

### Certificates

| Field | Description |
|---|---|
| `id` | Unique certificate record ID |
| `certificate_id` | Public certificate identifier |
| `recipient_name` | Recipient name |
| `recipient_email` | Recipient email |
| `event_name` | Event name |
| `event_date` | Event date |
| `certificate_type` | Type of certificate |
| `file_path` | Generated PDF location |
| `status` | Generation status |
| `created_at` | Certificate creation timestamp |

---

## Real-Time Generation Status

The Results page periodically polls the backend to display the latest job status.

Example:

| Status | Meaning |
|---|---|
| `PENDING` | Job has been created but processing has not started |
| `PROCESSING` | Certificates are currently being generated |
| `COMPLETED` | All certificates have been processed |
| `FAILED` | Job processing failed |

---

## Features

- Bulk certificate generation
- CSV recipient upload
- Personalized recipient names
- Unique certificate IDs
- PDF certificate generation
- Multiple certificate types
- PostgreSQL database storage
- Background certificate processing
- Real-time generation progress
- Success and failure tracking
- Individual PDF downloads
- REST API architecture
- Responsive React frontend
- FastAPI backend
- ReportLab PDF generation

---

## Environment Variables

Create a `.env` file inside the `backend` directory:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/cerificatedb
CERTIFICATES_DIR=generated_certificates
```

Replace `username` and `password` with your PostgreSQL credentials.

**Do not commit the `.env` file to GitHub.**

---

## Running the Application

### Terminal 1 — Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Terminal 2 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

---

## API Documentation

Once the backend is running, FastAPI automatically provides interactive API documentation:

```text
http://localhost:8000/docs
```

Alternative ReDoc documentation:

```text
http://localhost:8000/redoc
```