import io

from PIL import Image


def make_image(fmt: str = "PNG", size=(64, 48), color=(180, 120, 60)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format=fmt)
    return buf.getvalue()
