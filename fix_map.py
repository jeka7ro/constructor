import re

file_path = "frontend/src/pages/admin/WorkOrderDetail.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the distance card KPI fallback to route_segments
old_kpi = """                <KPI icon={({ className }) => <TruckSVG color="white" className={className} />} label={t('work_order_detail.kpi.base_dist', 'Distance Base')}       
                    value={
                        <div className="flex items-center gap-1.5">
                            <span>{wo.prices?.distance_km ? `${parseFloat(wo.prices.distance_km).toFixed(1)} km` : '—'}</span>
                        </div>
                    } 
                    sub={t('work_order_detail.kpi.round_trip', 'aller-retour')} color="slate" />"""

new_kpi = """                <KPI icon={({ className }) => <TruckSVG color="white" className={className} />} label={t('work_order_detail.kpi.base_dist', 'Distance Base')}       
                    value={
                        <div className="flex items-center gap-1.5">
                            <span>{wo.prices?.distance_km ? `${parseFloat(wo.prices.distance_km).toFixed(1)} km` : (
                                (wo.route_segments && wo.route_segments.length > 0) ? `${((wo.route_segments).reduce((sum, seg) => sum + (parseFloat(seg.km) || 0), 0)).toFixed(1)} km` : '—'
                            )}</span>
                        </div>
                    } 
                    sub={t('work_order_detail.kpi.round_trip', 'aller-retour')} color="slate" />"""

content = content.replace(old_kpi, new_kpi)

# Fix MapView props
old_map = """                        <MapView
                            latitude={lat}
                            longitude={lon}
                            address={address}
                            height={220}
                            zoom={15}
                        />"""

new_map = """                        <MapView
                            latitude={lat}
                            longitude={lon}
                            address={address}
                            height={220}
                            zoom={15}
                            routeSegments={wo.route_segments}
                            baseName={wo.route_segments?.[0]?.from}
                            teamColor={wo.team_color || '#2563eb'}
                        />"""

content = content.replace(old_map, new_map)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Map and Distance KPI fixed in WorkOrderDetail.")
