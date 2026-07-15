import py_compile
try:
    py_compile.compile("app/api/admin_logistics.py", doraise=True)
    print("Syntax OK")
except Exception as e:
    print(f"Syntax Error: {e}")
