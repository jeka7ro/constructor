import re

file_path = "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/employee/ClockInPage.jsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Add state variable
state_str = """    const [loading, setLoading] = useState(true)
    const [unreadComplaints, setUnreadComplaints] = useState(0)"""
content = content.replace("    const [loading, setLoading] = useState(true)", state_str)

# 2. Add useEffect for fetching unread complaints
effect_str = """    useEffect(() => {
        const fetchUnread = () => {
            api.get('/user/complaints/unread-count')
                .then(res => setUnreadComplaints(res.data?.count || 0))
                .catch(() => {})
        }
        fetchUnread()
        const t = setInterval(fetchUnread, 60000)
        return () => clearInterval(t)
    }, [])

    useEffect(() => {
        fetchActiveShift()"""
content = content.replace("    useEffect(() => {\n        fetchActiveShift()", effect_str)

# 3. Update the button
btn_old = """                        <button
                            onClick={() => navigate('/sesizari')}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            title="Sesizări și Reclamații"
                        >
                            <MessageSquareWarning className="w-5 h-5" />
                        </button>"""

btn_new = """                        <button
                            onClick={() => navigate('/sesizari')}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors relative"
                            title="Sesizări și Reclamații"
                        >
                            <MessageSquareWarning className="w-5 h-5" />
                            {unreadComplaints > 0 && (
                                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center bg-orange-500 text-white text-[9px] font-bold rounded-full border border-blue-600">
                                    {unreadComplaints > 9 ? '9+' : unreadComplaints}
                                </span>
                            )}
                        </button>"""
content = content.replace(btn_old, btn_new)

with open(file_path, "w") as f:
    f.write(content)
