import bcrypt as _bcrypt


def hash_password(plain: str) -> str:
    """Genera un hash bcrypt de la contraseña."""
    salt = _bcrypt.gensalt()
    return _bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verifica una contraseña contra su hash bcrypt.
    
    Nota: reemplaza passlib porque passlib>=1.7.4 tiene incompatibilidad
    con bcrypt>=4.0 que causa AttributeError en el atributo __about__.
    """
    try:
        return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False
