import re

f = 'frontend/src/pages/employee/WorkerOrdersPage.jsx'
with open(f, 'r') as file:
    c = file.read()

# Add a state for enableStations
state_old = "    const [showStation, setShowStation] = useState(false)"
state_new = "    const [showStation, setShowStation] = useState(false)\n    const [enableStations, setEnableStations] = useState(false)"
c = c.replace(state_old, state_new)

# Wrap the bestStation block
block_old = """                                        {bestStation && ("""
block_new = """                                        <div className="pt-2 mt-2 flex justify-center">
                                            <button 
                                                onClick={() => setEnableStations(!enableStations)}
                                                className="text-[10px] font-bold text-amber-600 hover:text-amber-700 uppercase tracking-wider px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50"
                                            >
                                                {enableStations ? "Masquer les stations de sable" : "Afficher les stations de sable"}
                                            </button>
                                        </div>
                                        {bestStation && enableStations && ("""
c = c.replace(block_old, block_new)

with open(f, 'w') as file:
    file.write(c)

