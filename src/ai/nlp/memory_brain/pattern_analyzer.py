import logging
from typing import Optional, Dict, List, Any
from collections import defaultdict
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger("PatternAnalyzer")

class TriggerType(Enum):
    TIME_BASED = "time_based"
    EVENT_BASED = "event_based"
    CONTEXT_BASED = "context_based"

class PatternAnalyzer:

    def __init__(self, context_tracker):
        self.tracker = context_tracker
        self.pattern_threshold = 2

    async def detect_time_patterns(self, db: AsyncSession, user_id: int, intent: str) -> Optional[Dict[str, Any]]:
        events = await self.tracker.get_events_by_intent(db, user_id, intent)
        if len(events) < self.pattern_threshold:
            return None

        hours = defaultdict(int)
        for event in events:
            hour = event.context.get('hour', event.timestamp.hour)
            hours[hour] += 1

        for hour, count in hours.items():
            if count >= self.pattern_threshold:
                confidence = min(count / len(events), 1.0)
                return {
                    "type": TriggerType.TIME_BASED.value,
                    "hour": hour,
                    "frequency": count,
                    "confidence": confidence
                }
        return None

    async def detect_location_patterns(self, db: AsyncSession, user_id: int, device_type: str) -> Optional[Dict[str, Any]]:
        events = await self.tracker.get_user_events(db, user_id)
        location_actions = defaultdict(list)

        for event in events:
            if event.device_type == device_type and event.location:
                location_actions[event.location].append(event)

        for location, actions in location_actions.items():
            if len(actions) >= self.pattern_threshold:
                action_types = defaultdict(int)
                for action in actions:
                    action_types[action.intent] += 1

                most_common = max(action_types, key=action_types.get)
                confidence = action_types[most_common] / len(actions)

                return {
                    "type": TriggerType.CONTEXT_BASED.value,
                    "location": location,
                    "device_type": device_type,
                    "action": most_common,
                    "confidence": confidence
                }
        return None

    async def detect_sequential_patterns(self, db: AsyncSession, user_id: int, window_minutes: int = 5) -> List[Dict[str, Any]]:
        events = await self.tracker.get_user_events(db, user_id)
        sequences = []
        pattern_map = defaultdict(int)

        for i in range(len(events) - 1):
            current = events[i]
            next_event = events[i + 1]
            time_diff = (next_event.timestamp - current.timestamp).total_seconds() / 60

            if 0 < time_diff <= window_minutes:
                sequence_key = f"{current.intent}→{next_event.intent}"
                pattern_map[sequence_key] += 1

        for sequence, count in pattern_map.items():
            if count >= self.pattern_threshold:
                actions = sequence.split("→")
                sequences.append({
                    "type": TriggerType.EVENT_BASED.value,
                    "sequence": actions,
                    "frequency": count,
                    "confidence": count / len(events) if events else 0
                })

        return sequences

    async def detect_repeated_actions(self, db: AsyncSession, user_id: int, min_frequency: int = 3) -> List[Dict[str, Any]]:
        """Detecta acciones que se han repetido al menos min_frequency veces a la misma hora"""
        events = await self.tracker.get_user_events(db, user_id)
        
        if len(events) < min_frequency:
            return []
        
        # Obtener rutinas confirmadas del usuario para evitar duplicados
        from src.db.models import Routine
        result = await db.execute(
            select(Routine).filter(
                Routine.user_id == user_id,
                Routine.confirmed == True
            )
        )
        confirmed_routines = result.scalars().all()
        
        # Crear un set de patrones ya confirmados (intent::hour)
        confirmed_patterns = set()
        for routine in confirmed_routines:
            trigger = routine.trigger
            if trigger.get('type') == 'action_based':
                intent = trigger.get('intent', '')
                hour = trigger.get('hour', -1)
                confirmed_patterns.add(f"{intent}::{hour}")
        
        # Agrupar por intent + action + hour (comando completo a la misma hora)
        action_counts = defaultdict(lambda: {"count": 0, "events": []})
        
        for event in events:
            # Solo considerar eventos que tienen una acción/comando
            if not event.action or event.action.strip() == "":
                continue
            
            # Obtener la hora del evento
            hour = event.context.get('hour', event.timestamp.hour)
            
            # Clave: intent::action::hour
            key = f"{event.intent}::{event.action}::{hour}"
            action_counts[key]["count"] += 1
            action_counts[key]["events"].append(event)
        
        patterns = []
        for key, data in action_counts.items():
            if data["count"] >= min_frequency:
                parts = key.split("::", 2)  # Dividir en 3 partes máximo
                intent = parts[0]
                action = parts[1]
                hour = int(parts[2])
                
                # Verificar si ya existe una rutina confirmada con este patrón
                pattern_key = f"{intent}::{hour}"
                if pattern_key in confirmed_patterns:
                    logger.info(f"Patrón {intent} a las {hour}:00 ya tiene rutina confirmada - omitiendo")
                    continue
                
                sample_event = data["events"][0]
                
                pattern = {
                    "type": "action_based",
                    "intent": intent,
                    "action": action,
                    "hour": hour,  # Incluir la hora en el patrón
                    "device_type": sample_event.device_type,
                    "location": sample_event.location,
                    "frequency": data["count"],
                    "confidence": min(data["count"] / len(events), 1.0)
                }
                patterns.append(pattern)
        
        return patterns

    async def detect_all_patterns(self, db: AsyncSession, user_id: int) -> Dict[str, List[Dict[str, Any]]]:
        events = await self.tracker.get_user_events(db, user_id)
        patterns = {
            "time_patterns": [],
            "location_patterns": [],
            "sequential_patterns": [],
            "repeated_action_patterns": []
        }

        intents = set(e.intent for e in events)
        for intent in intents:
            pattern = await self.detect_time_patterns(db, user_id, intent)
            if pattern:
                pattern["intent"] = intent
                patterns["time_patterns"].append(pattern)

        device_types = set(e.device_type for e in events if e.device_type)
        for device_type in device_types:
            pattern = await self.detect_location_patterns(db, user_id, device_type)
            if pattern:
                patterns["location_patterns"].append(pattern)

        patterns["sequential_patterns"] = await self.detect_sequential_patterns(db, user_id)
        patterns["repeated_action_patterns"] = await self.detect_repeated_actions(db, user_id)

        return patterns
        