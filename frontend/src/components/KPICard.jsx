import React from 'react';

export default function KPICard({ label, value, icon: Icon, colorTheme = 'blue', onClick, pulse, isText, active, subtitle, sub }) {
    const themes = {
        blue:   { dot: 'bg-sky-500',     pill: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/25',         iconText: 'text-sky-600 dark:text-sky-400',     activeBorder: 'border-sky-500/60 ring-1 ring-sky-500/20' },
        green:  { dot: 'bg-emerald-500', pill: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25', iconText: 'text-emerald-600 dark:text-emerald-400', activeBorder: 'border-emerald-500/60 ring-1 ring-emerald-500/20' },
        emerald:{ dot: 'bg-emerald-500', pill: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25', iconText: 'text-emerald-600 dark:text-emerald-400', activeBorder: 'border-emerald-500/60 ring-1 ring-emerald-500/20' },
        orange: { dot: 'bg-amber-500',   pill: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/25',     iconText: 'text-amber-600 dark:text-amber-400',   activeBorder: 'border-amber-500/60 ring-1 ring-amber-500/20' },
        amber:  { dot: 'bg-amber-500',   pill: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/25',     iconText: 'text-amber-600 dark:text-amber-400',   activeBorder: 'border-amber-500/60 ring-1 ring-amber-500/20' },
        red:    { dot: 'bg-rose-500',    pill: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25',         iconText: 'text-rose-600 dark:text-rose-400',    activeBorder: 'border-rose-500/60 ring-1 ring-rose-500/20' },
        purple: { dot: 'bg-violet-500',  pill: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/25', iconText: 'text-violet-600 dark:text-violet-400', activeBorder: 'border-violet-500/60 ring-1 ring-violet-500/20' },
        indigo: { dot: 'bg-indigo-500',  pill: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/25', iconText: 'text-indigo-600 dark:text-indigo-400', activeBorder: 'border-indigo-500/60 ring-1 ring-indigo-500/20' },
        slate:  { dot: 'bg-slate-400',   pill: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700', iconText: 'text-slate-500 dark:text-slate-400', activeBorder: 'border-slate-400 ring-1 ring-slate-400/20' }
    };
    const theme = themes[colorTheme] || themes.blue;
    const subLabel = subtitle || sub;

    return (
        <div
            onClick={onClick}
            className={`group rounded-[22px] bg-white dark:bg-slate-900 p-6 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] transition-all duration-200 flex flex-col justify-between min-w-0 ${onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700' : ''} ${active ? `border-[1.5px] ${theme.activeBorder}` : 'border border-slate-200/90 dark:border-slate-800'}`}
        >
            <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[16.5px] font-bold text-slate-700 dark:text-slate-200 truncate">
                        {label}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {pulse && (
                            <span className={`w-3 h-3 rounded-full ${theme.dot} animate-pulse`} />
                        )}
                        {Icon ? (
                            <Icon className={`w-5 h-5 ${theme.iconText}`} />
                        ) : (
                            <span className={`w-3 h-3 rounded-full ${theme.dot}`} />
                        )}
                    </div>
                </div>
                <div className={`${isText ? 'text-[28px]' : 'text-[34px]'} font-black tracking-tight text-slate-950 dark:text-white leading-tight tabular-nums truncate`}>
                    {value}
                </div>
            </div>
            {subLabel && (
                <div className="mt-3">
                    <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-[14px] font-extrabold border truncate max-w-full ${theme.pill}`}>
                        {subLabel}
                    </span>
                </div>
            )}
        </div>
    );
}
