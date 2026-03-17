import json
import struct

def parse_glb_header(path):
    with open(path, 'rb') as f:
        magic = f.read(4)
        if magic != b'glTF':
            print("Not a valid GLB file")
            return
            
        version = struct.unpack('<I', f.read(4))[0]
        length = struct.unpack('<I', f.read(4))[0]
        
        print(f"GLB Version: {version}")
        
        # Read chunks
        while f.tell() < length:
            chunk_length = struct.unpack('<I', f.read(4))[0]
            chunk_type = f.read(4)
            
            if chunk_type == b'JSON':
                json_data = f.read(chunk_length)
                data = json.loads(json_data)
                
                if 'animations' in data:
                    print(f"Found {len(data['animations'])} animations:")
                    for i, anim in enumerate(data['animations']):
                        name = anim.get('name', f'animation_{i}')
                        print(f"  - {name}")
                else:
                    print("No animations found in the GLB file.")
                return
            else:
                f.seek(chunk_length, 1)

if __name__ == "__main__":
    path = r"e:\TestGame\A-Pet\3d+猫咪+赛博风格+模型.glb"
    parse_glb_header(path)