import re

f = 'frontend/src/components/MobileAgenda.jsx'
with open(f, 'r') as file:
    c = file.read()

# 1. Change props
old_props = 'export default function MobileAgenda({ orders, onOrderClick, currentWeek, setCurrentWeek, isHistory = false }) {'
new_props = 'export default function MobileAgenda({ orders, onOrderClick, currentDate, setCurrentDate, isHistory = false }) {'
c = c.replace(old_props, new_props)

# 2. Change days array
# old: const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeek, i));
# new: const days = [currentDate];
old_days = 'const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeek, i));'
new_days = 'const days = [currentDate];'
c = c.replace(old_days, new_days)

# 3. Change header navigation
old_header = """            <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                <button 
                    onClick={() => setCurrentWeek(w => subWeeks(w, 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {format(currentWeek, 'MMM yyyy', { locale })}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                        {format(currentWeek, 'd', { locale })} - {format(addDays(currentWeek, 6), 'd MMM', { locale })}
                    </span>
                </div>

                <button 
                    onClick={() => setCurrentWeek(w => addWeeks(w, 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>"""

new_header = """            <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                <button 
                    onClick={() => setCurrentDate(d => addDays(d, -1))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex flex-col items-center flex-1 text-center">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {format(currentDate, 'MMM yyyy', { locale })}
                    </span>
                    <span className="text-sm font-bold text-slate-900 capitalize">
                        {format(currentDate, 'EEEE, d MMM', { locale })}
                    </span>
                </div>

                <button 
                    onClick={() => setCurrentDate(d => addDays(d, 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>"""
c = c.replace(old_header, new_header)

# 4. Remove the isHistory filter from days mapping.
# Since days is just ONE day, we don't need to filter it.
old_filter = """                {days.filter(day => {
                    const d = new Date(format(day, "yyyy-MM-dd") + "T00:00:00");
                    const today = new Date(format(new Date(), "yyyy-MM-dd") + "T00:00:00");
                    return isHistory ? d < today : d >= today;
                }).map(day => {"""
new_filter = """                {days.map(day => {"""
c = c.replace(old_filter, new_filter)

# 5. Remove the day header inside the list, since it's now in the top header. Or keep it?
# The user might like the day header. But if it's single day view, the top header already says the day.
# So we can just remove the inner Header Zi.
old_day_header = """                            {/* Header Zi */}
                            <div className="flex items-center gap-2 px-1">
                                <div className={`w-2 h-2 rounded-full ${isTodayFlag ? 'bg-blue-500' : 'bg-slate-300'}`} />
                                <h3 className={`text-sm font-bold capitalize ${isTodayFlag ? 'text-blue-600' : 'text-slate-700'}`}>
                                    {isTodayFlag ? t("general.today", "Aujourd'hui") + ' • ' + formatDayName(day) : formatDayName(day)}
                                </h3>
                                <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                                    {dayOrders.length} {dayOrders.length === 1 ? t('general.order', 'chantier') : t('general.orders', 'chantiers')}
                                </span>
                            </div>"""

new_day_header = """                            {/* Header Zi - Ascuns pentru ca e deja in top header in view zilnic */}
                            {isTodayFlag && (
                                <div className="flex items-center gap-2 px-1 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide">
                                        {t("general.today", "Aujourd'hui")}
                                    </h3>
                                    <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                                        {dayOrders.length} {dayOrders.length === 1 ? t('general.order', 'chantier') : t('general.orders', 'chantiers')}
                                    </span>
                                </div>
                            )}
                            {!isTodayFlag && (
                                <div className="flex justify-end px-1 mb-1">
                                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                                        {dayOrders.length} {dayOrders.length === 1 ? t('general.order', 'chantier') : t('general.orders', 'chantiers')}
                                    </span>
                                </div>
                            )}"""
c = c.replace(old_day_header, new_day_header)

with open(f, 'w') as file:
    file.write(c)
