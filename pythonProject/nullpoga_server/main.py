import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'nullpoga_cui')))
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi import Request

# import player

# FastAPIアプリケーションのインスタンス作成
app = FastAPI()

print("Current working directory:", os.getcwd())
templates_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'templates'))
print(templates_dir)
# Jinja2テンプレートの設定
templates = Jinja2Templates(
    directory=templates_dir)


# HTMLを返すエンドポイント
@app.get("/", response_class=HTMLResponse)
async def get_game_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api_test")
async def read_root():
    return {"message": "Welcome to nullpoga server!"}


@app.get("/test", response_class=HTMLResponse)
async def test_page(request: Request):
    return templates.TemplateResponse("test.html", {"request": request})
