from flask import Flask, render_template, jsonify, request
import boto3

app = Flask(__name__)

# Configurações do AWS SDK
dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
table = dynamodb.Table('LuanaDynamoDBTable')

# Rota raiz que renderiza o arquivo index.html
@app.route('/')
def index():
    return render_template('index.html')

# Rota para buscar todos os itens na tabela
@app.route('/items', methods=['GET'])
def get_items():
    try:
        response = table.scan()
        return jsonify(response['Items'])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Rota para adicionar um novo item à tabela
@app.route('/add_item', methods=['POST'])
def add_item():
    try:
        # Obter dados do formulário
        id = request.form['id']
        name = request.form['name']
        description = request.form['description']
        
        # Adicionar item à tabela
        table.put_item(Item={'id': id, 'name': name, 'description': description})
        
        return jsonify({'message': 'Item adicionado com sucesso'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=True)
