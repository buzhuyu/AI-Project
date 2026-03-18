import sys
import os

# Add src to sys.path to allow imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from PyQt6.QtWidgets import QApplication
from src.ui.pet_window import PetWindow
from src.ui.pet_3d_window import Pet3DWindow

def main():
    app = QApplication(sys.argv)
    
    # Check if 3D model exists
    # Prioritize the new model file
    model_path_new = r"e:\TestGame\A-Pet\3d+猫咪+赛博风格+模型 (1).glb"
    model_path_old = r"e:\TestGame\A-Pet\3d+猫咪+赛博风格+模型.glb"
    
    if os.path.exists(model_path_new):
        print(f"Loading 3D Pet from: {model_path_new}")
        pet = Pet3DWindow(model_path_new)
    elif os.path.exists(model_path_old):
        print(f"Loading 3D Pet from: {model_path_old}")
        pet = Pet3DWindow(model_path_old)
    else:
        print("3D Model not found, falling back to 2D Pet.")
        pet = PetWindow()
        
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
