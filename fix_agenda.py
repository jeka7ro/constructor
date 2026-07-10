import re

f = 'frontend/src/components/MobileAgenda.jsx'
with open(f, 'r') as file:
    c = file.read()

# 1. Remove the title paragraph
title_p = '<p className="text-sm text-slate-500 mb-2">{wo.title}</p>'
c = c.replace(title_p, '')

# 2. Add Google Maps icon near the distance
# The distance and address are rendered here:
# <div className="mt-4 flex items-start gap-2 text-slate-500">
#     <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
#     <div className="flex-1 text-sm leading-tight">
#         <p>{wo.address_street || ''}</p>
#         <p>{wo.address_city || ''}</p>
#         <div className="text-xs font-bold text-amber-700 mt-1 flex items-center gap-1">
#             <DistanceText lat1={prevWo ? prevWo.address_lat : null} lon1={prevWo ? prevWo.address_lng : null} lat2={wo.address_lat} lon2={wo.address_lng} label={prevWo ? "km du chantier précédent" : "km de la base"} />
#         </div>
#     </div>
# </div>

# We need to add the icon inside the text-xs font-bold text-amber-700 container or next to it.
# Let's replace the whole distance div block
old_distance_block = """<div className="text-xs font-bold text-amber-700 mt-1 flex items-center gap-1">
                                                <DistanceText lat1={prevWo ? prevWo.address_lat : null} lon1={prevWo ? prevWo.address_lng : null} lat2={wo.address_lat} lon2={wo.address_lng} label={prevWo ? "km du chantier précédent" : "km de la base"} />
                                            </div>"""

# And we will import Navigation or Map from lucide-react if not already imported
# Actually let's use a nice google maps SVG icon, or just Map/Navigation from lucide-react.
# Let's see what is imported from lucide-react.
# It imports: import { ChevronLeft, ChevronRight, MapPin, CloudRain, Clock, Calendar as CalendarIcon } from 'lucide-react'
# Let's add Navigation.
c = c.replace("CalendarIcon } from 'lucide-react'", "CalendarIcon, Navigation } from 'lucide-react'")

# If the replacement failed, let's just use MapPin or a custom icon. But we'll try replacing import.

new_distance_block = """<div className="flex items-center justify-between w-full mt-1">
                                                <div className="text-xs font-bold text-amber-700 flex items-center gap-1">
                                                    <DistanceText lat1={prevWo ? prevWo.address_lat : null} lon1={prevWo ? prevWo.address_lng : null} lat2={wo.address_lat} lon2={wo.address_lng} label={prevWo ? "km du chantier précédent" : "km de la base"} />
                                                </div>
                                                <a 
                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((wo.address_street || '') + ' ' + (wo.address_city || ''))}`}
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                >
                                                    <Navigation className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">Naviguer</span>
                                                </a>
                                            </div>"""

c = c.replace(old_distance_block, new_distance_block)

with open(f, 'w') as file:
    file.write(c)
