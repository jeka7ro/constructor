import requests

url = "http://127.0.0.1:8000/api/admin/work-orders?status=draft,pending&is_quote=true&slim=true"
headers = {"Authorization": "Bearer TEST_IF_NEEDED"} # Wait, I might need a token if it's protected
