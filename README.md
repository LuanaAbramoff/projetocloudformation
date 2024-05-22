# Relatório - Implementação de Arquitetura Cloud

***Luana Wilner Abramoff***

## 1. Introdução

Este projeto tem o objetivo de implementar uma infraestrutura através de um código de CloudFormation, em que são especificados os recursos que serão usados e configurações desejadas para esses recursos. Quando esse código é posto em produção, é criada uma pilha que provisiona o que foi especificado, sem que o desenvolvedor tenha que se preocupar em como aquilo será criado, e sim no que será criado. Além disso tem a vantagem de que toda a infraestrutura pode ser implementada através de um código, o que reduz tempo e aumenta a facilidade de lidar com possíveis problemas, pois todas as possibilidades de erros estão neste arquivo.

### 1.1 Visão geral da infraestrutura

A infraestrutura criada consta em uma VPC que tem duas *subnets* cada operando em uma zona de disponibilidade diferente. Um Internet Gateway é conectado à VPC, que faz a função de permitir a comunicação contínua entre a Internet pública e a VPC criada. Dentro dessa VPC existem instâncias EC2, que são máquina virtuais escaláveis dentro da nuvem da AWS. São elas que rodam a aplicação implantada. As instâncias são divididas entre as duas subnets, de modo que, sem uma das subnets cair, a aplicação continuará rodando na outra subnet disponível. Para controlar e distribuir  o tráfego de entrada de aplicações nas zonas de disponibilidade especificadas, conta-se com o Application Load Balancer. Associado ao Load Balancer, há também o Auto Scaling Group, que gerencia automaticamente o número de instâncias visando a melhor perfomance da aplicação, podendo trabalhar também em cima de critérios especificados no código, como a carga da CPU, tempo de resposta, entre outros. Por fim a infraestrutura conta com uma tabela DynamoDB para armazenar dados recebidos, todas as instâncias EC2 tem acesso exclusivo à esta tabela, sendo este acesso gerenciado por IAM Role, que concede a permissão de acesso das instâncias ao banco de dados, permitindo a interações de ações API com ele, por exemplo. 

Esta é apenas uma visão geral, que será detalhada ao longo do relatório, mas que pode ser visualmente representada e resumida pelo diagrama a seguir:

![Diagrama da infraestrutura gerado pelo Application Composer da AWS](Relato%CC%81rio%20-%20Implementac%CC%A7a%CC%83o%20de%20Arquitetura%20Cloud%2029be87c84fc145caa915f1baefadd968/9e89ed7c-821b-4f6c-b1f4-fad2bbf1467b.png)

Diagrama da infraestrutura gerado pelo Application Composer da AWS

## 2. Detalhes da infraestrutura

### 2.1 Instâncias EC2

As escolhas tanto das características da instâncias, quanto das regiões que as subredes iriam operar foram feitas, em ordem de prioridade, pelo preço e pelo desempenho necessário para o projeto. 

- **Tipo de instância**: `t2.micro`
    - *Justificativa*: A segunda instância mais barata, com preço On-Demand de 0,0116 dólares por horas, mas com 1 GB de memória e uma 1 vCPU, que é o necessário para rodar a aplicação sem demais problemas.
- **Zonas de disponibilidade**: `us-east-2a, us-east-2b` *(Ohio)*
    - *Justificativa*: A principal razão para esta escolha é que são as regiões mais baratas para operacionalizar.
- **Imagem de máquina:** `al2023-ami-2023.4.20240429.0-kernel-6.1-x86_64`
    - *Justificativa*: Única imagem gratuita em *Amazon Linux*, sistema operacional mais barato para se trabalhar com a instância `t2.micro`.

### 2.2 Application Load Balancer (ALB)

Como dito, o ALB tem como função distribuir o tráfico de entrada da aplicação pelas instâncias EC2. Ele tem três principais componentes: O *Listener*, o *Target Group* e as *Rules*. A ALB desta infraestrutura atua sobre as duas subredes disponívieis. 

- **Listener**: porta *80* e protocolo *HTTP*
    - *Justificativa*:  O Listener, que processa as solicitações de entrada com base na porta 80 e o protocolo HTTP, para processamento de tráfico web.
- **Target Group**
    - *Justificativa*:  O Target Group define agrupamentos de instâncias para o controle do tráfego. Ele também conta com verificações de integridade, para que apenas instâncias saudáveis recebam tráfego. No caso desta infraestrutura, é testada a aplicação com a rota base ‘/’ e são feitos testes de 30 em 30 segundos, e são dados 10 segundos e 3 testes para que considerar a instância saudável ou não, em casa de falha e sucesso respectivamente.
- **Security Group:** `ALBSecurityGroup`
    - *Justificativa*: São as regras de seguranças que envolvem o Target Group, nesse caso o tráfego recebido será apenas conduzido dentro da VPC estabelecido, e o ingresso será apenas com o protocolo *tpc* da porta 80 para a porta 80, aceitando todos os IP’s dentro da VPC.

### 2.3 Auto Scaling Group (ASG)

O ASG é um recurso da AWS que gerencia automaticamente o número de instâncias EC2 em um grupo para assegurar a perfomance ideal da aplicação. Os componentes do *Auto Scaling* são: *Launch Configuration, Auto Scaling Group, Scaling Policies* e *Health Checks.*

- **Launch Configuration:** *Especificado anteriormente*
    - *Justificativa*: Define a configuração das instâncias, que foram detalhadas na seção 2.1, o script de inicialização e o grupo de segurança associado ao *Auto Scaling*, que nesse caso é o *ALBSecurityGroup.* O script de inicialização, clona o repositório em que a aplicação está presente e cria pastas para aloca-lá localmente. Depois disso, a aplicação é roda pelo terminal.
- **Auto Scaling Group**
    - *Justificativa*: Associa as instâncias como um grupo lógico para fins de dimensionamento e gerenciamento de capacidade. Além disso, há uma garantia que as instâncias gerenciadas sejam associadas ao *Load Balancer.* Define-se também o numéro mínimo de instâncias no grupo, 2 no caso, o número máximo de instâncias no grupo, 7 no caso, e o número desejado de instâncias em execução, 2 no caso. O *Health Check* é feito pelo *Load Balancer* após 300 segundos depois da criação das instâncias*.*
- **Scaling Policies**
    - *Justificativa*: Determina quando e como o ASG deve ajustar a capacidade baseado em métricas. No caso dessa infraestrutura, é determinado que deve haver ajuste de capacidade quando a média de utilização da CPU é 70%. Um *CloudWatch Alarm* monitora a utilização da CPU, ela calcula a média de utilização da CPU de 1 em 1 minuto, em 5 períodos consecutivos, e a ação definida desse alarme é justamente a Scaling Policie.

### 2.4 Banco de Dados DynamoDB

Existem duas principais partes que envolvem o Banco de Dados DynamoDB dentro do código CloudFormation descrito neste relatório. A primeira é a criação da tabela onde ficarão os dados, é a definição das permissões e da interlocução entre as instâncias EC2 e a tabela criada. 

- **DynamoDB Table**
    - *Justificativa*: Aqui é estabelecida como será a estrutura da tabela, as únicas definições feitas são que a chave primária será o `id` . Além disso há definição de qual será a quantidade de leitura e escrita suportada por segundo. Uma capacidade de leitura/escrita equivale à 4KB de dado por segundo, neste caso têm-se 5 capacidades de leitura e 5 capacidades de escrita.
- **IAM Role**
    - *Justificativa*: Um conjunto de permissões que podem ser assumidas pelas instâncias EC2. As políticas permitidas são as as ações de *GET*, *PUT*, *DELETE*, *UPDATE* e *SCAN* da tabela DynamoDB pelas instâncias EC2.
- **Instance Profile**
    - *Justificativa*: Anexa o IAM Role à instâncias EC2, permitindo que elas assumam esse papel com as permissões especificadas.
- **VPC EndPoint**
    - *Justificativa*: Permite a conexão da VPC estabelecida ao serviço da AWS do DynamoDB. É feita também uma tabela de rotas públicas, para direcionar o tráfego destinado ao DynamoDB para o endpoint VPC. Também é criada uma rota pública que direciona o tráfego de qualquer endereço IP para o Internet Gateway.

## 3. Execução dos scripts

1. Primeiramente tem que se identificar o perfil usado, nesse caso com o usuário `luanawa` . Isso é feito com os dois comandos a seguir:
    
    ```bash
    aws sts get-caller-identity
    ```
    
    ```bash
    aws configure
    ```
    

1. Depois deve-se clonar o repositório que tem o arquivo YAML responsável pela infraestrutura:
    
    ```bash
    git clone https://github.com/LuanaAbramoff/projetocloudformation.git
    ```
    

1. Por fim deve-se criar a pilha, que deverá aparecer na dashboard da AWS CloudFormation, com o seguinte comando, sendo executado dentro da pasta clonada. Por conta da criação do IAM Role para acesso do banco de dados, deve-se usar a flag  `—capabilities` :
    
    ```bash
     aws cloudformation create-stack --stack-name minha-pilha --template-body file://teste_projeto.yaml --capabilities CAPABILITY_IAM
    ```
    
2. A pilha é configurada para gerar como saída o DNS público do ALB, em que é possível ter acesso à aplicação depois que a pilha é criada. Pode-se ter acesso à esta saída tanto pelo dashboard da AWS CloudFormation, quanto pelo comando `aws cloudformation describe-stacks —stack-name minha-pilha` . E indo até o output, aqui será demonstrado a forma pelo dashboard:
    
    ![Dashboard AWS CloudFormation, detalhes da pilha, aba Saídas, DNS público do ALB](Relato%CC%81rio%20-%20Implementac%CC%A7a%CC%83o%20de%20Arquitetura%20Cloud%2029be87c84fc145caa915f1baefadd968/demonstracaosaida.png)
    
    Dashboard AWS CloudFormation, detalhes da pilha, aba Saídas, DNS público do ALB
    
3. A visualização esperada da aplicação é a seguinte:
    
    ![Aplicação rodando](Relato%CC%81rio%20-%20Implementac%CC%A7a%CC%83o%20de%20Arquitetura%20Cloud%2029be87c84fc145caa915f1baefadd968/aplicacao.png)
    
    Aplicação rodando
    

## 4. Análise de Custos

Aqui estão apresentados os gráficos e tabelas dos custos, totais do usuário, por serviço e a tabela especificada. É possível ver que o maior custo de fato é decorrente de impostos e taxas, depois o custo das instâncias EC2 e depois o CloudWatch. Para a diminuição de custos seria possível ajustar por exemplo, o tipo de instância para uma que possuísse menos memória, ou menos vCPU, por exemplo.

![Análise de Custos da Conta - Meses Abril e Maio](Relato%CC%81rio%20-%20Implementac%CC%A7a%CC%83o%20de%20Arquitetura%20Cloud%2029be87c84fc145caa915f1baefadd968/analise_custos_conta.png)

Análise de Custos da Conta - Meses Abril e Maio

![Análises de Custo por tipo de serviço - Meses Abril e Maio](Relato%CC%81rio%20-%20Implementac%CC%A7a%CC%83o%20de%20Arquitetura%20Cloud%2029be87c84fc145caa915f1baefadd968/analise_custo_servico.png)

Análises de Custo por tipo de serviço - Meses Abril e Maio

![Tabela de Custos por serviço e mês](Relato%CC%81rio%20-%20Implementac%CC%A7a%CC%83o%20de%20Arquitetura%20Cloud%2029be87c84fc145caa915f1baefadd968/analise_custo_tabela.png)

Tabela de Custos por serviço e mês

<aside>
🔗 **LINK PARA O REPOSITÓRIO:** https://github.com/LuanaAbramoff/projetocloudformation

</aside>