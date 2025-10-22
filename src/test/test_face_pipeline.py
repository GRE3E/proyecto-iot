import os
import subprocess
import sys

# Rutas base del proyecto
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
RC_DIR = os.path.join(BASE_DIR, "rc")

# Archivos de los scripts
CAPTURE_SCRIPT = os.path.join(RC_DIR, "capture.py")
ENCODE_SCRIPT = os.path.join(RC_DIR, "encode.py")
RECOGNIZE_SCRIPT = os.path.join(RC_DIR, "recognize.py")

# Usa el mismo intérprete Python del entorno actual (.venv)
PYTHON_EXECUTABLE = sys.executable

def run_script(script_path, description):
    """Ejecuta un script Python dentro del mismo entorno virtual"""
    print(f"\n🧩 Ejecutando {description}...")
    try:
        result = subprocess.run(
            [PYTHON_EXECUTABLE, script_path],
            check=True,
            capture_output=True,
            text=True
        )
        print(f"✅ {description} completado correctamente.")
        print("Salida:\n", result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error al ejecutar {description}:")
        print(e.stderr)

def main():
    print("=== 🧠 Prueba completa del sistema de reconocimiento facial ===")

    # 1️⃣ Captura de rostros
    run_script(CAPTURE_SCRIPT, "Captura de rostros (capture.py)")

    # 2️⃣ Generación de encodings
    run_script(ENCODE_SCRIPT, "Generación de encodings (encode.py)")

    # 3️⃣ Reconocimiento facial
    run_script(RECOGNIZE_SCRIPT, "Reconocimiento facial (recognize.py)")

    print("\n🎯 Prueba finalizada. Verifica la consola para detalles.")

if __name__ == "__main__":
    main()
