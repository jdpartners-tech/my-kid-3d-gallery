import fitz
import os
import glob

ARTWORK_DIR = os.path.join(os.path.dirname(__file__), 'artwork')
DPI = 150

for kid_folder in os.listdir(ARTWORK_DIR):
    folder_path = os.path.join(ARTWORK_DIR, kid_folder)
    if not os.path.isdir(folder_path):
        continue

    for filename in os.listdir(folder_path):
        if not filename.lower().endswith('.pdf'):
            continue

        pdf_path = os.path.join(folder_path, filename)
        doc = fitz.open(pdf_path)
        total = len(doc)
        print(f'{kid_folder}/{filename}: {total} pages')

        mat = fitz.Matrix(DPI / 72, DPI / 72)
        for i, page in enumerate(doc):
            pix = page.get_pixmap(matrix=mat)
            out_name = f'{i + 1:03d}.jpg'
            out_path = os.path.join(folder_path, out_name)
            pix.save(out_path)
            print(f'  -> {out_name}')

        doc.close()
        os.remove(pdf_path)
        print(f'  Removed original PDF.')

print('Done.')
