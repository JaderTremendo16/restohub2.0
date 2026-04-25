import sqlite3

def add_password_column():
    try:
        conn = sqlite3.connect('restohub.db')
        cursor = conn.cursor()
        # Intentar añadir password a employees
        try:
            cursor.execute("ALTER TABLE employees ADD COLUMN password TEXT;")
            print("Columna 'password' añadida a 'employees'.")
        except:
            print("La columna 'password' ya existe en 'employees'.")
            
        # Intentar añadir role a work_shifts
        try:
            cursor.execute("ALTER TABLE work_shifts ADD COLUMN role TEXT;")
            print("Columna 'role' añadida a 'work_shifts'.")
        except:
            print("La columna 'role' ya existe en 'work_shifts'.")
            
        # Asegurar que todos los empleados tengan un rol para evitar errores de GraphQL
        cursor.execute("UPDATE employees SET role = 'cajero' WHERE role IS NULL OR role = '';")
        print("Roles actualizados para empleados existentes.")
            
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_password_column()
