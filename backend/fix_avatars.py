import os
import sys
import uuid
import io

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import User
from app.storage import upload_file

def main():
    try:
        import cv2
        import numpy as np
        from PIL import Image
    except ImportError:
        print("Eroare: Te rog sa instalezi pachetele ruland in terminal: pip install opencv-python-headless numpy")
        return

    db = SessionLocal()
    users = db.query(User).filter(User.id_card_path != None).all()
    
    print(f"S-au gasit {len(users)} utilizatori cu poza la buletin.")
    fixed_count = 0
    
    for user in users:
        print(f"Analizam buletinul lui {user.full_name}...")
        
        path = user.id_card_path
        local_filepath = None
        
        if path.startswith("/api/uploads/"):
            local_filepath = path.replace("/api/", "")
        elif path.startswith("/uploads/"):
            local_filepath = path[1:]
        elif path.startswith("http"):
            # Este URL din cloud, il vom descarca in memorie
            local_filepath = path
        else:
            local_filepath = f"uploads/{path}"
            
        try:
            from PIL import ImageOps
            if local_filepath.startswith("http"):
                import urllib.request
                req = urllib.request.Request(local_filepath, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    img_data = response.read()
                img = Image.open(io.BytesIO(img_data))
            else:
                if not os.path.exists(local_filepath):
                    print(f"  [Eroare] Fisierul original nu a fost gasit: {local_filepath}")
                    continue
                img = Image.open(local_filepath)
                
            # Apply EXIF rotation if any
            img = ImageOps.exif_transpose(img)
            
            open_cv_image = np.array(img.convert('RGB'))
            open_cv_image = open_cv_image[:, :, ::-1].copy() 

            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            face_cascade = cv2.CascadeClassifier(cascade_path)
            
            rotations = [
                (0, None, img),
                (90, cv2.ROTATE_90_CLOCKWISE, img.transpose(Image.ROTATE_270)),
                (180, cv2.ROTATE_180, img.transpose(Image.ROTATE_180)),
                (270, cv2.ROTATE_90_COUNTERCLOCKWISE, img.transpose(Image.ROTATE_90))
            ]
            
            face_crop = None
            
            for angle, cv_rot, pil_rot in rotations:
                rotated_cv = open_cv_image if angle == 0 else cv2.rotate(open_cv_image, cv_rot)
                gray = cv2.cvtColor(rotated_cv, cv2.COLOR_BGR2GRAY)
                
                faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
                
                if len(faces) > 0:
                    largest_face = max(faces, key=lambda rect: rect[2] * rect[3])
                    x, y, w, h = largest_face
                    margin_x = int(w * 0.25)
                    margin_y = int(h * 0.35)
                    img_h, img_w = rotated_cv.shape[:2]
                    
                    x1 = max(0, x - margin_x)
                    y1 = max(0, y - margin_y)
                    x2 = min(img_w, x + w + margin_x)
                    y2 = min(img_h, y + h + int(margin_y * 1.5))
                    
                    face_crop = pil_rot.crop((x1, y1, x2, y2))
                    break # Stop rotating, we found a face!
            
            # === FALLBACK: OCR Layout Analysis ===
            if not face_crop:
                try:
                    import easyocr
                    reader = easyocr.Reader(['ro', 'en'], gpu=False, verbose=False)
                    ocr_results = reader.readtext(open_cv_image)
                    
                    # Filter out MRZ (Machine Readable Zone) which contains lots of '<'
                    valid_text = [r for r in ocr_results if '<' not in r[1]]
                    
                    if len(valid_text) > 3: # Must have enough text to be an ID card
                        all_x = []
                        all_y = []
                        dx_sum = 0
                        dy_sum = 0
                        
                        for (bbox, text, prob) in valid_text:
                            pt0, pt1, pt2, pt3 = bbox
                            all_x.extend([pt0[0], pt1[0], pt2[0], pt3[0]])
                            all_y.extend([pt0[1], pt1[1], pt2[1], pt3[1]])
                            dx_sum += (pt1[0] - pt0[0])
                            dy_sum += (pt1[1] - pt0[1])
                            
                        all_x.sort()
                        all_y.sort()
                        
                        TX_min = all_x[int(len(all_x) * 0.20)]
                        TX_max = all_x[int(len(all_x) * 0.80)]
                        TY_min = all_y[int(len(all_y) * 0.10)]
                        TY_max = all_y[int(len(all_y) * 0.90)]
                        
                        if abs(dx_sum) > abs(dy_sum):
                            # Horizontal
                            fh = TY_max - TY_min
                            fw = fh * 0.75
                            y_start = TY_min + fh * 0.05
                            y_end = TY_max - fh * 0.05
                            if dx_sum > 0:
                                face_crop = img.crop((max(0, TX_min - fw), y_start, TX_min, y_end))
                            else:
                                face_crop = img.crop((TX_max, y_start, min(img.width, TX_max + fw), y_end))
                        else:
                            # Vertical
                            fw = TX_max - TX_min
                            fh = fw * 0.75
                            x_start = TX_min + fw * 0.05
                            x_end = TX_max - fw * 0.05
                            if dy_sum > 0:
                                face_crop = img.crop((x_start, max(0, TY_min - fh), x_end, TY_min))
                            else:
                                face_crop = img.crop((x_start, TY_max, x_end, min(img.height, TY_max + fh)))
                except Exception as ocr_e:
                    print(f"  [OCR Fallback Eroare] Trebuie instalat easyocr: pip install easyocr ({ocr_e})")

            # === FINAL FALLBACK ===
            if not face_crop:
                # If everything fails, do the default geometric crop
                w_img, h_img = img.size
                face_crop = img.crop((int(w_img * 0.02), int(h_img * 0.15), int(w_img * 0.35), int(h_img * 0.85)))
                print(f"  [Atentie] Folosim decupajul standard orb.")
            
            if face_crop:
                avatar_filename = f"avatar_fixed_{uuid.uuid4().hex[:8]}.jpg"
                avatar_buf = io.BytesIO()
                face_crop.save(avatar_buf, "JPEG", quality=90)
                avatar_url = upload_file(avatar_buf.getvalue(), f"avatars/{avatar_filename}", "image/jpeg")
                
                user.avatar_path = avatar_url
                db.commit()
                print(f"  [OK] Fata gasita si decupata cu succes!")
                fixed_count += 1
        except Exception as e:
            print(f"  [Eroare] {e}")

    db.close()
    print(f"\nGata! Au fost reparate {fixed_count} avatare folosind Inteligenta Artificiala.")

if __name__ == "__main__":
    main()
