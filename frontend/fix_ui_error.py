import re

with open("src/pages/admin/WorkOrders.jsx", "r") as f:
    code = f.read()

old_catch = "} catch { /* silently fail */ }"
new_catch = "} catch (e) { alert('API Error: ' + (e.response?.data?.detail || e.message)) }"

code = code.replace(old_catch, new_catch)

# Also fix the generic catch if it's different
code = code.replace("} catch {", "} catch(e) { alert('API Error: ' + (e.response?.data?.detail || e.message));")

with open("src/pages/admin/WorkOrders.jsx", "w") as f:
    f.write(code)

