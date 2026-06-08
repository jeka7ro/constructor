with open("app/services/robaws_scraper.py", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "updated_count += 1" in line:
        lines[i] = "                        " + "updated_count += 1\n"

with open("app/services/robaws_scraper.py", "w") as f:
    f.writelines(lines)
