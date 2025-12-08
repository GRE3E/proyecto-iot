import logging
from typing import Optional, Dict, Any
from src.ai.nlp.prompts.prompt_creator import create_system_prompt
from src.ai.nlp.prompts.prompt_loader import load_system_prompt_template
from src.ai.nlp.context.device_context import DeviceContextManager
from src.ai.nlp.prompts.prompt_processor import PromptProcessor
from src.ai.common.constants import IoTConstants

logger = logging.getLogger("ContextHandler")

class ContextHandler:
    """Gestiona la preparación de contexto y prompts para el procesamiento NLP."""
    
    def __init__(self, config: Dict[str, Any], iot_command_processor, memory_manager, user_manager, memory_brain=None):
        self._config = config
        self._iot_command_processor = iot_command_processor
        self._memory_manager = memory_manager
        self._user_manager = user_manager
        self._device_context_manager = DeviceContextManager(iot_command_processor)
        self._prompt_processor = PromptProcessor()
        self._system_prompt_data = load_system_prompt_template()
        self._system_prompt_template = self._system_prompt_data["template"]
        self._routine_creation_instructions = self._system_prompt_data["routine_creation_instructions"]
        self._memory_brain = memory_brain
    
    async def prepare_context(self, user_id: int, prompt: str, db_user, user_name: str, is_owner: str, user_permissions_str: str, user_preferences_dict: dict) -> dict:
        """Prepara todo el contexto necesario para generar una respuesta"""
        
        has_negation = self._prompt_processor.contains_negation(prompt)
        if has_negation:
            logger.info(f"Negación detectada en prompt: '{prompt}'. No se procesarán comandos IoT.")
        
        formatted_conversation_history = ""
        if self._prompt_processor.should_load_conversation_history(prompt):
            from src.db.database import get_db
            async with get_db() as db:
                formatted_conversation_history = await self._memory_manager.get_conversation_logs_by_user_id(db, user_id, limit=5)
            logger.debug("Historial de conversación cargado (detectada palabra clave)")
        
        enhanced_prompt = self._device_context_manager.enhance_prompt(user_id, prompt)
        
        scheduled_routines_info = ""  # No incluir rutinas automáticamente en el system_prompt
        
        formatted_iot_commands, iot_command_names, iot_error = await self._load_iot_commands()
        
        if iot_error:
            return {
                "error": iot_error,
                "user_name": user_name,
                "is_owner": is_owner
            }
        
        system_prompt, prompt_text = create_system_prompt(
            config=self._config,
            user_name=user_name,
            is_owner=is_owner,
            user_permissions_str=user_permissions_str,
            formatted_iot_commands=formatted_iot_commands,
            iot_command_names=iot_command_names,
            search_results_str="",
            user_preferences_dict=user_preferences_dict,
            prompt=enhanced_prompt,
            conversation_history=formatted_conversation_history,
            system_prompt_template=self._system_prompt_template,
            scheduled_routines_info=scheduled_routines_info,
            routine_creation_instructions=self._routine_creation_instructions
        )
        
        return {
            "system_prompt": system_prompt,
            "prompt_text": prompt_text,
            "has_negation": has_negation,
            "enhanced_prompt": enhanced_prompt,
            "iot_command_names": iot_command_names,
            "formatted_iot_commands": formatted_iot_commands
        }
    
    async def _get_scheduled_routines_info(self, user_id: int, db_user, prompt: str) -> str:
        """Obtiene información de rutinas programadas para el usuario"""
        from src.db.database import get_db
        
        scheduled_routines_info = ""
        if self._memory_brain:
            async with get_db() as db:
                scheduled_routines_data = await self._memory_brain.get_routine_status(db, user_id)
                
                if scheduled_routines_data and scheduled_routines_data["routines"]:
                    all_routines = scheduled_routines_data["routines"]
                    
                    # Extraer palabras clave del prompt
                    prompt_lower = prompt.lower()
                    
                    device_types = IoTConstants.DEVICE_TYPES
                    locations = IoTConstants.LOCATIONS

                    # Use dynamic entities if available
                    if hasattr(self, "_iot_command_processor") and self._iot_command_processor:
                         if self._iot_command_processor.device_types:
                             device_types = self._iot_command_processor.device_types
                         if self._iot_command_processor.known_locations:
                             locations = self._iot_command_processor.known_locations
                    
                    found_device_types = [dt for dt in device_types if dt in prompt_lower]
                    found_locations = [loc for loc in locations if loc in prompt_lower]
                    
                    filtered_routines = []
                    if found_device_types or found_locations:
                        for routine in all_routines:
                            routine_name_lower = routine['name'].lower()
                            routine_commands_lower = " ".join([cmd.lower() for cmd in routine['iot_commands']])
                            
                            # Filtrar por tipo de dispositivo
                            device_match = any(dt in routine_name_lower or dt in routine_commands_lower for dt in found_device_types)
                            
                            # Filtrar por ubicación
                            location_match = any(loc in routine_name_lower or loc in routine_commands_lower for loc in found_locations)
                            
                            if (found_device_types and device_match) or (found_locations and location_match):
                                filtered_routines.append(routine)
                    else:
                        # Si no hay palabras clave en el prompt, mostrar un número limitado de rutinas o un resumen
                        # Por ahora, mostraremos todas si no hay filtro específico, pero esto podría optimizarse
                        filtered_routines = all_routines[:3] # Limitar a 3 rutinas si no hay filtro
                    
                    if filtered_routines:
                        scheduled_routines_info = "\n".join([
                            f"- {r['name']} a las {r['trigger']['hour']}:00 (Acciones: {', '.join(r['iot_commands'])})"
                            for r in filtered_routines
                        ])
                    else:
                        scheduled_routines_info = "No se encontraron rutinas automáticas relevantes para tu consulta."
                else:
                    scheduled_routines_info = "No hay rutinas automáticas programadas para este usuario."
        
        return scheduled_routines_info
    
    async def _load_iot_commands(self):
        """Carga los comandos IoT disponibles"""
        try:
            from src.db.database import get_db
            async with get_db() as db:
                formatted_iot_commands, iot_commands_db = await self._iot_command_processor.load_commands_from_db(db)
                return formatted_iot_commands, [cmd.name for cmd in iot_commands_db], None
        except Exception as e:
            error_msg = "Error al cargar comandos IoT."
            logger.error(f"No se pudieron cargar los comandos IoT: {e}")
            return None, None, error_msg
    
    def update_device_context(self, user_id: int, prompt: str, extracted_command: Optional[str]):
        """Actualiza el contexto de dispositivo después de procesar un comando"""
        if extracted_command:
            self._device_context_manager.update(user_id, prompt, extracted_command)
    
    def extract_intent(self, prompt: str) -> str:
        """Extrae la intención del prompt"""
        return self._prompt_processor.extract_intent(prompt)
    
    def contains_negation(self, prompt: str) -> bool:
        """Verifica si el prompt contiene negaciones"""
        return self._prompt_processor.contains_negation(prompt)
