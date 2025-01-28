# Pythonの公式イメージをベースとして使用
FROM python:3.10-slim

# 作業ディレクトリを設定
WORKDIR /app

# 必要なパッケージをインストール
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# 依存関係ファイルをコピー
COPY requirements.txt requirements-dev.txt ./

# Pythonパッケージをインストール
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir -r requirements-dev.txt

# プロジェクトファイルをコピー
COPY nullpoga_cui/ ./nullpoga_cui/
COPY nullpoga_server/ ./nullpoga_server/
COPY nullpoga_frontend/ ./nullpoga_frontend/

# 環境変数を設定
ENV PYTHONPATH=/app

# ポートを公開
EXPOSE 8000

# 作業ディレクトリを移動
WORKDIR /app/nullpoga_server

# サーバーを起動
CMD ["python3", "main.py"] 