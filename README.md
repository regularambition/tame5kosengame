## 開発環境

- Node.js 22.x
- TypeScript 5.x.x
- Vite
- React
- VSCode
- Prettier
- ESLint
- EditorConfig

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
