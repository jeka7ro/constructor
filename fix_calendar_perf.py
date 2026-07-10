import re

f = 'frontend/src/components/ShortWorksCalendar.jsx'
with open(f, 'r') as file:
    c = file.read()

# Add useMemo for sandPerDay
old_sand = """    const dynamicStartHour = useMemo(() => {"""
new_sand = """    const sandPerDay = useMemo(() => {
        const sandMap = {};
        weeklyOrders.forEach(wo => {
            const dateStr = wo.start_date || wo.deadline_date;
            if (!dateStr) return;
            try {
                const datePart = dateStr.split('T')[0];
                sandMap[datePart] = (sandMap[datePart] || 0) + calculateOrderSand(wo);
            } catch (e) {}
        });
        return sandMap;
    }, [weeklyOrders]);

    const dynamicStartHour = useMemo(() => {"""
c = c.replace(old_sand, new_sand)

# Replace the loop inside weekDays.map
old_map = """                            const isToday = isSameDay(day, new Date());
                            let dailySand = 0;
                            weeklyOrders.forEach(wo => {
                                const dateStr = wo.start_date || wo.deadline_date;
                                if (!dateStr) return;
                                try {
                                    const datePart = dateStr.split('T')[0];
                                    const [year, month, d] = datePart.split('-').map(Number);
                                    const woDate = new Date(year, month - 1, d, 12, 0, 0);
                                    if (isSameDay(day, woDate)) {
                                        dailySand += calculateOrderSand(wo);
                                    }
                                } catch (e) {}
                            });
                            const sandDisplay = dailySand > 0 ? `${dailySand.toFixed(1)}T` : '';"""

new_map = """                            const isToday = isSameDay(day, new Date());
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const dailySand = sandPerDay[dayStr] || 0;
                            const sandDisplay = dailySand > 0 ? `${dailySand.toFixed(1)}T` : '';"""
c = c.replace(old_map, new_map)

# Replace the inner map for dayOrders which also filters every hover
old_hover = """                                        const dayStr = format(day, 'yyyy-MM-dd');
                                        const dayOrders = weeklyOrders.filter(wo => {
                                            const ds = (wo.start_date || wo.deadline_date || '').split('T')[0];
                                            return ds === dayStr;
                                        });"""

new_hover = """                                        const dayOrders = weeklyOrders.filter(wo => {
                                            const ds = (wo.start_date || wo.deadline_date || '').split('T')[0];
                                            return ds === dayStr;
                                        });"""
c = c.replace(old_hover, new_hover)


with open(f, 'w') as file:
    file.write(c)
