import React from 'react';
import MiniLiveTrackingMap from '../../components/MiniLiveTrackingMap';

export default function LiveTracking() {
    return (
        <div className="pb-1 md:pb-2 pt-0 bg-slate-50 dark:bg-slate-950">
            <div className="w-full h-[calc(100dvh-112px)] md:h-[calc(100vh-76px)] md:min-h-[640px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col overflow-hidden">
                <MiniLiveTrackingMap />
            </div>
        </div>
    );
}
