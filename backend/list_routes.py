import sys
import os
sys.path.append(os.getcwd())
import importlib
import traceback

try:
    # app is in main.py not app/main.py
    main_module = importlib.import_module("main")
    app = getattr(main_module, "app")
    for route in app.routes:
        print(route.path)
except Exception as e:
    traceback.print_exc()
