import json
import os
import time

class PetState:
    def __init__(self, data_file="data/pet_state.json"):
        self.data_file = data_file
        self.hunger = 100.0  # 0-100, 100 is full
        self.mood = 100.0    # 0-100, 100 is happy
        self.energy = 100.0  # 0-100, 100 is energetic
        self.last_updated = time.time()
        
        self.ensure_data_dir()
        self.load()

    def ensure_data_dir(self):
        directory = os.path.dirname(self.data_file)
        if directory and not os.path.exists(directory):
            os.makedirs(directory)

    def load(self):
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r') as f:
                    data = json.load(f)
                    self.hunger = data.get('hunger', 100.0)
                    self.mood = data.get('mood', 100.0)
                    self.energy = data.get('energy', 100.0)
                    self.last_updated = data.get('last_updated', time.time())
                    
                    # Calculate decay since last update
                    self.decay_since_last_update()
            except Exception as e:
                print(f"Error loading pet state: {e}")
                self.reset_defaults()
        else:
            self.reset_defaults()

    def save(self):
        data = {
            'hunger': self.hunger,
            'mood': self.mood,
            'energy': self.energy,
            'last_updated': time.time()
        }
        try:
            with open(self.data_file, 'w') as f:
                json.dump(data, f, indent=4)
        except Exception as e:
            print(f"Error saving pet state: {e}")

    def reset_defaults(self):
        self.hunger = 100.0
        self.mood = 100.0
        self.energy = 100.0
        self.last_updated = time.time()
        self.save()

    def decay_since_last_update(self):
        current_time = time.time()
        elapsed_seconds = current_time - self.last_updated
        
        # Decay rates (per second)
        # E.g. lose 100 points in 24 hours (86400 seconds) => ~0.00115 per second
        # Let's make it a bit faster for testing: lose 100 points in 4 hours => ~0.007 per second
        decay_rate = 100.0 / (4 * 3600) 
        
        decay_amount = elapsed_seconds * decay_rate
        
        self.hunger = max(0.0, self.hunger - decay_amount)
        self.mood = max(0.0, self.mood - decay_amount)
        self.energy = max(0.0, self.energy - decay_amount)
        
        self.last_updated = current_time

    def decay(self, amount=1.0):
        """Manual decay called periodically by the main loop."""
        self.hunger = max(0.0, self.hunger - amount)
        self.mood = max(0.0, self.mood - amount)
        self.energy = max(0.0, self.energy - amount)
        self.last_updated = time.time()
        self.save()

    def feed(self, amount=20.0):
        self.hunger = min(100.0, self.hunger + amount)
        self.mood = min(100.0, self.mood + amount * 0.5)
        self.save()

    def play(self, amount=20.0):
        self.mood = min(100.0, self.mood + amount)
        self.energy = max(0.0, self.energy - amount * 0.5) # Playing tires the pet
        self.hunger = max(0.0, self.hunger - amount * 0.2) # Playing makes pet hungry
        self.save()

    def sleep(self, amount=20.0):
        self.energy = min(100.0, self.energy + amount)
        self.hunger = max(0.0, self.hunger - amount * 0.1)
        self.save()

    def get_status_string(self):
        return f"Hunger: {int(self.hunger)}/100\nMood: {int(self.mood)}/100\nEnergy: {int(self.energy)}/100"
