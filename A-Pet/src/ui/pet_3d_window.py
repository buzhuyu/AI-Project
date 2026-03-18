import sys
import os
import math
import json
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QApplication, QSystemTrayIcon, QMenu
from PyQt6.QtCore import Qt, QPoint, QTimer, QEvent, QUrl
from PyQt6.QtGui import QMouseEvent, QAction, QIcon
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile

from src.core.pet_state import PetState
from src.core.ai_brain import AIBrain
from src.ui.chat_bubble import ChatBubble
from src.core.scene_sensor import SceneSensor
from src.ui.ball_widget import BallWidget

# HTML template for Three.js rendering
THREEJS_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>3D Pet</title>
    <style>
        body { margin: 0; padding: 0; overflow: hidden; background-color: transparent; }
        canvas { display: block; width: 100%; height: 100%; }
    </style>
    <!-- Use unpkg which is generally more reliable for QtWebEngine -->
    <script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script>
    <script src="https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
    <script src="https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body>
    <script>
        let scene, camera, renderer, model, mixer, clock, controls;
        let action;

        function init() {
            if (typeof THREE === 'undefined') {
                console.error("THREE is not defined! The script tag failed to load.");
                // Retry after a short delay
                setTimeout(init, 500);
                return;
            }
            
            clock = new THREE.Clock();
            
            // Scene
            scene = new THREE.Scene();
            
            // Camera
            camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 1.5, 4);

            // Renderer
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            // Fix color encoding for modern Three.js/GLTF
            renderer.outputEncoding = THREE.sRGBEncoding; 
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            document.body.appendChild(renderer.domElement);

            // Controls for interactive debugging
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;

            // Lighting - Make it brighter
            const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
            directionalLight.position.set(5, 10, 7.5);
            scene.add(directionalLight);
            
            const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
            fillLight.position.set(-5, 0, -5);
            scene.add(fillLight);

            // Loader
            const loader = new THREE.GLTFLoader();
            // The file path will be injected here
            const modelUrl = 'MODEL_URL_PLACEHOLDER';
            
            console.log("Loading model from:", modelUrl);
            
            loader.load(modelUrl, function (gltf) {
                console.log("Model loaded successfully!", gltf);
                model = gltf.scene;
                
                // Detailed model inspection
                model.traverse(function (node) {
                    if (node.isMesh) {
                        console.log("Found mesh:", node.name, "visible:", node.visible);
                        node.material.side = THREE.DoubleSide; // Ensure both sides render
                        node.frustumCulled = false; // Disable culling for safety
                    }
                });
                
                // --- ROBUST NORMALIZATION STRATEGY ---
                // 1. Calculate original bounding box
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                // 2. Center the model's geometry to local (0,0,0)
                model.position.x = -center.x;
                model.position.y = -center.y;
                model.position.z = -center.z;
                
                // Wrap it in a parent group so we can scale it cleanly
                const wrapper = new THREE.Group();
                wrapper.add(model);
                
                // 3. Find the maximum dimension
                const maxDim = Math.max(size.x, size.y, size.z);
                console.log("Model size:", size.x, size.y, size.z, "maxDim:", maxDim);
                
                // 4. Double the scale again (from 8.0 to 16.0)
                if (maxDim > 0) {
                    const scaleFactor = 16.0 / maxDim;
                    console.log("Scaling by 2x factor (Total 8x from original):", scaleFactor);
                    wrapper.scale.set(scaleFactor, scaleFactor, scaleFactor);
                }
                
                // Add the normalized wrapper to the scene
                scene.add(wrapper);
                
                // 5. AUTO-FIT CAMERA TO THE MODEL ITSELF
                const box2 = new THREE.Box3().setFromObject(wrapper);
                const size2 = box2.getSize(new THREE.Vector3());
                
                const maxDim2 = Math.max(size2.x, size2.y, size2.z);
                const fov2 = camera.fov * (Math.PI / 180);
                let cameraZ = Math.abs(maxDim2 / 2 / Math.tan(fov2 / 2));
                
                // Use a safe padding (1.1 = 10% space)
                camera.position.set(0, 0, cameraZ * 1.1); 
                camera.lookAt(0, 0, 0);
                
                // Standard lights for a 16.0 unit model
                const light1 = new THREE.AmbientLight(0xffffff, 1.5);
                scene.add(light1);
                
                const light2 = new THREE.DirectionalLight(0xffffff, 2.0);
                light2.position.set(20, 20, 40);
                scene.add(light2);
                
                const light3 = new THREE.DirectionalLight(0xffffff, 1.0);
                light3.position.set(-2, -2, -2);
                scene.add(light3);
                
                // Final render
                renderer.render(scene, camera);
                
                // Animation
                if (gltf.animations && gltf.animations.length > 0) {
                    mixer = new THREE.AnimationMixer(model);
                    action = mixer.clipAction(gltf.animations[0]);
                    action.play();
                }
                
            }, undefined, function (error) {
                console.error('An error happened loading the model:', error);
            });

            window.addEventListener('resize', onWindowResize, false);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate() {
            requestAnimationFrame(animate);
            const delta = clock.getDelta();
            
            if (controls) controls.update();
            
            if (mixer) mixer.update(delta);
            
            // Procedural idle animation if no mixer
            if (model && !mixer) {
                model.rotation.y += 0.01;
                // Simple breathing
                const time = Date.now() * 0.001;
                model.scale.y = 1 + Math.sin(time * 2) * 0.02;
            }
            
            renderer.render(scene, camera);
        }

        // JS API to receive commands from Python
        window.triggerJump = function() {
            if (model) {
                // Simple jump simulation via JS
                let startY = model.position.y;
                let startTime = Date.now();
                let jumpInterval = setInterval(() => {
                    let t = (Date.now() - startTime) / 500; // 0.5s jump
                    if (t > 1) {
                        model.position.y = startY;
                        clearInterval(jumpInterval);
                    } else {
                        model.position.y = startY + Math.sin(t * Math.PI) * 0.5;
                        model.rotation.y += 0.2;
                    }
                }, 16);
            }
        };

        window.triggerShake = function() {
            if (model) {
                 let startRotZ = model.rotation.z;
                 let startTime = Date.now();
                 let shakeInterval = setInterval(() => {
                     let t = (Date.now() - startTime) / 500;
                     if (t > 1) {
                         model.rotation.z = startRotZ;
                         clearInterval(shakeInterval);
                     } else {
                         model.rotation.z = startRotZ + Math.sin(t * Math.PI * 6) * 0.2;
                     }
                 }, 16);
            }
        };

        init();
        animate();
    </script>
</body>
</html>
"""

class WebEnginePage(QWebEnginePage):
    def javaScriptConsoleMessage(self, level, message, lineNumber, sourceID):
        levels = {
            QWebEnginePage.JavaScriptConsoleMessageLevel.InfoMessageLevel: "INFO",
            QWebEnginePage.JavaScriptConsoleMessageLevel.WarningMessageLevel: "WARN",
            QWebEnginePage.JavaScriptConsoleMessageLevel.ErrorMessageLevel: "ERROR",
        }
        level_str = levels.get(level, "DEBUG")
        print(f"WebEngine JS [{level_str}] (Line {lineNumber}): {message} (Source: {sourceID})")

class Pet3DWindow(QWidget):
    def __init__(self, model_path):
        super().__init__()
        
        self.model_path = model_path
        
        # Core components
        self.pet_state = PetState()
        self.ai_brain = AIBrain()
        self.scene_sensor = SceneSensor()
        
        # Animation State
        self.anim_state = "idle" # idle, jump, shake, spin
        self.anim_frame = 0
        self.anim_speed = 1.0
        self.base_scale = [1.0, 1.0, 1.0] # Will store original actor scale
        self.actor = None # Reference to the model actor
        
        # UI components
        self.chat_bubble = ChatBubble()
        self.ball = None
        
        # GLTF Importer Reference for animations
        self.importer = None
        self.animation_step = 0.0
        self.animation_max = 0.0
        
        self.initUI()
        self.create_context_menu()
        self.create_tray_icon()
        
        self.oldPos = self.pos()
        
        # Timers
        self.decay_timer = QTimer(self)
        self.decay_timer.timeout.connect(self.decay_state)
        self.decay_timer.start(60000)

        self.random_event_timer = QTimer(self)
        self.random_event_timer.timeout.connect(self.trigger_random_event)
        self.random_event_timer.start(30000)
        
        # 3D Animation Timer
        self.anim_timer = QTimer(self)
        self.anim_timer.timeout.connect(self.update_3d_view)
        self.anim_timer.start(30) # ~30fps

    def initUI(self):
        # 1. Restore the frameless, transparent, top-level window property
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint | Qt.WindowType.Tool)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        
        # 2. Start with a default size, but we will adjust it after model loads
        self.resize(1200, 1200) 
        
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)
        
        # 3. WebEngine Setup
        self.webview = QWebEngineView(self)
        self.webpage = WebEnginePage(self.webview)
        self.webview.setPage(self.webpage)
        
        # 4. CRITICAL: Set background to COMPLETELY transparent
        self.webpage.setBackgroundColor(Qt.GlobalColor.transparent)
        self.webview.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.webview.setStyleSheet("background: transparent;")
        
        self.layout.addWidget(self.webview)
        
        # Event filter for dragging
        self.webview.installEventFilter(self)
        
        # Load Model
        self.load_model()
        self.show()

    def load_model(self):
        if not os.path.exists(self.model_path):
            print(f"Model not found: {self.model_path}")
            return
            
        # Convert local path to a format WebEngine can use (file:///)
        # Important: WebEngine sometimes struggles with non-ASCII paths
        model_url = QUrl.fromLocalFile(os.path.abspath(self.model_path)).toString()
        
        # We might need to copy the file to a safe name to avoid encoding issues
        safe_model_path = os.path.abspath(os.path.join(os.path.dirname(self.model_path), "model.glb"))
        import shutil
        try:
            shutil.copy2(self.model_path, safe_model_path)
            model_url = QUrl.fromLocalFile(safe_model_path).toString()
        except Exception as e:
            print(f"Failed to copy model to safe path: {e}")

        # Inject the model URL into our HTML template
        html_content = THREEJS_TEMPLATE.replace('MODEL_URL_PLACEHOLDER', model_url)
        
        # Save HTML to a temporary local file to avoid CORS and base_url weirdness
        temp_html_path = os.path.abspath(os.path.join(os.path.dirname(self.model_path), "temp_viewer.html"))
        with open(temp_html_path, "w", encoding="utf-8") as f:
            f.write(html_content)
            
        # Enable local file access
        self.webview.settings().setAttribute(self.webview.settings().WebAttribute.LocalContentCanAccessRemoteUrls, True)
        self.webview.settings().setAttribute(self.webview.settings().WebAttribute.LocalContentCanAccessFileUrls, True)
        
        # Load the HTML file directly
        self.webview.load(QUrl.fromLocalFile(temp_html_path))

    def update_3d_view(self):
        # With Three.js, animation is handled inside the browser via requestAnimationFrame
        # We only need this timer to update the chat bubble position if the window moves
        self.update_bubble_position()
        
    def set_anim_state(self, state):
        self.anim_state = state
        if state == "jump":
            self.webview.page().runJavaScript("if(window.triggerJump) window.triggerJump();")
        elif state == "shake":
            self.webview.page().runJavaScript("if(window.triggerShake) window.triggerShake();")

    def eventFilter(self, source, event):
        if source == self.webview:
            if event.type() == QEvent.Type.MouseButtonPress:
                if event.button() == Qt.MouseButton.LeftButton:
                    self.oldPos = event.globalPosition().toPoint()
                    return True # Consume event
                elif event.button() == Qt.MouseButton.RightButton:
                    # Show context menu
                    self.context_menu.exec(event.globalPosition().toPoint())
                    return True
            elif event.type() == QEvent.Type.MouseMove:
                if event.buttons() == Qt.MouseButton.LeftButton:
                    delta = event.globalPosition().toPoint() - self.oldPos
                    self.move(self.x() + delta.x(), self.y() + delta.y())
                    self.oldPos = event.globalPosition().toPoint()
                    return True
            elif event.type() == QEvent.Type.MouseButtonDblClick:
                if event.button() == Qt.MouseButton.LeftButton:
                    self.chat_with_pet()
                    return True
        return super().eventFilter(source, event)

    def update_bubble_position(self):
        if self.chat_bubble and self.chat_bubble.isVisible():
            # Since the window size might have changed or plotter margins are different
            # Ensure chat bubble stays on top of the character
            
            # Position above the window instead of inside it
            global_pos = self.mapToGlobal(QPoint(0, 0))
            
            # Recalculate size just in case text changed
            self.chat_bubble.adjustSize()
            
            x = global_pos.x() + (self.width() - self.chat_bubble.width()) // 2
            # Move it slightly higher to account for scaling
            y = global_pos.y() - self.chat_bubble.height() - 10 
            
            self.chat_bubble.move(x, y)

    def show_chat(self, text, duration=3000):
        # Explicitly make sure it is a top level window if not already
        self.chat_bubble.setWindowFlags(Qt.WindowType.ToolTip | Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint)
        self.chat_bubble.show_message(text, duration)
        self.update_bubble_position()

    def chat_with_pet(self):
        context = self.scene_sensor.get_context()
        response = self.ai_brain.get_response("Say something cool about being 3D!", self.pet_state, context)
        self.show_chat(response)

    def decay_state(self):
        self.pet_state.decay()
        if self.pet_state.hunger < 20:
             self.show_chat("I'm so hungry...")
        elif self.pet_state.energy < 20:
             self.show_chat("I'm sleepy...")
        elif self.pet_state.mood < 20:
             self.show_chat("I'm bored...")

    def trigger_random_event(self):
        if self.ball: return # Don't interrupt game
        
        import random
        if random.random() < 0.2:
            prompt = "Tell me what you are feeling right now."
            if self.pet_state.hunger < 40:
                prompt = "Complain about being hungry."
            elif self.pet_state.mood < 40:
                prompt = "Say something sad."
            elif self.pet_state.energy < 40:
                prompt = "Say something sleepy."
            
            context = self.scene_sensor.get_context()
            response = self.ai_brain.get_response(prompt, self.pet_state, context)
            duration = max(3000, len(response) * 100)
            self.show_chat(response, duration)

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

    def show_status(self):
        status = self.pet_state.get_status_string()
        self.show_chat(status)

    def feed_pet(self):
        self.pet_state.feed()
        self.show_chat("Yummy! 3D food is best!")
        # Trigger happy animation
        self.set_anim_state("jump")

    def play_with_pet(self):
        self.pet_state.play()
        self.show_chat("Yay! Let's roll!")
        # Trigger play animation
        self.set_anim_state("jump") # Reusing jump for now

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
        self.set_anim_state("jump")
        self.ball = None

    def create_tray_icon(self):
        self.tray_icon = QSystemTrayIcon(self)
        
        # Use a default icon since we don't have a 2D snapshot easily
        # Try to use existing asset if available
        fallback_path = os.path.join("assets", "pet_idle.png")
        if os.path.exists(fallback_path):
            self.tray_icon.setIcon(QIcon(fallback_path))
        else:
            # Maybe create a simple pixmap
            pass 
            
        tray_menu = QMenu()
        show_action = QAction("Show/Hide", self)
        show_action.triggered.connect(self.toggle_visibility)
        quit_action = QAction("Quit", self)
        quit_action.triggered.connect(self.quit_app)
        tray_menu.addAction(show_action)
        tray_menu.addAction(quit_action)
        self.tray_icon.setContextMenu(tray_menu)
        self.tray_icon.show()

    def toggle_visibility(self):
        if self.isVisible():
            self.hide()
            self.chat_bubble.hide()
        else:
            self.show()

    def quit_app(self):
        self.pet_state.save()
        QApplication.quit()
