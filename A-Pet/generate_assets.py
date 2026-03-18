import os
from PIL import Image, ImageDraw

def create_frame(filename, offset_y=0, color='red'):
    # Create a 100x100 transparent image
    img = Image.new('RGBA', (100, 100), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw a circle with offset
    # Base position: (10, 10) to (90, 90)
    # Apply offset
    y1 = 10 + offset_y
    y2 = 90 + offset_y
    
    draw.ellipse([10, y1, 90, y2], fill=color, outline='darkred')
    
    # Save the image
    img.save(filename)
    print(f"Created {filename}")

def generate_assets():
    if not os.path.exists('assets'):
        os.makedirs('assets')
        
    # Generate idle frames (bouncing slightly)
    offsets = [0, 2, 4, 2]
    for i, offset in enumerate(offsets):
        create_frame(f'assets/idle_{i}.png', offset_y=offset, color='red')
        
    # Generate walk frames (simulated by color change for now, or slight position shift)
    # Let's just change color to blue for walk to distinguish easily
    for i, offset in enumerate(offsets):
        create_frame(f'assets/walk_{i}.png', offset_y=offset, color='blue')

if __name__ == "__main__":
    generate_assets()
