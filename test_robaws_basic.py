import requests

api_key = "6A7MI3DVO8RRX6LKEU5F"
email = "davidechapeteam1@gmail.com"
url = "https://app.robaws.com/api/v2/projects"

auths = [
    (api_key, ""),
    (api_key, api_key),
    ("", api_key),
    (email, api_key),
    (api_key, email)
]

for auth in auths:
    r = requests.get(url, auth=auth, headers={"Accept": "application/json"})
    print(f"Auth {auth[0][:5]}:{auth[1][:5]} -> {r.status_code}")
