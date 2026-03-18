import sys
import os
import random
import math
from PyQt6.QtWidgets import QWidget, QLabel, QApplication, QSystemTrayIcon, QMenu, QGraphicsDropShadowEffect
from PyQt6.QtCore import Qt, QPoint, QTimer, QTime
from PyQt6.QtGui import QPixmap, QMouseEvent, QAction, QIcon, QColor
from src.core.animation_manager import AnimationManager
from src.core.pet_state import PetState
from src.core.ai_brain import AIBrain
from src.ui.chat_bubble import ChatBubble
from src.core.scene_sensor import SceneSensor
from src.ui.ball_widget import BallWidget

class PetWindow(QWidget):
    def __init__(self):
        super().__init__()
        
        # Core components
        self.pet_state = PetState()
        self.ai_brain = AIBrain()
        self.animation_manager = AnimationManager()
        self.animation_manager.load_animations()
        self.scene_sensor = SceneSensor()
        
        # Breathing animation state
        self.breath_counter = 0
        
        # UI components
        self.chat_bubble = ChatBubble()
        self.ball = None # Keep reference to ball game
        
        self.initUI()
        self.create_context_menu()
        self.create_tray_icon()
        
        self.oldPos = self.pos()
        
        # Timer for animation
        self.anim_timer = QTimer(self)
        self.anim_timer.timeout.connect(self.update_animation)
        self.anim_timer.start(100) # 100ms per frame for smoother breathing

        # Timer for state decay (every minute)
        self.decay_timer = QTimer(self)
        self.decay_timer.timeout.connect(self.decay_state)
        self.decay_timer.start(60000) # 60 seconds

        # Timer for random events (every 30 seconds)
        self.random_event_timer = QTimer(self)
        self.random_event_timer.timeout.connect(self.trigger_random_event)
        self.random_event_timer.start(30000) # 30 seconds

        # Initial greeting
        QTimer.singleShot(1000, lambda: self.show_chat("Hello! I'm your desktop pet!"))

    def initUI(self):
        # Set window flags
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint | Qt.WindowType.Tool)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)

        # Load image
        self.image_label = QLabel(self)
        
        # Add Drop Shadow
        shadow = QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(15)
        shadow.setColor(QColor(0, 0, 0, 150))
        shadow.setOffset(3, 3)
        self.image_label.setGraphicsEffect(shadow)
        
        self.update_image()
        
        self.show()

    def update_image(self):
        pixmap = self.animation_manager.get_current_frame()
        if pixmap:
            # Breathing effect: Scale height slightly based on sine wave
            self.breath_counter += 0.15
            scale_factor = 1.0 + 0.015 * math.sin(self.breath_counter) # +/- 1.5% height
            
            # Use smooth transformation
            scaled_pixmap = pixmap.scaled(
                pixmap.width(), 
                int(pixmap.height() * scale_factor),
                Qt.AspectRatioMode.IgnoreAspectRatio,
                Qt.TransformationMode.SmoothTransformation
            )
            
            self.image_label.setPixmap(scaled_pixmap)
            
            # Resize window to accommodate + margin for shadow
            margin = 20
            target_width = pixmap.width() + margin
            target_height = int(pixmap.height() * 1.02) + margin # Max height
            
            if self.width() != target_width or self.height() != target_height:
                self.resize(target_width, target_height)
            
            # Center the label
            x_offset = margin // 2
            y_offset = margin // 2 + (pixmap.height() - scaled_pixmap.height()) // 2
            self.image_label.move(x_offset, int(y_offset))
            
    def update_animation(self):
        self.animation_manager.update()
        self.update_image()

    def decay_state(self):
        self.pet_state.decay()
        # Check if pet is too hungry/tired/sad and notify
        if self.pet_state.hunger < 20:
             self.show_chat("I'm so hungry...")
        elif self.pet_state.energy < 20:
             self.show_chat("I'm sleepy...")
        elif self.pet_state.mood < 20:
             self.show_chat("I'm bored...")

    def trigger_random_event(self):
        if random.random() < 0.2:
            # 20% chance to say something
            # Determine prompt based on state
            prompt = "Tell me what you are feeling right now."
            if self.pet_state.hunger < 40:
                prompt = "Complain about being hungry."
            elif self.pet_state.mood < 40:
                prompt = "Say something sad."
            elif self.pet_state.energy < 40:
                prompt = "Say something sleepy."
            
            context = self.scene_sensor.get_context()
            response = self.ai_brain.get_response(prompt, self.pet_state, context)
            
            # Calculate duration: min 3s, plus 100ms per character
            duration = max(3000, len(response) * 100)
            self.show_chat(response, duration)

    def mousePressEvent(self, event: QMouseEvent):
        if event.button() == Qt.MouseButton.LeftButton:
            self.oldPos = event.globalPosition().toPoint()

    def mouseMoveEvent(self, event: QMouseEvent):
        if event.buttons() == Qt.MouseButton.LeftButton:
            delta = QPoint(event.globalPosition().toPoint() - self.oldPos)
            self.move(self.x() + delta.x(), self.y() + delta.y())
            self.oldPos = event.globalPosition().toPoint()

    def moveEvent(self, event):
        super().moveEvent(event)
        self.update_bubble_position()

    def mouseDoubleClickEvent(self, event: QMouseEvent):
        if event.button() == Qt.MouseButton.LeftButton:
            self.chat_with_pet()

    def update_bubble_position(self):
        if self.chat_bubble and self.chat_bubble.isVisible():
            # Center above the pet
            x = self.x() + (self.width() - self.chat_bubble.width()) // 2
            y = self.y() - self.chat_bubble.height() + 10 # Overlap slightly
            self.chat_bubble.move(x, y)

    def show_chat(self, text, duration=3000):
        self.chat_bubble.show_message(text, duration)
        self.update_bubble_position()

    def chat_with_pet(self):
        # For now, just a simple interaction. 
        # In a real app, this might open a text input dialog.
        # Here we just get a random thought from AI.
        context = self.scene_sensor.get_context()
        response = self.ai_brain.get_response("Say something cute!", self.pet_state, context)
        self.show_chat(response)

    def contextMenuEvent(self, event):
        self.context_menu.exec(event.globalPos())

    def create_context_menu(self):
        self.context_menu = QMenu(self)
        
        status_action = QAction("Status", self)
        status_action.triggered.connect(self.show_status)

        chat_action = QAction("Chat", self)
        chat_action.triggered.connect(self.chat_with_pet)

        feed_action = QAction("Feed", self)
        feed_action.triggered.connect(self.feed_pet)
        
        play_action = QAction("Play", self)
        play_action.triggered.connect(self.play_with_pet)

        game_action = QAction("Catch Ball", self)
        game_action.triggered.connect(self.start_minigame)
        
        quit_action = QAction("Quit", self)
        quit_action.triggered.connect(self.quit_app)
        
        self.context_menu.addAction(status_action)
        self.context_menu.addAction(chat_action)
        self.context_menu.addSeparator()
        self.context_menu.addAction(feed_action)
        self.context_menu.addAction(play_action)
        self.context_menu.addAction(game_action)
        self.context_menu.addSeparator()
        self.context_menu.addAction(quit_action)

    def start_minigame(self):
        self.show_chat("Catch the red ball!", 2000)
        if self.ball:
            self.ball.close()
        self.ball = BallWidget()
        self.ball.caught.connect(self.on_ball_caught)
        self.ball.show()

    def on_ball_caught(self):
        self.pet_state.play()
        self.show_chat("Nice catch! +Fun")
        self.animation_manager.set_state("walk")
        QTimer.singleShot(2000, lambda: self.animation_manager.set_state("idle"))
        self.ball = None

    def create_tray_icon(self):
        self.tray_icon = QSystemTrayIcon(self)
        
        icon_pixmap = self.animation_manager.get_current_frame()
        if icon_pixmap:
            self.tray_icon.setIcon(QIcon(icon_pixmap))
        else:
            fallback_path = os.path.join("assets", "pet_idle.png")
            if os.path.exists(fallback_path):
                self.tray_icon.setIcon(QIcon(fallback_path))
            
        tray_menu = QMenu()
        
        show_action = QAction("Show/Hide", self)
        show_action.triggered.connect(self.toggle_visibility)
        
        quit_action = QAction("Quit", self)
        quit_action.triggered.connect(self.quit_app)
        
        tray_menu.addAction(show_action)
        tray_menu.addAction(quit_action)
        
        self.tray_icon.setContextMenu(tray_menu)
        self.tray_icon.show()

    def show_status(self):
        status = self.pet_state.get_status_string()
        self.show_chat(status)

    def feed_pet(self):
        self.pet_state.feed()
        self.show_chat("Yummy! Thank you!")
        self.animation_manager.set_state("walk") # Assuming walk is 'happy' for now
        QTimer.singleShot(2000, lambda: self.animation_manager.set_state("idle"))

    def play_with_pet(self):
        self.pet_state.play()
        self.show_chat("Yay! This is fun!")
        self.animation_manager.set_state("walk")
        QTimer.singleShot(2000, lambda: self.animation_manager.set_state("idle"))

    def toggle_visibility(self):
        if self.isVisible():
            self.hide()
            self.chat_bubble.hide()
        else:
            self.show()

    def quit_app(self):
        self.pet_state.save()
        QApplication.quit()
