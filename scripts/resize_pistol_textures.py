"""Prepare bounded-size working copies of the packed texture files."""
import json
import sys
from pathlib import Path
from PIL import Image
import numpy as np

directory = Path(sys.argv[1])
records = json.loads((directory / 'images.json').read_text(encoding='utf-8'))
for item in records:
    source = Path(item['path'])
    if source.suffix.lower() != '.png':
        continue
    target = source.with_name(source.stem + '-web.png')
    with Image.open(source) as image:
        if image.mode.startswith('I;16') or image.mode == 'I':
            image = Image.fromarray((np.array(image, dtype=np.float32) / 257).clip(0, 255).astype(np.uint8))
        if image.mode not in ('RGB', 'RGBA', 'L', 'LA'):
            image = image.convert('RGB')
        image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        image.save(target)
    item['working'] = str(target)
(directory / 'working-images.json').write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
print('Prepared', len(records), 'working textures')
