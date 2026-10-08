import uuid
import threading
from datetime import datetime
from sqlalchemy.orm import Session
from . import models
from .certificate_generator import generate_certificate
from .database import SessionLocal
import os
from dotenv import load_dotenv

load_dotenv(override=True)

CERTIFICATES_DIR = os.getenv("CERTIFICATES_DIR", "generated_certificates")


def process_job_in_background(job_id: str):
    """Background thread that generates all certificates for a job."""
    db: Session = SessionLocal()
    try:
        job_uuid = uuid.UUID(job_id) if isinstance(job_id, str) else job_id
        job = db.query(models.Job).filter(models.Job.id == job_uuid).first()
        if not job:
            return

        # Mark job as PROCESSING
        job.status = models.JobStatus.PROCESSING
        db.commit()

        certificates = db.query(models.Certificate).filter(
            models.Certificate.job_id == job_uuid
        ).all()

        successful = 0
        failed = 0

        for idx, cert in enumerate(certificates, start=1):
            try:
                file_path, certificate_id = generate_certificate(
                    recipient_name=cert.recipient_name,
                    event_name=job.event_name,
                    event_date=job.event_date,
                    cert_type=getattr(job, "cert_type", "Achievement") or "Achievement",
                    cert_serial=idx,
                    output_dir=CERTIFICATES_DIR,
                )
                cert.status = models.CertificateStatus.SUCCESS
                cert.file_path = file_path
                cert.certificate_id = certificate_id
                successful += 1
            except Exception as e:
                db.rollback()
                # Re-fetch cert after rollback
                cert = db.query(models.Certificate).filter(models.Certificate.id == cert.id).first()
                if cert:
                    cert.status = models.CertificateStatus.FAILED
                    cert.error_message = str(e)
                failed += 1

            # Persist progress after each certificate
            job = db.query(models.Job).filter(models.Job.id == job_uuid).first()
            if job:
                job.successful_count = successful
                job.failed_count = failed
            db.commit()

        # Final job status
        job = db.query(models.Job).filter(models.Job.id == job_uuid).first()
        if job:
            if failed == 0:
                job.status = models.JobStatus.COMPLETED
            elif successful == 0:
                job.status = models.JobStatus.FAILED
            else:
                job.status = models.JobStatus.COMPLETED_WITH_ERRORS

            job.completed_at = datetime.utcnow()
            db.commit()

    except Exception as e:
        # Unexpected error – mark job as failed
        try:
            db.rollback()
            job_uuid = uuid.UUID(job_id) if isinstance(job_id, str) else job_id
            job = db.query(models.Job).filter(models.Job.id == job_uuid).first()
            if job:
                job.status = models.JobStatus.FAILED
                job.completed_at = datetime.utcnow()
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def start_job(job_id: str):
    """Kick off background processing thread."""
    t = threading.Thread(target=process_job_in_background, args=(str(job_id),), daemon=True)
    t.start()
