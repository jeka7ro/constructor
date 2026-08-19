import requests

r = requests.get('https://fdb93f82-1040-4386-84b4-79c64ad7805e.up.railway.app/admin/work-orders?audit_mode=true')
if r.status_code == 200:
    for wo in r.json():
        if wo.get('client_name') == 'Eugeniu Cazmal' and wo.get('is_quote'):
            proforma = wo.get('proforma_data') or {}
            saved = proforma.get('totals', {}).get('net', 0)
            if saved == 8035.00:
                print("FOUND!")
                print("Volumes:", wo.get('volumes'))
                print("Prices:", wo.get('prices'))
                print("Recalculated Items:", wo.get('recalculated_items'))
                print("Recalculated Net:", wo.get('recalculated_net'))
