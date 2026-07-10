import re

f = 'frontend/src/components/MobileAgenda.jsx'
with open(f, 'r') as file:
    c = file.read()

# The target block to replace (the whole top row and bottom weather)
# First we find the start of the top row: `<div className="flex items-start gap-3">`
# and the clock div inside it.
top_row_regex = r'(<div className="flex items-start gap-3">\s*<div className="flex items-center gap-2 px-2\.5 py-1 rounded-lg shrink-0" style={{ backgroundColor: color \+ \'26\' }}>.*?<\/div>\s*<\/div>)'

# Actually it's easier to find the whole block by exact substring since I just saw it.
top_row_exact = """                                                    <div className="flex items-start gap-3">
                                                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg shrink-0" style={{ backgroundColor: color + '26' }}>
                                                            <Clock className="w-3.5 h-3.5 opacity-80" />
                                                            <span className="text-sm font-bold opacity-90">{time}</span>
                                                        </div>
                                                        <div className="flex-1 text-right">
                                                            {sandTons > 0 && (
                                                                <span className="text-xs font-bold px-2 py-1 rounded-md inline-block" style={{ backgroundColor: color + '1a', color: color }}>
                                                                    {sandTons.toFixed(1)} T {t('general.sand', 'Sable')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>"""

new_top_row = """                                                    <div className="flex items-start justify-between w-full">
                                                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg shrink-0" style={{ backgroundColor: color + '26' }}>
                                                            <Clock className="w-3.5 h-3.5 opacity-80" />
                                                            <span className="text-sm font-bold opacity-90">{time}</span>
                                                        </div>
                                                        <div className="flex-1 flex justify-center scale-[1.15] origin-top mt-[-4px]">
                                                            {(wo.site_lat && wo.site_lng) ? (
                                                                <WeatherWidget lat={wo.site_lat} lon={wo.site_lng} dateStr={wo.start_date || dateStr} />
                                                            ) : null}
                                                        </div>
                                                        <div className="shrink-0 text-right">
                                                            {sandTons > 0 && (
                                                                <span className="text-xs font-bold px-2 py-1 rounded-md inline-block" style={{ backgroundColor: color + '1a', color: color }}>
                                                                    {sandTons.toFixed(1)} T {t('general.sand', 'Sable')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>"""

if top_row_exact in c:
    c = c.replace(top_row_exact, new_top_row)
else:
    print("Could not find top row")

weather_bottom_exact = """                                                                        <div className="flex justify-end items-end pt-0 mt-0">
                                                        <div className="text-right flex-shrink-0 -mr-2 -mb-2">
                                                            {(wo.site_lat && wo.site_lng) ? (
                                                                <div className="scale-100 origin-bottom-right">
                                                                    <WeatherWidget lat={wo.site_lat} lon={wo.site_lng} dateStr={wo.start_date || dateStr} />
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>"""

if weather_bottom_exact in c:
    c = c.replace(weather_bottom_exact, "")
else:
    print("Could not find weather bottom exact block, attempting regex")
    import re
    # Try removing the bottom weather
    bottom_weather_regex = r'<div className="flex justify-end items-end pt-0 mt-0">\s*<div className="text-right flex-shrink-0 -mr-2 -mb-2">.*?</WeatherWidget>\s*</div>\s*\) : null\}\s*</div>\s*</div>'
    c = re.sub(bottom_weather_regex, '', c, flags=re.DOTALL)

with open(f, 'w') as file:
    file.write(c)
