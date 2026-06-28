import fs from 'fs';
const file = 'src/pages/admin/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Change root wrapper flex to flex-col
content = content.replace("flex font-sans", "flex flex-col font-sans");

// 2. Extract Header
const headerStartStr = '                {/* Header Bar */}';
const headerEndStr = '                {/* Main View Outlet */}';
const headerStart = content.indexOf(headerStartStr);
const headerEnd = content.indexOf(headerEndStr);
let headerStr = content.substring(headerStart, headerEnd);

// 3. Remove Header from its original place
content = content.slice(0, headerStart) + content.slice(headerEnd);

// 4. Modify Logo in Header
const logoCode = `                     {/* Desktop Logo extracted from Sidebar */}
                     <div className="hidden md:flex items-center justify-center mr-2">
                         {tenant ? (
                             tenant.logo_url ? (
                                 <img src={getImageUrl(tenant.logo_url)} alt="Tenant Logo" className="h-10 max-h-12 w-auto object-contain bg-transparent" />
                             ) : (
                                 <div className="font-extrabold text-xl text-blue-600 px-2">{tenant.name || 'Tenant'}</div>
                             )
                         ) : (
                             <img src="/getapp_smart_timesheet_icon.png" alt="Smart Timesheet" className="h-10 object-contain opacity-70" />
                         )}
                     </div>\n`;
headerStr = headerStr.replace('                         {/* Mobile Logo & Tenant Name */}', logoCode + '                         {/* Mobile Logo & Tenant Name */}');

// 5. Insert Header before the Sidebar
const sidebarStartStr = '            {/* Sidebar and Main Layout Below Header */}';
// Wait, this string doesn't exist yet because I restored the file!
// Let's insert it before {/* Mobile Sidebar Overlay */} or {/* Sidebar */}
const insertTarget = '            {/* Mobile Sidebar Overlay */}';
content = content.replace(insertTarget, headerStr + '\n            {/* Layout below header */}\n            <div className="flex-1 flex min-h-0 relative">\n' + insertTarget);

// 6. Remove the Logo Area from Sidebar
const logoSidebarStartStr = '                {/* Logo Area matches Header height */}';
const logoSidebarEndStr = '                {/* Navigation */}';
const logoSidebarStart = content.indexOf(logoSidebarStartStr);
const logoSidebarEnd = content.indexOf(logoSidebarEndStr);
content = content.slice(0, logoSidebarStart) + content.slice(logoSidebarEnd);

// 7. Fix the div wrapping the Main Content
const mainWrapStart = '            {/* Main Content Area — dark class on html element handles all dark: variants */}\n            <div className="flex-1 flex flex-col min-w-0 relative">\n';
content = content.replace(mainWrapStart, '            {/* Main Content Area */}\n');

// 8. Close the new <div className="flex-1 flex min-h-0 relative">
// The div wrapping Outlet now needs </div> removed, but we need to close our new layout wrapper.
// So we just leave the </div> that was closing the main wrapper, it will now close the Layout wrapper!
// Let's check:
// <div className="flex-1 flex min-h-0 relative">
//   <aside>
//   <main><Outlet/></main>
// </div>
// The existing file had:
//   <div className="flex-1 flex flex-col min-w-0 relative">
//      <main><Outlet/></main>
//   </div>
// If we just remove the OPENING <div className="flex-1 flex flex-col min-w-0 relative">, then the CLOSING </div> will perfectly match our NEW <div className="flex-1 flex min-h-0 relative"> !!

fs.writeFileSync(file, content);
console.log('Done!');
