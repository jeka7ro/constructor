import re

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

# 1. Merge Detalii Generale
t1 = """                    <Section icon={FileText} title={t('work_order_form.general_details', 'Detalii, Client și Locație')} zIndex={80}>
                        {/* 2. Client */}
                        <div>"""
r1 = """                    <Section icon={FileText} title={t('work_order_form.general_details', 'Detalii, Client și Locație')} zIndex={80}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        {/* 2. Client */}
                        <div className="min-w-0">"""
content = content.replace(t1, r1)

t2 = """                            )}
                        </div>

                        <div className="h-px w-full bg-slate-100 dark:bg-slate-800 my-6"></div>

                        {/* 3. Locatie + GPS */}
                        <div>"""
r2 = """                            )}
                        </div>

                        {/* separator md */}
                        <div className="md:hidden h-px w-full bg-slate-100 dark:bg-slate-800 my-2"></div>

                        {/* 3. Locatie + GPS */}
                        <div className="min-w-0">"""
content = content.replace(t2, r2)

t3 = """                                </>
                            )}
                        </div>
                    </Section>"""
r3 = """                                </>
                            )}
                        </div>
                        </div>
                    </Section>"""
content = content.replace(t3, r3)

# 2. Merge Planificare
p1 = """            {/* 5. Planificare */}
            <Section icon={Calendar} title={t('work_order_form.planning', 'Planificare și Ofertare')} zIndex={50}>
                <div className="grid grid-cols-3 gap-2 md:gap-4 items-end">
                    <Field label={t('work_order_form.start_date', 'Data Incepere')} required>"""
pr1 = """            {/* 5. Planificare & Echipa */}
            <Section icon={Calendar} title={t('work_order_form.planning_and_team', 'Planificare & Echipă')} zIndex={50}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    {/* Planificare */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Planificare</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2 items-end">
                            <Field label={t('work_order_form.start_date', 'Data Incepere')} required>"""
content = content.replace(p1, pr1)

p2 = """                    </Field>
                </div>
            </Section>

            {/* 6. Echipa + Vehicul */}
            <Section icon={Users} title={t('work_order_form.team_vehicle', 'Echipa si Vehicul')} zIndex={40}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <Field label={t('work_order_form.team_leader', 'Șef de Echipă / Responsabil')}>"""
pr2 = """                    </Field>
                        </div>
                    </div>
                    {/* Echipa */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Echipă</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2 items-end">
                            <Field label={t('work_order_form.team_leader', 'Șef de Echipă / Responsabil')}>"""
content = content.replace(p2, pr2)

p3 = """                        />
                    </Field>
                </div>
            </Section>

            {/* 5. Volume + Materiale */}"""
pr3 = """                        />
                    </Field>
                        </div>
                    </div>
                </div>
            </Section>

            {/* 5. Volume + Materiale */}"""
content = content.replace(p3, pr3)

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.write(content)

print("Applied UI fixes")
