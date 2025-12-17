import asyncio
import logging
import re
from typing import Dict, Any, Optional, Tuple
from .manager import MusicManager, MusicManagerError

logger = logging.getLogger("MusicCommandHandler")

MUSIC_COMMAND_REGEX = re.compile(
    r"music_(?P<action>play|pause|resume|stop|volume)(?::(?P<params>.+?))?(?=\s|$)",
    re.IGNORECASE,
)

class MusicCommandHandler:
    def __init__(self, music_manager: MusicManager):
        self.music_manager = music_manager

    async def process_music_commands(self, response: str) -> Tuple[str, Optional[str]]:
        matches = list(MUSIC_COMMAND_REGEX.finditer(response))
        if not matches:
            return response, None

        executed_command = None
        processed_response = response

        for match in matches:
            action = match.group("action").lower()
            params = match.group("params")

            try:
                result = await self._execute_music_action(action, params)
                executed_command = f"music:{action}:{params or ''}"

                command_str = match.group(0)
                human_response = result.get("human_response", "")
                processed_response = processed_response.replace(command_str, human_response, 1)
            except Exception as e:
                logger.error(f"Error ejecutando comando music {action}: {e}")
                error_msg = f"[Error reproduciendo música: {str(e)}]"
                processed_response = processed_response.replace(match.group(0), error_msg, 1)

        return processed_response.strip(), executed_command

    async def _execute_music_action(self, action: str, params: Optional[str]) -> Dict[str, Any]:
        try:
            if action == "play":
                if not params:
                    raise MusicManagerError("Se requiere el nombre de la canción para reproducir")
                result = await self.music_manager.play(params)
                return {
                    "success": True,
                    "human_response": f"Reproduciendo: {result['title']} por {result.get('uploader', 'Desconocido')}",
                    "data": result,
                }

            elif action == "pause":
                result = await asyncio.get_event_loop().run_in_executor(None, self.music_manager.pause)
                if result["success"]:
                    return {"success": True, "human_response": "⏸ Música pausada", "data": result}
                else:
                    return {"success": False, "human_response": "No hay música reproduciendo para pausar", "data": result}

            elif action == "resume":
                result = await asyncio.get_event_loop().run_in_executor(None, self.music_manager.resume)
                if result["success"]:
                    return {"success": True, "human_response": "▶ Música reanudada", "data": result}
                else:
                    return {"success": False, "human_response": "No hay música pausada para reanudar", "data": result}

            elif action == "stop":
                result = await asyncio.get_event_loop().run_in_executor(None, self.music_manager.stop)
                if result["success"]:
                    return {"success": True, "human_response": "⏹ Música detenida", "data": result}
                else:
                    return {"success": False, "human_response": "No hay música reproduciendo para detener", "data": result}

            elif action == "volume":
                if not params or not params.isdigit():
                    current_volume = self.music_manager.get_volume()
                    return {
                        "success": True,
                        "human_response": f"El volumen actual es {current_volume}%",
                        "data": {"volume": current_volume},
                    }

                volume = int(params)
                if volume < 0 or volume > 100:
                    raise MusicManagerError("El volumen debe estar entre 0 y 100")

                result = await asyncio.get_event_loop().run_in_executor(
                    None, self.music_manager.set_volume, volume
                )
                if result["success"]:
                    return {
                        "success": True,
                        "human_response": f"🔊 Volumen establecido a {volume}%",
                        "data": result,
                    }
                else:
                    raise MusicManagerError("No se pudo cambiar el volumen")

            else:
                raise MusicManagerError(f"Acción de música desconocida: {action}")

        except MusicManagerError as e:
            logger.error(f"Error de música: {e}")
            return {"success": False, "human_response": f"Error de música: {str(e)}", "error": str(e)}
        except Exception as e:
            logger.error(f"Error inesperado en acción de música: {e}")
            return {"success": False, "human_response": f"Error inesperado: {str(e)}", "error": str(e)}

