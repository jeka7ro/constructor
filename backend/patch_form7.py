import re

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

# 1. Wrap Client and Locatie in a grid
client_start_target = """                    <Section icon={FileText} title={t('work_order_form.general_details', 'Detalii, Client și Locație')} zIndex={80}>
                        {/* 2. Client */}
                        <div>"""
client_start_repl = """                    <Section icon={FileText} title={t('work_order_form.general_details', 'Detalii, Client și Locație')} zIndex={80}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        {/* 2. Client */}
                        <div>"""
content = content.replace(client_start_target, client_start_repl)

separator_target = """                            )}
                        </div>

                        <div className="h-px w-full bg-slate-100 dark:bg-slate-800 my-6"></div>

                        {/* 3. Locatie + GPS */}"""
separator_repl = """                            )}
                        </div>

                        {/* separator hidden on md+ */}
                        <div className="md:hidden h-px w-full bg-slate-100 dark:bg-slate-800 my-2"></div>

                        {/* 3. Locatie + GPS */}"""
content = content.replace(separator_target, separator_repl)

locatie_end_target = """                                </>
                            )}
                        </div>
                    </Section>"""
locatie_end_repl = """                                </>
                            )}
                        </div>
                        </div>
                    </Section>"""
content = content.replace(locatie_end_target, locatie_end_repl)

# 2. Merge Planificare and Echipa
plan_echipa_target = """            {/* 5. Planificare */}
            <Section icon={Calendar} title={t('work_order_form.planning', 'Planificare și Ofertare')} zIndex={50}>
                <div className="grid grid-cols-3 gap-2 md:gap-4 items-end">
                    <Field label={t('work_order_form.start_date', 'Data Incepere')} required>"""

plan_echipa_repl = """            {/* 5. Planificare & Echipa */}
            <Section icon={Calendar} title={t('work_order_form.planning_and_team', 'Planificare & Echipă')} zIndex={50}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    
                    {/* Planificare col */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Planificare</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 items-end">
                            <Field label={t('work_order_form.start_date', 'Data Incepere')} required>"""
content = content.replace(plan_echipa_target, plan_echipa_repl)

plan_echipa_mid_target = """                    </Field>
                </div>
            </Section>

            {/* 6. Echipa + Vehicul */}
            <Section icon={Users} title={t('work_order_form.team_vehicle', 'Echipa si Vehicul')} zIndex={40}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <Field label={t('work_order_form.team_leader', 'Șef de Echipă / Responsabil')}>"""

plan_echipa_mid_repl = """                    </Field>
                        </div>
                    </div>

                    {/* separator hidden on md+ */}
                    <div className="md:hidden h-px w-full bg-slate-100 dark:bg-slate-800 my-2"></div>

                    {/* Echipa col */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="w-4 h-4 text-blue-500" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Echipa și Vehicul</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                            <Field label={t('work_order_form.team_leader', 'Șef de Echipă / Responsabil')}>"""
content = content.replace(plan_echipa_mid_target, plan_echipa_mid_repl)

plan_echipa_end_target = """                    </Field>
                </div>
            </Section>

            {/* 6. Instructiuni Acces */}"""

plan_echipa_end_repl = """                    </Field>
                        </div>
                    </div>
                </div>
            </Section>

            {/* 6. Instructiuni Acces */}"""
content = content.replace(plan_echipa_end_target, plan_echipa_end_repl)

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.write(content)

print("Applied layout compaction")
