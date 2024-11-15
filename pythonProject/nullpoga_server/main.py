# import sys
import os
# from fastapi import FastAPI
from nullpoga_server.core.config import app, templates  # 設定のインポート
from nullpoga_server.routers import game_apis, pages  # ルーターのインポート
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

# 各種ルーターをアプリケーションに追加
app.include_router(game_apis.router)
app.include_router(pages.router)

# 静的ファイルのマウント
static_assets_directory = os.path.join(os.path.dirname(__file__), "static", "assets")
app.mount("/assets", StaticFiles(directory=static_assets_directory), name="static")
static_images_directory = os.path.join(os.path.dirname(__file__), "static", "images")
app.mount("/images", StaticFiles(directory=static_images_directory), name="images")


# favicon.icoのパスを明示的に指定
@app.get("/assets/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("static/favicon.ico")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 必要に応じて設定を変更
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
