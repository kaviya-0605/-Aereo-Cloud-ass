from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import uuid
import os

from . import models, schemas
from .database import get_db
from .job_processor import start_job

router = APIRouter(prefix="/api")


# ── Create Job ───────────────────────────────────────────────────────────────

@router.post("/jobs", response_model=schemas.CreateJobResponse, status_code=201)
def create_job(payload: schemas.CreateJobRequest, db: Session = Depends(get_db)):
    """Create a new certificate generation job and kick off background processing."""

    # Create the Job record
    job = models.Job(
        event_name=payload.event_name,
        event_date=payload.event_date,
        cert_type=payload.cert_type or "Achievement",
        total_recipients=len(payload.recipients),
        status=models.JobStatus.PENDING,
    )
    db.add(job)
    db.flush()  # get job.id

    # Create certificate placeholder records
    for recipient in payload.recipients:
        cert = models.Certificate(
            job_id=job.id,
            recipient_name=recipient.name,
            recipient_email=recipient.email,
            status=models.CertificateStatus.PENDING,
        )
        db.add(cert)

    db.commit()
    db.refresh(job)

    # Start background generation
    start_job(str(job.id))

    return schemas.CreateJobResponse(
        job_id=str(job.id),
        message=f"Job created successfully. Generating {len(payload.recipients)} certificate(s).",
    )


# ── Get All Jobs (History) ────────────────────────────────────────────────────

@router.get("/jobs", response_model=List[schemas.JobResponse])
def get_all_jobs(db: Session = Depends(get_db)):
    """Retrieve all jobs sorted by creation date descending for history view."""
    jobs = db.query(models.Job).order_by(models.Job.created_at.desc()).all()
    return [
        schemas.JobResponse(
            id=str(j.id),
            event_name=j.event_name,
            event_date=j.event_date,
            cert_type=getattr(j, "cert_type", "Achievement") or "Achievement",
            status=j.status.value,
            total_recipients=j.total_recipients,
            successful_count=j.successful_count,
            failed_count=j.failed_count,
            created_at=j.created_at,
            completed_at=j.completed_at,
        )
        for j in jobs
    ]


# ── Get All History Certificates ─────────────────────────────────────────────

@router.get("/history/certificates", response_model=List[schemas.HistoryCertificateResponse])
def get_all_history_certificates(db: Session = Depends(get_db)):
    """Retrieve all certificates joined with job info for direct history viewing."""
    certs = (
        db.query(models.Certificate, models.Job)
        .join(models.Job, models.Certificate.job_id == models.Job.id)
        .order_by(models.Certificate.created_at.desc())
        .all()
    )
    return [
        schemas.HistoryCertificateResponse(
            id=str(c.id),
            job_id=str(c.job_id),
            event_name=j.event_name,
            event_date=j.event_date,
            cert_type=getattr(j, "cert_type", "Achievement") or "Achievement",
            recipient_name=c.recipient_name,
            recipient_email=c.recipient_email,
            certificate_id=c.certificate_id,
            status=c.status.value,
            file_path=c.file_path,
            error_message=c.error_message,
            created_at=c.created_at,
        )
        for c, j in certs
    ]


# ── Get Job Status ───────────────────────────────────────────────────────────

@router.get("/jobs/{job_id}", response_model=schemas.JobResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    try:
        uid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID format")

    job = db.query(models.Job).filter(models.Job.id == uid).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return schemas.JobResponse(
        id=str(job.id),
        event_name=job.event_name,
        event_date=job.event_date,
        cert_type=getattr(job, "cert_type", "Achievement") or "Achievement",
        status=job.status.value,
        total_recipients=job.total_recipients,
        successful_count=job.successful_count,
        failed_count=job.failed_count,
        created_at=job.created_at,
        completed_at=job.completed_at,
    )


# ── Get Job Certificates ─────────────────────────────────────────────────────

@router.get("/jobs/{job_id}/certificates", response_model=List[schemas.CertificateResponse])
def get_job_certificates(job_id: str, db: Session = Depends(get_db)):
    try:
        uid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID format")

    job = db.query(models.Job).filter(models.Job.id == uid).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    certs = db.query(models.Certificate).filter(models.Certificate.job_id == uid).all()

    return [
        schemas.CertificateResponse(
            id=str(c.id),
            job_id=str(c.job_id),
            recipient_name=c.recipient_name,
            recipient_email=c.recipient_email,
            certificate_id=c.certificate_id,
            status=c.status.value,
            file_path=c.file_path,
            error_message=c.error_message,
            created_at=c.created_at,
        )
        for c in certs
    ]


# ── Download / View Certificate ───────────────────────────────────────────────

@router.get("/certificates/{certificate_id}/download")
def download_certificate(certificate_id: str, db: Session = Depends(get_db)):
    try:
        uid = uuid.UUID(certificate_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid certificate ID format")

    cert = db.query(models.Certificate).filter(models.Certificate.id == uid).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    if cert.status != models.CertificateStatus.SUCCESS:
        raise HTTPException(status_code=400, detail="Certificate was not successfully generated")

    if not cert.file_path or not os.path.exists(cert.file_path):
        raise HTTPException(status_code=404, detail="Certificate file not found on disk")

    filename = f"{cert.certificate_id}_{cert.recipient_name}.pdf"
    return FileResponse(
        path=cert.file_path,
        media_type="application/pdf",
        filename=filename,
    )


@router.get("/certificates/{certificate_id}/view")
def view_certificate(certificate_id: str, db: Session = Depends(get_db)):
    try:
        uid = uuid.UUID(certificate_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid certificate ID format")

    cert = db.query(models.Certificate).filter(models.Certificate.id == uid).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    if cert.status != models.CertificateStatus.SUCCESS:
        raise HTTPException(status_code=400, detail="Certificate was not successfully generated")

    if not cert.file_path or not os.path.exists(cert.file_path):
        raise HTTPException(status_code=404, detail="Certificate file not found on disk")

    filename = f"{cert.certificate_id}_{cert.recipient_name}.pdf"
    return FileResponse(
        path=cert.file_path,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
