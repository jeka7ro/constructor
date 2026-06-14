import sys

with open('frontend/src/pages/admin/AdminOverview.jsx', 'r') as f:
    content = f.read()

# 1. Add import
if "import WorkOrderDetail" not in content:
    content = content.replace(
        "import ShortWorksCalendar from '../../components/ShortWorksCalendar'",
        "import ShortWorksCalendar from '../../components/ShortWorksCalendar'\nimport WorkOrderDetail from './WorkOrderDetail'"
    )

# 2. Add state
if "const [fullscreenOrderId, setFullscreenOrderId] = useState(null)" not in content:
    content = content.replace(
        "const [quickEditOrder, setQuickEditOrder] = useState(null) // wo object",
        "const [quickEditOrder, setQuickEditOrder] = useState(null) // wo object\n    const [fullscreenOrderId, setFullscreenOrderId] = useState(null)"
    )

# 3. Update onClick for Detalii Avansate
target_btn = '''                                <button 
                                    type="button" 
                                    onClick={() => navigate(`/admin/work-orders/${quickEditOrder.id}/edit`)} 
                                    className="flex-1 h-10 font-bold text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 transition-colors rounded-xl flex items-center justify-center gap-2"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Detalii Avansate
                                </button>'''

replacement_btn = '''                                <button 
                                    type="button" 
                                    onClick={() => {
                                        if (isCalendarFull) {
                                            setFullscreenOrderId(quickEditOrder.id);
                                            setQuickEditOrder(null);
                                        } else {
                                            navigate(`/admin/work-orders/${quickEditOrder.id}/edit`);
                                        }
                                    }} 
                                    className="flex-1 h-10 font-bold text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 transition-colors rounded-xl flex items-center justify-center gap-2"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Detalii Avansate
                                </button>'''

if target_btn in content:
    content = content.replace(target_btn, replacement_btn)
else:
    print("Could not find target_btn")
    # try a regex or looser match just in case spacing is different
    sys.exit(1)

# 4. Insert WorkOrderDetail at the end of the calendarWrapperRef
# Let's find:
#                 </div>
#             )}
# 
#                 </div>
# 
#             )}
# 
#             <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6 items-start">

target_end = '''                </div>
            )}

                </div>

            )}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6 items-start">'''

replacement_end = '''                </div>
            )}
            
            {/* Embedded Work Order Detail for Fullscreen Mode */}
            {fullscreenOrderId && (
                <WorkOrderDetail 
                    orderId={fullscreenOrderId} 
                    onBack={() => setFullscreenOrderId(null)} 
                    isEmbedded={true} 
                />
            )}

                </div>

            )}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6 items-start">'''

if target_end in content:
    content = content.replace(target_end, replacement_end)
else:
    print("Could not find target_end")
    sys.exit(1)

with open('frontend/src/pages/admin/AdminOverview.jsx', 'w') as f:
    f.write(content)
print("Success")
