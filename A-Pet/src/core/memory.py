import json
import os
from datetime import datetime

class LongTermMemory:
    def __init__(self, memory_file="data/memory.json"):
        self.memory_file = memory_file
        self.memory_data = {
            "user_name": "Master",
            "interactions": [],
            "facts": []
        }
        self.load_memory()

    def load_memory(self):
        if os.path.exists(self.memory_file):
            try:
                with open(self.memory_file, 'r', encoding='utf-8') as f:
                    self.memory_data = json.load(f)
            except Exception as e:
                print(f"Error loading memory: {e}")

    def save_memory(self):
        os.makedirs(os.path.dirname(self.memory_file), exist_ok=True)
        try:
            with open(self.memory_file, 'w', encoding='utf-8') as f:
                json.dump(self.memory_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error saving memory: {e}")

    def add_interaction(self, user_input, ai_response):
        """Record a conversation turn."""
        self.memory_data["interactions"].append({
            "timestamp": datetime.now().isoformat(),
            "user": user_input,
            "ai": ai_response
        })
        # Keep only last 50 interactions
        if len(self.memory_data["interactions"]) > 50:
            self.memory_data["interactions"] = self.memory_data["interactions"][-50:]
        self.save_memory()

    def get_recent_context(self, limit=5):
        """Get the last few interactions as context string."""
        recent = self.memory_data["interactions"][-limit:]
        context = ""
        for interaction in recent:
            context += f"User: {interaction['user']}\nYou: {interaction['ai']}\n"
        return context

    def add_fact(self, fact):
        """Add a learned fact about the user."""
        if fact not in self.memory_data["facts"]:
            self.memory_data["facts"].append(fact)
            self.save_memory()

    def get_facts_context(self):
        if not self.memory_data["facts"]:
            return ""
        return "Things you know about the user: " + ", ".join(self.memory_data["facts"])
