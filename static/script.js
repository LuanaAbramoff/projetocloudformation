// Função para lidar com o envio do formulário
document.getElementById("addItemForm").addEventListener("submit", function(event) {
    event.preventDefault(); // Evitar o comportamento padrão do formulário
    addItem(); // Chamar a função para adicionar um novo item
});

// Função para adicionar um novo item
function addItem() {
    var formData = new FormData(document.getElementById("addItemForm")); // Obter os dados do formulário
    fetch('/add_item', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // Exibir mensagem de resposta
        var responseMessage = document.getElementById("responseMessage");
        responseMessage.textContent = data.message;
        responseMessage.style.display = 'block'; // Exibir a mensagem
        // Limpar o formulário após 3 segundos
        setTimeout(function() {
            document.getElementById("addItemForm").reset();
            responseMessage.style.display = 'none'; // Esconder a mensagem após limpar o formulário
        }, 3000);
    })
    .catch(error => {
        console.error('Erro:', error);
        // Exibir mensagem de erro
        var responseMessage = document.getElementById("responseMessage");
        responseMessage.textContent = 'Erro ao adicionar o fato';
        responseMessage.style.display = 'block'; // Exibir a mensagem de erro
    });
}

// Função para lidar com o clique no botão de visualizar fatos
document.getElementById("viewFactsButton").addEventListener("click", function() {
    viewFacts(); // Chamar a função para visualizar os fatos
});

// Função para visualizar fatos existentes
function viewFacts() {
    fetch('/items')
    .then(response => response.json())
    .then(data => {
        // Exibir os fatos na div factsList
        var factsList = document.getElementById("factsList");
        factsList.innerHTML = ''; // Limpar qualquer conteúdo existente
        data.forEach(item => {
            var factItem = document.createElement("div");
            factItem.textContent = `ID: ${item.id}, Nome: ${item.name}, Fato curioso: ${item.fato_curioso}`;
            factsList.appendChild(factItem);
        });
        factsList.style.display = 'block'; // Exibir a lista de fatos
    })
    .catch(error => {
        console.error('Erro:', error);
        // Exibir mensagem de erro
        var factsList = document.getElementById("factsList");
        factsList.textContent = 'Erro ao buscar os fatos';
        factsList.style.display = 'block'; // Exibir a mensagem de erro
    });
}
