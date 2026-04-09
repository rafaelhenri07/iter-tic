import requests

API = "http://localhost:8000/api/v1"

# Fix: Update existing revision from numero_revisao=1 to 0
r = requests.patch(f"{API}/pdtic/revisoes/1", json={
    "descricao": "Versao Inicial do PDTIC 2024-2027"
})
print("Patch revisao:", r.status_code, r.json())

# We need to update numero_revisao from 1 to 0 directly in DB
# since the PATCH endpoint doesn't expose numero_revisao
print("\nNOTE: Need to update numero_revisao=0 directly in PostgreSQL:")
print("UPDATE pdtic_revisoes SET numero_revisao = 0 WHERE id = 1;")
