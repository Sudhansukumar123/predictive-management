from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.api.deps import get_operator_user
from app.services.reports import generate_pdf_report, generate_excel_report

router = APIRouter()

@router.get("/pdf")
def get_pdf_report(db: Session = Depends(get_db), current_user=Depends(get_operator_user)):
    """Downloads an executive summary report of the factory fleet in PDF format."""
    try:
        pdf_buffer = generate_pdf_report(db)
        return StreamingResponse(
            pdf_buffer, 
            media_type="application/pdf", 
            headers={"Content-Disposition": "attachment; filename=predictive-maintenance-report.pdf"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF report: {e}"
        )

@router.get("/excel")
def get_excel_report(db: Session = Depends(get_db), current_user=Depends(get_operator_user)):
    """Downloads a detailed plant operations spreadsheet in Excel format."""
    try:
        excel_buffer = generate_excel_report(db)
        return StreamingResponse(
            excel_buffer, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
            headers={"Content-Disposition": "attachment; filename=predictive-maintenance-report.xlsx"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate Excel spreadsheet: {e}"
        )
