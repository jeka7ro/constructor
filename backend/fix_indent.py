with open("app/services/robaws_scraper.py", "r") as f:
    lines = f.readlines()

for i in range(84, 216):  # Python indices 84 to 215 correspond to lines 85 to 216
    if lines[i].strip() != "":
        lines[i] = "    " + lines[i]

with open("app/services/robaws_scraper.py", "w") as f:
    f.writelines(lines)
