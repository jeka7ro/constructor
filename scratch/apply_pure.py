import re

with open("backend/app/services/pdf_generator.py", "r") as f:
    content = f.read()

with open("scratch/patch.py", "r") as f:
    patch = f.read()

# find "def get_html_template" and inject _compute_pdf_data before it
idx = content.find("def get_html_template")
if idx == -1:
    print("Not found")
    exit(1)

# first, replace any existing _compute_pdf_data
if "def _compute_pdf_data" in content:
    idx_start = content.find("def _compute_pdf_data")
    idx_end = content.find("def get_html_template")
    content = content[:idx_start] + patch + "\n\n" + content[idx_end:]
else:
    content = content[:idx] + patch + "\n\n" + content[idx:]

# Next, update get_html_template to use _compute_pdf_data
get_html_str = """def get_html_template(work_order, client=None):
    \"\"\"Generates the HTML template for the PDF invoice/quote\"\"\"
    
    data = _compute_pdf_data(work_order, client, is_invoice=True)
    invoice_number = data['doc_number']
    issue_date = data['issue_date']
    client_name = data['client_name']
    client_cui = data['client_cui']
    client_address = data['client_address']
    table_rows = data['table_rows']
    total_net = data['total_net']
    total_vat = data['total_vat']
    vat_percent = data['vat_percent']
    total_gross = data['total_gross']

    html = f\"\"\""""
content = re.sub(r'def get_html_template\(.*?html = f\"\"\"', get_html_str, content, flags=re.DOTALL)

get_quote_str = """def get_quote_html_template(work_order, client=None):
    \"\"\"Generates the HTML template for the PDF quote (Devis)\"\"\"
    
    data = _compute_pdf_data(work_order, client, is_invoice=False)
    quote_number = data['doc_number']
    issue_date = data['issue_date']
    client_name = data['client_name']
    client_cui = data['client_cui']
    client_address = data['client_address']
    table_rows = data['table_rows']
    total_net = data['total_net']
    total_vat = data['total_vat']
    vat_percent = data['vat_percent']
    total_gross = data['total_gross']

    html = f\"\"\""""
content = re.sub(r'def get_quote_html_template\(.*?html = f\"\"\"', get_quote_str, content, flags=re.DOTALL)

with open("backend/app/services/pdf_generator.py", "w") as f:
    f.write(content)
