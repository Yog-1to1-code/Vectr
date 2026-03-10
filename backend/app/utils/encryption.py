import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# We need a consistent key for encryption/decryption
# Retrieve from environment, or generate a temporary one if testing
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    # If not set, generate one (WARNING: this will invalidate past PATs on restart if not saved in .env)
    ENCRYPTION_KEY = Fernet.generate_key().decode()
    print(f"WARNING: No ENCRYPTION_KEY found in .env. Generated temporary key: {ENCRYPTION_KEY}")

cipher_suite = Fernet(ENCRYPTION_KEY.encode())

def encrypt_pat(pat: str) -> str:
    """Encrypts a plain text GitHub PAT."""
    return cipher_suite.encrypt(pat.encode()).decode()

def decrypt_pat(encrypted_pat: str) -> str:
    """Decrypts an encrypted GitHub PAT back to plain text."""
    try:
        return cipher_suite.decrypt(encrypted_pat.encode()).decode()
    except Exception:
        return encrypted_pat
