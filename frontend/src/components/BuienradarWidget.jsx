import React, { useState, useEffect } from 'react';
import { CloudRain, ExternalLink, RefreshCw } from 'lucide-react';

export default function BuienradarWidget() {
    // We add a timestamp to the image URL to bypass browser caching and force refresh
    const [timestamp, setTimestamp] = useState(Date.now());
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Auto-refresh every 5 minutes (300000 ms) as Buienradar updates its radar every 5 mins
    useEffect(() => {
        const interval = setInterval(() => {
            setTimestamp(Date.now());
        }, 300000);
        return () => clearInterval(interval);
    }, []);

    const handleManualRefresh = () => {
        setIsRefreshing(true);
        setTimestamp(Date.now());
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-blue-500" />
                    <h2 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                        Radar Ploaie (Belgia)
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleManualRefresh}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-blue-500"
                        title="Actualizează Radarul"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
                    </button>
                    <a 
                        href="https://www.buienradar.be/" 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-blue-500"
                        title="Deschide Buienradar.be"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>
            
            <div className="p-0 flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden min-h-[300px]">
                <img 
                    key={timestamp}
                    src={`https://image.buienradar.nl/2.0/image/animation/RadarMapRainBE`} 
                    alt="Buienradar BE" 
                    className="w-full h-full object-contain opacity-90 hover:opacity-100 transition-opacity"
                    
                />
                <div className="absolute bottom-2 left-2 right-2 text-center">
                    <span className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300 shadow-sm border border-white/20">
                        Live Animation • Sursă: Buienradar
                    </span>
                </div>
            </div>
        </div>
    );
}
