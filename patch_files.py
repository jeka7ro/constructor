import os
import sys

files = [
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/Login.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/App.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/employee/EmployeeEmergencies.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/employee/EmployeeComplaints.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/employee/EmployeeInventory.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/components/PhotoGallery.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/employee/TimesheetForm.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/employee/EmployeeMaterialRequests.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/components/AvatarCropModal.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/employee/SiteManagerPanel.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/employee/TeamLeaderPanel.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/components/LanguageSelector.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/employee/ClockInPage.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/components/PhotoUpload.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/components/SiteMap.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/components/ui/DialogOverlay.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/History.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/components/ui/ToastOverlay.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/SitePhotosPage.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/ComplaintsManagement.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/ReportsPage.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/ActivitiesManagement.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/NotificationsPage.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/SitesManagement.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/AdminMaterialRequests.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/AdminEmergencies.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/EmployeesManagement.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/AdminLogin.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/WarehouseManagement.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/FleetManagement.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/PhotoTestPage.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/SettingsPage.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/TeamsManagement.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/TimesheetApprovalPage.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/AdminDashboard.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/ExpensesManagement.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/AdminOverview.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/AccommodationsManagement.jsx",
    "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/ClientsManagement.jsx"
]

emojis = ['📋', '👋', '✏️', '📝', '🔔', '👥', '📦', '🕐', '☕', '🔴', '🔄', '✅', '💡', '📍', '⚠️', '📊', '🚚', '✍️', '⚙️', '📤', '📎', '📷']

for filepath in files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        initial_content = content
        
        for emoji in emojis:
            content = content.replace(emoji + ' ', '')
            content = content.replace(emoji, '')

        content = content.replace('rounded-lg', 'rounded-full')
        content = content.replace('rounded-md', 'rounded-full')

        if content != initial_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated: {filepath}")
    except Exception as e:
        print(f"Failed {filepath}: {e}")
