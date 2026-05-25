import re

file_path = "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/backend/main.py"
with open(file_path, "r") as f:
    content = f.read()

# 1. Add unread-count endpoint
unread_endpoint = """
@app.get("/api/user/complaints/unread-count", tags=["user-complaints"])
def user_complaints_unread_count(
    db=Depends(_get_db),
    current_user: UserModel = Depends(get_current_user),
):
    count = db.query(ComplaintModel).filter(
        ComplaintModel.user_id == current_user.id,
        ComplaintModel.admin_response != None,
        ComplaintModel.user_seen_response == False
    ).count()
    return {"count": count}

@app.get("/api/user/complaints", tags=["user-complaints"])
"""
content = content.replace("@app.get(\"/api/user/complaints\", tags=[\"user-complaints\"])", unread_endpoint)

# 2. Modify user_list_complaints to mark as seen and return user_seen_response
list_body = """    complaints = db.query(ComplaintModel).filter(
        ComplaintModel.user_id == current_user.id
    ).order_by(ComplaintModel.created_at.desc()).all()

    modified = False
    for c in complaints:
        if c.admin_response and not c.user_seen_response:
            c.user_seen_response = True
            modified = True
            
    if modified:
        db.commit()

    return [
        {
            "id": c.id,
            "title": c.title,
            "content": c.content,
            "status": c.status,
            "admin_response": c.admin_response,
            "user_seen_response": c.user_seen_response,
            "responded_at": str(c.responded_at) if c.responded_at else None,
            "created_at": str(c.created_at),
        }
        for c in complaints
    ]"""

# We need to replace the old list_body
content = re.sub(r'    complaints = db\.query\(ComplaintModel\).*?for c in complaints\n    \]', list_body, content, flags=re.DOTALL)

with open(file_path, "w") as f:
    f.write(content)
