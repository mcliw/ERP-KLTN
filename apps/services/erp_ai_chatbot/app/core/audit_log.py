import json
from datetime import datetime

def audit(event: dict):
    # MVP: print; production: ghi DB/log system
    event["ts"] = datetime.utcnow().isoformat()
    print(json.dumps(event, ensure_ascii=False))
