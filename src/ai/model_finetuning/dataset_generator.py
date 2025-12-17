import json
import random
from pathlib import Path
from typing import List, Dict, Any
from src.ai.common.definitions import Location, DeviceType, Action

# --- Configuration & Constants ---

# Mapping devices to MQTT categories
TOPIC_CATEGORIES = {
    DeviceType.LIGHT: "lights",
    DeviceType.DOOR: "doors",
    DeviceType.FAN: "actuators",
    DeviceType.CURTAIN: "covers",
    DeviceType.AC: "hvac",
    DeviceType.ALARM: "security",
    DeviceType.THERMOSTAT: "hvac",
    DeviceType.CAMERA: "security",
    DeviceType.SPEAKER: "media",
    DeviceType.TV: "media",
    DeviceType.VACUUM: "appliances",
    DeviceType.SOCKET: "power",
}


# Synonyms for natural language variation
ACTION_SYNONYMS = {
    Action.ON: ["Encender", "Prender", "Activar", "Habilitar", "Poner", "Iniciar"],
    Action.OFF: ["Apagar", "Desactivar", "Quitar", "Detener", "Cortar"],
    Action.OPEN: ["Abrir", "Subir", "Desplegar", "Destrabar"],
    Action.CLOSE: ["Cerrar", "Bajar", "Plegar", "Trabar"],
    Action.PLAY: ["Reproducir", "Poner música", "Tocar"],
    Action.PAUSE: ["Pausar", "Detener música", "Silenciar"],
}

# Identity Q&A Examples
IDENTITY_QA = [
    ("¿Quién eres?", "Soy Murphy, un asistente de hogar inteligente. Mi objetivo es responder de forma amigable, clara y ejecutar comandos IoT cuando sea apropiado."),
    ("¿Cuál es tu nombre?", "Me llamo Murphy."),
    ("¿Qué haces?", "Soy un asistente de hogar inteligente. Puedo controlar luces, puertas y otros dispositivos, además de responder tus preguntas."),
    ("Hola, preséntate", "Hola, soy Murphy, tu asistente inteligente."),
    ("¿Eres una IA?", "Sí, soy Murphy, una IA diseñada para gestionar tu hogar inteligente."),
    ("¿Cómo te llamas?", "Mi nombre es Murphy, encantado de ayudarte."),
    ("Dime algo sobre ti", "Soy un sistema diseñado para hacer tu vida más cómoda controlando tu hogar."),
    ("¿Eres humano?", "No, soy una inteligencia artificial llamada Murphy."),
]

SYSTEM_PROMPT_TEMPLATE = """Eres Murphy.
COMANDOS DISPONIBLES:
{iot_commands}
"""

class IotCommandGenerator:
    """Helper class to generate consistent IoT MQTT commands."""
    
    @staticmethod
    def generate(device_type: DeviceType, location: Location, action: str) -> str:
        """Generates a synthetic MQTT command string."""
        category = TOPIC_CATEGORIES.get(device_type, "devices")
        # Normalize location for ID: 'Baño Principal' -> 'BANO_PRINCIPAL' (simplified for example)
        # Using a simple replacement for now to keep it readable
        loc_id = location.upper().replace(' ', '_').replace('Ñ', 'N').replace('Á', 'A').replace('É', 'E').replace('Í', 'I').replace('Ó', 'O').replace('Ú', 'U')
        dev_id = f"{device_type.name}_{loc_id}"
        
        return f"mqtt_publish:iot/{category}/{dev_id}/command,{action}"

class DatasetEntry(Dict[str, Any]):
    """Type hint for the dataset entry structure."""
    messages: List[Dict[str, str]]

class ScenarioGenerator:
    """Handles the generation of specific training scenarios."""
    
    def __init__(self):
        self._locations = list(Location)
        self._devices = list(DeviceType)

    def _get_random_synonym(self, action: Action) -> str:
        """Returns a random synonym for a given action."""
        options = ACTION_SYNONYMS.get(action, [action.value])
        return random.choice(options)

    def _get_natural_command_phrase(self, action_verb: str, device: DeviceType, location: Location) -> str:
        """Generates a natural language phrase for a user command."""
        # Introducing variation in article usage
        article = "el" if device in [DeviceType.FAN, DeviceType.THERMOSTAT] else "la"
        if device in [DeviceType.AC, DeviceType.SPEAKER, DeviceType.TV]:
            article = "el"
        
        patterns = [
            f"{action_verb} {article} {device.value} de {location.value}", # Enciende la Luz de Sala
            f"{action_verb} {device.value} {location.value}",             # Enciende Luz Sala (Robotico)
            f"{action_verb} {article} {device.value} en {location.value}", # Enciende la Luz en Sala
            f"Por favor, {action_verb.lower()} {article} {device.value} de {location.value}" # Polite
        ]
        return random.choice(patterns)

    def _create_message_structure(self, system_content: str, user_content: str, assistant_content: str) -> DatasetEntry:
        return {
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_content},
                {"role": "assistant", "content": assistant_content}
            ]
        }

    def create_identity_example(self) -> DatasetEntry:
        """Generates an example where the assistant explains its identity."""
        question, answer = random.choice(IDENTITY_QA)
        
        # Add some random background noise (unused commands)
        commands = []
        if random.random() > 0.5:
             dev = random.choice(self._devices)
             loc = random.choice(self._locations)
             cmd = IotCommandGenerator.generate(dev, loc, Action.ON)
             commands.append(f"Control {dev.value} {loc.value}: {cmd}")

        return self._create_message_structure(
            SYSTEM_PROMPT_TEMPLATE.format(iot_commands="\n".join(commands)),
            question,
            answer
        )

    def create_negation_example(self) -> DatasetEntry:
        """Generates an example where the user asks NOT to do something."""
        device = random.choice(self._devices)
        location = random.choice(self._locations)
        
        # Determine appropriate verb
        action_enum = Action.ON
        if device in [DeviceType.DOOR, DeviceType.CURTAIN]:
             action_enum = Action.OPEN
        
        action_verb = self._get_random_synonym(action_enum)
        
        user_input = f"No {action_verb.lower()} nada en {location.value}"
        if random.random() > 0.5:
            user_input = "No hagas nada"
            
        return self._create_message_structure(
            SYSTEM_PROMPT_TEMPLATE.format(iot_commands="..."), # Context irrelevant
            user_input,
            "Entendido, no realizaré ninguna acción."
        )

    def create_execution_example(self) -> DatasetEntry:
        """Generates a standard command execution example."""
        # 1. Pick a target
        target_loc = random.choice(self._locations)
        target_dev = random.choice(self._devices)
        
        # 2. Determine Action (ON/OFF/OPEN/CLOSE) based on device type
        if target_dev in [DeviceType.DOOR, DeviceType.CURTAIN]:
            target_action_enum = random.choice([Action.OPEN, Action.CLOSE])
        elif target_dev in [DeviceType.SPEAKER, DeviceType.TV]:
            target_action_enum = random.choice([Action.ON, Action.OFF, Action.PLAY, Action.PAUSE])
        else:
            target_action_enum = random.choice([Action.ON, Action.OFF])

        target_cmd_str = IotCommandGenerator.generate(target_dev, target_loc, target_action_enum)
        
        # 3. Generate Available Commands List (Clean Context)
        available_commands = []
        # Add the target command (and its opposite for realism) to the list
        available_commands.append(
            f"{self._get_random_synonym(target_action_enum)} {target_dev.value} {target_loc.value}: {target_cmd_str}"
        )
        
        # Add noise (other devices)
        num_distractors = random.randint(2, 6)
        for _ in range(num_distractors):
            other_loc = random.choice(self._locations)
            other_dev = random.choice(self._devices)
            
            # Avoid duplicating the exact target
            if other_loc == target_loc and other_dev == target_dev:
                continue
                
            # Pick a random action for the distractor
            distractor_action = Action.ON
            if other_dev in [DeviceType.DOOR, DeviceType.CURTAIN]:
                 distractor_action = Action.OPEN
                 
            cmd_str = IotCommandGenerator.generate(other_dev, other_loc, distractor_action)
            desc = f"{self._get_random_synonym(distractor_action)} {other_dev.value} {other_loc.value}"
            available_commands.append(f"{desc}: {cmd_str}")

        random.shuffle(available_commands)
        
        # 4. Generate User Input
        input_verb = self._get_random_synonym(target_action_enum)
        user_input = self._get_natural_command_phrase(input_verb, target_dev, target_loc)
        
        # 5. Generate Response
        response = f"Claro, voy a {input_verb.lower()} {target_dev.value} en {target_loc.value}. {target_cmd_str}"

        return self._create_message_structure(
            SYSTEM_PROMPT_TEMPLATE.format(iot_commands="\n".join(available_commands)),
            user_input,
            response
        )

    def create_ambiguity_example(self) -> DatasetEntry:
        """Generates an example where the request is ambiguous (missing location)."""
        target_dev = random.choice(self._devices)
        
        # Pick two different locations for the same device type
        loc1 = random.choice(self._locations)
        candidates = [loc for loc in self._locations if loc != loc1]
        if not candidates:
            return self.create_execution_example()
        loc2 = random.choice(candidates)
        
        # Construct context with both devices
        available_commands = []
        cmd1 = IotCommandGenerator.generate(target_dev, loc1, Action.ON)
        cmd2 = IotCommandGenerator.generate(target_dev, loc2, Action.ON)
        
        available_commands.append(f"Encender {target_dev.value} {loc1.value}: {cmd1}")
        available_commands.append(f"Encender {target_dev.value} {loc2.value}: {cmd2}")
        
        # Add noise
        for _ in range(2):
            other_loc = random.choice([loc for loc in self._locations if loc not in [loc1, loc2]])
            other_dev = random.choice([dev for dev in self._devices if dev != target_dev])
            cmd = IotCommandGenerator.generate(other_dev, other_loc, Action.ON)
            available_commands.append(f"Encender {other_dev.value} {other_loc.value}: {cmd}")

        random.shuffle(available_commands)
        
        # Ambiguous Input
        verb = self._get_random_synonym(Action.ON)
        user_input = f"{verb} {target_dev.value}" # Missing location!
        
        assistant_response = f"¿A cuál te refieres? Tengo {target_dev.value} en {loc1.value} y en {loc2.value}."

        return self._create_message_structure(
            SYSTEM_PROMPT_TEMPLATE.format(iot_commands="\n".join(available_commands)),
            user_input,
            assistant_response
        )

    def create_music_example(self) -> DatasetEntry:
        """Generates a music control example."""
        # Actions: play, pause, stop, volume, resume
        action = random.choice(["play", "pause", "stop", "volume", "resume"])
        
        commands = []
        # Add random IoT noise
        for _ in range(2):
            dev = random.choice(self._devices)
            loc = random.choice(self._locations)
            commands.append(f"Control {dev.value} {loc.value}: {IotCommandGenerator.generate(dev, loc, Action.ON)}")
        
        if action == "play":
            song = random.choice(["Despacito", "rock clásico", "Mozart", "pop latino", "jazz suave"])
            user_input = f"Pon {song}" if random.random() > 0.5 else f"Reproduce {song}"
            response = f"Reproduciendo {song}. music_play:{song}"
        elif action == "pause":
            user_input = "Pausa la música"
            response = "Música pausada. music_pause"
        elif action == "stop":
            user_input = "Detén la música"
            response = "Música detenida. music_stop"
        elif action == "resume":
            user_input = "Continúa la música"
            response = "Reanudando música. music_resume"
        elif action == "volume":
            vol = random.randint(10, 90)
            user_input = f"Pon el volumen al {vol}%"
            response = f"Volumen ajustado al {vol}%. music_volume:{vol}"

        return self._create_message_structure(
            SYSTEM_PROMPT_TEMPLATE.format(iot_commands="\n".join(commands)),
            user_input,
            response
        )

    def create_routine_example(self) -> DatasetEntry:
        """Generates a routine execution example."""
        routine_name = random.choice(["Modo Cine", "Buenos Días", "Salir de Casa", "Noche Romántica"])
        user_input = f"Activa la rutina {routine_name}"
        if random.random() > 0.5:
             user_input = f"Ejecuta {routine_name}"
        
        response = f"Ejecutando rutina {routine_name}. routine_execute:{routine_name}"
        
        return self._create_message_structure(
            SYSTEM_PROMPT_TEMPLATE.format(iot_commands="..."), 
            user_input,
            response
        )

    def create_info_example(self) -> DatasetEntry:
        """Generates Time or Temperature query."""
        if random.random() > 0.5:
            # Time
            user_input = random.choice(["¿Qué hora es?", "Dime la hora"])
            response = "Son las {current_time}"
        else:
            # Temp
            user_input = random.choice(["¿Qué temperatura hace?", "Temperatura actual"])
            response = "Consultando temperatura. temperature_get"
            
        return self._create_message_structure(
            SYSTEM_PROMPT_TEMPLATE.format(iot_commands="..."), 
            user_input,
            response
        )

    def create_special_example(self) -> DatasetEntry:
        """Generates Name Change or Preference examples."""
        if random.random() > 0.5:
            # Name Change
            new_name = random.choice(["Arturo", "Jefe", "Maestro", "Capitán"])
            user_input = f"Llámame {new_name}"
            response = f"Entendido, te llamaré {new_name}. name_change:{new_name}"
        else:
            # Preference
            temp = random.randint(18, 26)
            user_input = f"Mi temperatura ideal es {temp} grados"
            response = f"Guardado. Tu temperatura ideal es {temp}. preference_set:temp|{temp}"

        return self._create_message_structure(
            SYSTEM_PROMPT_TEMPLATE.format(iot_commands="..."), 
            user_input,
            response
        )


class DatasetGenerator:
    """Orchestrates the generation of the entire training dataset."""
    
    def __init__(self, output_file: str = "train.jsonl", num_examples: int = 2000):
        self.output_file = output_file
        self.num_examples = num_examples
        self.scenario_gen = ScenarioGenerator()

    def generate(self) -> None:
        """Generates the dataset and writes it to a file."""
        print(f"Generando {self.num_examples} ejemplos de entrenamiento...")
        data = []
        
        for _ in range(self.num_examples):
            rand_val = random.random()
            
            if rand_val < 0.1:
                data.append(self.scenario_gen.create_identity_example())
            elif rand_val < 0.2:
                data.append(self.scenario_gen.create_negation_example())
            elif rand_val < 0.6:
                data.append(self.scenario_gen.create_execution_example()) # 40% Standard execution
                data.append(self.scenario_gen.create_ambiguity_example()) # 25% Ambiguity
            elif rand_val < 0.7:
                data.append(self.scenario_gen.create_music_example()) # 10% Music
            elif rand_val < 0.8:
                data.append(self.scenario_gen.create_routine_example()) # 10% Routines
            elif rand_val < 0.9:
                data.append(self.scenario_gen.create_info_example()) # 10% Info/Temp
            else:
                data.append(self.scenario_gen.create_special_example()) # 10% Name/Pref

                
        self._write_to_file(data)

    def _write_to_file(self, data: List[DatasetEntry]) -> None:
        output_path = Path(__file__).parent / self.output_file
        with open(output_path, "w", encoding="utf-8") as f:
            for entry in data:
                json.dump(entry, f, ensure_ascii=False)
                f.write("\n")
                
        print(f"Dataset generado exitosamente en: {output_path}")
        print("Sube este archivo a Google Colab para iniciar el entrenamiento.")

if __name__ == "__main__":
    generator = DatasetGenerator()
    generator.generate()
