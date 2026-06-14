import sys

with open('frontend/src/pages/admin/AdminOverview.jsx', 'r') as f:
    content = f.read()

# 1. Add import
if "import WorkOrderForm" not in content:
    content = content.replace(
        "import WorkOrderDetail from './WorkOrderDetail'",
        "import WorkOrderDetail from './WorkOrderDetail'\nimport WorkOrderForm from './WorkOrderForm'"
    )

# 2. Add state
if "const [fullscreenNewOrder, setFullscreenNewOrder] = useState(null)" not in content:
    content = content.replace(
        "const [fullscreenOrderId, setFullscreenOrderId] = useState(null)",
        "const [fullscreenOrderId, setFullscreenOrderId] = useState(null)\n    const [fullscreenNewOrder, setFullscreenNewOrder] = useState(null)"
    )

# 3. Update ShortWorksCalendar props
target_props = '''                            onOrderClick={(wo) => {
                                if (isCalendarFull) {'''

replacement_props = '''                            onEmptyCellClick={(date, time) => {
                                if (isCalendarFull) {
                                    setFullscreenNewOrder({ date, time });
                                } else {
                                    navigate(`/admin/work-orders/new?date=${date}&time=${time}`);
                                }
                            }}
                            onOrderClick={(wo) => {
                                if (isCalendarFull) {'''

if "onEmptyCellClick" not in content and target_props in content:
    content = content.replace(target_props, replacement_props)

# 4. Insert WorkOrderForm at the end
target_end = '''            {/* Embedded Work Order Detail for Fullscreen Mode */}
            {fullscreenOrderId && (
                <WorkOrderDetail 
                    orderId={fullscreenOrderId} 
                    onBack={() => setFullscreenOrderId(null)} 
                    isEmbedded={true} 
                />
            )}'''

replacement_end = '''            {/* Embedded Work Order Detail for Fullscreen Mode */}
            {fullscreenOrderId && (
                <WorkOrderDetail 
                    orderId={fullscreenOrderId} 
                    onBack={() => setFullscreenOrderId(null)} 
                    isEmbedded={true} 
                />
            )}
            
            {/* Embedded Work Order Form for Fullscreen Mode */}
            {fullscreenNewOrder && (
                <WorkOrderForm 
                    initialDate={fullscreenNewOrder.date}
                    initialTime={fullscreenNewOrder.time}
                    onBack={() => setFullscreenNewOrder(null)} 
                    onSuccess={() => {
                        setFullscreenNewOrder(null);
                        fetchData();
                    }}
                    isEmbedded={true} 
                />
            )}'''

if "fullscreenNewOrder && (" not in content and target_end in content:
    content = content.replace(target_end, replacement_end)

with open('frontend/src/pages/admin/AdminOverview.jsx', 'w') as f:
    f.write(content)
print("Success")
