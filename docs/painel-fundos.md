# Painel de fundos — estado da implementação

O painel está na rota `/`. O formulário anterior permanece em `/planejamento`.

## Executar e validar

Node 24.19.0 e npm 11.9.0 foram usados na validação.

```sh
npm ci --cache /tmp/rd-npm-cache --no-audit --no-fund
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
npm run build
node --test tests/funds.test.js
```

O smoke test interativo pode usar Playwright instalado fora do checkout, sem mudar as dependências do produto:

```sh
npm install --prefix /tmp/rd-browser-tools --cache /tmp/rd-npm-cache --no-audit --no-fund playwright
PLAYWRIGHT_MODULE=/tmp/rd-browser-tools/node_modules/playwright/index.mjs node tests/browser-smoke.mjs
```

Requer Chromium em `/usr/bin/chromium`. O servidor de desenvolvimento deve estar em execução. Os testes usam somente exemplos sintéticos e uma posição anônima criada pelo próprio teste. Capturas são gravadas em `/tmp/rd-fundos-desktop.png` e `/tmp/rd-fundos-mobile.png`.

## O que funciona

- Seis abas: Meu dia, Carteira de fundos, Clientes, Fundos, Comparador e Acompanhamento.
- Filtros por assessor e estratégia, buscas contextuais e consulta de clientes por fundo.
- Saldos e alocação por estratégia e gestora; concentração por fundo com limite configurável.
- Exposição a alertas sem duplicar uma posição atingida por mais de uma regra.
- Navegação fundo → cliente → pauta → registro de decisão e próxima revisão.
- Histórico de status e decisões, download de resumo, impressão da pauta e exportação CSV.
- Importação CSV com prévia de totais e confirmação explícita. Um lote substitui a sessão; não há append que duplique posições.
- Sugestões com identificação, retorno por período e referência. Indicadores técnicos e análises de seleção não integram a interface.
- Arquivo de trabalho único com posições, prioridades pesquisadas por conta/fundo, alternativas, limite de concentração e histórico completo de atendimento. Salvar e reabrir para continuar depois.
- HTML independente com CSP sem conexões externas, código e estilos incorporados. Cópias com dados reais são geradas somente fora do checkout.
- Layout responsivo, navegação por teclado e modais com foco contido e fechamento por Escape.

## Demonstração e dados importados

A aplicação inicia com dados integralmente sintéticos, identificados no banner e nos cartões. Nomes e CNPJs de produtos reais não foram inventados. As alternativas fictícias aparecem apenas para um fundo fictício de crédito privado; não se repetem para estratégias distintas.

Os cenários demonstrativos de desempenho, queda e mudança no fundo são eventos estáticos explicitamente fictícios. Para um CSV simples, o único alerta calculado é concentração por fundo. Um arquivo de trabalho pode incluir revisões pesquisadas fora do site: desempenho, identificação pendente, liquidez, mudança ou queda. Cada revisão precisa apontar uma posição existente de uma conta, referência igual à carteira e motivo/fonte/próxima análise; o painel não recalcula a pesquisa nem transforma a revisão em ordem de venda. Os filtros preservam o vínculo exato da conta; ter o mesmo fundo não transfere uma revisão a outro cliente. A lista permite carregar mais prioridades além das seis iniciais.

O denominador de concentração é o total importado da conta, mesmo quando a tela é filtrada por estratégia. Saldos de visão consolidada usam o filtro atual. A página individual mostra todos os fundos importados da conta; não transforma o subconjunto em patrimônio total da pessoa.

CSV deve usar UTF-8, ponto e vírgula e os cabeçalhos:

```text
conta;cliente;assessor;fundo_id;fundo;estrategia;gestora;saldo;data;liquidez;ret_mes_pct;ret_ano_pct;ret_12m_pct;ret_24m_aa_pct;data_cota;fonte_url
```

`liquidez` é opcional. Saldo: formato brasileiro, por exemplo `1234,56` ou `1.234,56`. Data: `AAAA-MM-DD`, única no lote. Uma linha por conta/fundo. O modelo vazio é baixado na interface. O importador recusa linhas duplicadas, datas inválidas/diferentes, cadastros conflitantes, saldos inválidos, arquivos acima de 5 MB e lotes acima de 10.000 posições. Nomes contendo indícios de previdência são recusados, mas isso não substitui classificação confiável na origem. A prévia não certifica o conteúdo; conferir os totais com a base original.

Contas distintas não são consolidadas por nome. As seis colunas após `liquidez` são opcionais: os quatro retornos são percentuais com vírgula, por exemplo `14,53` significa 14,53%, sem símbolo. Valor ausente fica vazio. Havendo retorno, `data_cota` deve coincidir com a data da posição e `fonte_url` deve ser HTTPS do Mais Retorno, CVM ou XP Asset. A referência declarada é validada em formato, não certificada pelo importador. Retornos nunca são inferidos dos saldos. O exportador preserva retornos importados e neutraliza fórmulas de planilha; os retornos fictícios do modo demonstração não são exportados para importação real.

No Comparador ou na página do fundo, “Carregar alternativas” lê um JSON local de até 1 MB. O pacote tem exclusivamente `version: 1`, `date` igual à carteira e `suggestions`, lista de `{currentFundId, alternatives}`. Cada alternativa aceita somente `{id, name, returns, date, sourceUrl}`; `returns` contém quatro frações decimais (0,1453 significa 14,53%), na ordem mês, ano, 12M e 24M a.a.; use `null` para ausência. IDs atuais precisam existir na carteira, alternativas precisam ser distintas do atual e têm limite de três por origem. Campos extras, inclusive análises e indicadores técnicos, são rejeitados. O JSON não contém contas nem clientes. As alternativas são apresentadas como condicionais à revisão do assessor; o pacote não aprova suitability, disponibilidade ou execução. Não há pesquisa automática no navegador.

## Privacidade e limites

Protótipo local, sem autenticação, backend, banco de dados ou autorização entre assessores. Os filtros são filtros, não controles de acesso. Não publicar dados reais em arquivos estáticos e não usar o protótipo como sistema de produção com clientes identificáveis.

Importações e alterações permanecem somente na memória desta aba. “Salvar trabalho” exporta um `.rdfundos` com posições, alternativas, revisões e histórico de decisões. Ao reabrir o arquivo, dados e acompanhamentos são restaurados após a prévia. No HTML preenchido, recarregar volta à fotografia incorporada, e alterações posteriores precisam desse backup. Não há envio automático a servidor, localStorage, telemetria ou integração com custódia no painel. O formulário legado mantém sua integração Web3Forms, separada do painel e inacessível como rota na cópia HTML independente.

O contrato de trabalho tem `format: "rd-fundos-workspace"`, `version: 1`, `date`, `positionsCsv`, `curation` (formato de alternativas acima), `reviews`, `tasks` e `settings.concentrationLimit`. Implementação e limites em `src/funds/workspace.js`. Campos extras são rejeitados; títulos e motivos são texto escapado pelo React. Históricos precisam estar em ordem e concordar com o status final. O importador verifica a existência da relação conta/fundo de cada registro. A validação estrutural não certifica as conclusões financeiras. O pacote não é criptografado; mantenha-o privado.

Antes de uso operacional: implementar autenticação, autorização no servidor, banco privado, auditoria confiável, política de retenção e restauração de backup; integrar posições e métricas com rastreabilidade. A análise de movimentações, tributação, liquidez por objetivo, correlação e sobreposição está pendente das respectivas bases.

## Fonte de pesquisa e sugestões

Mais Retorno é a fonte solicitada para a análise e seleção de fundos. A pesquisa completa deve ficar fora da interface e do bundle público. Acesso HTTP às páginas públicas do comparador e de um fundo foi confirmado em 21/10/2026; isso não valida todas as métricas ou acesso às funcionalidades dinâmicas/contratadas. Nenhuma API privada foi presumida.

Uma recomendação real depende de identificar o fundo atual fora da previdência, conferir classe/subclasse e documentação, analisar composição e mandato, comparar risco e retorno em janelas equivalentes, verificar liquidez/perfil/plataforma e registrar a revisão. Não usar uma lista genérica dos “mais rentáveis”. Não traduzir retorno histórico em promessa de ganho sobre o saldo atual. A curadoria é produzida fora do site e pode ser carregada localmente no formato limitado acima. Arquivos de posições, documentos privados, scripts de pesquisa e planilhas com análises permanecem fora do checkout e do build.

## Resultado da validação desta entrega

Build de produção concluído; oito testes de regras/importação passaram, incluindo preservação de retorno negativo, rejeição de fonte/data incompatíveis e isolamento do pacote de alternativas. O smoke em Chromium passou pelas seis abas, prioridade → tarefa → decisão → histórico, downloads de CSV/resumo, filtro de concentração com denominador preservado, viewport de 390 px sem overflow horizontal, importação anônima com conferência de centavos, carregamento de alternativa anônima e descarte no reload, além do acesso ao formulário legado. Os cartões não contêm Sharpe, volatilidade, correlação, quartil, taxa de administração ou projeção de ganho. Isso valida o protótipo; não valida recomendações reais ou controles de produção ainda não implementados.

Validação do arquivo único: `npm test` executa 11 testes, incluindo isolamento de revisões por conta, restauração de decisões e rejeição de dados inconsistentes. Após `npm run build:offline`, execute `PLAYWRIGHT_MODULE=/tmp/rd-browser-tools/node_modules/playwright/index.mjs node tests/offline-smoke.mjs`. O teste abre o HTML independente por loopback (o Chromium gerenciado deste ambiente bloqueia `file:`), desliga a rede durante as interações, cria decisão, salva/reabre backup, verifica CSP sem solicitações externas, escape do seed e layout móvel sem overflow. Nenhuma credencial ou dado real é usado nas fixtures. `tests/check-private-site.mjs /caminho/privado/site.html` é uma conferência opcional, somente leitura, sem capturas nem impressão de dados individuais, para comparar a cópia privada com o pacote incorporado.
