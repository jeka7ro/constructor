import os

file_path = "frontend/src/components/MiniLiveTrackingMap.jsx"
with open(file_path, "r") as f:
    content = f.read()

# Replace import to include hook
if "import { useState, useEffect, useRef } from 'react';" not in content:
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect, useRef } from 'react';")

# Add mapRef to access map instance
content = content.replace("const [isMapFull, setIsMapFull] = useState(false);", "const [isMapFull, setIsMapFull] = useState(false);\n  const mapRef = useRef(null);")
content = content.replace("<MapContainer", "<MapContainer ref={mapRef}")

# Update icon function
old_icon = """const avatarHtml = fullAvatarUrl 
    ? `<img src="${fullAvatarUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid white;" />`
    : `<div style="width:32px;height:32px;border-radius:50%;background-color:${themeColor};border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h4.3c.6 0 1.1.4 1.3.9l.8 2.1c.2.5.7.9 1.3.9h6.3c.6 0 1 .4 1 1v7c0 .6-.4 1-1 1h-2"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle></svg></div>`;"""

new_icon = """const isCrane = vehicleType === 'Grue';
  const truckSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h4.3c.6 0 1.1.4 1.3.9l.8 2.1c.2.5.7.9 1.3.9h6.3c.6 0 1 .4 1 1v7c0 .6-.4 1-1 1h-2"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle></svg>`;
  const craneSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M7 21v-4"/><path d="M17 21v-4"/><path d="M12 17V3l-7 4"/><path d="M12 10l5 3"/></svg>`;

  const avatarHtml = fullAvatarUrl 
    ? `<img src="${fullAvatarUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid white;" />`
    : `<div style="width:32px;height:32px;border-radius:50%;background-color:${themeColor};border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(0,0,0,0.3);">${isCrane ? craneSvg : truckSvg}</div>`;"""

content = content.replace("function createVehicleIcon(color, name, avatarUrl) {", "function createVehicleIcon(color, name, avatarUrl, vehicleType) {")
content = content.replace(old_icon, new_icon)

# Update Marker icon call
content = content.replace("icon={createVehicleIcon(v.team_color, v.name, v.avatar_url)}", "icon={createVehicleIcon(v.team_color, v.name, v.avatar_url, v.vehicle_type)}")

# Handle card click
handle_click = """onClick={() => {
                            if (mapRef.current) {
                                mapRef.current.flyTo([v.lat, v.lng], 16, { animate: true, duration: 1.5 });
                            }
                        }}"""
content = content.replace('className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-700/50 pt-2 first:border-0 first:pt-0"', 
                          f'className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-700/50 pt-2 first:border-0 first:pt-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded-lg p-1 -mx-1" {handle_click}')

with open(file_path, "w") as f:
    f.write(content)
