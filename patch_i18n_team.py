import json
import glob

files = glob.glob("frontend/src/i18n/*.json")

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    changed = False

    if "admin" in data and "team" in data["admin"]:
        if "Davide Chape" in data["admin"]["team"]:
            data["admin"]["team"] = "Équipe"
            changed = True

    if "work_order_detail" in data and "team_leader_details" in data["work_order_detail"]:
        if "title" in data["work_order_detail"]["team_leader_details"]:
            if "Davide" in data["work_order_detail"]["team_leader_details"]["title"]:
                data["work_order_detail"]["team_leader_details"]["title"] = "Équipe (Confirmations & Quantités)"
                changed = True

    if changed:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"Updated {file_path}")

print("Done translations")
