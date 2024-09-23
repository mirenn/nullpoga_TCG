from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from nullpoga_server.core.config import templates

router = APIRouter()


@router.get("/", response_class=HTMLResponse)
async def get_game_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@router.get("/test", response_class=HTMLResponse)
async def test_api(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
