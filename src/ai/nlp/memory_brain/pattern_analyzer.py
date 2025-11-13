import logging
from typing import Optional, Dict, List, Any
from collections import defaultdict
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession

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

    async def detect_all_patterns(self, db: AsyncSession, user_id: int) -> Dict[str, List[Dict[str, Any]]]:
        events = await self.tracker.get_user_events(db, user_id)
        patterns = {
            "time_patterns": [],
            "location_patterns": [],
            "sequential_patterns": []
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

        return patterns
        