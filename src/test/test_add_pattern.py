"""
Test para añadir un patrón a un usuario.
Ubicación: src/test/test_add_pattern.py

Ejecutar con: python -m pytest src/test/test_add_pattern.py -v -s
"""

import sys
import pytest
from pathlib import Path
from datetime import datetime, timedelta

# Agregar el path del proyecto
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from src.ai.nlp.memory_brain.memory_brain import MemoryBrain


@pytest.fixture
def memory_brain():
    """Fixture para crear una instancia de MemoryBrain"""
    memory_dir = Path(__file__).parent.parent.parent.parent / "data" / "memory_brain_test_add_pattern"
    memory_dir.mkdir(parents=True, exist_ok=True)
    
    brain = MemoryBrain(memory_dir)
    
    yield brain
    
    # No cleanup para que la data persista
    pass


def test_add_new_pattern_for_user_1(memory_brain):
    """Test para añadir un nuevo patrón para el usuario con ID 1"""
    print("\n" + "="*70)
    print("  TEST: AÑADIR NUEVO PATRÓN PARA USUARIO 1")
    print("="*70)
    
    user_id = 1
    user_name = "TestUser1"
    target_hour = datetime.now().hour  # Usar hora actual
    base_time = datetime.now().replace(minute=0, second=0, microsecond=0)
    
    # Inyectar 5 eventos a la misma hora en días diferentes para crear un patrón fuerte
    for day in range(5):
        timestamp = base_time - timedelta(days=day)
        memory_brain.context_tracker.track_event(
            user_id=user_id,
            user_name=user_name,
            intent="encender_ventilador",
            action="mqtt_publish:iot/fans/FAN_DORMITORIO/command,ON",
            context={
                "hour": target_hour,
                "day": timestamp.weekday(),
                "timestamp": timestamp.isoformat()
            },
            device_type="ventilador",
            location="dormitorio"
        )
        print(f"✅ Evento {day+1}: {timestamp.strftime('%Y-%m-%d %H:%M')} (Hora context: {target_hour})")
    
    # Analizar patrones
    patterns = memory_brain.pattern_analyzer.detect_all_patterns(user_id)
    
    print(f"\n📊 Patrones temporales detectados: {len(patterns['time_patterns'])}")
    
    # Assertions
    assert len(patterns['time_patterns']) > 0, "Debería detectar al menos 1 patrón temporal"
    
    pattern_found = False
    for pattern in patterns['time_patterns']:
        if pattern['hour'] == target_hour and pattern['frequency'] >= 5 and pattern['confidence'] >= 0.8:
            pattern_found = True
            print(f"   Patrón detectado: Hora {pattern['hour']}:00, Frecuencia: {pattern['frequency']}, Confianza: {pattern['confidence']:.0%}")
            break
            
    assert pattern_found, f"No se detectó el patrón esperado para la hora {target_hour}:00 con alta confianza y frecuencia."
    print(f"✅ Patrón de 'encender_ventilador' a las {target_hour}:00 detectado correctamente para el usuario {user_id}.")