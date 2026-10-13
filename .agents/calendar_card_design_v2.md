# Design Backup for ShortWorksCalendar Cards (23 August 2026)

This file serves as an immutable backup for the highly specific card design requested by the user for the desktop calendar (`ShortWorksCalendar.jsx`).
Any agent attempting to modify the calendar cards MUST reference this layout to ensure the design is not accidentally reverted.

## Key Design Rules
1. **Full-Width Colored Header**: The top row (`TOP ROW: Name and Total Surface`) MUST have a full background color tint `backgroundColor: (isPartner ? wo.client_color : colorHex) + '40'` covering the entire width (using `-mx-1.5 -mt-1.5 px-1.5 py-1 mb-1 border-b`). NO floating pills for the header!
2. **Total Surface Badge**: In the header row (top right), the total sum of all layer surfaces MUST be displayed. If there are multiple layers, it must be prefixed with "Total: ". The text is displayed inside a highlighted badge `bg-white/40 px-1 rounded-sm shadow-sm`.
3. **Map Thumbnail**: The map (`staticMapLoc`) MUST be a clear thumbnail placed in the bottom-right corner (`w-[55%]`, `opacity-60`, `bottom-0 right-0`), pushed down below the header (`top: '26px'`). It MUST NOT cover the entire card as a washed-out background.
4. **Card Rounding**: The entire card, the header, and the map thumbnail MUST use `rounded-xl` (or `rounded-t-xl` / `rounded-br-xl`) to match the softer look of the Mobile Agenda.
5. **Layer Numbering**: The middle row (materials/volumes) MUST explicitly state "Chape 1", "Chape 2", etc. if there are multiple layers and the name is generic/empty. It MUST NOT hide the word "Chape".
6. **Address Divider Line**: The bottom row (address/location) MUST have a subtle separator line above it (`border-t` colored with a 25% tint of the client color, e.g., `+ '40'`).
7. **Address Parsing**: The address parsed in the bottom row MUST use the actual address fields `wo.site_address || wo.site?.address || wo.address` and NOT `wo.site_name`, to prevent rendering dummy values like "Belgique" on partner cards.

## Verified Code Block (Card Render inside `weeklyOrders.map`)
```javascript
<div 
    className="absolute right-0 bottom-0 w-[55%] pointer-events-none overflow-hidden rounded-br-xl opacity-60 dark:opacity-40 mix-blend-multiply dark:mix-blend-lighten z-0" 
    style={{ top: '26px', WebkitMaskImage: 'linear-gradient(to right, transparent, black 60%)', maskImage: 'linear-gradient(to right, transparent, black 60%)' }}
>
    <img 
        src={`https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&size=400,300&z=14&l=map`} 
        alt="Map" 
        className="w-full h-full object-cover" 
        onError={(e) => { e.target.style.display = 'none'; }}
    />
</div>

<div className="flex flex-col flex-1 w-full relative z-10">
    {/* TOP ROW: Name and Total Surface */}
    <div className="flex items-center justify-between z-10 -mx-1.5 -mt-1.5 px-1.5 py-1 mb-1 border-b rounded-t-xl" style={{ backgroundColor: (isPartner ? wo.client_color : colorHex) + '40', borderColor: isPartner ? wo.client_color : colorHex }}>
        <div className="flex items-center gap-1.5 truncate pr-2 shrink-0">
            {isCompleted ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            ) : isExternalSource ? (
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-sm" />
            ) : null}
            <span className="text-[11px] font-extrabold text-slate-900 truncate">
                {(wo.client_name && wo.client_name !== 'None' ? wo.client_name : wo.title)}
            </span>
        </div>
        {(() => {
            const finalVols = Array.isArray(wo.volumes) ? wo.volumes : [];
            const sumVol = finalVols.reduce((sum, v) => sum + (parseFloat(v.quantity) || 0), 0);
            const fallbackSurf = parseFloat(wo.surface_area) || parseFloat(wo.surface) || parseFloat(wo.surface_m2) || 0;
            const displaySurf = sumVol > 0 ? parseFloat(sumVol.toFixed(2)) : parseFloat(fallbackSurf.toFixed(2));
            if (displaySurf > 0) {
                const isMultiple = finalVols.length > 1;
                return <span className="text-[10px] font-bold text-slate-800 shrink-0 bg-white/40 px-1 rounded-sm shadow-sm">{isMultiple ? 'Total: ' : ''}{displaySurf} m²</span>;
            }
            return null;
        })()}
    </div>

    {/* MIDDLE ROW: Volumes / Layers */}
    <div className="flex flex-col gap-[1px] mt-0.5 w-full">
        {(() => {
            const finalVols = Array.isArray(wo.volumes) ? wo.volumes : [];
            const sandVal = calculateOrderSand(wo);
            const distText = getDistanceTextForOrder(wo);
            
            if (finalVols.length > 0) {
                return finalVols.map((vol, idx) => {
                    let displayName = vol.name;
                    if (!displayName || displayName.toLowerCase() === 'chape') {
                        displayName = finalVols.length > 1 ? `Chape ${idx + 1}` : 'Chape';
                    }
                    return (
                        <div key={idx} className="flex items-center text-[9px] text-slate-700/90 font-semibold w-full">
                            <Layers className="w-3 h-3 text-slate-600/70 mr-1 shrink-0" />
                            <span className="truncate">{displayName}: {vol.quantity}m²&times;{vol.thickness}cm</span>
                            {idx === 0 && sandVal > 0 && (
                                <span className="ml-auto text-[9px] text-amber-600 font-bold bg-white/90 px-1 rounded-sm shadow-sm shrink-0">
                                    {sandVal.toFixed(1)}T
                                </span>
                            )}
                        </div>
                    );
                });
            } else {
                const fallbackSurf = parseFloat(wo.surface_area) || parseFloat(wo.surface) || parseFloat(wo.surface_m2) || 0;
                if (fallbackSurf > 0) {
                    return (
                        <div className="flex items-center text-[9px] text-slate-700/90 font-semibold w-full">
                            <Layers className="w-3 h-3 text-slate-600/70 mr-1 shrink-0" />
                            <span className="truncate">Chape: {fallbackSurf}m²</span>
                            {sandVal > 0 && (
                                <span className="ml-auto text-[9px] text-amber-600 font-bold bg-white/90 px-1 rounded-sm shadow-sm shrink-0">
                                    {sandVal.toFixed(1)}T
                                </span>
                            )}
                        </div>
                    );
                }
            }
            return null;
        })()}
    </div>

    {/* BOTTOM ROW: Location, KM, and Weather */}
    <div className="flex items-center justify-between mt-auto pt-1 border-t" style={{ borderColor: (isPartner ? wo.client_color : colorHex) + '40' }}>
        <div className="flex items-center gap-1 text-[9px] text-slate-600/80 font-medium truncate pr-1">
            <MapPin className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{formatAddressCityFirst((wo.site_address || wo.site?.address || wo.address) || t('common.no_location', 'Aucune adresse'))}</span>
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
            {(() => {
                const distText = getDistanceTextForOrder(wo);
                return distText ? <span className="text-[9px] text-fuchsia-600 font-bold">{distText}</span> : null;
            })()}
            
            {!isCompleted && (
                <span className="text-[9px] text-slate-600/80 font-bold">
                    <WeatherWidget lat={wo.site_latitude || 50.8503} lon={wo.site_longitude || 4.3517} dateStr={(wo.start_date || wo.deadline_date) + (wo.start_time ? `T${wo.start_time}` : '')} compact={true} />
                </span>
            )}
        </div>
    </div>
</div>
```
