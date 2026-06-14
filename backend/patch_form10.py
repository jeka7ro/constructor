import re

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

# Detalii Generale
content = content.replace(
    """<Section icon={FileText} title={t('work_order_form.general_details', 'Detalii, Client și Locație')} zIndex={80}>
                        {/* 2. Client */}
                        <div>""",
    """<Section icon={FileText} title={t('work_order_form.general_details', 'Detalii, Client și Locație')} zIndex={80}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 2. Client */}
                        <div className="min-w-0">"""
)

content = content.replace(
    """                        <div className="h-px w-full bg-slate-100 dark:bg-slate-800 my-6"></div>

                        {/* 3. Locatie + GPS */}
                        <div>""",
    """                        <div className="md:hidden h-px w-full bg-slate-100 dark:bg-slate-800 my-2"></div>

                        {/* 3. Locatie + GPS */}
                        <div className="min-w-0">"""
)

content = content.replace(
    """                                </>
                            )}
                        </div>
                    </Section>

            {/* 4. Planificare + Pret */""",
    """                                </>
                            )}
                        </div>
                        </div>
                    </Section>

            {/* 4. Planificare + Pret */"""
)

# Planificare and Echipa
content = content.replace(
    """            {/* 4. Planificare + Pret */}
            <Section icon={Calendar} title={t('work_order_form.planning', 'Planificare și Ofertare')} zIndex={50}>
                <div className="grid grid-cols-3 gap-2 md:gap-4 items-end">
                    <Field label={t('work_order_form.start_date', 'Data Incepere')} required>""",
    """            {/* 4. Planificare + Echipa */}
            <Section icon={Calendar} title={t('work_order_form.planning_and_team', 'Planificare & Echipă')} zIndex={50}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-orange-500" /><h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('work_order_form.planning', 'Planificare')}</h3></div>
                        <div className="grid grid-cols-3 gap-2 items-end">
                            <Field label={t('work_order_form.start_date', 'Data Incepere')} required>"""
)

content = content.replace(
    """                    </Field>
                </div>
            </Section>

            {/* 6. Echipa + Vehicul */}
            <Section icon={Users} title={t('work_order_form.team_vehicle', 'Echipa si Vehicul')} zIndex={40}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <Field label={t('work_order_form.team_leader', 'Șef de Echipă / Responsabil')}>""",
    """                    </Field>
                        </div>
                    </div>
                    <div className="md:hidden h-px w-full bg-slate-100 dark:bg-slate-800 my-2"></div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-blue-500" /><h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('work_order_form.team_vehicle', 'Echipa și Vehicul')}</h3></div>
                        <div className="grid grid-cols-2 gap-2 items-end">
                            <Field label={t('work_order_form.team_leader', 'Șef de Echipă / Responsabil')}>"""
)

content = content.replace(
    """                        />
                    </Field>
                </div>
            </Section>

            {/* 5. Volume + Materiale */}""",
    """                        />
                    </Field>
                        </div>
                    </div>
                </div>
            </Section>

            {/* 5. Volume + Materiale */}"""
)

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.write(content)

print("Merged UI successfully")
