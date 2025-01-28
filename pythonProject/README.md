## プロジェクト構造

このプロジェクトは、ゲームのコアロジックを管理する `nullpoga_cui` と、ゲームサーバーの実装を行う `nullpoga_server` から構成されています。

```
pythonProject/
├── requirements.txt # プロジェクトの実行に必要なパッケージの依存関係管理ファイル
├── requirements-dev.txt # pytest用のパッケージ依存関係管理ファイル
├── nullpoga_cui/
│   ├── player.py
│   ├── state.py
│   └── tests/ # テスト
│         └──　test_monte_carlo_vs_random_cpu_battle.py # CPU同士が対戦している（はずの）テストコード
├── nullpoga_server/ 
│   ├── static/ #htmlなどフロントエンド
│   └── tests/ # テスト
└── nullpoga_frontend/ #Reactのフロントエンド開発用
```

### `nullpoga_cui`

- ゲームのコアロジックを担当するモジュール。
- 実装は以下の記事とリポジトリを参考にしています。
  - [Pythonでのモンテカルロ木探索](https://zenn.dev/ganariya/articles/python-monte-carlo-tree-search)
  - [MonteCarloTreeSearch リポジトリ](https://github.com/ganyariya/MonteCarloTreeSearch)

### `nullpoga_server`

- ゲームサーバーのモジュール。

### `nullpoga_frontend`

- Reactで実装しているフロントエンド
 - 開発用。ビルド先はnullpoga_server直下のstaticディレクトリ

## Dockerとしてデプロイする

Dockerfileを用意しています。
デプロイするだけなら以下のコマンドでOKです。

```bash
docker build -t nullpoga_tcg .
docker run -p 8000:8000 nullpoga_tcg
```

## セットアップ手順

本プロジェクトをgit cloneして落とした後、プロジェクトをセットアップするには、まず依存パッケージをインストールする必要があります。
以下はUbuntuでのセットアップ手順です。Windowsの場合は適宜読み替えてください。

### 依存パッケージのインストール

1. pythonProjectディレクトリに移動します。(以下`/path/to/pythonProject`は、pythonProjectのある場所のパスに置き換えてください)

   ```bash
   cd /path/to/pythonProject
   ```

2. 仮想環境を作成
   プロジェクトディレクトリで以下を実行します：

   ```bash
   python3 -m venv venv
   ```

3. 仮想環境を有効化
   仮想環境をアクティブにします。

   ```bash
   source venv/bin/activate
   ```

4. プロジェクトの実行に必要な基本的な依存パッケージをインストールします。

   ```bash
   pip install -r requirements.txt
   ```

   `requirements.txt` には、プロジェクトが正しく動作するために必要なパッケージの一覧が記載されています。

5. 開発環境用の追加パッケージ（主に `pytest` 用）をインストールします。

   ```bash
   pip install -r requirements-dev.txt
   ```

   `requirements-dev.txt` には、テスト環境必要なパッケージが記載されています。特に `pytest` のテストツールが含まれています。

### サーバー実行

1. nullpoga_serverディレクトリに移動します：

```bash
cd nullpoga_server
```

2. 環境変数PYTHONPATHを設定してサーバーを起動します：

```bash
# pythonProjectディレクトリへの絶対パスを指定
PYTHONPATH=/path/to/pythonProject/ python3 main.py 
```

実行例（Ubuntuの場合）：
```bash
(venv) mirenn@mirenn-dev:~/nullpoga_TCG/pythonProject/nullpoga_server$ PYTHONPATH=~/nullpoga_TCG/pythonProject/ python3 main.py
```

### テストの実行（開発者向け）

開発環境をセットアップした後、以下のコマンドでpythonのソースのテストを実行できます。

```bash
pytest
```

