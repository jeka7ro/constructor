import re

file_path = "frontend/src/pages/public/WorkOrderConfirm.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_code = """            } finally {
                setLoading(false)
            }
        }
        load()
    }, [token, t.errorLoading, t.orderCancelled])"""

new_code = """            } finally {
                setLoading(false)
                setTimeout(() => {
                    if (window.location.hash === '#chat-section') {
                        const chatEl = document.getElementById('chat-section');
                        if (chatEl) {
                            chatEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }
                }, 300);
            }
        }
        load()
    }, [token, t.errorLoading, t.orderCancelled])"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched WorkOrderConfirm.jsx successfully.")
else:
    print("Could not find the code to patch in WorkOrderConfirm.jsx.")
