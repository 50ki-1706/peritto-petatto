# 付箋同期実装の復習ノート

この文書は、ハッカソン後に実装をGit差分から復習するための入口です。

## 全体のデータ経路

```text
Reactの操作
  -> Zustand（画面へ即時反映）
  -> 400msのデバウンス
  -> 保存済みスナップショットとの差分計算
  -> /api/notes
  -> Better Authのセッション検証
  -> D1
```

## 学習価値が高い箇所

### 1. 楽観的更新

`apps/app/src/client/stores/noteStore.ts` の `setNotes` は、APIの完了を待たずにZustandを更新します。操作感を止めず、保存は後から行う設計です。

確認すること:

- API成功を待ってから画面更新する方式との違い
- API失敗時にローカル状態を消さない理由
- 保存状態をUIへ表示する理由

### 2. デバウンスと差分同期

ドラッグ中や文字入力中は短時間に多数の状態変更が発生します。変更ごとにPATCHせず、操作が400ms止まってから同期します。

`savedNotes` と現在の `notes` を比較し、次の操作へ変換しています。

- 保存側に存在せず現在側にある: POST
- 両方にあり内容が違う: PATCH
- 保存側にあり現在側にない: DELETE

### 3. 保存中の再変更

API通信中にも利用者は操作できます。通信開始時の状態を `target` としてコピーし、その保存完了後に現在値と再比較します。差が残っていれば次の同期を予約します。

### 4. 再試行可能なAPI操作

通信が途中まで成功してから失敗すると、再試行時に同じPOSTやDELETEが呼ばれる可能性があります。

- POSTが409なら、同じ内容でPATCHを試す
- DELETEが404なら、目的の「存在しない状態」は達成済みと扱う

このように、同じ操作を再実行しても最終状態を合わせられる性質を冪等性と呼びます。

### 5. userIdを信用しない境界

`apps/app/src/server/notesApi.ts` は、フロントエンドからuserIdを受け取りません。CookieをBetter Authで検証し、セッションから得たuserIdをSQL条件に利用します。

更新・削除は「付箋ID」と「ログインユーザーID」の両方が一致した場合だけ成功します。

### 6. 初回データと空のボードの区別

単に「付箋が0枚なら説明用付箋を追加」すると、利用者が全削除しても次回起動時に復活します。

そこで `user.notesInitialized` を持ち、初回だけ説明用付箋を作ります。初期付箋IDはuserIdからSHA-256で決定的に生成するため、初期化処理を再実行しても同じIDになります。

### 7. PCとスマートフォンの座標変換

APIでは `mobileX` と `mobileY`、フロントエンドでは `mobilePlacement` を使います。`apps/app/src/client/noteApi.ts` が両者の形式を変換します。

## Gitでの復習方法

対象PRがマージされた後、次の順で確認します。

```bash
git show --stat <merge-commit>
git show <merge-commit> -- apps/app/src/client/stores/noteStore.ts
git show <merge-commit> -- apps/app/src/client/noteApi.ts
git show <merge-commit> -- apps/app/src/server/notesApi.ts
git show <merge-commit> -- packages/db/src/schema.ts
```

最初はコードを暗記せず、「どの層が何を担当しているか」を説明できることを目標にします。
