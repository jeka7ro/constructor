from bs4 import BeautifulSoup
with open("backend/robaws_dash_dump.html", "r") as f:
    soup = BeautifulSoup(f.read(), "html.parser")
    rows = soup.find_all("tr", attrs={"dynamicoverviewtablerow": ""})
    for row in rows:
        tds = row.find_all("td")
        if len(tds) < 11: continue
        ext_id = tds[1].get_text(strip=True)
        date = tds[2].get_text(strip=True)
        title = tds[3].get_text(strip=True)
        client = tds[7].get_text(strip=True)
        address = tds[10].get_text(strip=True)
        print(f"{ext_id} | {date} | {client} | {address} | {title}")
