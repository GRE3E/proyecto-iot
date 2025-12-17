import asyncio
import logging
from typing import Optional, Dict, Tuple, Any
from ollama import ResponseError
from httpx import ConnectError
from src.ai.nlp.core.ollama_manager import OllamaManager

logger = logging.getLogger("ResponseHandler")

class ResponseHandler:
    """Gestiona la comunicación con Ollama y la generación de respuestas del LLM."""
    
    def __init__(self, ollama_manager: OllamaManager, config: Dict[str, Any]):
        self._ollama_manager = ollama_manager
        self._config = config
    
    async def generate_llm_response(self, system_prompt: str, prompt_text: str) -> Tuple[Optional[str], Optional[str]]:
        """Obtiene la respuesta del modelo de lenguaje"""
        client = self._ollama_manager.get_async_client()
        retries = self._config["model"].get("llm_retries", 2)
        llm_timeout = self._config["model"].get("llm_timeout", 60)

        for attempt in range(retries):
            try:
                response_stream = await asyncio.wait_for(client.chat(
                    model=self._config["model"]["name"],
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt_text}
                    ],
                    options={
                        "temperature": self._config["model"]["temperature"],
                        "num_predict": self._config["model"]["max_tokens"],
                        "top_p": self._config["model"].get("top_p"),
                        "top_k": self._config["model"].get("top_k"),
                        "repeat_penalty": self._config["model"].get("repeat_penalty"),
                        "num_ctx": self._config["model"].get("num_ctx"),
                    },
                    stream=True,
                ), timeout=llm_timeout)

                full_response_content = ""
                async for chunk in response_stream:
                    if "content" in chunk["message"]:
                        full_response_content += chunk["message"]["content"]

                if not full_response_content:
                    logger.warning("Respuesta vacía de Ollama. Reintentando...")
                    continue
                
                return full_response_content, None
                
            except (ResponseError, ConnectError, asyncio.TimeoutError) as e:
                error_type = "Timeout" if isinstance(e, asyncio.TimeoutError) else "Error con Ollama"
                logger.error(f"{error_type}: {e}. Reintentando...")
                if attempt == retries - 1:
                    return None, f"{error_type} después de {retries} intentos: {e}"
                continue
        
        return None, "No se pudo generar una respuesta después de varios intentos."
    
    def is_online(self) -> bool:
        """Devuelve True si Ollama está online"""
        return self._ollama_manager.is_online()
        