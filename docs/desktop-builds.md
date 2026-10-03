# デスクトップ版のビルドと検証

## 今回の範囲

TauriはWindows・macOS・Linux向けに同じフロントエンドを組み込めます。
ただし、WSLでビルドした実行ファイルはLinux版であり、Windows版のexeではありません。
OSごとのインストーラー作成をGitHub Actionsの `Desktop Build` で検証します。

配布版の画面は「デスクトップ版の接続は準備中です」です。
Googleログイン・セッション・付箋保存・端末間同期の接続は、この基盤作成に含めません。
Web版と `tauri dev` は従来の画面を維持します。

## ビルド対象

| 対象              | Rustターゲット           | 生成物                    |
| ----------------- | ------------------------ | ------------------------- |
| Windows x64       | x86_64-pc-windows-msvc   | NSISインストーラー（exe） |
| Mac Apple Silicon | aarch64-apple-darwin     | DMG                       |
| Mac Intel         | x86_64-apple-darwin      | DMG                       |
| Linux x64         | x86_64-unknown-linux-gnu | deb・rpm・AppImage        |

Windows ARM64とLinux ARM64は今回の対象外です。
Mac向けの2種類は別ファイルであり、Universal Binaryではありません。
実際の対応OSバージョン・動作保証は実機検証後に確定します。

## GitHub Actionsでの作成

1. 関連ファイルを変更したPRを更新すると、4種類のビルドが実行されます。
2. リポジトリの「Actions」から「Desktop Build」の実行結果を開きます。
3. 成功した実行の「Artifacts」から、使用するOS・CPUに合うファイルをダウンロードします。
4. ZIPを展開し、対象OSでインストール・起動を確認します。

ワークフローがデフォルトブランチに入った後は「Run workflow」から手動実行もできます。
生成物の保持期間は7日です。正式なGitHub Releaseの作成や公開は行いません。
Rust・pnpmのlockfileを利用し、既存依存関係の更新は行いません。

このワークフローはCloudflareのデプロイやD1マイグレーションを実行しません。
OAuth・Cloudflare・署名用の秘密情報も渡しません。
アップロード対象は指定したインストーラーのみで、`.dev.vars`、Worker出力、作業ツリー全体は対象外です。

## 署名に関する注意

- Windows版には発行元の署名証明書を設定していません。インストール時に警告が出る可能性があります。
- macOS版は `tauri.macos.conf.json` でad-hoc署名を設定します。Apple認証済みの発行元署名や公証ではありません。
- macOSのGatekeeperによる確認・許可が必要になる可能性があります。端末全体の保護機能を無効にする運用はしません。
- 正式配布用の署名・公証・自動更新は後続作業です。

## 実機で確認すること

- インストーラーからインストール・起動できること
- 日本語の準備中画面が表示されること
- ウィンドウの縮小後に再拡大できること
- アプリを閉じて再起動できること
- Web版のログイン画面が維持されていること

ビルド成功だけでは実機検証済みとは扱いません。
これまでWSLのLinux実行ファイルで確認済みですが、Windows・Macの実機確認は未完了です。

## ローカルでの作成

各OSにTauriの前提環境を用意し、リポジトリのルートで実行します。
WindowsではWSLではなく、Windows側のRust・Node・ビルドツールが必要です。
MacはMac上で実行します。

```sh
vp install
vp -C apps/app run tauri build
```

開発時の認証確認には、別途ローカルの `.dev.vars` とローカルD1への既存マイグレーション適用が必要です。
配布版の準備中画面だけの確認に、本番DBへの変更は不要です。

## 参考資料

- [Tauriのビルド前提環境](https://v2.tauri.app/start/prerequisites/)
- [GitHub ActionsによるOS別ビルド](https://v2.tauri.app/distribute/pipelines/github/)
- [macOSの署名とad-hoc署名](https://v2.tauri.app/distribute/sign/macos/)
