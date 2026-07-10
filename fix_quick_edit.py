import re

file_path = 'frontend/src/pages/admin/AdminOverview.jsx'
with open(file_path, 'r') as f:
    content = f.read()

# Fix handleQuickEditSubmit calculation
old_calc = """
            if (surface > 0) {
                const extraThickness = Math.max(0, thickness - 5);
                const autoBase = 12.5 * surface;
                const autoExtra = extraThickness * 1.25 * surface;
                const autoFoil = quickEditForm.has_foil ? 1.2 * surface : 0;
                const autoMesh = quickEditForm.has_mesh ? 2.5 * surface : 0;
                estimatedAmount = autoBase + autoExtra + autoFoil + autoMesh;
                isAutoCalculated = true;
            }
"""
new_calc = """
            if (surface > 0) {
                const extraThickness = Math.max(0, thickness - 5);
                const autoBase = 12.5 * surface;
                const autoExtra = extraThickness * 1.25 * surface;
                const autoFoil = quickEditForm.has_foil ? 1.2 * surface : 0;
                const autoMesh = quickEditForm.has_mesh ? 2.5 * surface : 0;
                const fiberRate = surface <= 200 ? 2.5 : 2.0;
                const autoFiber = quickEditForm.has_fiber ? fiberRate * surface : 0;
                estimatedAmount = autoBase + autoExtra + autoFoil + autoMesh + autoFiber;
                isAutoCalculated = true;
            }
"""
content = content.replace(old_calc, new_calc)

# Fix quickEditForm initialization in handleQuickEdit
old_edit_init = """
        const vol = wo.volumes && wo.volumes.length > 0 ? wo.volumes[0] : null
        setQuickEditForm({
            title: wo.title || '',
            address: wo.site_address || (wo.site ? wo.site.address : ''),
            latitude: wo.site_latitude || '',
            longitude: wo.site_longitude || '',
            surface: vol ? vol.quantity : '',
            thickness: vol ? vol.thickness : '',
            has_foil: vol ? !!vol.has_foil : false,
            has_mesh: vol ? !!vol.has_mesh : false,
            has_duramint: vol ? !!vol.has_duramint : false,
            teamId: wo.assigned_team_id ? String(wo.assigned_team_id) : '',
            clientId: wo.client_id ? String(wo.client_id) : ''
        })
"""
new_edit_init = """
        const vol = wo.volumes && wo.volumes.length > 0 ? wo.volumes[0] : null
        setQuickEditForm({
            title: wo.title || '',
            address: wo.site_address || (wo.site ? wo.site.address : ''),
            latitude: wo.site_latitude || '',
            longitude: wo.site_longitude || '',
            surface: vol ? vol.quantity : '',
            thickness: vol ? vol.thickness : '',
            has_foil: vol ? !!vol.has_foil : false,
            has_mesh: vol ? !!vol.has_mesh : false,
            has_fiber: vol ? !!vol.has_fiber : false,
            has_duramint: vol ? !!vol.has_duramint : false,
            teamId: wo.assigned_team_id ? String(wo.assigned_team_id) : '',
            clientId: wo.client_id ? String(wo.client_id) : ''
        })
"""
content = content.replace(old_edit_init, new_edit_init)

# Fix API payload
old_api = """
                volumes: (quickEditForm.surface || quickEditForm.thickness) ? [{
                    label: 'Chape',
                    quantity: surface,
                    unit: 'm²',
                    thickness: thickness,
                    has_foil: !!quickEditForm.has_foil,
                    has_mesh: !!quickEditForm.has_mesh,
                    has_duramint: !!quickEditForm.has_duramint
                }] : [],
"""
new_api = """
                volumes: (quickEditForm.surface || quickEditForm.thickness) ? [{
                    label: 'Chape',
                    quantity: surface,
                    unit: 'm²',
                    thickness: thickness,
                    has_foil: !!quickEditForm.has_foil,
                    has_mesh: !!quickEditForm.has_mesh,
                    has_fiber: !!quickEditForm.has_fiber,
                    has_duramint: !!quickEditForm.has_duramint
                }] : [],
"""
content = content.replace(old_api, new_api)

# Add checkbox for Fiber
old_checkboxes = """
                                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={!!quickEditForm.has_duramint}
                                        onChange={e => setQuickEditForm({ ...quickEditForm, has_duramint: e.target.checked })}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                    />
                                    {t('dashboard.quick_create.include_duramint', 'Include Duramint')}
                                </label>
"""
new_checkboxes = """
                                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={!!quickEditForm.has_fiber}
                                        onChange={e => setQuickEditForm({ ...quickEditForm, has_fiber: e.target.checked })}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                    />
                                    {t('dashboard.quick_create.include_fiber', 'Include Fibre')}
                                </label>
                                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={!!quickEditForm.has_duramint}
                                        onChange={e => setQuickEditForm({ ...quickEditForm, has_duramint: e.target.checked })}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                    />
                                    {t('dashboard.quick_create.include_duramint', 'Include Duramint')}
                                </label>
"""
content = content.replace(old_checkboxes, new_checkboxes)

with open(file_path, 'w') as f:
    f.write(content)
