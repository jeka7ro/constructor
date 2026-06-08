import requests
import re
import time

links = [
    ("BAZA GHENT", "https://maps.app.goo.gl/aH7b8oxeM2RyGgXr9"),
    ("BAZZA NINOVE", "https://maps.app.goo.gl/kesb3LFEHFgcZ8Su6"),
    ("NHM WIELSBEKE", "https://maps.app.goo.gl/DQ9wzhCX1E2zKFgF9"),
    ("NHM BAZA OSTENDE", "https://g.co/kgs/AaQphaU"),
    ("BAZA DOUR", "https://g.co/kgs/4JPbCwb"),
    ("BAZA LUMMEN (Minera)", "https://www.google.com/maps/place/Minera,+Industriestraat+16,+3560+Lummen/@51.0107703,5.2366141"),
    ("BAZA ATH", "https://g.co/kgs/TyWD8GT"),
    ("Baza dranaco Antwerpen", "https://maps.google.com/maps?q=51.237220764160156%2C4.45698356628418"),
    ("MINERA LUMEN", "https://maps.app.goo.gl/iY8JdxrrCfxfXuPo8"),
    ("BAZZA HALLE", "https://g.co/kgs/F4nv8z1"),
    ("BAZA SODEMAF TOURNAI", "https://maps.app.goo.gl/x5pYYoQifk855UTi8"),
    ("BAZA JOASSIN NAMUR", "https://maps.app.goo.gl/dcPw35MFzi7yWurP9"),
    ("BAZA ERPE-MERE", "https://maps.app.goo.gl/oL6gzcDqiuwCtEsy8"),
    ("BAZA SABLE ET GRANULATS LIEGE", "https://maps.app.goo.gl/CTiJhCCrnq72KwEP6"),
    ("Baza Antoing", "https://maps.google.com/maps?q=50.56235885620117%2C3.437950611114502"),
    ("BAZA AALST", "https://maps.app.goo.gl/1hqaFYv5sYJguP53A"),
    ("BAZA GENT", "https://maps.app.goo.gl/9j7osnN5EoTiQkBk9"),
    ("BAZA BOOM", "https://maps.app.goo.gl/5xprCtxpvYjrkDaS7"),
    ("BAZA TEMSE", "https://maps.app.goo.gl/c9o9KhN7nKEFcxok6"),
    ("BAZA ANTWERP", "https://maps.google.com?q=51.2373003,4.4571109"),
    ("BAZA BOOM 2", "https://maps.app.goo.gl/N5gSSM18azPuqV218"),
    ("BAZA ECODREAM LIEGE", "https://maps.app.goo.gl/6iM4hSjB7aWemqNo7"),
    ("BAZA INTRE MONS SI ATH", "https://maps.app.goo.gl/rUuf5rwC53GQLy247")
]

results = []
for name, url in links:
    try:
        # Check if URL already has coordinates
        match = re.search(r'[-+]?\d*\.\d+,\s*[-+]?\d*\.\d+', url)
        if match:
            # handle %2C
            pass
        
        # Follow redirects
        r = requests.head(url, allow_redirects=True, timeout=10)
        final_url = r.url
        
        # Search for !3d(lat)!4d(lon) or @lat,lon
        lat, lon = None, None
        m = re.search(r'!3d([-+]?[0-9]*\.?[0-9]+)!4d([-+]?[0-9]*\.?[0-9]+)', final_url)
        if m:
            lat, lon = m.groups()
        else:
            m2 = re.search(r'@([-+]?[0-9]*\.?[0-9]+),([-+]?[0-9]*\.?[0-9]+)', final_url)
            if m2:
                lat, lon = m2.groups()
            else:
                m3 = re.search(r'q=([-+]?[0-9]*\.?[0-9]+)(?:%2C|,)([-+]?[0-9]*\.?[0-9]+)', final_url)
                if m3:
                    lat, lon = m3.groups()
                    
        print(f"{{ name: '{name}', lat: {lat}, lng: {lon} }},")
    except Exception as e:
        print(f"// Error {name}: {e}")
