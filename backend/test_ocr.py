from app.services.vision_ocr import extract_machine_screen_data
import requests

url = "https://ltxbghtnygnguoegtgfo.supabase.co/storage/v1/object/public/uploads/work_orders/326d74c3-fec5-4b34-89a5-fced052dcdb1/6d61b145.jpg"
image_bytes = requests.get(url).content
res = extract_machine_screen_data(image_bytes=image_bytes)
print(res)
