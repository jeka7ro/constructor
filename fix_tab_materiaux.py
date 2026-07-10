import re

f = 'frontend/src/pages/employee/WorkerOrdersPage.jsx'
with open(f, 'r') as file:
    c = file.read()

# 1. Add Duramit, Fibre métallique, and Fibre plastique to estMaterials
old_est = """    const estMaterials = [...(order.materials || [])];
    if (sandTons > 0 && !estMaterials.find(m => m.name.toLowerCase().includes('nisip'))) {
        estMaterials.unshift({ name: 'Sable (Nécessaire calculé)', quantity: sandTons.toFixed(1), unit: 'T' });
    }
    // removed automatic duramit fallback"""

new_est = """    const estMaterials = [...(order.materials || [])].filter(m => 
        !m.name.toLowerCase().includes('duramit') && 
        !m.name.toLowerCase().includes('fibre') && 
        !m.name.toLowerCase().includes('metalic') && 
        !m.name.toLowerCase().includes('plastic')
    );
    
    // Inseram statusul clar pentru materiale speciale, imediat sub nisip
    const specialMats = [
        { name: 'Duramit', quantity: order.has_duramit ? 'OUI' : 'NON', unit: '' },
        { name: 'Fibre métallique', quantity: order.has_mesh ? 'OUI' : 'NON', unit: '' },
        { name: 'Fibre plastique', quantity: order.has_fiber ? 'OUI' : 'NON', unit: '' }
    ];
    
    if (sandTons > 0 && !estMaterials.find(m => m.name.toLowerCase().includes('nisip') || m.name.toLowerCase().includes('sable'))) {
        estMaterials.unshift({ name: 'Sable (Nécessaire calculé)', quantity: sandTons.toFixed(1), unit: 'T' });
        estMaterials.splice(1, 0, ...specialMats);
    } else {
        estMaterials.push(...specialMats);
    }"""
c = c.replace(old_est, new_est)

# 2. Translate labels
# "Matériaux Estimate" -> "Matériaux (Estimé)"
c = c.replace('label="Matériaux Estimate"', 'label="Matériaux (Estimé)"')

# "Date Reale Șantier (Completate de Șef)" -> "Données réelles du chantier (Chef d'équipe)"
c = c.replace('label="Date Reale Șantier (Completate de Șef)"', 'label="Données réelles du chantier (Chef d\'équipe)"')

# "Alte Matériaux Consumate" -> "Autres matériaux consommés"
c = c.replace('label="Alte Matériaux Consumate"', 'label="Autres matériaux consommés"')

with open(f, 'w') as file:
    file.write(c)
