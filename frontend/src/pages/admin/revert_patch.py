import os

with open("/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/frontend/src/pages/admin/WorkOrderDetail.jsx", "r") as f:
    c = f.read()

# Reverse Flex replacements
c = c.replace("flex-col sm:flex-row gap-6", "flex-col xl:flex-row gap-6")
c = c.replace("hidden sm:block", "hidden xl:block")
c = c.replace("sm:border-t-0", "xl:border-t-0")
c = c.replace("sm:pt-0", "xl:pt-0")

with open("/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/frontend/src/pages/admin/WorkOrderDetail.jsx", "w") as f:
    f.write(c)
