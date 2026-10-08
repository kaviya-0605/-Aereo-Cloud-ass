import os
import math
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from dotenv import load_dotenv

load_dotenv(override=True)

CERTIFICATES_DIR = os.getenv("CERTIFICATES_DIR", "generated_certificates")
os.makedirs(CERTIFICATES_DIR, exist_ok=True)

# ── Color palette (dark navy + gold luxury) ──────────────────────────────────
NAVY       = (0.082, 0.106, 0.200)
NAVY_DARK  = (0.055, 0.071, 0.145)
GOLD       = (0.816, 0.671, 0.294)
GOLD_LIGHT = (0.933, 0.820, 0.510)
GOLD_DARK  = (0.588, 0.447, 0.145)
WHITE      = (1.0, 1.0, 1.0)
OFF_WHITE  = (0.965, 0.965, 0.950)
GRAY_MID   = (0.55, 0.55, 0.53)
DARK_TEXT  = (0.12, 0.14, 0.22)


import uuid

def _generate_cert_id(index: int) -> str:
    return f"CERT-{uuid.uuid4().hex[:8].upper()}"


def _sf(cv, rgb):
    cv.setFillColorRGB(*rgb)


def _ss(cv, rgb):
    cv.setStrokeColorRGB(*rgb)


def _draw_navy_corners(cv, W, H):
    """Draw diagonal dark-navy corner panels and gold accent lines."""
    # Top-right navy triangle
    p = cv.beginPath()
    p.moveTo(W * 0.50, H)
    p.lineTo(W, H)
    p.lineTo(W, H * 0.60)
    p.close()
    _sf(cv, NAVY_DARK)
    cv.drawPath(p, fill=1, stroke=0)

    # Bottom-left navy triangle
    p2 = cv.beginPath()
    p2.moveTo(0, H * 0.40)
    p2.lineTo(0, 0)
    p2.lineTo(W * 0.50, 0)
    p2.close()
    _sf(cv, NAVY_DARK)
    cv.drawPath(p2, fill=1, stroke=0)

    # Gold diagonal lines – top-right
    _ss(cv, GOLD)
    cv.setLineWidth(2.8)
    cv.line(W * 0.35, H, W, H * 0.48)

    _ss(cv, GOLD_LIGHT)
    cv.setLineWidth(1.2)
    cv.line(W * 0.40, H, W, H * 0.55)

    # Gold diagonal lines – bottom-left
    _ss(cv, GOLD)
    cv.setLineWidth(2.8)
    cv.line(0, H * 0.52, W * 0.65, 0)

    _ss(cv, GOLD_LIGHT)
    cv.setLineWidth(1.2)
    cv.line(0, H * 0.45, W * 0.60, 0)


def _draw_gold_seal(cv, cx, cy, r=38):
    """Draw a decorative gold medallion seal."""
    # Sunburst spikes
    _ss(cv, GOLD_DARK)
    cv.setLineWidth(1)
    for i in range(24):
        angle = math.radians(i * 15)
        x1 = cx + r * 0.90 * math.cos(angle)
        y1 = cy + r * 0.90 * math.sin(angle)
        x2 = cx + r * 1.22 * math.cos(angle)
        y2 = cy + r * 1.22 * math.sin(angle)
        cv.line(x1, y1, x2, y2)

    # Outer gold ring
    _sf(cv, GOLD)
    _ss(cv, GOLD_DARK)
    cv.setLineWidth(1.5)
    cv.circle(cx, cy, r, fill=1, stroke=1)

    # Inner dark ring
    _sf(cv, GOLD_DARK)
    cv.circle(cx, cy, r * 0.62, fill=1, stroke=0)

    # Inner gold disc
    _sf(cv, GOLD_LIGHT)
    cv.circle(cx, cy, r * 0.46, fill=1, stroke=0)

    # Star centre
    _sf(cv, GOLD_DARK)
    cv.setFont("Helvetica-Bold", 15)
    cv.drawCentredString(cx, cy - 5, "★")

    # Ribbon below
    rw = r * 1.55
    rh = 11
    ry = cy - r * 1.22 - rh
    _sf(cv, GOLD)
    cv.rect(cx - rw / 2, ry, rw, rh, fill=1, stroke=0)

    # V-notch in ribbon
    _sf(cv, OFF_WHITE)
    tri = cv.beginPath()
    tri.moveTo(cx - 6, ry)
    tri.lineTo(cx + 6, ry)
    tri.lineTo(cx, ry + 6)
    tri.close()
    cv.drawPath(tri, fill=1, stroke=0)


def _draw_sig_line(cv, cx, name, role, y_line, y_name, y_role):
    _ss(cv, GOLD)
    cv.setLineWidth(0.9)
    cv.line(cx - 72, y_line, cx + 72, y_line)

    _sf(cv, OFF_WHITE)
    cv.setFont("Helvetica-BoldOblique", 10)
    cv.drawCentredString(cx, y_name, name)

    _sf(cv, GRAY_MID)
    cv.setFont("Helvetica", 8)
    cv.drawCentredString(cx, y_role, role.upper())


def generate_certificate(
    recipient_name: str,
    event_name: str,
    event_date: str,
    cert_type: str = "Achievement",
    cert_serial: int = 1,
    output_dir: str = CERTIFICATES_DIR,
    custom_cert_id: str | None = None,
) -> tuple[str, str]:
    """
    Generate a single PDF certificate (dark navy + gold luxury style).
    Returns (file_path, certificate_id).
    Raises an exception on failure.
    """
    certificate_id = custom_cert_id or _generate_cert_id(cert_serial)
    safe_name = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "_" for c in recipient_name
    ).strip()
    filename = f"{certificate_id}_{safe_name}.pdf"
    file_path = os.path.join(output_dir, filename)

    W, H = landscape(A4)
    cv = canvas.Canvas(file_path, pagesize=landscape(A4))

    # 1. Off-white base
    _sf(cv, OFF_WHITE)
    cv.rect(0, 0, W, H, fill=1, stroke=0)

    # 2. Navy corner panels + gold diagonals
    _draw_navy_corners(cv, W, H)

    # 3. Thin gold outer border
    _ss(cv, GOLD)
    cv.setLineWidth(2)
    m = 16
    cv.rect(m, m, W - 2 * m, H - 2 * m, fill=0, stroke=1)

    # Determine wording based on cert_type
    ct = (cert_type or "Achievement").strip().lower()
    if "course" in ct or "completion" in ct:
        sub_heading = "OF COURSE COMPLETION"
        body_line1 = "For successfully completing all requirements and coursework for"
        body_line2 = f"\"{event_name}\" on {event_date}. All criteria have been fulfilled."
    elif "participation" in ct:
        sub_heading = "OF PARTICIPATION"
        body_line1 = "For active participation and valuable contribution to"
        body_line2 = f"\"{event_name}\" held on {event_date}. We appreciate your dedication."
    else:
        sub_heading = "OF ACHIEVEMENT"
        body_line1 = "For outstanding performance and successful achievement in"
        body_line2 = f"\"{event_name}\" held on {event_date}. This achievement is hereby recognized."

    # 4. "CERTIFICATE" heading (gold, letter-spaced)
    title_cx = W * 0.35
    title_y  = H - 90
    _sf(cv, GOLD)
    cv.setFont("Helvetica-Bold", 28)
    title = "CERTIFICATE"
    cw = 17.5
    sx = title_cx - (len(title) * cw) / 2
    for i, ch in enumerate(title):
        cv.drawString(sx + i * cw, title_y, ch)

    # 5. Dynamic Sub-heading centered beneath CERTIFICATE title with flanking gold lines
    _sf(cv, DARK_TEXT)
    cv.setFont("Helvetica-Bold", 8.5)
    sw = cv.stringWidth(sub_heading, "Helvetica-Bold", 8.5)
    sh_x = title_cx - sw / 2
    cv.drawString(sh_x, title_y - 17, sub_heading)

    _ss(cv, GOLD)
    cv.setLineWidth(0.8)
    line_len = 30
    cv.line(sh_x - line_len - 8, title_y - 14, sh_x - 8, title_y - 14)
    cv.line(sh_x + sw + 8, title_y - 14, sh_x + sw + line_len + 8, title_y - 14)

    # 6. "This certificate is proudly presented to"
    _sf(cv, (0.35, 0.35, 0.33))
    cv.setFont("Helvetica", 10.5)
    cv.drawString(W * 0.075, H - 148, "This certificate is proudly presented to")

    # 7. Recipient name (navy, bold, large)
    _sf(cv, DARK_TEXT)
    fs = 46
    cv.setFont("Helvetica-Bold", fs)
    nw = cv.stringWidth(recipient_name, "Helvetica-Bold", fs)
    max_w = W * 0.56
    if nw > max_w:
        fs = int(fs * max_w / nw)
        cv.setFont("Helvetica-Bold", fs)
    cv.drawString(W * 0.075, H - 195, recipient_name)

    # 8. Thin divider under name
    _ss(cv, (0.80, 0.80, 0.78))
    cv.setLineWidth(0.7)
    cv.line(W * 0.075, H - 210, W * 0.63, H - 210)

    # 9. Dynamic Event description
    _sf(cv, (0.38, 0.38, 0.36))
    cv.setFont("Helvetica", 9.5)
    cv.drawString(W * 0.075, H - 238, body_line1)
    cv.drawString(W * 0.075, H - 252, body_line2)

    # 10. Signature lines
    yl, yn, yr = 96, 82, 70
    _draw_sig_line(cv, W * 0.205, "James Anderson",  "Director",  yl, yn, yr)
    _draw_sig_line(cv, W * 0.435, "Angela Thompson", "Manager",   yl, yn, yr)

    # 11. Gold seal (bottom-right, clear of diagonals)
    _draw_gold_seal(cv, W * 0.715, 88, r=36)

    # 12. Certificate ID & date at very bottom
    _sf(cv, GRAY_MID)
    cv.setFont("Helvetica", 7.5)
    cv.drawString(m + 8, m + 7, f"Certificate ID: {certificate_id}")
    cv.drawRightString(W - m - 8, m + 7, f"Date: {event_date}")

    cv.save()
    return file_path, certificate_id
