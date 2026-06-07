import re

with open("app/api/admin_work_orders.py", "r") as f:
    code = f.read()

old_create = """        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))"""

new_create = """        except Exception as e:
            db.rollback()
            import traceback
            trace = traceback.format_exc()
            raise HTTPException(status_code=500, detail=f"DEBUG_ERROR: {str(e)} | TRACE: {trace}")"""

code = code.replace(old_create, new_create)

with open("app/api/admin_work_orders.py", "w") as f:
    f.write(code)

