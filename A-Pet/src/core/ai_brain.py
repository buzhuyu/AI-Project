import os
import random
from src.core.memory import LongTermMemory

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

class AIBrain:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.client = None
        self.memory = LongTermMemory(os.path.join("data", "memory.json"))
        
        if self.api_key and OpenAI:
            try:
                self.client = OpenAI(api_key=self.api_key)
            except Exception as e:
                print(f"Failed to initialize OpenAI client: {e}")
                self.client = None
        else:
            print("OpenAI API key not found or library missing. Using mock responses.")

    def get_response(self, user_message, pet_state, context=None):
        if not self.client:
            response = self.get_mock_response(pet_state)
            self.memory.add_interaction(user_message, response)
            return response

        system_prompt = self.create_system_prompt(pet_state, context)
        
        # Include recent conversation history for context
        history_context = self.memory.get_recent_context(limit=3)
        if history_context:
            system_prompt += "\nRecent conversation:\n" + history_context
        
        try:
            response_obj = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=50
            )
            response = response_obj.choices[0].message.content.strip()
            self.memory.add_interaction(user_message, response)
            return response
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            response = self.get_mock_response(pet_state)
            self.memory.add_interaction(user_message, response)
            return response

    def create_system_prompt(self, pet_state, context=None):
        base_prompt = "You are a cute desktop pet. Answer in short, cute sentences. "
        
        # Add facts about user
        facts = self.memory.get_facts_context()
        if facts:
            base_prompt += facts + ". "
            
        state_desc = []
        if context:
            state_desc.append(f"Current User Context: {context}.")
            
        if pet_state.hunger < 30:
            state_desc.append("You are very hungry.")
        elif pet_state.hunger < 60:
            state_desc.append("You are a bit hungry.")
            
        if pet_state.mood < 30:
            state_desc.append("You are sad.")
        elif pet_state.mood > 80:
            state_desc.append("You are very happy!")
            
        if pet_state.energy < 30:
            state_desc.append("You are tired.")
            
        return base_prompt + " ".join(state_desc)

    def get_mock_response(self, pet_state):
        responses = [
            "Meow~",
            "Purr...",
            "Thinking about fish...",
            "*Stares at you with big eyes*",
            "Zzz...",
            "Can we play?",
            "I'm a good kitty!",
        ]
        
        if pet_state.hunger < 30:
            return "Feed me, human! Meow!"
        if pet_state.mood < 30:
            return "*Sigh* ...boring..."
        if pet_state.energy < 30:
            return "*Yawn* ...so sleepy..."
            
        return random.choice(responses)
