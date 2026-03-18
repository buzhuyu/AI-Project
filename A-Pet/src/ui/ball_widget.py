import random
from PyQt6.QtWidgets import QWidget, QLabel
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QPoint
from PyQt6.QtGui import QPainter, QColor, QBrush

class BallWidget(QWidget):
    caught = pyqtSignal()

    def __init__(self):
        super().__init__()
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint | Qt.WindowType.Tool)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.resize(50, 50)
        
        # Random start position
        self.move(random.randint(100, 1000), random.randint(100, 800))
        
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.move_ball)
        self.timer.start(50)
        
        self.dx = random.choice([-5, 5])
        self.dy = random.choice([-5, 5])
        
        self.show()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setBrush(QBrush(QColor(255, 100, 100)))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawEllipse(0, 0, 50, 50)

    def move_ball(self):
        screen_geo = QApplication.primaryScreen().geometry()
        x = self.x() + self.dx
        y = self.y() + self.dy
        
        if x < 0 or x > screen_geo.width() - 50:
            self.dx = -self.dx
        if y < 0 or y > screen_geo.height() - 50:
            self.dy = -self.dy
            
        self.move(x, y)

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.caught.emit()
            self.close()
