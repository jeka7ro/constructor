import bcrypt
hash_str = "$2b$12$/9dCdH3dmvjcOqDXDWLMpOT8f7wmyn3zZVsKW9VmwFctLVQdOwYqK"
print("Davide2026! matches:", bcrypt.checkpw("Davide2026!".encode('utf-8'), hash_str.encode('utf-8')))
