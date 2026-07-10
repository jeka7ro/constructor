import re

f = 'frontend/src/pages/employee/WorkerOrdersPage.jsx'
with open(f, 'r') as file:
    c = file.read()

# Replace the Draft status with Weather in Header
header_old = """                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLOR[selected.status] || ''}`}>
                        {STATUS_LABEL[selected.status] || selected.status}
                    </span>"""
header_new = """                    <div className="shrink-0 flex justify-end">
                        {(selected.site_lat && selected.site_lng) ? (
                            <div className="scale-90 origin-right">
                                <WeatherWidget lat={selected.site_lat} lon={selected.site_lng} dateStr={selected.start_date || new Date().toISOString()} />
                            </div>
                        ) : null}
                    </div>"""
c = c.replace(header_old, header_new)

# Translate labels
translations = {
    'Detalii Lucrare': "Détails du chantier",
    'Adresa': "Adresse",
    'Instructiuni Acces': "Instructions d'accès",
    'Contact': "Contact",
    'Documente / Planuri Atașate': "Documents / Plans",
    'Documente & Photos Instructiuni': "Documents & Instructions",
    'Note': "Notes",
    'Prima Sosire Echipa': "Première arrivée",
    'Check-in la': "Pointé à",
    'Check-out la': "Dépointé à",
    'Istoricul Meu': "Mon historique",
    'Matériaux Estimate': "Matériaux (Estimé)",
    'Date Reale Șantier (Completate de Șef)': "Données réelles (Chef)",
    'Alte Matériaux Consumate': "Autres matériaux consommés",
    'Cantitati Executate': "Quantités exécutées",
    'Photos Interne (Consum Matériaux, Situatie Teren)': "Photos internes",
    'Photos Finalizare (merg la client)': "Photos de finalisation",
    'Poză Calculator Mașină (OBLIGATORIU pt OCR)': "Photo de la machine (Obligatoire)",
    'Date Măsurători Lucrare (OBLIGATORIU)': "Données de mesure",
    'Pozitia': "Position",
    'Nisip (estimat)': "Sable (estimé)"
}

for k, v in translations.items():
    c = c.replace(f'"{k}"', f'"{v}"')
    c = c.replace(f"'{k}'", f"'{v}'")

# Also fix the "Sugestie Stație Sable" to hide it completely by default
# "pentru sef de chipe statiile de nisip nu sunt imprtante as aca poti le tii pe ff, pan un vrea el sa le activeze."
# It's currently rendered if `bestStation` is true. Let's make it so that the user has to click something, or just hide the block unless `showStation` is true? But there must be a button.
# Right now, there is a header "Sugestie Stație Sable" which when clicked toggles `showStation`. I think "le tii pe ff" means keeping the toggle off by default, which is already `const [showStation, setShowStation] = useState(false)`.
# Wait, maybe he means hide the whole block in a settings toggle?
# Let's just wrap the `bestStation && ( ... )` block inside a toggle?
# He said "poti le tii pe off, pan un vrea el sa le activeze." So maybe add a boolean state `enableStations` and a button to show it, or maybe he means the `showStation` is already off, but it still shows the header.
# Let's just make the "Sugestie Statie Nisip" button very small and subtle, or hidden by a master toggle `showStationsBlock`.
pass

# Let's see the bestStation block:
station_old = """                                        {bestStation && ("""
station_new = """                                        {bestStation && showStation && ("""
# wait, if I do `showStation &&`, he will never be able to toggle it if the button is inside.
# The button is:
# <div onClick={() => setShowStation(!showStation)}>... Sugestie ... </div>
# If I make it off by default, it's just the header. 
# Let's look at the actual code in TabInfo.
