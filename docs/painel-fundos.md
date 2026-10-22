# Painel de fundos — acesso privado e base real

## Fluxo implementado

A rota `/` apresenta acesso privado. Uma sessão válida carrega automaticamente o pacote de carteira do servidor; falhas de configuração, autenticação ou dados não acionam uma demonstração. O usuário também pode abrir sua cópia local. O formulário legado fica em `/planejamento`.

- Resumo: patrimônio, contas, fundos, saldo com alertas, alocação por classe/gestora e indicadores históricos com cobertura.
- Rentabilidade: saldos, alocação, indicador histórico com cobertura por período, índices vinculados, retornos até 24M a.a. e ordenação por saldo/retorno/nome.
- Clientes: posições completas da conta, pesos, pendências e o quadro “O que revisar nesta conta”, com motivo, fonte e próxima análise.
- Consulta por fundo e Realocação: seleção de conta, apenas seus fundos posicionados, clientes expostos, exportação por fundo, pendências e alternativas condicionais pesquisadas. Abrir uma posição da página do cliente preserva a conta.
- Pontos de atenção: revisões explicáveis, exposição sem duplicação, contas prioritárias e tarefas.
- Acompanhamento: decisões, histórico e próximas revisões; no acesso online com armazenamento privado, salvamento automático e botão explícito de salvar.

O cabeçalho escuro, verde, navegação horizontal, tabelas e cartões seguem a organização do HTML de referência. `reference.css` isola essa apresentação do formulário legado. As tabelas têm rolagem horizontal própria no celular.

## Servidor e configuração

`server/access.js`, `api/session.js` e `api/workspace.js` atendem um proprietário do workspace. O acesso não é uma solução multiusuário com permissões entre assessores. A sessão assinada por HMAC expira em oito horas e usa cookie Secure, HttpOnly, SameSite=Strict e host exclusivo. Senha verificada com scrypt; escritas exigem origem do próprio site. Respostas da carteira não são cacheáveis. Limite por instância reduz tentativas de login; não substitui uma política central de rate limiting para operação com muitos usuários.

Configuração **somente no servidor**, por variáveis secretas do ambiente de produção:

- `RD_LOGIN_SALT`: 16 bytes aleatórios em hexadecimal.
- `RD_LOGIN_HASH`: scrypt(senha, salt, 64 bytes), hexadecimal.
- `RD_SESSION_SECRET`: segredo aleatório independente, com ao menos 40 caracteres.
- `RD_WORKSPACE_GZIP`: pacote validado, comprimido com gzip e codificado em base64. Nunca usar prefixo VITE_.
- `BLOB_READ_WRITE_TOKEN` ou `BLOB_STORE_ID` com credenciais OIDC: loja Vercel Blob **privada** conectada ao projeto.

Nunca registrar esses valores em logs, commits, PRs ou argumentos de comandos. A configuração privada e o bootstrap ficam fora do checkout. O build bloqueia documentos, carteiras incorporadas, configurações do servidor e identificadores conhecidos da demonstração anterior.

`server/workspace-store.js` valida o bootstrap e o conteúdo salvo. O caminho da loja é derivado da revisão do bootstrap. Leituras privadas ignoram cache do provedor; gravações usam comparação de ETag e criação sem sobrescrita. Uma sessão com revisão antiga recebe conflito e mantém seu trabalho para exportação, em vez de sobrescrever silenciosamente a outra sessão. Atualizações de bootstrap geram um novo caminho; a retenção de versões antigas precisa de política operacional.

Se a loja estiver indisponível, o código informa falha de salvamento e preserva a possibilidade de backup. Não anunciar persistência em nuvem antes de conectar e verificar a loja real. Exclusão, auditoria independente, restauração operacional e permissões por usuário ainda exigem evolução.

Quando uma leitura HTTP fornece ETag fraco, a revisão forte é obtida da API de metadados da loja e sua identidade precisa coincidir com a leitura. Uma revisão divergente provoca conflito; o código não remove a condição de atualização nem sobrescreve outra versão para contornar a falha.

## Contratos de importação e backup

CSV deve usar UTF-8, ponto e vírgula e os cabeçalhos:

```text
conta;cliente;assessor;fundo_id;fundo;estrategia;gestora;saldo;data;liquidez;ret_mes_pct;ret_ano_pct;ret_12m_pct;ret_24m_aa_pct;data_cota;fonte_url
```

`liquidez` é opcional. Saldo: formato brasileiro, por exemplo `1234,56` ou `1.234,56`. Data: `AAAA-MM-DD`, única no lote. Uma linha por conta/fundo. O modelo vazio é baixado na interface. O importador recusa linhas duplicadas, datas inválidas/diferentes, cadastros conflitantes, saldos inválidos, arquivos acima de 5 MB e lotes acima de 10.000 posições. Nomes contendo indícios de previdência são recusados, mas isso não substitui classificação confiável na origem. A prévia não certifica o conteúdo; conferir os totais com a base original.

Contas distintas não são consolidadas por nome. As seis colunas após `liquidez` são opcionais: os quatro retornos são percentuais com vírgula, por exemplo `14,53` significa 14,53%, sem símbolo. Valor ausente fica vazio. Havendo retorno, `data_cota` deve coincidir com a data da posição e `fonte_url` deve ser HTTPS do Mais Retorno, CVM ou XP Asset. A referência declarada é validada em formato, não certificada pelo importador. Retornos nunca são inferidos dos saldos. O exportador preserva retornos importados e neutraliza fórmulas de planilha; os retornos fictícios do modo demonstração não são exportados para importação real.

Em Realocação ou na consulta por fundo, “Carregar alternativas” lê um JSON local de até 1 MB. O pacote tem exclusivamente `version: 1`, `date` igual à carteira e `suggestions`, lista de `{currentFundId, alternatives}`. Cada alternativa aceita somente `{id, name, returns, date, sourceUrl}`; `returns` contém quatro frações decimais (0,1453 significa 14,53%), na ordem mês, ano, 12M e 24M a.a.; use `null` para ausência. IDs atuais precisam existir na carteira, alternativas precisam ser distintas do atual e têm limite de três por origem. Campos extras, inclusive análises e indicadores técnicos, são rejeitados. O JSON não contém contas nem clientes. As alternativas são apresentadas como condicionais à revisão do assessor; o pacote não aprova suitability, disponibilidade ou execução. Não há pesquisa automática no navegador.

`relocationAlternatives` usa somente a curadoria específica do fundo de origem. Exige a mesma referência e retorno estritamente maior na janela escolhida (12M por padrão); exclui empates, ausências e retornos inferiores. Diferenças de estratégia ou benchmark já conhecidos também excluem o par. A curadoria externa continua responsável por comprovar a comparabilidade de mandato, risco e liquidez; ausência desses campos no pacote não constitui comprovação. O site informa quando não existe alternativa superior na seleção disponível, sem inventar substitutos nem repetir uma lista genérica. A diferença em pontos percentuais é histórica; não há projeção de ganho em reais. “Analisar esta alternativa” prepara acompanhamento com a conta, fundo de origem, retornos, data e fonte. O formulário limita as opções às contas posicionadas naquele fundo e impede mudar a origem da análise.


Arquivos de trabalho v1 contêm `format`, `version`, `date`, `positionsCsv`, `curation`, `reviews`, `tasks`, `settings.concentrationLimit`. V2 acrescenta `market: {date, benchmarks, fundReferences}`. Índices têm `{id, name, returns, date, sourceUrl}`; vínculos `{fundId, benchmarkId, sourceUrl}`. Datas precisam coincidir, IDs devem existir, duplicatas e campos extras são recusados. Backups preservam a versão e o histórico. Um CSV isolado não preserva índices, pesquisa e decisões.

## Cálculos e pesquisa

Pesos e concentrações usam somente o universo de fundos importado, mantendo todas as posições da conta no denominador ao filtrar estratégia. Contas distintas não são unificadas por nome. Exposições contam cada posição uma vez. O indicador histórico divide soma(saldo atual × retorno do fundo) pelo saldo com retorno disponível no período e informa sua cobertura. Não é rentabilidade da carteira ou do investidor. Ausências não viram zero.

Benchmark exige vínculo explícito e fonte por fundo. Só comparar períodos equivalentes. Índice com retorno zero ou negativo não gera razão de retornos. Não descontar taxas novamente, emendar subclasses ou extrapolar ganho futuro sobre saldos atuais. Quartis exigem universo de pares definido e fonte antes de serem apresentados.

Mais Retorno, CVM, BACEN e documentos do veículo apoiam a pesquisa externa. O código não inventa liquidez, CNPJ, disponibilidade XP, adequação ao cliente ou alternativas. A pesquisa técnica não integra o frontend. O assessor assumiu conferir perfil, objetivos e restrições. Movimentações completas são necessárias para TWR/MWR e cálculo tributário individual.

## Verificação

`npm test` inclui importação, cobertura, índices, revisões por conta, autenticação, origem, limites de corpo, expiração, persistência e conflitos. `npm run build:public` confere a saída. Execute `PLAYWRIGHT_MODULE=/tmp/rd-browser-tools/node_modules/playwright/index.mjs node tests/production-smoke.mjs` para login, carteira automática, salvamento/restauração/logout, ausência de fallback, exportações, comparador e mobile sob headers Vercel. O teste usa exclusivamente fixtures anônimas e uma loja em memória; não certifica a configuração da loja real.

`tests/offline-smoke.mjs` verifica HTML preenchido, backup/restauração, escape do seed e ausência de conexões. `tests/check-private-site.mjs /caminho/externo/site.html` confere carteira real sem capturas ou dados individuais no resultado. O gerador offline exige `--workspace` e `--output` fora do checkout. A cópia local usa CSP sem conexões; o acesso online permite somente conexões ao próprio site.
