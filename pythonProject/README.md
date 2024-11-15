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

### プロジェクトルート

プロジェクトルートは、`requirements.txt` が存在するディレクトリです。このディレクトリを基準にコマンドを実行することで、モジュールのインポートやパッケージのインストールが正しく行われるようになります。

## セットアップ手順

プロジェクトをセットアップするには、まず依存パッケージをインストールする必要があります。

### 依存パッケージのインストール

1. プロジェクトルート（`requirements.txt` が存在するディレクトリ）に移動します。(`/path/to/pythonProject`は、pythonProjectのある場所のパスに置き換えてください)

   ```bash
   cd /path/to/pythonProject
   ```

2. プロジェクトの実行に必要な基本的な依存パッケージをインストールします。

   ```bash
   pip install -r requirements.txt
   ```

   `requirements.txt` には、プロジェクトが正しく動作するために必要なパッケージの一覧が記載されています。

3. 開発環境用の追加パッケージ（主に `pytest` 用）をインストールします。

   ```bash
   pip install -r requirements-dev.txt
   ```

   `requirements-dev.txt` には、テスト環境必要なパッケージが記載されています。特に `pytest` のテストツールが含まれています。

### サーバー実行

pythonProjectディレクトリで以下コマンド

```bash
uvicorn nullpoga_server.main:app --reload
```

あるいは、

```bash
python -m nullpoga_server.main
```

### テストの実行（開発者向け）

開発環境をセットアップした後、以下のコマンドでpythonのソースのテストを実行できます。

```bash
pytest
```

