import os
from PyQt6.QtGui import QPixmap

class AnimationManager:
    def __init__(self):
        self.animations = {}
        self.current_state = "idle"
        self.current_frame_index = 0
        self.base_path = "assets"

    def load_animations(self):
        """Load all animations from the assets folder."""
        # Find all unique states based on filenames like state_0.png
        if not os.path.exists(self.base_path):
            print(f"Error: Assets folder '{self.base_path}' not found.")
            return

        files = os.listdir(self.base_path)
        for file in files:
            if file.endswith(".png"):
                parts = file.split("_")
                if len(parts) >= 2:
                    state = parts[0]
                    # Check if it's a valid frame file (e.g., idle_0.png)
                    try:
                        frame_index = int(parts[1].split(".")[0])
                        if state not in self.animations:
                            self.animations[state] = []
                        # We'll sort them later or insert at correct index if needed
                        # For simplicity, let's just collect and sort
                        self.animations[state].append((frame_index, file))
                    except ValueError:
                        continue

        # Sort frames and load QPixmaps
        for state in self.animations:
            self.animations[state].sort(key=lambda x: x[0])
            self.animations[state] = [QPixmap(os.path.join(self.base_path, f[1])) for f in self.animations[state]]
            print(f"Loaded animation '{state}' with {len(self.animations[state])} frames.")

    def set_state(self, state):
        if state in self.animations and state != self.current_state:
            self.current_state = state
            self.current_frame_index = 0

    def get_current_frame(self):
        if self.current_state in self.animations:
            frames = self.animations[self.current_state]
            if frames:
                return frames[self.current_frame_index]
        return None

    def update(self):
        """Advance to the next frame."""
        if self.current_state in self.animations:
            frames = self.animations[self.current_state]
            if frames:
                self.current_frame_index = (self.current_frame_index + 1) % len(frames)
