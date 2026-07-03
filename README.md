## 開発環境

- Node.js 22.x
- Vite + React + TypeScript 5.x.x
- VSCode
- Prettier
- ESLint
- EditorConfig
- Google Cloud (Firebase, Realtime Database, Cloud Functions)

### Node.js のバージョン参考情報(バージョン確認コマンドの実行結果)

- npm -v → 10.9.4
- node -v → v22.22.0

### 入れるべきVSCodeの拡張機能(カッコ内は識別子)

- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)

### ワークスペース設定

- .github/workflows/deploy.yml → コミット時にGitHub Pagesで動作するようにビルド
- .vscode/settings.json → VSCodeでファイルを保存した時の自動処理など(Cloud Functions向けリソースがプロジェクトルートではなくサブディレクトリのfunctionsにあるためESLintと噛み合わせるには"eslint.workingDirectories": ["functions"]が必須)
- .editorconfig → 上と揃うように
- .gitattributes → Cloud Functionsを使うためESLintとの兼ね合いで改行文字は絶対にLFである必要あり
- .prettierrc → 写経(特に"bracketSpacing": falseが重要)

自動フォーマットとESLintを有効化すべくVSCodeではプロジェクトルートを開くこと

## 基本的な作業コマンド

### Git操作([R]はプロジェクトルートで実行)

- [R]ワーキングツリーの状態確認 → git status
- [R]リモートリポジトリから最新リソースを取得 → git pull
- [R]ブランチ一覧表示 → git branch
- [R]作業ブランチ切り替え → git switch {branchName}
- ローカルでの編集を取り消す → git checkout {fileName}

### Cloud Functions向けリソースのデプロイ(プロジェクトルート/functionsで実行)

firebase deploy --only functions

※不安な場合は事前に以下の2コマンドを叩いてエラーが出なければ問題なし

- npm run build
- npm run lint

### localhostで動作テスト(プロジェクトルートで実行)

- npm run build
- npm run dev

### git clone の直後やpackage-lock.jsonの内容が変わったら実行

npm install

※node_modulesを削除してから再実行しても通らない場合はnpmの古いキャッシュが原因の場合があるため以下を実行

npm cache clean --force

### shared下の既存リソースを修正したり新規リソースを追加したりした場合に実行(プロジェクトルート/functionsで実行)

npm run sync:shared

※functions側から参照できるためには.local-packages\tame5kosengame-shared-0.0.0.tgzが最新のsharedリソースになっている必要あり
