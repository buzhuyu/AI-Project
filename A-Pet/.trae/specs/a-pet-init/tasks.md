# Tasks

- [x] Task 1: Environment Setup & Project Structure
  - [x] SubTask 1.1: Create Python virtual environment and `requirements.txt` (PyQt6, openai, Pillow).
  - [x] SubTask 1.2: Define project directory structure (`src/`, `assets/`, `data/`).
  - [x] SubTask 1.3: Create a placeholder asset generation script (or download basic assets) for testing.

- [x] Task 2: Core Window Implementation (The "Body")
  - [x] SubTask 2.1: Implement `PetWindow` class using PyQt6.
  - [x] SubTask 2.2: Achieve transparent background and frameless window.
  - [x] SubTask 2.3: Implement "Always on Top" and drag-to-move functionality.
  - [x] SubTask 2.4: Implement system tray icon for quitting/hiding the app.

- [x] Task 3: Animation & Visual System (The "Look")
  - [x] SubTask 3.1: Create `AnimationManager` to handle GIF/Sprite loading and playback.
  - [x] SubTask 3.2: Define states (Idle, Walk, Sleep, Interact) and map them to assets.
  - [x] SubTask 3.3: Implement smooth state transitions (e.g., click to trigger "Happy" animation).

- [x] Task 4: State Management & Persistence (The "Life")
  - [x] SubTask 4.1: Create `PetState` class to manage Hunger, Mood, Energy.
  - [x] SubTask 4.2: Implement a time-based decay mechanism (background timer).
  - [x] SubTask 4.3: Implement save/load logic using JSON.
  - [x] SubTask 4.4: Create context menu actions (Feed, Play) that update state.

- [x] Task 5: AI Integration & Chat UI (The "Mind")
  - [x] SubTask 5.1: Create `AIBrain` class wrapping OpenAI SDK.
  - [x] SubTask 5.2: Design system prompt for the "Cute Pet" persona.
  - [x] SubTask 5.3: Implement `ChatBubble` widget (custom painted, transparent) attached to the pet.
  - [x] SubTask 5.4: Connect AI response to ChatBubble and update pet mood based on conversation sentiment (optional simple keyword analysis).

- [x] Task 6: Main Loop & Integration
  - [x] SubTask 6.1: Integrate Body, Look, Life, and Mind into `main.py`.
  - [x] SubTask 6.2: Add "Random Event" system (pet speaks spontaneously based on mood).
  - [x] SubTask 6.3: Final polish of UI assets and interaction feel.
