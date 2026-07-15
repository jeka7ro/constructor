import re

file_path = "frontend/src/pages/admin/logistics/LogisticsDashboard.jsx"
with open(file_path, "r") as f:
    content = f.read()

# Fix Fără comenzi.
content = content.replace(
    '<div className="text-[10px] text-slate-400 dark:text-slate-500 italic pl-5">Fără comenzi.</div>',
    '<div className="text-[10px] text-slate-400 dark:text-slate-500 italic pl-5">{t(\'logistics.no_works\', \'Fără comenzi.\')}</div>'
)

# Fix team_name display
old_header = """                                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{route.team_name}</h3>"""
new_header = """                                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                                    {route.team_name}
                                                    {route.is_unassigned && (
                                                        <span className="ml-1 text-slate-400 font-normal italic">
                                                            ({t('logistics.unassigned', 'Fără echipă')})
                                                        </span>
                                                    )}
                                                </h3>"""
content = content.replace(old_header, new_header)

with open(file_path, "w") as f:
    f.write(content)

