import sys
import vtk
from PyQt6.QtWidgets import QApplication, QWidget, QVBoxLayout, QLabel
from PyQt6.QtCore import Qt, QTimer
from vtk.qt.QVTKRenderWindowInteractor import QVTKRenderWindowInteractor

class Pet3DWindow(QWidget):
    def __init__(self, model_path):
        super().__init__()
        
        # Window setup
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint | Qt.WindowType.Tool)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.resize(400, 400)
        
        # Layout
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)
        
        # VTK Widget
        self.vtkWidget = QVTKRenderWindowInteractor(self)
        self.layout.addWidget(self.vtkWidget)
        
        # VTK Renderer
        self.renderer = vtk.vtkRenderer()
        self.renderer.SetBackground(0, 0, 0) # Black background
        self.renderer.SetBackgroundAlpha(0.0) # Transparent
        self.vtkWidget.GetRenderWindow().AddRenderer(self.renderer)
        
        # Load GLB Model
        self.load_model(model_path)
        
        # Camera setup
        self.camera = self.renderer.GetActiveCamera()
        self.camera.SetPosition(0, 1, 3)
        self.camera.SetFocalPoint(0, 0, 0)
        
        # Animation timer (Rotate the model)
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.animate)
        self.timer.start(30)
        
        # Initialize
        self.vtkWidget.Initialize()
        self.vtkWidget.Start()
        self.show()

    def load_model(self, path):
        # GLTF Importer
        importer = vtk.vtkGLTFImporter()
        importer.SetFileName(path)
        importer.SetRenderWindow(self.vtkWidget.GetRenderWindow())
        importer.Update()
        
        # Since vtkGLTFImporter adds actors directly to the window, 
        # we might need to iterate actors to set properties if needed.
        # But for now, let's just let it render.
        
        # Reset camera to fit model
        self.renderer.ResetCamera()

    def animate(self):
        # Rotate camera around focal point
        self.camera.Azimuth(1)
        self.vtkWidget.GetRenderWindow().Render()

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.oldPos = event.globalPosition().toPoint()

    def mouseMoveEvent(self, event):
        if event.buttons() == Qt.MouseButton.LeftButton:
            delta = event.globalPosition().toPoint() - self.oldPos
            self.move(self.x() + delta.x(), self.y() + delta.y())
            self.oldPos = event.globalPosition().toPoint()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    
    # Path to the uploaded GLB file
    model_path = r"e:\TestGame\A-Pet\3d+猫咪+赛博风格+模型.glb"
    
    window = Pet3DWindow(model_path)
    sys.exit(app.exec())
