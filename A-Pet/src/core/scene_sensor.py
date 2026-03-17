import ctypes
from ctypes import wintypes
import time

class SceneSensor:
    def __init__(self):
        self.user32 = ctypes.windll.user32
        self.last_check_time = 0
        self.last_window_title = ""

    def get_active_window_title(self):
        """Get the title of the currently active window."""
        hwnd = self.user32.GetForegroundWindow()
        length = self.user32.GetWindowTextLengthW(hwnd)
        if length > 0:
            buff = ctypes.create_unicode_buffer(length + 1)
            self.user32.GetWindowTextW(hwnd, buff, length + 1)
            return buff.value
        return ""

    def get_context(self):
        """Return a string describing the user's current activity."""
        current_time = time.time()
        # Rate limit checks to avoid spamming system calls if needed, 
        # but for simple title retrieval it's fast.
        
        title = self.get_active_window_title()
        self.last_window_title = title
        
        if not title:
            return "User is idle at desktop"
            
        lower_title = title.lower()
        
        if "chrome" in lower_title or "edge" in lower_title or "firefox" in lower_title:
            return f"User is browsing the web: {title}"
        elif "code" in lower_title or "pycharm" in lower_title or "visual studio" in lower_title:
            return f"User is coding: {title}"
        elif "discord" in lower_title or "slack" in lower_title or "wechat" in lower_title:
            return f"User is chatting: {title}"
        elif "steam" in lower_title or "game" in lower_title:
            return f"User is gaming: {title}"
        elif "word" in lower_title or "excel" in lower_title or "powerpoint" in lower_title:
            return f"User is working on documents: {title}"
        else:
            return f"User is using {title}"

if __name__ == "__main__":
    sensor = SceneSensor()
    print(sensor.get_context())
