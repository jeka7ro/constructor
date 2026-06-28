import fs from 'fs';
const file = 'src/pages/admin/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// We need to target only the <header> block for these replacements.
const startHeader = content.indexOf('                {/* Header Bar */}');
const endHeader = content.indexOf('            {/* Layout below header */}');
if (startHeader === -1 || endHeader === -1) {
    console.error("Could not find header boundaries");
    process.exit(1);
}

let header = content.substring(startHeader, endHeader);

// 1. Header main tag
header = header.replace(
    'className={`h-20 bg-white dark:bg-slate-800 px-6 flex items-center justify-between z-40 text-slate-800 dark:text-white shadow-sm transition-colors shadow-slate-900/10 max-md:bg-[color:var(--mobile-bg)] max-md:text-white md:mx-4 md:mt-4 md:mb-4 md:rounded-[24px] shrink-0`}',
    'className={`h-20 bg-[color:var(--tenant-bg)] px-6 flex items-center justify-between z-40 text-white shadow-sm transition-colors md:mx-4 md:mt-4 md:mb-4 md:rounded-[24px] shrink-0`}'
);
header = header.replace(
    "style={{ '--mobile-bg': tenant?.primary_color || '#2563EB' }}",
    "style={{ '--tenant-bg': tenant?.primary_color || '#2563EB' }}"
);

// 2. Menu button
header = header.replace(
    'className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 transition-colors hidden md:block"',
    'className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors hidden md:block"'
);

// 3. Logo text
header = header.replace(
    '<div className="font-extrabold text-xl text-blue-600 px-2">',
    '<div className="font-extrabold text-xl text-white px-2">'
);

// 4. Mobile tenant name
header = header.replace(
    'className="font-extrabold text-[15px] leading-tight tracking-tighter text-slate-900 dark:text-white/95 max-md:text-white truncate max-w-[200px]"',
    'className="font-extrabold text-[15px] leading-tight tracking-tighter text-white truncate max-w-[200px]"'
);

// 5. Desktop title
header = header.replace(
    'className={`font-bold text-lg leading-tight tracking-tight text-slate-900 font-extrabold dark:text-white/90 uppercase tracking-wider`}',
    'className={`font-bold text-lg leading-tight tracking-tight text-white font-extrabold uppercase tracking-wider`}'
);

// 6. Desktop date
header = header.replace(
    'className="text-[10px] text-slate-500 font-medium leading-none tracking-wide mt-0.5"',
    'className="text-[10px] text-white/70 font-medium leading-none tracking-wide mt-0.5"'
);

// 7. LanguageSelector
header = header.replace(
    '<LanguageSelector variant={darkMode ? \'dark\' : \'light\'} className="max-md:!text-white max-md:!border-white/30 max-md:!bg-white/10" />',
    '<LanguageSelector variant="dark" className="!text-white !border-white/30 !bg-white/10 hover:!bg-white/20" />'
);

// 8. Dark mode toggle
header = header.replace(
    'className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 max-md:border-white/30 text-slate-500 max-md:text-white dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 max-md:hover:bg-white/10 transition-all duration-200 shadow-sm"',
    'className="w-8 h-8 rounded-full flex items-center justify-center border border-white/30 text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200 shadow-sm"'
);

// 9. Complaints button
header = header.replace(
    'className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 max-md:border-white/30 transition-colors relative text-slate-500 max-md:text-white hover:text-blue-600 max-md:hover:text-white hover:bg-slate-50 max-md:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 shadow-sm"',
    'className="w-8 h-8 flex items-center justify-center rounded-full border border-white/30 transition-colors relative text-white/90 hover:text-white hover:bg-white/10 shadow-sm"'
);

// 10. Notifications button
header = header.replace(
    'className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 max-md:border-white/30 transition-colors relative text-slate-500 max-md:text-white hover:text-blue-600 max-md:hover:text-white hover:bg-slate-50 max-md:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 shadow-sm"',
    'className="w-8 h-8 flex items-center justify-center rounded-full border border-white/30 transition-colors relative text-white/90 hover:text-white hover:bg-white/10 shadow-sm"'
);

// 11. Separators (2 occurrences)
header = header.replaceAll(
    'className="w-[1px] h-5 bg-slate-200 dark:bg-white/20 mx-1 hidden sm:block"',
    'className="w-[1px] h-5 bg-white/20 mx-1 hidden sm:block"'
);
header = header.replaceAll(
    'className="w-[1px] h-8 bg-slate-200 dark:bg-white/20 hidden sm:block"',
    'className="w-[1px] h-8 bg-white/20 hidden sm:block"'
);

// 12. Profile text is inherited, Logout text is text-red-400 -> text-red-300
header = header.replace(
    'className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center justify-end w-full gap-1 mt-1 cursor-pointer hover:underline group"',
    'className="text-xs text-red-200 hover:text-white font-medium flex items-center justify-end w-full gap-1 mt-1 cursor-pointer hover:underline group"'
);

// 13. Mobile Logout button
header = header.replace(
    'className="sm:hidden flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 max-md:border-white/30 max-md:bg-white/10 text-red-500 max-md:text-white hover:bg-red-50 dark:hover:bg-slate-800 transition-colors shadow-sm ml-0.5"',
    'className="sm:hidden flex items-center justify-center w-9 h-9 rounded-full border border-white/30 bg-white/10 text-white hover:bg-red-500/80 transition-colors shadow-sm ml-0.5"'
);

content = content.substring(0, startHeader) + header + content.substring(endHeader);
fs.writeFileSync(file, content);
console.log("Updated header colors successfully!");
