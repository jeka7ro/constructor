import re

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

target = """                        />
                    </Field>
                </div>
            </Section>

            {/* 5. Volume + Materiale */}"""

repl = """                        />
                    </Field>
                        </div>
                    </div>
                </div>
            </Section>

            {/* 5. Volume + Materiale */}"""

content = content.replace(target, repl)

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.write(content)

print("Fixed tags")
