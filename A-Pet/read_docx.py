import docx
import os

docx_path = r"e:\TestGame\A-Pet\桌面AI宠物养成设计.docx"
try:
    if os.path.exists(docx_path):
        doc = docx.Document(docx_path)
        print("--- Start of Docx Content ---")
        for para in doc.paragraphs:
            if para.text.strip():
                print(para.text.strip())
        print("--- End of Docx Content ---")
    else:
        print("Docx not found.")
except Exception as e:
    print(f"Error reading docx: {e}")
