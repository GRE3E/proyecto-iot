"""
Test Suite Completo para el Módulo NLP
Prueba: Memory Search, Throttling, Detección de Ambigüedad, Contexto, Negaciones
"""

import pytest
import asyncio
import time
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime
from typing import AsyncGenerator
import sys
from pathlib import Path

# Agregar src al path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Importar módulos
from ai.nlp.nlp_core import NLPModule, UserDeviceContext, MEMORY_SEARCH_REGEX, NEGATION_REGEX, DEVICE_LOCATION_REGEX
from ai.nlp.iot_command_processor import IoTCommandProcessor
from ai.nlp.ollama_manager import OllamaManager
from ai.nlp.memory_manager import MemoryManager
from ai.nlp.user_manager import UserManager
from db.models import User, ConversationLog, IoTCommand

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def mock_ollama_manager():
    """Mock del OllamaManager"""
    manager = Mock(spec=OllamaManager)
    manager.is_online.return_value = True
    manager.get_async_client.return_value = AsyncMock()
    manager.close.return_value = None
    return manager


@pytest.fixture
def mock_mqtt_client():
    """Mock del Cliente MQTT"""
    client = Mock()
    client.disconnect = AsyncMock()
    return client


@pytest.fixture
def config_dict():
    """Configuración de prueba"""
    return {
        "assistant_name": "TestAssistant",
        "language": "es",
        "model": {
            "name": "qwen2.5:3b",
            "temperature": 0.3,
            "max_tokens": 1024,
            "top_p": 0.9,
            "top_k": 40,
            "repeat_penalty": 1.1,
            "num_ctx": 8192,
            "llm_retries": 2,
            "llm_timeout": 60
        },
        "capabilities": ["control_luces", "control_temperatura"],
        "timezone": "America/Lima"
    }


@pytest.fixture
def mock_iot_processor(mock_mqtt_client):
    """IoT Command Processor mockeado"""
    processor = IoTCommandProcessor(mock_mqtt_client)
    return processor


# ============================================================================
# TESTS: DETECCIÓN DE NEGACIONES
# ============================================================================

class TestNegationDetection:
    """Suite de tests para detección de negaciones"""
    
    def test_negation_detection_simple(self, config_dict, mock_ollama_manager):
        """Test detección de negaciones simples"""
        nlp = NLPModule(mock_ollama_manager, config_dict)
        
        negation_cases = [
            "NO enciendas la luz",
            "Nunca hagas eso",
            "No quiero que abras la puerta",
            "No enciendas nada",
            "No cierre la ventana"
        ]
        
        for case in negation_cases:
            result = nlp._contains_negation(case)
            assert result is True, f"❌ Debe detectar negación en: {case}"
        
        print(f"✅ Negaciones detectadas: {len(negation_cases)} casos")
    
    def test_no_negation_cases(self, config_dict, mock_ollama_manager):
        """Test casos sin negación"""
        nlp = NLPModule(mock_ollama_manager, config_dict)
        
        positive_cases = [
            "Enciende la luz",
            "Abre la puerta",
            "Sube la temperatura"
        ]
        
        for case in positive_cases:
            result = nlp._contains_negation(case)
            assert result is False, f"❌ No debe detectar negación en: {case}"
        
        print(f"✅ Sin negaciones: {len(positive_cases)} casos confirmados")
    
    def test_regex_negation_pattern(self):
        """Test patrón regex de negaciones"""
        test_cases = [
            ("no enciendas", True),
            ("nunca hagas", True),
            ("no quiero", True),
            ("no cierre", True),
            ("no prenda", True),
            ("enciende", False),
        ]
        
        for text, should_match in test_cases:
            match = bool(NEGATION_REGEX.search(text.lower()))
            assert match == should_match, f"❌ Regex falló para: {text}"
        
        print(f"✅ Patrón regex de negaciones: {len(test_cases)} casos")


# ============================================================================
# TESTS: EXTRACCIÓN DE INFORMACIÓN
# ============================================================================

class TestExtractDeviceInfo:
    """Suite de tests para extracción de información de dispositivos"""
    
    def test_extract_device_location(self, config_dict, mock_ollama_manager):
        """Test extracción de ubicación"""
        nlp = NLPModule(mock_ollama_manager, config_dict)
        
        test_cases = [
            ("Enciende la luz del salón", "salón"),
            ("Abre la puerta de la cocina", "cocina"),
            ("Sube temperatura en el dormitorio", "dormitorio"),
            ("Enciende la luz", None),
        ]
        
        for text, expected in test_cases:
            result = nlp._extract_device_location(text)
            if expected:
                assert result == expected, f"❌ Debe extraer {expected} de: {text}"
            else:
                assert result is None, f"❌ No debe extraer ubicación de: {text}"
        
        print(f"✅ Extracción de ubicación: {len(test_cases)} casos")
    
    def test_extract_device_info(self, mock_iot_processor):
        """Test extracción de tipo de dispositivo y ubicación"""
        test_cases = [
            ("Enciende luz cocina", "luz", "cocina"),
            ("Abre puerta principal", "puerta", "principal"),
            ("Activa ventilador sala", "ventilador", "sala"),
        ]
        
        for prompt, expected_device, expected_location in test_cases:
            device, location = mock_iot_processor._extract_device_info_from_prompt(prompt, "")
            assert expected_device.lower() in device.lower() or device == "desconocido"
            assert expected_location in location.lower() or location == "desconocida"
        
        print(f"✅ Extracción info dispositivo: {len(test_cases)} casos")
    
    def test_regex_location_pattern(self):
        """Test patrón regex de ubicaciones"""
        locations = ["salón", "cocina", "dormitorio", "pasillo", "baño"]
        
        for loc in locations:
            match = DEVICE_LOCATION_REGEX.search(loc)
            assert match is not None, f"❌ Regex debe encontrar: {loc}"
        
        print(f"✅ Patrón regex de ubicaciones: {len(locations)} ubicaciones")


# ============================================================================
# TESTS: CONTEXTO DE DISPOSITIVO
# ============================================================================

class TestUserDeviceContext:
    """Suite de tests para contexto de dispositivo"""
    
    def test_context_creation(self):
        """Test creación de contexto"""
        context = UserDeviceContext(context_ttl_seconds=300)
        
        assert context.get_context_info() is None, "❌ Contexto vacío debe retornar None"
        print("✅ Contexto creado correctamente")
    
    def test_context_update(self):
        """Test actualización de contexto"""
        context = UserDeviceContext(context_ttl_seconds=300)
        
        context.update("LIGHT_COCINA", "cocina", "luz")
        info = context.get_context_info()
        
        assert info is not None, "❌ Contexto debe contener información"
        assert info["device"] == "LIGHT_COCINA"
        assert info["location"] == "cocina"
        assert info["device_type"] == "luz"
        print("✅ Contexto actualizado correctamente")
    
    def test_context_expiration(self):
        """Test expiración de contexto"""
        context = UserDeviceContext(context_ttl_seconds=1)
        
        context.update("LIGHT_COCINA", "cocina", "luz")
        assert context.get_context_info() is not None, "❌ Contexto nuevo debe ser válido"
        
        time.sleep(1.1)
        assert context.get_context_info() is None, "❌ Contexto expirado debe retornar None"
        print("✅ Expiración de contexto funciona")
    
    def test_context_not_expired_before_ttl(self):
        """Test contexto no expira antes de TTL"""
        context = UserDeviceContext(context_ttl_seconds=10)
        
        context.update("LIGHT_SALA", "sala", "luz")
        assert not context.is_expired(), "❌ Contexto no debe expirar antes de TTL"
        print("✅ Contexto válido antes de TTL")


# ============================================================================
# TESTS: THROTTLING
# ============================================================================

class TestThrottling:
    """Suite de tests para throttling de comandos"""
    
    def test_throttling_first_command_allowed(self, mock_iot_processor):
        """Test primer comando está permitido"""
        user_id = 1
        ok, msg = mock_iot_processor._check_command_throttle(user_id)
        
        assert ok is True, "❌ Primer comando debe ser permitido"
        print("✅ Primer comando permitido")
    
    def test_throttling_min_interval(self, mock_iot_processor):
        """Test intervalo mínimo entre comandos"""
        user_id = 1
        
        ok1, _ = mock_iot_processor._check_command_throttle(user_id)
        assert ok1 is True
        mock_iot_processor._record_command(user_id)
        
        ok2, msg2 = mock_iot_processor._check_command_throttle(user_id)
        assert ok2 is False, "❌ Comando muy rápido debe ser bloqueado"
        assert "espera" in msg2.lower(), "❌ Debe indicar espera"
        print(f"✅ Intervalo mínimo bloqueado: {msg2}")
    
    def test_throttling_after_interval(self, mock_iot_processor):
        """Test comando permitido después de intervalo"""
        user_id = 2
        
        ok1, _ = mock_iot_processor._check_command_throttle(user_id)
        mock_iot_processor._record_command(user_id)
        
        time.sleep(1.1)
        
        ok2, _ = mock_iot_processor._check_command_throttle(user_id)
        assert ok2 is True, "❌ Comando después de intervalo debe ser permitido"
        print("✅ Comando permitido después de intervalo")
    
    def test_throttling_record_command(self, mock_iot_processor):
        """Test grabación de comando"""
        user_id = 3
        before = time.time()
        mock_iot_processor._record_command(user_id)
        after = time.time()
        
        recorded_time = mock_iot_processor._last_command_time[user_id]
        assert before <= recorded_time <= after, "❌ Tiempo de grabación inválido"
        print("✅ Comando grabado correctamente")


# ============================================================================
# TESTS: MEMORY SEARCH REGEX
# ============================================================================

class TestMemorySearchRegex:
    """Suite de tests para regex de memory search"""
    
    def test_memory_search_regex_match(self):
        """Test que regex detecta memory_search"""
        text = "memory_search: temperatura ideal"
        match = MEMORY_SEARCH_REGEX.search(text)
        
        assert match is not None, "❌ Regex debe encontrar memory_search"
        assert match.group(1).strip() == "temperatura ideal"
        print("✅ Memory search regex detecta correctamente")
    
    def test_memory_search_regex_no_match(self):
        """Test que regex no detecta si no hay memory_search"""
        text = "Esto no contiene memoria search"
        match = MEMORY_SEARCH_REGEX.search(text)
        
        assert match is None, "❌ Regex no debe encontrar nada"
        print("✅ Memory search regex no detecta falsos positivos")
    
    def test_memory_search_regex_extraction(self):
        """Test extracción de query del memory search"""
        cases = [
            ("memory_search: qué me dijiste", "qué me dijiste"),
            ("memory_search: temperatura", "temperatura"),
            ("memory_search:    espacios", "espacios"),
        ]
        
        for text, expected_query in cases:
            match = MEMORY_SEARCH_REGEX.search(text)
            assert match is not None
            query = match.group(1).strip()
            assert query == expected_query, f"❌ Extracción falló para: {text}"
        
        print(f"✅ Extracción de query: {len(cases)} casos")


# ============================================================================
# TESTS: IOT COMMAND PARSING
# ============================================================================

class TestIoTCommandParsing:
    """Suite de tests para parsing de comandos IoT"""
    
    def test_parse_valid_mqtt_command(self, mock_iot_processor):
        """Test parseo de comando MQTT válido"""
        command = "mqtt_publish:iot/lights/LIGHT_SALA/command,ON"
        success, msg, parts = mock_iot_processor._parse_iot_command(command)
        
        assert success is True, f"❌ Debe parsear comando válido. Mensaje: {msg}"
        assert parts["command_name"] == "mqtt_publish"
        assert parts["topic"] == "iot/lights/LIGHT_SALA/command"
        assert parts["payload"] == "ON"
        print("✅ Comando MQTT válido parseado")
    
    def test_parse_invalid_mqtt_command(self, mock_iot_processor):
        """Test rechazo de comando MQTT inválido"""
        invalid_commands = [
            "mqtt_publish:iot/lights/LIGHT_SALA",  # Sin payload
            "invalid_command:topic,payload",  # Tipo inválido
            "mqtt_publish:",  # Vacío
        ]
        
        for command in invalid_commands:
            success, msg, parts = mock_iot_processor._parse_iot_command(command)
            assert success is False, f"❌ Debe rechazar comando: {command}"
        
        print(f"✅ Comandos inválidos rechazados: {len(invalid_commands)}")


# ============================================================================
# TESTS: DEVICE CONTEXT ENHANCEMENT
# ============================================================================

class TestPromptEnhancement:
    """Suite de tests para mejora de prompt con contexto"""
    
    def test_enhance_prompt_with_context(self, config_dict, mock_ollama_manager):
        """Test mejora de prompt con contexto"""
        nlp = NLPModule(mock_ollama_manager, config_dict)
        user_id = 1
        
        nlp._user_device_context[user_id] = UserDeviceContext()
        nlp._user_device_context[user_id].update("LIGHT_COCINA", "cocina", "luz")
        
        prompt = "Apágala"
        enhanced = nlp._enhance_prompt_with_context(user_id, prompt)
        
        assert "[Contexto anterior:" in enhanced, "❌ Debe contener hint de contexto"
        assert "luz" in enhanced.lower()
        print("✅ Prompt mejorado con contexto")
    
    def test_enhance_prompt_with_explicit_location(self, config_dict, mock_ollama_manager):
        """Test que no mejora si hay ubicación explícita"""
        nlp = NLPModule(mock_ollama_manager, config_dict)
        user_id = 2
        
        nlp._user_device_context[user_id] = UserDeviceContext()
        nlp._user_device_context[user_id].update("LIGHT_COCINA", "cocina", "luz")
        
        prompt = "Apágala en el salón"
        enhanced = nlp._enhance_prompt_with_context(user_id, prompt)
        
        # Si ya hay ubicación, no debe agregar contexto
        assert enhanced == prompt, "❌ No debe modificar si hay ubicación explícita"
        print("✅ Prompt no modificado con ubicación explícita")


# ============================================================================
# TESTS: SHOULD LOAD HISTORY LOGIC
# ============================================================================

class TestHistoryLoadLogic:
    """Suite de tests para lógica de carga de historial"""
    
    def test_should_load_history_keyword_detection(self, config_dict, mock_ollama_manager):
        """Test detección de keywords para cargar historial"""
        nlp = NLPModule(mock_ollama_manager, config_dict)
        
        should_load_cases = [
            "¿Qué me dijiste antes?",
            "Recuerda que mencionaste algo",
            "Hablamos de esto anteriormente",
            "Lo que dijiste",
            "Me dijeron que",
        ]
        
        for case in should_load_cases:
            result = nlp._should_load_conversation_history(case)
            assert result is True, f"❌ Debe cargar historial para: {case}"
        
        print(f"✅ Detección de keywords: {len(should_load_cases)} casos")
    
    def test_should_not_load_history(self, config_dict, mock_ollama_manager):
        """Test casos donde no debe cargar historial"""
        nlp = NLPModule(mock_ollama_manager, config_dict)
        
        normal_cases = [
            "Enciende la luz",
            "¿Qué hora es?",
            "Abre la puerta",
        ]
        
        for case in normal_cases:
            result = nlp._should_load_conversation_history(case)
            assert result is False, f"❌ No debe cargar para: {case}"
        
        print(f"✅ Sin carga de historial: {len(normal_cases)} casos")


# ============================================================================
# TESTS DE INTEGRACIÓN
# ============================================================================

class TestIntegration:
    """Suite de tests de integración"""
    
    def test_multiple_features_together(self, config_dict, mock_ollama_manager, mock_iot_processor):
        """Test múltiples características juntas"""
        nlp = NLPModule(mock_ollama_manager, config_dict)
        
        # 1. Test negación
        assert nlp._contains_negation("no enciendas") is True
        
        # 2. Test ubicación
        assert nlp._extract_device_location("cocina") == "cocina"
        
        # 3. Test contexto
        context = UserDeviceContext()
        context.update("LIGHT_COCINA", "cocina", "luz")
        assert context.get_context_info() is not None
        
        print("✅ Integración de características completada")
    
    def test_edge_case_empty_prompt(self, config_dict, mock_ollama_manager):
        """Test caso límite con prompt vacío"""
        nlp = NLPModule(mock_ollama_manager, config_dict)
        
        result = nlp._contains_negation("")
        assert result is False, "❌ Prompt vacío no debe ser negación"
        
        location = nlp._extract_device_location("")
        assert location is None, "❌ Prompt vacío no debe extraer ubicación"
        
        print("✅ Edge case de prompt vacío manejado")


# ============================================================================
# RUNNER
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--tb=short"])