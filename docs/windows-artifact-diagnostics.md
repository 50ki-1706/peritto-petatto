# Windows配布物の診断

ChromeがブロックしたPR #19の元のArtifact（run `37058099538`、ID `11249516824`）を検査します。再ビルドした別ファイルの検査ではありません。

診断用ワークフローの変更を含むPRで実行できます。mainへ取り込んだ後はActionsの `Windows Artifact Diagnostics` から手動実行もできます。対象Artifactは固定で、期限切れの場合は検査を停止します。

- GitHub管理の一時的なWindowsランナー上で実施します。
- Artifactの実行元・コミット・名前・ZIPダイジェストを確認します。
- インストーラー1ファイルだけであることを確認し、SHA256とAuthenticode署名状態を記録します。
- Defenderが利用可能で定義が更新されている場合にカスタムスキャンします。検査中にインストーラーを実行・インストールしません。
- ファイル取得前に、その一時ランナーだけで自動サンプル送信を `NeverSend` にします。ウイルス対策の停止や除外追加はしません。定義更新やMicrosoftへのメタデータ通信は発生し得ます。
- 検査機能が使えない、検出がある、ファイルが消える、内容が異なるなどの場合は失敗として停止します。
- 診断後に配布物を再アップロードせず、ログとActionsのSummaryで結果を確認します。

検出なしでも安全を保証しません。ChromeのSafe BrowsingとDefenderは別の判定であり、Chromeのブロック解除の根拠にはしません。署名なしという結果だけでも誤検知とは断定できません。

参照：[Microsoft DefenderのCLI仕様](https://learn.microsoft.com/en-us/defender-endpoint/command-line-arguments-microsoft-defender-antivirus)、[自動サンプル送信設定](https://learn.microsoft.com/en-us/powershell/module/defender/set-mppreference)。
