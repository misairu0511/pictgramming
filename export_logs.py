import csv
import json
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from datetime import datetime

# ==========================================
# 準備:
# 1. pip install firebase-admin を実行してください
# 2. Firebaseコンソールから「プロジェクトの設定」>「サービスアカウント」>「新しい秘密鍵の生成」をクリックし、
#    ダウンロードしたJSONファイルをこのスクリプトと同じフォルダに置き、ファイル名を変更するか以下のパスを修正してください。
SERVICE_ACCOUNT_KEY_PATH = 'serviceAccountKey.json'
# ==========================================

def export_firestore_to_csv():
    print("Initializing Firebase...")
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        print(f"Make sure you have downloaded the service account key and placed it at '{SERVICE_ACCOUNT_KEY_PATH}'.")
        return

    db = firestore.client()
    print("Fetching logs from Firestore...")
    
    # 'logs' コレクションから全てのドキュメントを取得
    logs_ref = db.collection('logs')
    docs = logs_ref.stream()

    all_logs = []
    all_keys = set()

    for doc in docs:
        data = doc.to_dict()
        data['doc_id'] = doc.id  # FirestoreのドキュメントIDも保存
        
        # 配列データや辞書データ（events, finalStateなど）はJSON文字列に変換
        for key, value in data.items():
            if isinstance(value, (list, dict)):
                data[key] = json.dumps(value, ensure_ascii=False)
                
        all_logs.append(data)
        all_keys.update(data.keys())

    if not all_logs:
        print("No logs found in the collection.")
        return

    # CSVの列順を整える（重要なものを左に）
    priority_keys = ['doc_id', 'timestamp', 'userId', 'stageId', 'eventType', 'hintActionType', 'goalResult', 'sourceCode', 'targetHintLogId', 'runsSinceHint', 'distanceToTargetHint']
    sorted_keys = priority_keys + [k for k in all_keys if k not in priority_keys]

    # 現在の時刻をファイル名にする
    filename = f"pictgramming_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    print(f"Writing {len(all_logs)} logs to {filename}...")
    with open(filename, mode='w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=sorted_keys)
        writer.writeheader()
        for log in all_logs:
            writer.writerow(log)

    print("Export complete!")

if __name__ == '__main__':
    export_firestore_to_csv()
