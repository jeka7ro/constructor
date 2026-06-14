import sys

with open('frontend/src/pages/admin/AdminOverview.jsx', 'r') as f:
    content = f.read()

start_marker = '            {/* Activity Popup (Portal) */}'
end_marker = '            <style>{`'

if start_marker not in content or end_marker not in content:
    print('Markers not found')
    sys.exit(1)

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

modals_content = content[start_idx:end_idx]
content = content[:start_idx] + content[end_idx:]

insert_marker = """                        </div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6 items-start">"""

if insert_marker not in content:
    print('Insert marker not found')
    sys.exit(1)

insert_idx = content.find(insert_marker) + len("                        </div>\n                        </div>\n                    )}\n                </div>\n")

new_content = content[:insert_idx] + modals_content + content[insert_idx:]

with open('frontend/src/pages/admin/AdminOverview.jsx', 'w') as f:
    f.write(new_content)
print('Success')
