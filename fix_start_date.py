import re

f = 'frontend/src/pages/employee/WorkerOrdersPage.jsx'
with open(f, 'r') as file:
    c = file.read()

old_state = """    const [currentDate, setCurrentDate] = useState(() => {
        // Dacă e history, vrem să pornim de la ziua de ieri ca punct de start vizual? Nu neapărat. Dar utilizatorul merge înapoi.
        return new Date();
    });"""

new_state = """    const [currentDate, setCurrentDate] = useState(() => {
        const d = new Date();
        if (isHistory) d.setDate(d.getDate() - 1);
        return d;
    });"""

c = c.replace(old_state, new_state)

with open(f, 'w') as file:
    file.write(c)
