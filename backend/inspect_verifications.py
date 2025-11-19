import requests
import json

admin_token = 'a95e6ea0162901c57edc940a9a86e22c947b37df'

res = requests.get('http://localhost:8000/api/verifications/', headers={'Authorization': f'Token {admin_token}'})
print('Status:', res.status_code)

if res.ok:
    data = res.json()
    if isinstance(data, dict) and 'results' in data:
        items = data['results']
    elif isinstance(data, list):
        items = data
    else:
        items = data.get('verifications', [])
    print('Total items:', len(items))
    for item in items[:5]:
        print(json.dumps(item, indent=2)[:1000])
        print('-'*60)
else:
    print(res.text)
