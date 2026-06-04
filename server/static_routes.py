from fastapi import APIRouter
from fastapi.responses import FileResponse

from server.config import WEB_DIR


router = APIRouter()


@router.get("/")
async def index() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


@router.get("/styles.css")
async def styles() -> FileResponse:
    return FileResponse(WEB_DIR / "styles.css")


@router.get("/app.js")
async def app_js() -> FileResponse:
    return FileResponse(WEB_DIR / "app.js")
