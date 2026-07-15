import os

file_path = "frontend/src/components/MiniLiveTrackingMap.jsx"
with open(file_path, "r") as f:
    content = f.read()

# Add containerRef
content = content.replace("const mapRef = useRef(null);", "const mapRef = useRef(null);\n  const containerRef = useRef(null);")

# Update toggle fullscreen logic
old_toggle = """            <button onClick={() => setIsMapFull(!isMapFull)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mr-2">
                {isMapFull ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
            </button>"""

new_toggle = """            <button onClick={() => {
                if (!document.fullscreenElement) {
                    containerRef.current?.requestFullscreen().catch(err => {
                        console.error(`Error attempting to enable fullscreen: ${err.message}`);
                    });
                } else {
                    document.exitFullscreen();
                }
            }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mr-2">
                {isMapFull ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
            </button>"""
content = content.replace(old_toggle, new_toggle)

# Add fullscreen change listener
effect_block = """  useEffect(() => {
    fetchLive();
    intervalRef.current = setInterval(fetchLive, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchLive]);"""

new_effect_block = """  useEffect(() => {
    fetchLive();
    intervalRef.current = setInterval(fetchLive, POLL_INTERVAL);
    
    const handleFullscreenChange = () => {
        setIsMapFull(!!document.fullscreenElement);
        // Force Leaflet to recalculate its size after a small delay
        setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }
        }, 100);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
        clearInterval(intervalRef.current);
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [fetchLive]);"""
content = content.replace(effect_block, new_effect_block)

# Add ref to container and fix its style when fullscreen
old_div = '<div className={`flex flex-col bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 ${isMapFull ? "fixed inset-0 z-50 rounded-none border-none" : "w-full h-full"}`}>'
new_div = '<div ref={containerRef} className={`flex flex-col bg-white dark:bg-slate-900 overflow-hidden shadow-sm ${isMapFull ? "fixed inset-0 z-[9999] rounded-none border-none w-screen h-screen" : "w-full h-full rounded-xl border border-slate-200 dark:border-slate-700"}`}>'
content = content.replace(old_div, new_div)

with open(file_path, "w") as f:
    f.write(content)
