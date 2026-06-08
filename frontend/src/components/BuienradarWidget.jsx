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
            <div className="px-5 py-4 bg-blue-600 dark:bg-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CloudRain className="w-5 h-5 text-white" />
                    <h2 className="font-extrabold text-white text-sm uppercase tracking-wide">
                        Radar Ploaie (Belgia)
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleManualRefresh}
                        className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                        title="Actualizează Radarul"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <a 
                        href="https://www.buienradar.be/" 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                        title="Deschide Buienradar.be"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </div>
            
            <div className="p-0 flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden min-h-[350px]">
                <iframe 
                    key={timestamp}
                    src={`https://gadgets.buienradar.nl/gadget/zoommap/?lat=50.85045&lng=4.34878&overname=2&zoom=8&size=3`} 
                    width="100%" 
                    height="100%" 
                    frameBorder="no" 
                    scrolling="no"
                    className="absolute inset-0 w-full h-full"
                    title="Buienradar Interactive Map"
                ></iframe>
            </div>
        </div>
    );
}
