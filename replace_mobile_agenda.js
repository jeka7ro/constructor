const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/MobileAgenda.jsx', 'utf8');

// 1. Replace the state and days logic
const logicSearch = `    const [viewMode, setViewMode] = React.useState('week'); // 'day' | 'week'

    const days = viewMode === 'day' 
        ? [currentDate] 
        : [...Array(7)].map((_, i) => addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i));

    const ordersByDay = useMemo(() => {
        const grouped = {};
        days.forEach(d => {
            const dateStr = format(d, 'yyyy-MM-dd');
            grouped[dateStr] = [];
        });

        orders.forEach(wo => {
            const woDateStr = (wo.start_date || wo.deadline_date || '').split('T')[0];
            if (grouped[woDateStr]) {
                grouped[woDateStr].push(wo);
            }
        });

        // Sort orders inside each day by time
        Object.values(grouped).forEach(dayOrders => {
            dayOrders.sort((a, b) => {
                const tA = a.start_time || '00:00';
                const tB = b.start_time || '00:00';
                return tA.localeCompare(tB);
            });
        });

        return grouped;
    }, [orders, days]);`;

const logicReplace = `    const weekDays = useMemo(() => {
        return [...Array(7)].map((_, i) => addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i));
    }, [currentDate]);

    const days = [currentDate];

    const ordersByDay = useMemo(() => {
        const grouped = {};
        weekDays.forEach(d => {
            const dateStr = format(d, 'yyyy-MM-dd');
            grouped[dateStr] = [];
        });

        orders.forEach(wo => {
            const woDateStr = (wo.start_date || wo.deadline_date || '').split('T')[0];
            if (grouped[woDateStr]) {
                grouped[woDateStr].push(wo);
            }
        });

        Object.values(grouped).forEach(dayOrders => {
            dayOrders.sort((a, b) => {
                const tA = a.start_time || '00:00';
                const tB = b.start_time || '00:00';
                return tA.localeCompare(tB);
            });
        });

        return grouped;
    }, [orders, weekDays]);`;

code = code.replace(logicSearch, logicReplace);

// 2. Replace the UI Header and Toggle
const uiSearch = `        <div className="flex flex-col gap-4 pb-10">
            {/* Navigare Saptamana */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <button 
                    onClick={() => setCurrentDate(d => addDays(d, -1))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex flex-col items-center flex-1 text-center">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {format(currentDate, 'MMM yyyy', { locale })}
                        </span>
                        {/* WeatherWidget removed from here as per user request */}
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                        {viewMode === 'day' ? format(currentDate, 'EEEE, d MMM', { locale }) : \`\${format(days[0], 'd MMM', { locale })} - \${format(days[6], 'd MMM', { locale })}\`}
                    </span>
                </div>

                <button 
                    onClick={() => setCurrentDate(d => addDays(d, 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Toggle Day/Week */}
            <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl mx-4 shadow-inner">
                <button
                    onClick={() => setViewMode('day')}
                    className={\`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all \${viewMode === 'day' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}\`}
                >
                    {t('agenda.day', 'Zi')}
                </button>
                <button
                    onClick={() => setViewMode('week')}
                    className={\`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all \${viewMode === 'week' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}\`}
                >
                    {t('agenda.week', 'Săptămână')}
                </button>
            </div>`;

const uiReplace = `        <div className="flex flex-col pb-10">
            {/* Header: LUNA, ANUL și Navigare Săptămâni */}
            <div className="flex items-center justify-between px-6 pt-2 pb-4">
                <button 
                    onClick={() => setCurrentDate(d => addWeeks(d, -1))}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                        {format(currentDate, 'yyyy', { locale })}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">
                        {format(currentDate, 'MMMM', { locale })}
                    </span>
                </div>

                <button 
                    onClick={() => setCurrentDate(d => addWeeks(d, 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shrink-0"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Apple Style Week Strip */}
            <div className="flex items-center justify-between px-4 pb-4 mb-4">
                {weekDays.map((d, i) => {
                    const isSelected = isSameDay(d, currentDate);
                    const isToday = isSameDay(d, new Date());
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const hasOrders = (ordersByDay[dateStr] || []).length > 0;
                    
                    return (
                        <button 
                            key={i}
                            onClick={() => setCurrentDate(d)}
                            className="flex flex-col items-center justify-center gap-1.5 group w-10 outline-none"
                        >
                            <span className={\`text-[10px] font-bold uppercase \${isSelected ? 'text-blue-600 dark:text-blue-400' : isToday ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}\`}>
                                {format(d, 'EEEEE', { locale })}
                            </span>
                            <div className={\`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all \${isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : isToday ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}\`}>
                                {format(d, 'd')}
                            </div>
                            {/* Dot for events */}
                            <div className="h-1 flex items-center justify-center">
                                {hasOrders && (
                                    <div className={\`w-1 h-1 rounded-full \${isSelected ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-300 dark:bg-slate-600'}\`} />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>`;

code = code.replace(uiSearch, uiReplace);

// 3. We also need to remove the "Header Zi - Arătat dacă e azi SAU în modul săptămână" because the week strip covers this visually!
// Actually, it's nice to keep a small header for the day itself like "LUNI, 3 AUG   3 chantiers". The Apple calendar keeps the date header in the list view as well!
const dayHeaderSearch = `                            {/* Header Zi - Arătat dacă e azi SAU în modul săptămână */}
                            {(isTodayFlag || viewMode === 'week') && (
                                <div className="flex items-center gap-2 px-1 mb-1 mt-2">
                                    {isTodayFlag && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                    <h3 className={\`text-sm font-bold uppercase tracking-wide \${isTodayFlag ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}\`}>
                                        {isTodayFlag ? t("general.today", "Aujourd'hui") : format(day, 'EEEE, d MMM', { locale })}
                                    </h3>
                                    <span className="ml-auto text-xs font-semibold text-slate-400 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                        {dayOrders.length} {dayOrders.length === 1 ? t('general.order', 'chantier') : t('general.orders', 'chantiers')}
                                    </span>
                                </div>
                            )}`;

const dayHeaderReplace = `                            {/* Header Zi */}
                            <div className="flex items-center gap-2 px-4 mb-2 mt-1">
                                {isTodayFlag && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                <h3 className={\`text-xs font-bold uppercase tracking-widest \${isTodayFlag ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}\`}>
                                    {isTodayFlag ? t("general.today", "Aujourd'hui") : format(day, 'EEEE, d MMM', { locale })}
                                </h3>
                                <span className="ml-auto text-xs font-semibold text-slate-400 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                    {dayOrders.length} {dayOrders.length === 1 ? t('general.order', 'chantier') : t('general.orders', 'chantiers')}
                                </span>
                            </div>`;

code = code.replace(dayHeaderSearch, dayHeaderReplace);

fs.writeFileSync('frontend/src/components/MobileAgenda.jsx', code);
