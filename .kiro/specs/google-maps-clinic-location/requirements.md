# Documento de Requisitos

## Introdução

Esta feature adiciona a funcionalidade de localização do consultório médico ao sistema de agendamento de consultas. Médicos poderão cadastrar o endereço do consultório com coordenadas geográficas (latitude/longitude), e pacientes poderão visualizar a localização no mapa interativo do Google Maps ao agendar uma consulta. A integração utiliza a API do Google Maps para exibição do mapa no frontend.

## Glossário

- **Sistema**: O sistema de agendamento de consultas médicas (appointment-scheduling)
- **API_Localizacao**: O endpoint REST responsável por salvar e recuperar dados de localização do consultório
- **Mapa_Frontend**: O componente de mapa interativo do Google Maps exibido na interface do usuário (SPA)
- **Geocodificacao**: O processo de converter um endereço textual em coordenadas geográficas (latitude e longitude)
- **Localizacao_Consultorio**: O conjunto de dados que representa a localização do consultório (endereço, latitude, longitude)
- **Google_Maps_API**: A API JavaScript do Google Maps utilizada para renderizar mapas interativos

## Requisitos

### Requisito 1: Armazenamento da Localização do Consultório

**User Story:** Como administrador do sistema, eu quero cadastrar o endereço e coordenadas geográficas do consultório de um médico, para que pacientes possam visualizar a localização.

#### Critérios de Aceitação

1. THE Sistema SHALL armazenar os campos endereço (texto), latitude (número decimal) e longitude (número decimal) associados a cada médico na tabela de médicos do banco de dados
2. WHEN um médico é criado sem informações de localização, THE Sistema SHALL permitir a criação com os campos de localização nulos
3. THE Sistema SHALL aceitar valores de latitude entre -90 e 90 graus
4. THE Sistema SHALL aceitar valores de longitude entre -180 e 180 graus
5. IF um valor de latitude fora do intervalo -90 a 90 é fornecido, THEN THE Sistema SHALL retornar um erro de validação com código INVALID_COORDINATES
6. IF um valor de longitude fora do intervalo -180 a 180 é fornecido, THEN THE Sistema SHALL retornar um erro de validação com código INVALID_COORDINATES

### Requisito 2: Endpoint para Salvar Localização do Consultório

**User Story:** Como administrador do sistema, eu quero um endpoint de API para salvar a localização do consultório de um médico, para que as informações possam ser atualizadas pela interface.

#### Critérios de Aceitação

1. WHEN uma requisição PUT é enviada para /api/doctors/:doctorId/location com endereço, latitude e longitude válidos, THE API_Localizacao SHALL salvar os dados e retornar status 200 com os dados atualizados
2. WHEN uma requisição PUT é enviada para /api/doctors/:doctorId/location sem o campo endereço, THE API_Localizacao SHALL retornar status 400 com código de erro VALIDATION_ERROR
3. WHEN uma requisição PUT é enviada para /api/doctors/:doctorId/location sem latitude ou longitude, THE API_Localizacao SHALL retornar status 400 com código de erro VALIDATION_ERROR
4. IF o doctorId fornecido não corresponde a nenhum médico cadastrado, THEN THE API_Localizacao SHALL retornar status 404 com código de erro DOCTOR_NOT_FOUND
5. WHEN os dados de localização são salvos com sucesso, THE API_Localizacao SHALL atualizar o campo updated_at do médico com o timestamp atual

### Requisito 3: Endpoint para Recuperar Localização do Consultório

**User Story:** Como paciente, eu quero consultar a localização do consultório de um médico via API, para que a interface possa exibir o mapa.

#### Critérios de Aceitação

1. WHEN uma requisição GET é enviada para /api/doctors/:doctorId/location, THE API_Localizacao SHALL retornar status 200 com endereço, latitude e longitude do médico
2. IF o doctorId fornecido não corresponde a nenhum médico cadastrado, THEN THE API_Localizacao SHALL retornar status 404 com código de erro DOCTOR_NOT_FOUND
3. WHEN um médico não possui localização cadastrada, THE API_Localizacao SHALL retornar status 200 com os campos de localização como null

### Requisito 4: Exibição do Mapa na Interface do Paciente

**User Story:** Como paciente, eu quero visualizar a localização do consultório do médico em um mapa interativo, para que eu saiba onde será a consulta antes de agendar.

#### Critérios de Aceitação

1. WHEN o paciente seleciona um médico na aba de Agendamento, THE Mapa_Frontend SHALL exibir um mapa interativo do Google Maps com um marcador na localização do consultório
2. WHILE o mapa está sendo carregado, THE Mapa_Frontend SHALL exibir um indicador de carregamento no espaço reservado para o mapa
3. WHEN o médico selecionado não possui localização cadastrada, THE Mapa_Frontend SHALL exibir uma mensagem informando que a localização do consultório não está disponível
4. THE Mapa_Frontend SHALL exibir o endereço textual do consultório acima do mapa
5. WHEN o marcador no mapa é clicado, THE Mapa_Frontend SHALL exibir uma janela de informação com o nome do médico e o endereço do consultório

### Requisito 5: Configuração da API Key do Google Maps

**User Story:** Como administrador do sistema, eu quero configurar a chave de API do Google Maps de forma segura, para que o mapa funcione sem expor credenciais no código-fonte.

#### Critérios de Aceitação

1. THE Sistema SHALL carregar a chave da API do Google Maps a partir da variável de ambiente GOOGLE_MAPS_API_KEY
2. IF a variável de ambiente GOOGLE_MAPS_API_KEY não está definida, THEN THE Mapa_Frontend SHALL exibir uma mensagem de erro indicando que o mapa não está configurado
3. WHEN o frontend solicita a chave para carregar o mapa, THE Sistema SHALL fornecer a chave por meio de um endpoint dedicado ou embutida na página HTML servida pelo backend

### Requisito 6: Migração do Banco de Dados

**User Story:** Como desenvolvedor, eu quero uma migração SQL que adicione os campos de localização à tabela de médicos, para que o banco de dados suporte a nova funcionalidade.

#### Critérios de Aceitação

1. THE Sistema SHALL incluir uma migração SQL que adicione as colunas clinic_address (VARCHAR(500), nullable), latitude (DECIMAL(10,7), nullable) e longitude (DECIMAL(10,7), nullable) à tabela doctors
2. WHEN a migração é executada em um banco que já possui médicos cadastrados, THE Sistema SHALL preservar todos os registros existentes sem alteração
3. THE Sistema SHALL permitir que a migração seja executada de forma idempotente sem causar erros em execuções subsequentes
