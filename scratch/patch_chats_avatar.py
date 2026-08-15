import re

file_path = "frontend/src/pages/admin/AdminChats.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the avatar rendering for admin
avatar_search = r"""                                                                    \) : msg\.sender === 'admin' \? \(
                                                                        \(tenant\?\.favicon_url \|\| tenant\?\.logo_url\) \? \(
                                                                            <img src=\{tenant\.favicon_url \? getImageUrl\(tenant\.favicon_url\) : getImageUrl\(tenant\.logo_url\)\} alt=\{tenant\?\.name \|\| "Company"\} className="w-5 h-5 rounded-full object-contain bg-white p-\[2px\] shrink-0 hidden md:block" />
                                                                        \) : \(
                                                                            <span className="w-5 h-5 rounded-full bg-white text-blue-600 hidden md:flex items-center justify-center font-bold text-\[10px\] shrink-0">\{\(tenant\?\.name \|\| "T"\)\.charAt\(0\)\.toUpperCase\(\)\}</span>
                                                                        \)
                                                                    \) : null\}"""

avatar_replace = """                                                                    ) : msg.sender === 'admin' ? (
                                                                        (tenant?.favicon_url || tenant?.logo_url) ? (
                                                                            <img src={tenant.favicon_url ? getImageUrl(tenant.favicon_url) : getImageUrl(tenant.logo_url)} alt={tenant?.name || "Company"} className="w-5 h-5 rounded-full object-contain bg-white p-[2px] shrink-0 hidden md:block" />
                                                                        ) : (
                                                                            <img src="/davide_chape_favicon.png" alt="Company" className="w-5 h-5 rounded-full object-contain bg-white p-[2px] shrink-0 hidden md:block" />
                                                                        )
                                                                    ) : null}"""

# Now the name logic:
name_search = r"\{msg\.sender === 'client' \? activeWo\.client_name : \(msg\.sender === 'admin' \? tenant\?\.name \|\| t\('admin\.team', 'Équipe'\) : t\('admin\.system', 'Sistem'\)\)\}"
name_replace = "{msg.sender === 'client' ? activeWo.client_name : (msg.sender === 'admin' ? (activeWo.client_language === 'nl' || activeWo.client_language === 'en' ? 'Team Davide Chape' : 'Équipe Davide Chape') : t('admin.system', 'Sistem'))}"

content = re.sub(avatar_search, avatar_replace, content)
content = re.sub(name_search, name_replace, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("AdminChats patched")
