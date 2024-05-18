import requests

# Dados do novo item a ser adicionado
new_item = {
    'id': '1',
    'name': 'Novo Item',
    'description': 'Descrição do novo item'
}

# URL da rota de adicionar item
url = 'http://127.0.0.1:5000/add_item'  # Altere para o endereço correto se necessário

# Faça uma solicitação POST para adicionar o novo item
response = requests.post(url, json=new_item)

# Verifique a resposta
if response.status_code == 201:
    print('Item adicionado com sucesso!')
else:
    print('Erro ao adicionar o item:', response.text)
