import asyncio
import re
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("MusicIntentProcessor")

class IntentProcessor:
    """Procesador de intents de voz/texto para control de música."""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Inicializa el procesador de intents.
        
        Args:
            config_path: Ruta al archivo de configuración del MusicManager
        """

        self.logger = logging.getLogger(__name__)
        
        # Patrones de intents
        self.intent_patterns = {
            'play': [
                r'reproduc(?:ir|e)\s+(.+)',
                r'pon(?:er)?\s+(.+)',
                r'tocar?\s+(.+)',
                r'pon(?:me)?\s+(.+)',
                r'reproduce\s+(.+)',
                r'música\s+(.+)',
                r'canción\s+(.+)'
            ],
            'pause': [
                r'pausar?',
                r'pausa',
                r'detener\s*temporalmente',
                r'congelar',
                r'stop\s*temporal'
            ],
            'resume': [
                r'reanudar?',
                r'continuar?',
                r'resum(?:ir|e)',
                r'seguir?',
                r'regresar',
                r'volver'
            ],
            'stop': [
                r'detener?',
                r'parar?',
                r'stop',
                r'finalizar',
                r'terminar',
                r'acabar',
                r'cerrar\s*música'
            ],
            'volume': [
                r'volumen\s+(\d+)',
                r'pon(?:er)?\s+volumen\s+(\d+)',
                r'subir\s+volumen\s+a\s+(\d+)',
                r'bajar\s+volumen\s+a\s+(\d+)',
                r'volumen\s+al\s+(\d+)',
                r'qué\s+volumen\s+tenemos',
                r'volumen\s+actual'
            ],
            'status': [
                r'estado',
                r'qué\s+está\s+sonando',
                r'información',
                r'qué\s+música\s+está\s+sonando',
                r'estado\s+actual'
            ]
        }
    
    def extract_intent(self, text: str) -> Dict[str, Any]:
        """
        Extrae el intent y los parámetros del texto.
        
        Args:
            text: Texto del usuario
            
        Returns:
            Dict con 'intent' y 'params'
        """
        text_lower = text.lower().strip()
        
        # Buscar coincidencias con patrones
        for intent_type, patterns in self.intent_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text_lower, re.IGNORECASE)
                if match:
                    params = match.groups()
                    return {
                        'intent': intent_type,
                        'params': list(params) if params else [],
                        'original_text': text
                    }
        
        # Si no se encuentra intent específico, verificar si es una búsqueda general
        if len(text.split()) <= 5:  # Búsqueda corta
            return {
                'intent': 'play',
                'params': [text],
                'original_text': text
            }
        
        return {
            'intent': 'unknown',
            'params': [],
            'original_text': text
        }
    
    async def process_intent(self, text: str) -> Dict[str, Any]:
        """
        Procesa un intent y ejecuta la acción correspondiente.
        
        Args:
            text: Texto del usuario
            
        Returns:
            Dict con la respuesta y estado
        """
        try:
            self.logger.info(f"Procesando intent: '{text}'")
            
            # Extraer intent
            intent_data = self.extract_intent(text)
            intent_type = intent_data['intent']
            params = intent_data['params']
            
            self.logger.info(f"Intent detectado: {intent_type}, params: {params}")
            
            # Ejecutar acción según intent
            if intent_type == 'play':
                return await self._handle_play_intent(params)
            elif intent_type == 'pause':
                return self._handle_pause_intent()
            elif intent_type == 'resume':
                return self._handle_resume_intent()
            elif intent_type == 'stop':
                return self._handle_stop_intent()
            elif intent_type == 'volume':
                return self._handle_volume_intent(params)
            elif intent_type == 'status':
                return self._handle_status_intent()
            else:
                return self._handle_unknown_intent(text)
                
        except Exception as e:
            self.logger.error(f"Error procesando intent: {e}")
            return {
                'response': f"Lo siento, ocurrió un error: {str(e)}",
                'status': 'error',
                'intent': 'error'
            }
    
    async def _handle_play_intent(self, params: list) -> Dict[str, Any]:
        """Maneja el intent de reproducción."""
        if not params or not params[0].strip():
            return {
                'response': "¿Qué música te gustaría reproducir?",
                'status': 'missing_params',
                'intent': 'play'
            }
        
        query = params[0].strip()
        
        try:
            result = await self.music_manager.play(query)
            
            response = f"Reproduciendo '{result['title']}' de {result['uploader']}"
            if result.get('duration'):
                minutes = result['duration'] // 60
                seconds = result['duration'] % 60
                response += f" ({minutes}:{seconds:02d})"
            
            return {
                'response': response,
                'status': 'playing',
                'intent': 'play',
                'data': result
            }
            
        except Exception as e:
            self.logger.error(f"Error en reproducción: {e}")
            return {
                'response': f"Lo siento, no pude reproducir '{query}'. Intenta con otro título o artista.",
                'status': 'error',
                'intent': 'play'
            }
    
    def _handle_pause_intent(self) -> Dict[str, Any]:
        """Maneja el intent de pausa."""
        try:
            if not self.music_manager.is_playing():
                return {
                    'response': "No hay música sonando actualmente.",
                    'status': 'not_playing',
                    'intent': 'pause'
                }
            
            result = self.music_manager.pause()
            
            if result['success']:
                return {
                    'response': "⏸️ Música pausada.",
                    'status': 'paused',
                    'intent': 'pause'
                }
            else:
                return {
                    'response': "No se pudo pausar la música.",
                    'status': 'error',
                    'intent': 'pause'
                }
                
        except Exception as e:
            self.logger.error(f"Error en pausa: {e}")
            return {
                'response': f"Error al pausar: {str(e)}",
                'status': 'error',
                'intent': 'pause'
            }
    
    def _handle_resume_intent(self) -> Dict[str, Any]:
        """Maneja el intent de reanudación."""
        try:
            result = self.music_manager.resume()
            
            if result['success']:
                return {
                    'response': "▶️ Música reanudada.",
                    'status': 'playing',
                    'intent': 'resume'
                }
            else:
                return {
                    'response': "No hay música pausada para reanudar.",
                    'status': 'not_paused',
                    'intent': 'resume'
                }
                
        except Exception as e:
            self.logger.error(f"Error en reanudación: {e}")
            return {
                'response': f"Error al reanudar: {str(e)}",
                'status': 'error',
                'intent': 'resume'
            }
    
    def _handle_stop_intent(self) -> Dict[str, Any]:
        """Maneja el intent de detención."""
        try:
            result = self.music_manager.stop()
            
            if result['success']:
                return {
                    'response': "⏹️ Música detenida.",
                    'status': 'stopped',
                    'intent': 'stop'
                }
            else:
                return {
                    'response': "No hay música sonando para detener.",
                    'status': 'not_playing',
                    'intent': 'stop'
                }
                
        except Exception as e:
            self.logger.error(f"Error en detención: {e}")
            return {
                'response': f"Error al detener: {str(e)}",
                'status': 'error',
                'intent': 'stop'
            }
    
    def _handle_volume_intent(self, params: list) -> Dict[str, Any]:
        """Maneja el intent de control de volumen."""
        try:
            # Si no hay parámetros, devolver volumen actual
            if not params or not params[0].strip():
                current_volume = self.music_manager.get_volume()
                return {
                    'response': f"El volumen actual es {current_volume}%",
                    'status': 'info',
                    'intent': 'volume',
                    'volume': current_volume
                }
            
            # Extraer número del primer parámetro
            volume_str = params[0].strip()
            
            # Buscar número en el texto
            volume_match = re.search(r'(\d+)', volume_str)
            if not volume_match:
                return {
                    'response': "No pude entender el volumen. Usa un número entre 0 y 100.",
                    'status': 'invalid_params',
                    'intent': 'volume'
                }
            
            volume = int(volume_match.group(1))
            
            # Validar rango
            if volume < 0 or volume > 100:
                return {
                    'response': "El volumen debe estar entre 0 y 100.",
                    'status': 'invalid_params',
                    'intent': 'volume'
                }
            
            # Establecer volumen
            result = self.music_manager.set_volume(volume)
            
            if result['success']:
                return {
                    'response': f"🔊 Volumen establecido al {volume}%",
                    'status': 'volume_set',
                    'intent': 'volume',
                    'volume': volume
                }
            else:
                return {
                    'response': "No se pudo cambiar el volumen.",
                    'status': 'error',
                    'intent': 'volume'
                }
                
        except Exception as e:
            self.logger.error(f"Error en control de volumen: {e}")
            return {
                'response': f"Error al cambiar volumen: {str(e)}",
                'status': 'error',
                'intent': 'volume'
            }
    
    def _handle_status_intent(self) -> Dict[str, Any]:
        """Maneja el intent de estado."""
        try:
            info = self.music_manager.get_info()
            current_track = self.music_manager.get_current_track()
            
            if current_track:
                response = f"Actualmente sonando: '{current_track['title']}' de {current_track['uploader']}"
                if current_track.get('duration'):
                    minutes = current_track['duration'] // 60
                    seconds = current_track['duration'] % 60
                    response += f" ({minutes}:{seconds:02d})"
                
                current_volume = self.music_manager.get_volume()
                response += f" | Volumen: {current_volume}%"
                
                return {
                    'response': response,
                    'status': 'info',
                    'intent': 'status',
                    'data': {
                        'track': current_track,
                        'volume': current_volume,
                        'state': info['backend']['state']
                    }
                }
            else:
                return {
                    'response': "No hay música sonando actualmente.",
                    'status': 'not_playing',
                    'intent': 'status'
                }
                
        except Exception as e:
            self.logger.error(f"Error obteniendo estado: {e}")
            return {
                'response': f"Error al obtener estado: {str(e)}",
                'status': 'error',
                'intent': 'status'
            }
    
    def _handle_unknown_intent(self, text: str) -> Dict[str, Any]:
        """Maneja intents desconocidos."""
        # Intentar interpretar como búsqueda de música
        if len(text.split()) <= 3:
            return {
                'response': f"¿Quieres que reproduzca '{text}'?",
                'status': 'clarification_needed',
                'intent': 'clarification',
                'suggested_action': 'play',
                'suggested_query': text
            }
        
        return {
            'response': "No entendí ese comando. Puedes decir cosas como: 'reproduce despacito', 'pausa la música', 'sube el volumen a 80'",
            'status': 'unknown',
            'intent': 'unknown'
        }
    
    def cleanup(self):
        """Limpia los recursos del procesador."""
        try:
            self.music_manager.cleanup()
            self.logger.info("IntentProcessor limpiado exitosamente")
        except Exception as e:
            self.logger.error(f"Error limpiando IntentProcessor: {e}")


# Ejemplo de uso
async def main():
    """Función de ejemplo mostrando el uso del IntentProcessor."""
    
    # Configurar logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Crear procesador
    processor = IntentProcessor()
    
    # Ejemplos de comandos
    test_commands = [
        "reproduce despacito",
        "pon música de luis fonsi",
        "pausa la música",
        "sube el volumen a 80",
        "qué volumen tenemos",
        "reanudar",
        "detener música",
        "estado actual",
        "pon imagine dragons",
        "volumen 50"
    ]
    
    print("Ejemplo de IntentProcessor con MusicManager")
    print("=" * 50)
    
    for command in test_commands:
        print(f"\n🗣️ Usuario: {command}")
        
        try:
            result = await processor.process_intent(command)
            print(f"🤖 Asistente: {result['response']}")
            
            if result.get('data'):
                print(f"📊 Datos: {result['data']}")
                
        except Exception as e:
            print(f"❌ Error: {e}")
        
        # Pequeña pausa entre comandos
        await asyncio.sleep(0.5)
    
    # Limpiar
    processor.cleanup()
    print("\n✅ Demo completada!")


# Handler para integración con sistemas existentes
class MusicIntentHandler:
    """Handler para integración con sistemas de procesamiento de lenguaje natural."""
    
    def __init__(self, intent_processor: IntentProcessor):
        """
        Inicializa el handler.
        
        Args:
            intent_processor: Instancia de IntentProcessor
        """
        self.intent_processor = intent_processor
    
    async def handle_music_intent(self, intent_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Maneja intents de música desde un sistema externo.
        
        Args:
            intent_data: Dict con información del intent
                - text: Texto del usuario
                - user_id: ID del usuario (opcional)
                - confidence: Confianza del intent (opcional)
                
        Returns:
            Dict con la respuesta
        """
        text = intent_data.get('text', '')
        user_id = intent_data.get('user_id', 'default')
        confidence = intent_data.get('confidence', 1.0)
        
        if not text:
            return {
                'response': "No recibí ningún texto para procesar.",
                'status': 'error',
                'user_id': user_id
            }
        
        # Si la confianza es muy baja, pedir clarificación
        if confidence < 0.5:
            return {
                'response': "No estoy seguro de entender. ¿Podrías repetirlo?",
                'status': 'low_confidence',
                'user_id': user_id,
                'confidence': confidence
            }
        
        # Procesar el intent
        result = await self.intent_processor.process_intent(text)
        result['user_id'] = user_id
        result['confidence'] = confidence
        
        return result
    
    def get_supported_intents(self) -> list:
        """Retorna la lista de intents soportados."""
        return [
            'play', 'pause', 'resume', 'stop', 'volume', 'status'
        ]
    
    def get_example_commands(self) -> list:
        """Retorna ejemplos de comandos que el sistema entiende."""
        return [
            "reproduce despacito",
            "pon música de luis fonsi",
            "pausa la música",
            "reanudar",
            "sube el volumen a 80",
            "baja el volumen a 30",
            "qué volumen tenemos",
            "detener música",
            "estado actual",
            "pon imagine dragons believer"
        ]


if __name__ == "__main__":
    # Ejecutar demo
    asyncio.run(main())