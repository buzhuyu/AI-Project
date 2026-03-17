import sys
from PyQt6.QtWidgets import QWidget, QLabel, QVBoxLayout, QApplication, QSizePolicy
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QPainter, QColor, QFont, QPainterPath

class ChatBubble(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        
        # Important: Allow it to resize dynamically based on layout
        self.setWindowFlags(Qt.WindowType.ToolTip | Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        
        self.layout = QVBoxLayout(self)
        # Tighter margins so the bubble isn't artificially bloated
        self.layout.setContentsMargins(10, 10, 10, 20) 
        
        self.label = QLabel("")
        # Revert font to a more reasonable 10pt size
        self.label.setFont(QFont("Arial", 10))
        self.label.setStyleSheet("color: black;")
        self.label.setWordWrap(True)
        # Constrain the maximum width so it doesn't get ridiculously wide
        self.label.setMaximumWidth(200)
        # Let the label expand vertically if needed
        self.label.setSizePolicy(QSizePolicy.Policy.Preferred, QSizePolicy.Policy.Expanding)
        self.label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        self.layout.addWidget(self.label)
        
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.hide)
        
        self.hide()

    def show_message(self, text, duration=3000):
        self.label.setText(text)
        # Force layout update to calculate new size
        self.label.adjustSize()
        self.adjustSize()
        self.show()
        self.timer.start(duration)

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # Bubble styling
        painter.setBrush(QColor(240, 240, 240, 240))
        painter.setPen(Qt.PenStyle.NoPen)
        
        # Draw rounded rectangle
        # Subtracting 15 for the tail space at the bottom
        bubble_rect = self.rect().adjusted(5, 5, -5, -20) 
        painter.drawRoundedRect(bubble_rect, 10, 10)
        
        # Draw tail
        path = QPainterPath()
        tail_width = 16
        tail_height = 15
        center_x = self.rect().width() / 2
        bottom_y = bubble_rect.bottom()
        
        path.moveTo(center_x - tail_width/2, bottom_y)
        path.lineTo(center_x + tail_width/2, bottom_y)
        path.lineTo(center_x, bottom_y + tail_height)
        path.lineTo(center_x - tail_width/2, bottom_y)
        
        painter.drawPath(path)
