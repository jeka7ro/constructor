import re

f = 'frontend/src/pages/employee/WorkerOrdersPage.jsx'
with open(f, 'r') as file:
    c = file.read()

# Fix estMaterials to include special materials near sand
old_est_logic = """    const estMaterials = [...(order.materials || [])];
    if (sandTons > 0 && !estMaterials.find(m => m.name.toLowerCase().includes('nisip'))) {
        estMaterials.unshift({ name: 'Sable (Nécessaire calculé)', quantity: sandTons.toFixed(1), unit: 'T' });
    }
    // removed automatic duramit fallback"""

new_est_logic = """    const estMaterials = [...(order.materials || [])];
    if (sandTons > 0 && !estMaterials.find(m => m.name.toLowerCase().includes('sable') || m.name.toLowerCase().includes('nisip'))) {
        estMaterials.unshift({ name: 'Sable (estimé)', quantity: sandTons.toFixed(1), unit: 'T' });
    }
    
    let insertIndex = 1;
    const specialMats = [
        { key: 'has_duramit', label: 'Duramit' },
        { key: 'has_fiber_plastic', label: 'Fibre Plastique' },
        { key: 'has_fiber_metal', label: 'Fibre Métallique' },
        { key: 'has_mesh', label: 'Treillis' }
    ];
    specialMats.forEach(sm => {
        if (order[sm.key]) {
            estMaterials.splice(insertIndex, 0, { name: sm.label, quantity: 'OUI', unit: '' });
            insertIndex++;
        }
    });"""

c = c.replace(old_est_logic, new_est_logic)

# Fix display of Other Materials (Alte Materiale Consumate -> "Autres matériaux consommés")
# Add state to TabMatériaux
old_states = """    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)"""

new_states = """    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [showOtherMaterials, setShowOtherMaterials] = useState(false)"""

c = c.replace(old_states, new_states)

# Wrap "Autres matériaux consommés" in a toggle
# We look for `<Section label="Autres matériaux consommés">`
old_other = """            {/* Matériaux suplimentare */}
            <Section label="Autres matériaux consommés">
                <div className="space-y-2">"""

new_other = """            {/* Matériaux suplimentare */}
            <Section label="Autres matériaux consommés">
                <div className="mb-3">
                    <button 
                        onClick={() => setShowOtherMaterials(!showOtherMaterials)}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors uppercase tracking-wider"
                    >
                        {showOtherMaterials ? "Masquer les autres matériaux" : "Ajouter d'autres matériaux consommés"}
                    </button>
                </div>
                {showOtherMaterials && (
                <div className="space-y-2">"""

# Close the conditional block right before the Save button block
# The Save button block starts with:
#             {/* Salvare */}
#             <div className="pt-2">

old_save = """            {/* Salvare */}
            <div className="pt-2">"""

new_save = """                )}
            </Section>

            {/* Salvare */}
            <div className="pt-2">"""

# wait! The `</Section>` is above `{/* Salvare */}` already.
# I need to close the `{showOtherMaterials && (` before the `</Section>` of "Autres matériaux consommés".
# Let's check exactly how it looks using `sed`.
