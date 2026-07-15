import os
import uuid
from pathlib import Path
from fastapi import UploadFile
from app.core.config import settings


def ensure_upload_dir() -> str:
    root = os.path.abspath(os.getcwd())
    upload_dir = os.path.join(root, settings.UPLOAD_FOLDER)
    Path(upload_dir).mkdir(parents=True, exist_ok=True)
    return upload_dir


async def save_upload_file(upload_file: UploadFile) -> str:
    upload_dir = ensure_upload_dir()
    safe_name = os.path.basename(upload_file.filename)
    if not safe_name:
        safe_name = "upload"
    filename = f"{uuid.uuid4().hex}_{safe_name}"
    file_path = os.path.join(upload_dir, filename)
    content = await upload_file.read()
    with open(file_path, "wb") as out_file:
        out_file.write(content)
    return f"/{settings.UPLOAD_FOLDER}/{filename}"
