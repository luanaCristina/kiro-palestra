# Requirements Document

## Introduction

Suite abrangente de automação de testes para o Sistema de Agendamento de Consultas Médicas. Cobre testes de integração de API (backend), testes unitários de módulos de lógica de negócio, testes baseados em propriedades (property-based tests) usando fast-check, e testes E2E de frontend. O objetivo é garantir a corretude, robustez e confiabilidade de todos os módulos e endpoints do sistema.

## Glossary

- **Suite_de_Testes**: Conjunto organizado de testes automatizados que validam o comportamento do sistema
- **API_Backend**: Endpoints REST Express que expõem as funcionalidades do sistema em /api/*
- **Módulo_Slot_Calculator**: Módulo responsável por calcular horários disponíveis com base na agenda do médico e consultas existentes
- **Módulo_Overlap_Detector**: Módulo responsável por detectar sobreposição de intervalos de tempo entre consultas
- **Módulo_Cancellation_Policy**: Módulo que aplica regras de cancelamento (janela mínima de 24 horas)
- **Módulo_Holidays**: Módulo que gerencia feriados nacionais e estaduais brasileiros
- **Frontend_SPA**: Aplicação de página única (HTML + JavaScript vanilla) que consome a API
- **Fast_Check**: Biblioteca de testes baseados em propriedades que gera entradas aleatórias para validar invariantes
- **Supertest**: Biblioteca para testes de integração HTTP sem necessidade de servidor rodando
- **Jest**: Framework de testes utilizado no projeto
- **Zod_Schema**: Esquema de validação de dados de entrada definido com a biblioteca Zod
- **Slot**: Intervalo de tempo disponível para agendamento (30min para FOLLOW_UP, 60min para FIRST_VISIT)
- **Availability_Range**: Intervalo de disponibilidade configurado pelo médico em formato HH:mm para um dia da semana
- **Intervalo_Half_Open**: Intervalo de tempo [início, fim) onde início é inclusivo e fim é exclusivo

## Requirements

### Requisito 1: Testes de Integração da API de Médicos

**User Story:** Como desenvolvedor QA, eu quero testes automatizados para os endpoints de médicos, para que eu possa garantir que o CRUD e a busca por especialidade funcionam corretamente.

#### Critérios de Aceitação

1. WHEN uma requisição POST /api/doctors com name (string não vazia, máximo 255 caracteres) e specialty válida (uma entre: cardiology, dermatology, neurology, orthopedics, pediatrics, psychiatry, general_practice) é enviada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 201 e o objeto do médico criado com id, name, specialty e created_at
2. WHEN uma requisição POST /api/doctors sem name ou sem specialty é enviada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 400 com código VALIDATION_ERROR
3. WHEN uma requisição GET /api/doctors/all é enviada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 200 com uma lista de objetos contendo id, name, specialty e created_at, ordenada alfabeticamente por name
4. WHEN uma requisição GET /api/doctors?specialty=cardiology&date=YYYY-MM-DD é enviada com specialty válida e date no formato ISO 8601 (não no passado e no máximo 90 dias no futuro), THE Suite_de_Testes SHALL verificar que o sistema retorna status 200 com médicos da especialidade que possuem slots disponíveis, cada um incluindo um array de availableSlots com startTime e endTime
5. WHEN uma requisição GET /api/doctors com specialty que não pertence à lista de especialidades aceitas é enviada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 400 com código INVALID_SPECIALTY
6. WHEN uma requisição GET /api/doctors com date no passado ou com mais de 90 dias no futuro é enviada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 400 com código INVALID_DATE_RANGE
7. WHEN uma requisição PUT /api/doctors/:doctorId/availability com schedule contendo ranges válidos (dayOfWeek entre 0 e 6, startTime e endTime no formato HH:mm em incrementos de 15 minutos, máximo 5 ranges por dia, sem sobreposições, endTime posterior ao startTime) é enviada para um doctorId existente, THE Suite_de_Testes SHALL verificar que o sistema retorna status 200 com o objeto schedule atualizado contendo doctorId e ranges
8. WHEN uma requisição PUT /api/doctors/:doctorId/availability com mais de 5 ranges para o mesmo dia é enviada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 400 com código TOO_MANY_RANGES
9. WHEN uma requisição PUT /api/doctors/:doctorId/availability com ranges cujos horários se sobrepõem no mesmo dia é enviada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 400 com código OVERLAPPING_RANGES
10. WHEN uma requisição PUT /api/doctors/:doctorId/availability com endTime anterior ou igual ao startTime é enviada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 400 com código INVALID_TIME_RANGE
11. WHEN uma requisição PUT /api/doctors/:doctorId/availability é enviada com um doctorId que não existe no sistema, THE Suite_de_Testes SHALL verificar que o sistema retorna status 404 com código DOCTOR_NOT_FOUND

### Requisito 2: Testes de Integração da API de Pacientes

**User Story:** Como desenvolvedor QA, eu quero testes automatizados para os endpoints de pacientes, para que eu possa garantir que o cadastro e listagem funcionam corretamente.

#### Critérios de Aceitação

1. WHEN uma requisição POST /api/patients com name (string não vazia) e email (string não vazia em formato válido) é enviada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 201 e o objeto do paciente com id, name, email e created_at
2. WHEN uma requisição POST /api/patients sem name ou sem email é enviada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 400 com código VALIDATION_ERROR e mensagem "name and email are required"
3. WHEN uma requisição GET /api/patients é enviada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 200 com um objeto contendo campo "patients" como array de objetos com id, name, email e created_at, ordenados alfabeticamente por name

### Requisito 3: Testes de Integração da API de Agendamento

**User Story:** Como desenvolvedor QA, eu quero testes automatizados para os endpoints de agendamento, para que eu possa garantir que booking, listagem e cancelamento funcionam com todas as regras de negócio.

#### Critérios de Aceitação

1. WHEN uma requisição POST /api/appointments com patientId (UUID válido), doctorId (UUID válido), startTime (datetime ISO 8601 válido) e appointmentType ("FIRST_VISIT" ou "FOLLOW_UP") é enviada para um horário disponível do médico, THE Suite_de_Testes SHALL verificar que o sistema retorna status 201 com corpo JSON contendo campo "confirmation" com as propriedades: appointmentId (UUID), patientName (string), doctorName (string), specialty (string), date (formato YYYY-MM-DD), startTime (ISO 8601), endTime (ISO 8601) e appointmentType ("FIRST_VISIT" ou "FOLLOW_UP")
2. WHEN uma requisição POST /api/appointments com patientId em formato não-UUID é enviada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 400 com corpo JSON contendo campo "error" com propriedade "code" indicando falha de validação
3. WHEN uma requisição POST /api/appointments com appointmentType diferente de "FIRST_VISIT" ou "FOLLOW_UP" é enviada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 400 com corpo JSON contendo campo "error" com propriedade "code" indicando falha de validação
4. WHEN uma requisição POST /api/appointments é enviada para um horário já ocupado pelo mesmo médico, THE Suite_de_Testes SHALL verificar que o sistema retorna status 409 com corpo JSON contendo error.code igual a "SLOT_UNAVAILABLE"
5. WHEN uma requisição POST /api/appointments é enviada para um horário fora da disponibilidade configurada do médico, THE Suite_de_Testes SHALL verificar que o sistema retorna status 409 com corpo JSON contendo error.code igual a "OUTSIDE_AVAILABILITY"; e WHEN enviada para um dia sem disponibilidade configurada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 409 com error.code igual a "NO_AVAILABILITY"
6. WHEN uma requisição GET /api/appointments é enviada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 200 com corpo JSON contendo campo "appointments" como array onde cada item possui as propriedades: id, start_time, end_time, duration_minutes, appointment_type, status, doctor_name, specialty e patient_name, ordenados por start_time decrescente
7. WHEN uma requisição POST /api/appointments/:id/cancel com patientId (UUID válido) é enviada para uma consulta confirmada com mais de 24 horas de antecedência (desigualdade estrita: diferença > 24h), THE Suite_de_Testes SHALL verificar que o sistema retorna status 200 com corpo JSON contendo "message" e "appointmentId"
8. WHEN uma requisição POST /api/appointments/:id/cancel é enviada para uma consulta confirmada com 24 horas ou menos de antecedência (diferença ≤ 24h), THE Suite_de_Testes SHALL verificar que o sistema retorna status 409 com corpo JSON contendo error.code igual a "CANCELLATION_POLICY"
9. WHEN uma requisição POST /api/appointments/:id/cancel é enviada para uma consulta com status "cancelled", THE Suite_de_Testes SHALL verificar que o sistema retorna status 400 com corpo JSON contendo error.code igual a "ALREADY_CANCELLED"
10. WHEN uma requisição POST /api/appointments/:id/cancel é enviada com patientId que não corresponde ao patient_id da consulta, THE Suite_de_Testes SHALL verificar que o sistema retorna status 403 com corpo JSON contendo error.code igual a "UNAUTHORIZED_CANCEL"
11. WHEN uma requisição POST /api/appointments é enviada com doctorId que não existe no sistema, THE Suite_de_Testes SHALL verificar que o sistema retorna status 404 com corpo JSON contendo error.code igual a "DOCTOR_NOT_FOUND"

### Requisito 4: Testes de Integração da API de Disponibilidade

**User Story:** Como desenvolvedor QA, eu quero testes automatizados para os endpoints de disponibilidade, para que eu possa garantir que consulta, atualização e exclusão de ranges funcionam corretamente.

#### Critérios de Aceitação

1. WHEN uma requisição GET /api/availability/:doctorId é enviada com um doctorId de um médico previamente cadastrado que possui ranges de disponibilidade, THE Suite_de_Testes SHALL verificar que o sistema retorna status 200 com um objeto contendo doctorId e um array ranges onde cada elemento possui id, day_of_week (inteiro de 0 a 6), start_time e end_time, ordenados por day_of_week e start_time de forma ascendente
2. WHEN uma requisição DELETE /api/availability/:rangeId é enviada com um rangeId de um range previamente cadastrado, THE Suite_de_Testes SHALL verificar que o sistema retorna status 200 com um objeto contendo message e id do range removido, e que uma requisição GET subsequente não retorna mais esse range
3. WHEN uma requisição DELETE /api/availability/:rangeId é enviada com um rangeId inexistente (UUID válido que não corresponde a nenhum registro), THE Suite_de_Testes SHALL verificar que o sistema retorna status 404 com objeto error contendo code igual a NOT_FOUND
4. WHEN uma requisição PUT /api/availability/:rangeId é enviada com um rangeId existente e body contendo dayOfWeek (inteiro de 0 a 6), startTime (formato HH:mm) e endTime (formato HH:mm, posterior a startTime), THE Suite_de_Testes SHALL verificar que o sistema retorna status 200 com um objeto range contendo id, day_of_week, start_time e end_time refletindo os valores atualizados
5. WHEN uma requisição PUT /api/availability/:rangeId é enviada com um rangeId inexistente (UUID válido que não corresponde a nenhum registro), THE Suite_de_Testes SHALL verificar que o sistema retorna status 404 com objeto error contendo code igual a NOT_FOUND
6. WHEN uma requisição GET /api/availability/:doctorId é enviada com um doctorId que não possui ranges cadastrados, THE Suite_de_Testes SHALL verificar que o sistema retorna status 200 com doctorId e um array ranges vazio

### Requisito 5: Testes de Integração da API de Feriados

**User Story:** Como desenvolvedor QA, eu quero testes automatizados para os endpoints de feriados, para que eu possa garantir que a consulta de feriados nacionais e estaduais funciona corretamente.

#### Critérios de Aceitação

1. WHEN uma requisição GET /api/holidays?state=PE é enviada sem parâmetro date, THE Suite_de_Testes SHALL verificar que o sistema retorna status 200 com um objeto contendo state e um array holidays onde cada elemento possui date (formato MM-DD), name e type (national ou state), incluindo feriados nacionais e estaduais de Pernambuco
2. WHEN uma requisição GET /api/holidays?state=SP&date=2026-01-25 é enviada para uma data que é feriado estadual de São Paulo, THE Suite_de_Testes SHALL verificar que o sistema retorna status 200 com isHoliday igual a true e um objeto holiday contendo date, name e type do feriado correspondente
3. WHEN uma requisição GET /api/holidays?state=SP&date=2026-03-10 é enviada para uma data que não é feriado, THE Suite_de_Testes SHALL verificar que o sistema retorna status 200 com isHoliday igual a false e sem objeto holiday na resposta
4. WHEN uma requisição GET /api/holidays sem o parâmetro state é enviada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 400 com objeto error contendo code igual a VALIDATION_ERROR
5. WHEN uma requisição GET /api/states é enviada, THE Suite_de_Testes SHALL verificar que o sistema retorna status 200 com um array states contendo exatamente 27 elementos, cada um com propriedades code (sigla de 2 letras) e name (nome do estado), ordenados alfabeticamente por code

### Requisito 6: Testes Unitários do Módulo Slot Calculator

**User Story:** Como desenvolvedor QA, eu quero testes unitários para o calculador de slots, para que eu possa garantir que o algoritmo de cálculo de horários disponíveis produz resultados corretos.

#### Critérios de Aceitação

1. WHEN calculateAvailableSlots recebe ranges de disponibilidade com lista vazia de existingAppointments, THE Suite_de_Testes SHALL verificar que o módulo retorna todos os slots possíveis em incrementos de 15 minutos dentro dos ranges, onde cada slot possui startTime e endTime com duração igual ao parâmetro duration
2. WHEN calculateAvailableSlots recebe ranges de disponibilidade com consultas existentes com status "confirmed", THE Suite_de_Testes SHALL verificar que o módulo exclui os intervalos ocupados pelas consultas e retorna apenas slots cujo intervalo [startTime, endTime) não sobrepõe nenhuma consulta ativa
3. WHEN calculateAvailableSlots recebe duration de 60 minutos (FIRST_VISIT), THE Suite_de_Testes SHALL verificar que cada slot retornado possui diferença entre endTime e startTime de exatamente 3.600.000 milissegundos
4. WHEN calculateAvailableSlots recebe duration de 30 minutos (FOLLOW_UP), THE Suite_de_Testes SHALL verificar que cada slot retornado possui diferença entre endTime e startTime de exatamente 1.800.000 milissegundos
5. WHEN calculateAvailableSlots recebe uma data cujo dia da semana (getDay()) não corresponde ao dayOfWeek de nenhum availability range, THE Suite_de_Testes SHALL verificar que o módulo retorna array vazio
6. WHEN calculateAvailableSlots recebe consultas com status "cancelled" na lista de existingAppointments, THE Suite_de_Testes SHALL verificar que o módulo ignora essas consultas e disponibiliza o horário correspondente
7. WHEN calculateAvailableSlots calcula slots, THE Suite_de_Testes SHALL verificar que para cada slot retornado, endTime.getTime() é menor ou igual ao endTime do availability range correspondente convertido para Date

### Requisito 7: Testes Unitários do Módulo Overlap Detector

**User Story:** Como desenvolvedor QA, eu quero testes unitários para o detector de sobreposição, para que eu possa garantir que a detecção de conflitos de horário funciona corretamente com intervalos half-open.

#### Critérios de Aceitação

1. WHEN dois intervalos se sobrepõem parcialmente (ex: [09:00-10:00) e [09:30-10:30) onde startA < endB AND startB < endA), THE Suite_de_Testes SHALL verificar que intervalsOverlap retorna true
2. WHEN dois intervalos são idênticos (startA === startB e endA === endB), THE Suite_de_Testes SHALL verificar que intervalsOverlap retorna true
3. WHEN dois intervalos são adjacentes (ex: [09:00-10:00) e [10:00-11:00) onde endA.getTime() === startB.getTime()), THE Suite_de_Testes SHALL verificar que intervalsOverlap retorna false
4. WHEN dois intervalos são completamente disjuntos (endA < startB ou endB < startA), THE Suite_de_Testes SHALL verificar que intervalsOverlap retorna false
5. WHEN um intervalo está completamente contido em outro ([09:00-11:00) contém [09:30-10:30)), THE Suite_de_Testes SHALL verificar que intervalsOverlap retorna true
6. WHEN detectOverlap encontra conflito com uma consulta existente, THE Suite_de_Testes SHALL verificar que o resultado contém hasOverlap: true, conflictingAppointment referenciando a consulta conflitante, e overlappingRange com start igual a max(startA, startB) e end igual a min(endA, endB)
7. WHEN detectOverlap recebe lista vazia de appointments ou nenhuma consulta conflitante, THE Suite_de_Testes SHALL verificar que o resultado contém hasOverlap: false

### Requisito 8: Testes Unitários do Módulo Cancellation Policy

**User Story:** Como desenvolvedor QA, eu quero testes unitários para a política de cancelamento, para que eu possa garantir que as regras de janela de 24 horas são aplicadas corretamente.

#### Critérios de Aceitação

1. WHEN canCancel recebe uma consulta com status "cancelled", THE Suite_de_Testes SHALL verificar que retorna { allowed: false, reason: "Appointment has already been cancelled" }
2. WHEN canCancel recebe uma consulta cujo startTime.getTime() é menor ou igual a currentTime.getTime() (consulta passada ou no exato momento), THE Suite_de_Testes SHALL verificar que retorna { allowed: false, reason: "Past appointments cannot be cancelled" }
3. WHEN canCancel recebe uma consulta com status "confirmed" e diferença entre startTime.getTime() e currentTime.getTime() igual a exatamente 86.400.000ms (24 horas), THE Suite_de_Testes SHALL verificar que retorna allowed: false (igualdade estrita — exatamente 24h não é suficiente)
4. WHEN canCancel recebe uma consulta com status "confirmed" e diferença entre startTime.getTime() e currentTime.getTime() menor que 86.400.000ms, THE Suite_de_Testes SHALL verificar que retorna { allowed: false, reason: "Cancellation must be made more than 24 hours before the appointment" }
5. WHEN canCancel recebe uma consulta com status "confirmed" e diferença entre startTime.getTime() e currentTime.getTime() estritamente maior que 86.400.000ms, THE Suite_de_Testes SHALL verificar que retorna { allowed: true } sem propriedade reason

### Requisito 9: Testes Unitários do Módulo Holidays

**User Story:** Como desenvolvedor QA, eu quero testes unitários para o módulo de feriados, para que eu possa garantir que feriados nacionais e estaduais são identificados corretamente.

#### Critérios de Aceitação

1. WHEN getHolidaysForState é chamado com um código de estado válido (ex: "PE"), THE Suite_de_Testes SHALL verificar que o retorno inclui todos os 12 feriados nacionais e os feriados específicos do estado de Pernambuco (03-06 e 06-24)
2. WHEN isHoliday é chamado com data "2026-01-01" e qualquer estado, THE Suite_de_Testes SHALL verificar que retorna o objeto Holiday com name "Confraternização Universal" e type "national"
3. WHEN isHoliday é chamado com data "2026-01-25" e estado "SP", THE Suite_de_Testes SHALL verificar que retorna o objeto Holiday com name "Aniversário de São Paulo" e type "state"
4. WHEN isHoliday é chamado com data "2026-01-25" e estado "RJ" (estado diferente de SP), THE Suite_de_Testes SHALL verificar que retorna null pois o feriado é específico de SP
5. WHEN isHoliday é chamado com data "2026-03-10" e qualquer estado, THE Suite_de_Testes SHALL verificar que retorna null pois não é feriado em nenhuma categoria
6. WHEN getHolidaysForMonth é chamado com ano 2026, mês 1 e estado "SP", THE Suite_de_Testes SHALL verificar que retorna array contendo feriados de janeiro incluindo Confraternização Universal (01-01) e Aniversário de São Paulo (01-25)

### Requisito 10: Testes Baseados em Propriedades - Slot Calculator

**User Story:** Como desenvolvedor QA, eu quero testes baseados em propriedades para o calculador de slots, para que eu possa validar invariantes matemáticas do algoritmo com entradas geradas aleatoriamente.

#### Critérios de Aceitação

1. FOR ALL combinações válidas de availability ranges (dayOfWeek 0-6, startTime e endTime em formato HH:mm com incrementos de 15 minutos, endTime > startTime) e consultas existentes com status "confirmed" cujos intervalos estão contidos nos availability ranges, WHEN calculateAvailableSlots é invocado, THE Suite_de_Testes SHALL verificar que nenhum slot retornado possui intervalo [startTime, endTime) que satisfaça a condição startA < endB AND startB < endA com qualquer consulta existente não-cancelada (propriedade de não-sobreposição)
2. FOR ALL slots retornados pelo Módulo_Slot_Calculator com parâmetro duration de 30 ou 60 minutos, THE Suite_de_Testes SHALL verificar que a diferença entre endTime e startTime de cada slot é exatamente igual ao parâmetro duration fornecido em milissegundos (propriedade de duração constante)
3. FOR ALL slots retornados pelo Módulo_Slot_Calculator, THE Suite_de_Testes SHALL verificar que startTime de cada slot é maior ou igual ao startTime e menor que o endTime de pelo menos um availability range cujo dayOfWeek corresponda ao dia da semana da data consultada (propriedade de contenção)
4. FOR ALL inputs válidos com lista vazia de consultas existentes, WHEN calculateAvailableSlots é invocado com os mesmos availability ranges, data e duration, THE Suite_de_Testes SHALL verificar que o número de slots retornados é maior ou igual ao número de slots retornados quando a mesma invocação inclui uma ou mais consultas "confirmed" no mesmo range (propriedade metamórfica)
5. FOR ALL slots retornados pelo Módulo_Slot_Calculator para uma mesma data, THE Suite_de_Testes SHALL verificar que para quaisquer dois slots consecutivos no array retornado, o startTime do slot na posição i+1 é maior ou igual ao startTime do slot na posição i (propriedade de ordenação)
6. FOR ALL slots retornados pelo Módulo_Slot_Calculator, THE Suite_de_Testes SHALL verificar que o startTime de cada slot está alinhado em incrementos exatos de 15 minutos (minutos em {0, 15, 30, 45} e segundos e milissegundos iguais a zero) (propriedade de alinhamento de grade)

### Requisito 11: Testes Baseados em Propriedades - Overlap Detector

**User Story:** Como desenvolvedor QA, eu quero testes baseados em propriedades para o detector de sobreposição, para que eu possa validar propriedades matemáticas da detecção de intervalos com entradas geradas aleatoriamente.

#### Critérios de Aceitação

1. FOR ALL pares de intervalos half-open [A, B) e [C, D) onde B > A e D > C, THE Suite_de_Testes SHALL verificar que intervalsOverlap(A, B, C, D) produz o mesmo resultado booleano que intervalsOverlap(C, D, A, B) (propriedade de comutatividade)
2. FOR ALL intervalos half-open [A, B) onde B > A (diferença mínima de 1 milissegundo), THE Suite_de_Testes SHALL verificar que intervalsOverlap(A, B, A, B) retorna true (propriedade de reflexividade)
3. FOR ALL pares de intervalos adjacentes [A, B) e [B, C) onde B > A e C > B e B é exatamente o instante final do primeiro e inicial do segundo (mesmo valor de getTime()), THE Suite_de_Testes SHALL verificar que intervalsOverlap(A, B, B, C) retorna false (propriedade de adjacência half-open)
4. FOR ALL intervalos [A, B) e [C, D) onde D.getTime() <= A.getTime() ou B.getTime() <= C.getTime(), THE Suite_de_Testes SHALL verificar que intervalsOverlap(A, B, C, D) retorna false (propriedade de intervalos disjuntos)
5. FOR ALL intervalos [A, B) e [C, D) onde intervalsOverlap(A, B, C, D) retorna true, WHEN detectOverlap é invocado com um appointment de [A, B) contra newStart=C e newEnd=D, THE Suite_de_Testes SHALL verificar que o resultado possui hasOverlap igual a true e overlappingRange.start igual a max(A, C) e overlappingRange.end igual a min(B, D) (propriedade de cálculo correto do intervalo de sobreposição)

### Requisito 12: Testes Baseados em Propriedades - Cancellation Policy

**User Story:** Como desenvolvedor QA, eu quero testes baseados em propriedades para a política de cancelamento, para que eu possa validar que as regras de janela temporal são consistentes com entradas variadas.

#### Critérios de Aceitação

1. FOR ALL consultas com status "cancelled" e qualquer combinação de currentTime (passado, presente ou futuro em relação a startTime), THE Suite_de_Testes SHALL verificar que canCancel retorna allowed: false com reason contendo indicação de que a consulta já foi cancelada (propriedade de idempotência de cancelamento)
2. FOR ALL consultas com status "confirmed" e startTime tal que startTime.getTime() - currentTime.getTime() é estritamente maior que 86.400.000 milissegundos (24 horas), THE Suite_de_Testes SHALL verificar que canCancel retorna allowed: true sem propriedade reason (propriedade de permissão)
3. FOR ALL consultas com status "confirmed" e startTime tal que 0 < startTime.getTime() - currentTime.getTime() <= 86.400.000 milissegundos (menor ou igual a 24 horas, incluindo exatamente 24 horas), THE Suite_de_Testes SHALL verificar que canCancel retorna allowed: false (propriedade de janela — desigualdade estrita)
4. FOR ALL consultas onde startTime.getTime() <= currentTime.getTime() independentemente do status ("confirmed" ou "cancelled"), THE Suite_de_Testes SHALL verificar que canCancel retorna allowed: false (propriedade de imutabilidade do passado)

### Requisito 13: Testes Baseados em Propriedades - Validação de Schemas Zod

**User Story:** Como desenvolvedor QA, eu quero testes baseados em propriedades para os schemas de validação Zod, para que eu possa garantir que entradas válidas são aceitas e entradas inválidas são rejeitadas de forma consistente.

#### Critérios de Aceitação

1. FOR ALL objetos BookingRequest gerados com patientId e doctorId como UUIDs v4 válidos, startTime como string ISO 8601 datetime válida representando data futura, e appointmentType em ["FIRST_VISIT", "FOLLOW_UP"], THE Suite_de_Testes SHALL verificar que bookingRequestSchema.safeParse retorna success: true (propriedade de aceitação de entradas válidas)
2. FOR ALL strings que não satisfazem o formato UUID v4 (8-4-4-4-12 caracteres hexadecimais com versão 4) usadas como patientId ou doctorId em um objeto BookingRequest com demais campos válidos, THE Suite_de_Testes SHALL verificar que bookingRequestSchema.safeParse retorna success: false (propriedade de rejeição de UUID inválido)
3. FOR ALL strings que não pertencem ao conjunto ["cardiology", "dermatology", "neurology", "orthopedics", "pediatrics", "psychiatry", "general_practice"], THE Suite_de_Testes SHALL verificar que specialtySchema.safeParse retorna success: false (propriedade de rejeição de specialty inválida)
4. FOR ALL strings no formato HH:mm com horas no intervalo [0-23] e minutos exatamente em {0, 15, 30, 45}, THE Suite_de_Testes SHALL verificar que o schema de availability range aceita o valor com success: true quando combinado com dayOfWeek válido (0-6) e endTime posterior ao startTime (propriedade de aceitação de incrementos válidos)
5. FOR ALL strings no formato HH:mm com minutos que não pertencem a {0, 15, 30, 45}, THE Suite_de_Testes SHALL verificar que o schema de availability range rejeita o valor com success: false (propriedade de rejeição de incrementos inválidos)

### Requisito 14: Testes E2E do Frontend - Cadastro

**User Story:** Como desenvolvedor QA, eu quero testes automatizados do frontend para as funcionalidades de cadastro, para que eu possa garantir que médicos e pacientes podem ser registrados pela interface.

#### Critérios de Aceitação

1. WHEN o usuário preenche o formulário de cadastro de médico com um nome e seleciona uma especialidade da lista e clica em "Cadastrar Médico", THE Suite_de_Testes SHALL verificar que o sistema exibe mensagem de sucesso contendo o nome do médico e que o médico aparece na lista de médicos cadastrados com nome e especialidade visíveis
2. WHEN o usuário clica em "Cadastrar Médico" com o campo nome vazio, THE Suite_de_Testes SHALL verificar que o sistema exibe mensagem de erro de validação e que nenhum médico novo é adicionado à lista
3. WHEN o usuário preenche o formulário de cadastro de paciente com um nome e um email válido e clica em "Cadastrar Paciente", THE Suite_de_Testes SHALL verificar que o sistema exibe mensagem de sucesso contendo o nome do paciente e que o paciente aparece na lista de pacientes cadastrados
4. WHEN o usuário clica em "Cadastrar Paciente" com o campo email vazio, THE Suite_de_Testes SHALL verificar que o sistema exibe mensagem de erro de validação e que nenhum paciente novo é adicionado à lista
5. WHEN o usuário cadastra um médico ou paciente com sucesso, THE Suite_de_Testes SHALL verificar que os campos do formulário são limpos após a operação bem-sucedida

### Requisito 15: Testes E2E do Frontend - Disponibilidade

**User Story:** Como desenvolvedor QA, eu quero testes automatizados do frontend para o gerenciamento de disponibilidade, para que eu possa garantir que ranges de horário podem ser adicionados, editados e removidos pela interface.

#### Critérios de Aceitação

1. WHEN o usuário seleciona um médico no dropdown e adiciona um range de disponibilidade com dia da semana (Segunda a Sábado), hora início e hora fim válidos e clica em "Adicionar Horário", THE Suite_de_Testes SHALL verificar que uma mensagem de sucesso é exibida e o range aparece na lista de disponibilidades do médico mostrando dia, hora início e hora fim
2. WHEN o usuário clica no botão de editar de um range existente, altera os horários no modal de edição e clica em "Salvar", THE Suite_de_Testes SHALL verificar que o modal é fechado e o range é atualizado na lista com os novos valores de horário
3. WHEN o usuário clica no botão de excluir de um range existente e confirma a exclusão no diálogo de confirmação, THE Suite_de_Testes SHALL verificar que o range é removido da lista de disponibilidades do médico
4. IF o usuário clica no botão de excluir de um range existente e cancela o diálogo de confirmação, THEN THE Suite_de_Testes SHALL verificar que o range permanece inalterado na lista de disponibilidades

### Requisito 16: Testes E2E do Frontend - Agendamento

**User Story:** Como desenvolvedor QA, eu quero testes automatizados do frontend para o fluxo de agendamento, para que eu possa garantir que consultas podem ser agendadas selecionando slots disponíveis.

#### Critérios de Aceitação

1. WHEN o usuário seleciona um médico, uma data futura e um tipo de consulta (Primeira Consulta de 60 min ou Retorno de 30 min), THE Suite_de_Testes SHALL verificar que o sistema exibe os slots disponíveis como botões clicáveis no container de horários
2. WHEN o usuário seleciona um slot disponível clicando no botão de horário e clica em "Agendar Consulta", THE Suite_de_Testes SHALL verificar que o sistema exibe confirmação de sucesso contendo nome do paciente, nome do médico, data, horário de início e fim, e tipo de consulta
3. IF o sistema não encontra slots disponíveis para a combinação de médico, data e tipo de consulta selecionados, THEN THE Suite_de_Testes SHALL verificar que o sistema exibe mensagem informando que não há horários disponíveis e que nenhum botão de slot é renderizado
4. IF o usuário clica em "Agendar Consulta" sem ter selecionado nenhum slot de horário, THEN THE Suite_de_Testes SHALL verificar que o sistema exibe mensagem de erro indicando que um horário deve ser selecionado

### Requisito 17: Testes E2E do Frontend - Consultas

**User Story:** Como desenvolvedor QA, eu quero testes automatizados do frontend para a aba de consultas, para que eu possa garantir que a listagem e o cancelamento funcionam pela interface.

#### Critérios de Aceitação

1. WHEN o usuário navega para a aba de consultas, THE Suite_de_Testes SHALL verificar que o sistema exibe a lista de consultas agendadas onde cada consulta mostra nome do paciente, nome do médico, data, horário (início e fim), tipo de consulta e status (Confirmada ou Cancelada)
2. WHEN o usuário clica em "Cancelar" em uma consulta cujo horário de início é mais de 24 horas no futuro e confirma a ação, THE Suite_de_Testes SHALL verificar que o status da consulta muda para "Cancelada" e que os botões de ação (Cancelar e Reagendar) não são mais exibidos para essa consulta
3. IF o usuário tenta cancelar uma consulta cujo horário de início é 24 horas ou menos no futuro, THEN THE Suite_de_Testes SHALL verificar que o sistema exibe mensagem de erro informando que o cancelamento deve ser feito com mais de 24 horas de antecedência e que o status da consulta permanece como "Confirmada"
