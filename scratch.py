@router.post("/work-orders/{wo_id}/chat-attachment")
async def upload_chat_attachment(
    wo_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Uploads an attachment for a chat message and returns its URL."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    if getattr(wo, 'is_chat_closed', False):
        raise HTTPException(status_code=403, detail="Chat is closed")
        
    allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only PDF and Images are allowed.")
        
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")
        
    import uuid
    from datetime import datetime
    
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    if file.content_type == "application/pdf":
        ext = "pdf"
    elif "image" in file.content_type:
        ext = file.content_type.split('/')[-1]
        
    filename = f"chat_attachments/{wo_id}/{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}.{ext}"
    
    from app.storage import upload_file
    try:
        url = upload_file(content, filename, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
        
    file_type = "pdf" if file.content_type == "application/pdf" else "image"
        
    return {
        "url": url,
        "name": file.filename,
        "type": file_type
    }
