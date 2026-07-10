f = 'frontend/src/components/WeatherWidget.jsx'
with open(f, 'r') as file:
    c = file.read()

c = c.replace('w-3 h-3', 'w-4 h-4')
c = c.replace('px-1.5 py-0.5', 'px-2 py-1')
c = c.replace('text-[9px]', 'text-xs')

with open(f, 'w') as file:
    file.write(c)

