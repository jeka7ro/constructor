import fs from 'fs';
const file = 'src/pages/admin/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Extract the big page title logic
const titleLogicStr = `{(() => {
                                      const p = location.pathname;
                                      if (p.includes('/planning') || p === '/admin') return t('nav.planning', 'Planning');
                                      if (p.includes('/logistica')) return t('nav.logistics', 'Logistică');
                                      if (p.includes('/work-orders')) return t('nav.work_orders', 'Comenzi');
                                      if (p.includes('/screed-analytics')) return t('nav.screed_analytics', 'Tabel calcul');
                                      if (p.includes('/timesheets')) return t('nav.timesheets', 'Pontaje');
                                      if (p.includes('/reports')) return t('nav.reports', 'Rapoarte');
                                      if (p.includes('/sites')) return t('nav.sites', 'Șantiere');
                                      if (p.includes('/clients')) return t('nav.clients', 'Clienți');
                                      if (p.includes('/employees')) return t('nav.employees', 'Angajați');
                                      if (p.includes('/teams')) return t('nav.teams', 'Echipe');
                                      if (p.includes('/leaves')) return t('nav.leaves', 'Concedii');
                                      if (p.includes('/accommodations')) return t('nav.accommodations', 'Cazări');
                                      if (p.includes('/activities')) return t('nav.activities', 'Activități');
                                      if (p.includes('/site-photos')) return t('nav.site_photos', 'Poze Șantier');
                                      if (p.includes('/warehouse')) return t('nav.warehouse', 'Magazie');
                                      if (p.includes('/fleet')) return t('nav.fleet', 'Parc Auto');
                                      if (p.includes('/transport')) return t('nav.transport', 'Transport');
                                      if (p.includes('/material-requests')) return t('nav.material_requests', 'Necesar Materiale');
                                      if (p.includes('/expenses')) return t('nav.expenses', 'Deconturi / Cheltuieli');
                                      if (p.includes('/alerts')) return t('nav.alerts', 'Avizier');
                                      if (p.includes('/emergencies')) return t('nav.emergencies', 'Urgențe');
                                      if (p.includes('/complaints')) return t('nav.complaints', 'Sesizări');
                                      if (p.includes('/users')) return t('nav.users', 'Utilizatori');
                                      if (p.includes('/settings')) return t('nav.settings', 'Setări');
                                      if (p.includes('/notifications')) return t('nav.notifications', 'Notificări');
                                      if (p.includes('/organizations')) return t('nav.organizations', 'Companii');
                                      return t('nav.planning', 'Planning');
                                  })()}`;

// Add pageTitle constant before return
const getPageTitleCode = `
    const pageTitle = (() => {
        const p = location.pathname;
        if (p.includes('/planning') || p === '/admin') return t('nav.planning', 'Planning');
        if (p.includes('/logistica')) return t('nav.logistics', 'Logistică');
        if (p.includes('/work-orders')) return t('nav.work_orders', 'Comenzi');
        if (p.includes('/screed-analytics')) return t('nav.screed_analytics', 'Tabel calcul');
        if (p.includes('/timesheets')) return t('nav.timesheets', 'Pontaje');
        if (p.includes('/reports')) return t('nav.reports', 'Rapoarte');
        if (p.includes('/sites')) return t('nav.sites', 'Șantiere');
        if (p.includes('/clients')) return t('nav.clients', 'Clienți');
        if (p.includes('/employees')) return t('nav.employees', 'Angajați');
        if (p.includes('/teams')) return t('nav.teams', 'Echipe');
        if (p.includes('/leaves')) return t('nav.leaves', 'Concedii');
        if (p.includes('/accommodations')) return t('nav.accommodations', 'Cazări');
        if (p.includes('/activities')) return t('nav.activities', 'Activități');
        if (p.includes('/site-photos')) return t('nav.site_photos', 'Poze Șantier');
        if (p.includes('/warehouse')) return t('nav.warehouse', 'Magazie');
        if (p.includes('/fleet')) return t('nav.fleet', 'Parc Auto');
        if (p.includes('/transport')) return t('nav.transport', 'Transport');
        if (p.includes('/material-requests')) return t('nav.material_requests', 'Necesar Materiale');
        if (p.includes('/expenses')) return t('nav.expenses', 'Deconturi / Cheltuieli');
        if (p.includes('/alerts')) return t('nav.alerts', 'Avizier');
        if (p.includes('/emergencies')) return t('nav.emergencies', 'Urgențe');
        if (p.includes('/complaints')) return t('nav.complaints', 'Sesizări');
        if (p.includes('/users')) return t('nav.users', 'Utilizatori');
        if (p.includes('/settings')) return t('nav.settings', 'Setări');
        if (p.includes('/notifications')) return t('nav.notifications', 'Notificări');
        if (p.includes('/organizations')) return t('nav.organizations', 'Companii');
        return t('nav.planning', 'Planning');
    })();

    return (
`;
content = content.replace("    return (", getPageTitleCode);

// 2. Change Mobile Header Title
const mobileLogoBlockStart = content.indexOf('{/* Mobile Logo & Tenant Name */}');
const mobileLogoBlockEnd = content.indexOf('{/* Desktop Title & Date */}');
let mobileBlock = content.substring(mobileLogoBlockStart, mobileLogoBlockEnd);
mobileBlock = mobileBlock.replace(titleLogicStr, "{tenant?.name || 'Smart Timesheet'}");
content = content.substring(0, mobileLogoBlockStart) + mobileBlock + content.substring(mobileLogoBlockEnd);

// 3. Remove Desktop Title & Date from Header
const desktopTitleStart = content.indexOf('{/* Desktop Title & Date */}');
const desktopTitleEnd = content.indexOf('</div>\n                    </div>\n\n                    <div className="flex items-center gap-3 sm:gap-5">');
content = content.substring(0, desktopTitleStart) + content.substring(desktopTitleEnd);

// 4. Update the Main Outlet
const mainBlockStart = content.indexOf('{/* Main View Outlet */}');
const mainBlockEndStr = '                </main>\n            </div>\n\n            {/* Bottom Navigation Bar (Admin Mobile) */}';
const mainBlockEnd = content.indexOf(mainBlockEndStr);
const oldMain = content.substring(mainBlockStart, mainBlockEnd + 24);

const newMain = `{/* Main View Outlet */}
            <main className={\`flex-1 overflow-auto relative custom-scrollbar transition-colors \${darkMode ? 'bg-slate-950' : 'bg-slate-50'}\`}>
                {/* Page Title inside main area */}
                <div className="px-4 pt-4 md:px-8 md:pt-6 pb-2">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                        {pageTitle}
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
                        {now.toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : i18n.language === 'fr' ? 'fr-FR' : 'ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {now.toLocaleTimeString(i18n.language === 'nl' ? 'nl-NL' : i18n.language === 'fr' ? 'fr-FR' : 'ro-RO')}
                    </p>
                </div>
                
                <div className="p-4 md:p-8 md:pt-4 pb-24">
                    <Outlet />
                </div>
            </main>`;

content = content.replace(oldMain, newMain);

fs.writeFileSync(file, content);
console.log("Moved title successfully!");
