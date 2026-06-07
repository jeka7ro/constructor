import re

with open("src/pages/admin/ImportInvoice.jsx", "r") as f:
    code = f.read()

# Fix 1: Change purple gradients to blue-600
code = code.replace("from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500", "bg-blue-600 hover:bg-blue-700")
code = code.replace("bg-gradient-to-r", "")
code = code.replace("shadow-indigo-500/25", "shadow-sm")

# Fix 2: Change the Cancel button styles
cancel_old = 'className="px-6 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"'
cancel_new = 'className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900 shadow-sm"'
code = code.replace(cancel_old, cancel_new)

# Fix 3: Fix the Loading Spinner state to look clean
loading_old = '''
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Se analizează factura...</h3>
                    <p className="text-slate-500">{loadingStatus}</p>
                    <div className="w-64 h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-6 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full animate-pulse w-2/3"></div>
                    </div>
                </div>
'''
loading_new = '''
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-blue-100 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Se analizează factura...</h3>
                    <p className="text-sm text-slate-500">{loadingStatus}</p>
                    <div className="w-64 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-6 overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full animate-pulse w-2/3"></div>
                    </div>
                </div>
'''
code = code.replace(loading_old.strip(), loading_new.strip())

# Fix 4: Fix File Input tooltip by removing title or fixing the structure
# The file input area was: 
file_input_old = '''
                                <input 
                                    type="file"
                                    accept="application/pdf,image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileUpload}
                                />
'''
file_input_new = '''
                                <input 
                                    type="file"
                                    id="invoice-upload"
                                    accept="application/pdf,image/*"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
'''
# We must replace it and wrap the dropzone in a label matching 'invoice-upload'
code = code.replace(file_input_old.strip(), file_input_new.strip())

# Change the div wrap into a label wrap
div_dropzone_old = '<div className="relative group">'
div_dropzone_new = '<label htmlFor="invoice-upload" className="relative group cursor-pointer block">'
code = code.replace(div_dropzone_old, div_dropzone_new)

div_dropzone_end_old = '''
                                </div>
                            </div>
                        </div>
'''
div_dropzone_end_new = '''
                                </label>
                            </div>
                        </div>
'''
code = code.replace(div_dropzone_end_old.strip(), div_dropzone_end_new.strip())

# Fix header colors
code = code.replace("bg-indigo-600", "bg-blue-600")
code = code.replace("text-indigo-600", "text-blue-600")
code = code.replace("bg-indigo-50", "bg-blue-50")
code = code.replace("dark:bg-indigo-900/30", "dark:bg-blue-900/30")
code = code.replace("dark:text-indigo-400", "dark:text-blue-400")

# Fix button colors
code = code.replace("focus:ring-indigo-500", "focus:ring-blue-500")

# Write it back
with open("src/pages/admin/ImportInvoice.jsx", "w") as f:
    f.write(code)

