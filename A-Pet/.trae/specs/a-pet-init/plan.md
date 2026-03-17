# Plan: Enhance A-Pet to a "Full 3D-like" Character

Based on the design document and user request, we will enhance the current 2D desktop pet to feel more "alive" and "3D" through visual tricks and deep AI interaction.

## 1. Visual Enhancements (The "3D" Feel)
- [ ] **Add Drop Shadow**: Implement a custom painted shadow below the pet to ground it on the desktop, giving a sense of depth.
- [ ] **Breathing Animation**: If static or low-frame animation, add a subtle vertical scaling (squash & stretch) effect in `PetWindow` to simulate breathing 3D model.
- [ ] **Mouse Parallax**: Make the pet's "eyes" (or whole body) shift slightly based on mouse position relative to the center, simulating 3D perspective.

## 2. Scene Perception (The "Context")
- [ ] **Active Window Detection**: Create a `SceneSensor` class using `ctypes` (Windows API) to detect the active window title (e.g., "Chrome", "VS Code", "Steam").
- [ ] **Contextual Reaction**: Update `AIBrain` to include current activity in the prompt (e.g., "User is coding", "User is watching a video").

## 3. Emotional Depth (The "Soul")
- [ ] **Long-term Memory**: Implement a simple JSON-based memory system to store user preferences and past topics.
- [ ] **Mood-driven Behavior**: Make the pet refuse to play if "Mood" is too low, or demand food if "Hunger" is high (already partially in, but will refine).

## 4. Mini-Game (The "Fun")
- [ ] **Catch the Ball**: Implement a simple overlay game where a ball appears on screen and the user must click it, increasing pet "Mood".

## 5. Refinement
- [ ] **Optimize Animation**: Ensure smooth transitions.
- [ ] **Verify**: Test all features.
