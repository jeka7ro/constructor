import re

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

# 1. Update lucide-react import
content = content.replace("Users, Truck, Image, X, Clock, Save, Send, Banknote, Info\n} from 'lucide-react'", "Users, Truck, Image, X, Clock, Save, Send, Banknote, Info, Edit2\n} from 'lucide-react'")

# 2. Update EMPTY_FORM with prices
empty_form_target = "volumes: [{ label: 'Montaj sapa', quantity: '', unit: 'm²', thickness: '' }],"
empty_form_repl = "volumes: [{ label: 'Montaj sapa', quantity: '', unit: 'm²', thickness: '' }],\n    prices: { base: 12.5, extra: 1.25, foil: 1.2, mesh: 2.5 },"
if "prices: { base: 12.5" not in content:
    content = content.replace(empty_form_target, empty_form_repl)

# 3. Handle default in initialization
state_form_target = """    const [form, setForm] = useState(() => {
        if (!isEdit) {
            try {
                const saved = localStorage.getItem('work_order_draft_new');
                if (saved) return JSON.parse(saved);
            } catch (e) {}
        }
        return EMPTY_FORM;
    })"""
state_form_repl = """    const [form, setForm] = useState(() => {
        let initial = EMPTY_FORM;
        if (!isEdit) {
            try {
                const saved = localStorage.getItem('work_order_draft_new');
                if (saved) initial = JSON.parse(saved);
            } catch (e) {}
        }
        if (!initial.prices) {
            initial.prices = { base: 12.5, extra: 1.25, foil: 1.2, mesh: 2.5 };
        }
        return initial;
    })"""
if "let initial = EMPTY_FORM" not in content:
    content = content.replace(state_form_target, state_form_repl)


# 4. Remove auto-override useEffect completely
override_regex = re.compile(r"\s*// Auto-calculate estimated_amount based on volumes and client type\n\s*useEffect\(\(\) => \{.*?\}\, \[form\.volumes\, form\.client_id\, clients\, form\.estimated_amount\, form\.is_auto_calculated\]\);", re.DOTALL)
content = override_regex.sub("\n    // Auto-calculate logic removed", content)

# 5. Fix disabled state on the input
input_target = """                                disabled={form.is_auto_calculated}
                                className={`w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-l-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${form.is_auto_calculated ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400'}`}"""
input_repl = """                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-l-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400" """
content = content.replace(input_target, input_repl)

# 6. Change input type="number" to type="text" so that commas don't break it
content = content.replace("input type=\"number\" min=\"0\"\n                                value={form.estimated_amount", "input type=\"text\"\n                                value={form.estimated_amount")

# 7. Update rendering logic to use form.prices
content = content.replace("12.5 * surface", "(parseFloat(form.prices?.base || 12.5) * surface)")
content = content.replace("extraThickness * 1.25 * surface", "extraThickness * parseFloat(form.prices?.extra || 1.25) * surface")
content = content.replace("1.2 * surface", "parseFloat(form.prices?.foil || 1.2) * surface")
content = content.replace("2.5 * surface", "parseFloat(form.prices?.mesh || 2.5) * surface")


# 8. Add inputs to the rendered calculation block
calc_target_base = r"<span className=\"text-right whitespace-nowrap\">\{surfaceForAuto\} m² × 12.50 = <b className=\"text-slate-800 dark:text-slate-200 ml-1\">\{autoBase.toFixed\(2\)\} EUR</b></span>"
calc_repl_base = """<span className="text-right whitespace-nowrap flex items-center gap-2 justify-end">{surfaceForAuto} m² × <input type="number" step="0.1" value={form.prices?.base || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, base: e.target.value}}))} className="w-16 px-1 h-6 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-center" /> = <b className="text-slate-800 dark:text-slate-200 ml-1">{autoBase.toFixed(2)} EUR</b></span>"""
content = re.sub(calc_target_base, calc_repl_base, content)

calc_target_extra = r"<span className=\"text-right whitespace-nowrap\">\{surfaceForAuto\} m² × \{\(extraThickForAuto \* 1\.25\)\.toFixed\(2\)\} = <b className=\"text-slate-800 dark:text-slate-200 ml-1\">\{autoExtra.toFixed\(2\)\} EUR</b></span>"
calc_repl_extra = """<span className="text-right whitespace-nowrap flex items-center gap-2 justify-end">{surfaceForAuto} m² × {extraThickForAuto} cm × <input type="number" step="0.1" value={form.prices?.extra || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, extra: e.target.value}}))} className="w-16 px-1 h-6 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-center" /> = <b className="text-slate-800 dark:text-slate-200 ml-1">{autoExtra.toFixed(2)} EUR</b></span>"""
content = re.sub(calc_target_extra, calc_repl_extra, content)

calc_target_foil = r"<span className=\"text-right whitespace-nowrap\">\{surfaceForAuto\} m² × 1.20 = <b className=\"text-slate-800 dark:text-slate-200 ml-1\">\{autoFoil.toFixed\(2\)\} EUR</b></span>"
calc_repl_foil = """<span className="text-right whitespace-nowrap flex items-center gap-2 justify-end">{surfaceForAuto} m² × <input type="number" step="0.1" value={form.prices?.foil || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, foil: e.target.value}}))} className="w-16 px-1 h-6 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-center" /> = <b className="text-slate-800 dark:text-slate-200 ml-1">{autoFoil.toFixed(2)} EUR</b></span>"""
content = re.sub(calc_target_foil, calc_repl_foil, content)

calc_target_mesh = r"<span className=\"text-right whitespace-nowrap\">\{surfaceForAuto\} m² × 2.50 = <b className=\"text-slate-800 dark:text-slate-200 ml-1\">\{autoMesh.toFixed\(2\)\} EUR</b></span>"
calc_repl_mesh = """<span className="text-right whitespace-nowrap flex items-center gap-2 justify-end">{surfaceForAuto} m² × <input type="number" step="0.1" value={form.prices?.mesh || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, mesh: e.target.value}}))} className="w-16 px-1 h-6 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-center" /> = <b className="text-slate-800 dark:text-slate-200 ml-1">{autoMesh.toFixed(2)} EUR</b></span>"""
content = re.sub(calc_target_mesh, calc_repl_mesh, content)

# 9. Also add a button to "Copy total to estimated value"
calc_total_target = r"<span>\{t\('work_order_form.total_gross', 'TOTAL DE PLATĂ'\)\}:</span>\n\s*<span>\{totalGross.toFixed\(2\)\} EUR</span>"
calc_total_repl = """<span>{t('work_order_form.total_gross', 'TOTAL DE PLATĂ')}:</span>\n                                    <div className="flex items-center gap-3"><span>{totalGross.toFixed(2)} EUR</span><button type="button" onClick={() => set('estimated_amount', totalGross.toFixed(2))} className="px-3 h-8 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm font-bold transition-colors">Folosește ca Estimare</button></div>"""
content = re.sub(calc_total_target, calc_total_repl, content)


with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.write(content)

print("Patched WorkOrderForm completely.")
