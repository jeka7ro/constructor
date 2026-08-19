import re

with open('/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/frontend/src/pages/admin/ClientDetail.jsx', 'r') as f:
    content = f.read()

# 1. Update the PDF Icon
content = content.replace(
    '<FileText className="w-4 h-4" />',
    '{wo.is_invoiced ? <FileCheck className="w-4 h-4 text-indigo-500" /> : <FileText className="w-4 h-4 text-blue-500" />}'
)

# 2. Extract Tabs
tabs_start = content.find('{/* Tabs */}')
tabs_end = content.find('                    </div>\n                </div>\n\n                {/* Right Column - Sidebar */}')
# The tabs end just before the end of the left column.
# Actually, let's find the Right Column block.
right_col_start = content.find('{/* Right Column - Sidebar */}')
right_col_end = content.find('                    </div>\n                </div>\n            </div>\n\n            {/* Document Preview Modal */}')

# Let's extract them precisely
tabs_block = content[tabs_start:right_col_start]
# Right col block includes its closing tags for the grid
right_col_block = content[right_col_start:right_col_end + len('                    </div>\n                </div>\n            </div>')]

# The structure before was:
# <div className="grid ...">
#    <div className="xl:col-span-2 space-y-6">
#       ... stats ...
#       {/* Tabs */} ... 
#    </div>
#    {/* Right Column */} ...
# </div>

# Let's split content before tabs:
content_before_tabs = content[:tabs_start]

# We want:
# content_before_tabs (which ends right after Stats)
# </div> (close the xl:col-span-2)
# right_col_block (which ends with the closing of the grid)
# tabs_block (but we need to remove the closing </div> of the left column from it if any, actually tabs_block is just the Tabs div. We can place it outside the grid).

# Let's be very specific:
tabs_end = content.find('                    </div>\n                </div>\n\n                {/* Right Column - Sidebar */}')
tabs_code = content[tabs_start:tabs_end]

# Right column code
right_end = content.find('            </div>\n\n            {/* Document Preview Modal */}')
right_code = content[right_col_start:right_end]

# New layout:
new_layout = content[:tabs_start] + "</div>\n\n                " + right_code + "\n\n            {/* Full Width Tabs */}\n            <div className=\"col-span-full mt-6\">\n" + tabs_code + "\n            </div>\n" + content[right_end:]

with open('/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/frontend/src/pages/admin/ClientDetail.jsx', 'w') as f:
    f.write(new_layout)

