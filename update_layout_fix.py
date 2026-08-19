with open('/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/frontend/src/pages/admin/ClientDetail.jsx', 'r') as f:
    lines = f.readlines()

with open('/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/frontend/src/pages/admin/ClientDetail.jsx', 'w') as f:
    for line in lines:
        if line.strip() == "</div>" and lines.index(line) == 257:
            # We skip this stray div
            pass
        else:
            f.write(line)
