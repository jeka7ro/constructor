import re

f = 'frontend/src/components/MobileAgenda.jsx'
with open(f, 'r') as file:
    c = file.read()

# Fix 1: Change 'Azi' fallback to 'Aujourd\\'hui'
c = c.replace("t('general.today', 'Azi')", 't("general.today", "Aujourd\'hui")')

# Fix 2: Filter days based on isHistory
old_filter = 'days.filter(day => isHistory || new Date(format(day, "yyyy-MM-dd") + "T00:00:00") >= new Date(format(new Date(), "yyyy-MM-dd") + "T00:00:00")).map(day => {'

new_filter = """days.filter(day => {
                    const d = new Date(format(day, "yyyy-MM-dd") + "T00:00:00");
                    const today = new Date(format(new Date(), "yyyy-MM-dd") + "T00:00:00");
                    return isHistory ? d < today : d >= today;
                }).map(day => {"""

c = c.replace(old_filter, new_filter)

with open(f, 'w') as file:
    file.write(c)
