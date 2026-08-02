/* ------------------------------------------------------------------ */
/*  FACTORIES — criam um item vazio para cada lista do formulário     */
/* ------------------------------------------------------------------ */

// dataNasc agora guarda a data completa "YYYY-MM-DD" (dia incluído) e
// estadoCivil foi adicionado conforme requisito de melhoria da etapa
// "Dados Familiares".
export const newMember    = () => ({ nome:"", parentesco:"", dataNasc:"", estadoCivil:"", dependente:false });
export const newIncome    = () => ({ categoria:"", descricao:"", bruto:"0", imposto:"0", liquido:"0", frequencia:"" });
export const newExpense   = () => ({ categoria:"", descricao:"", valor:"0", frequencia:"" });
export const newInvestNac = () => ({ dataRef:"", tipo:"", instituicao:"", patrimonio:"0", comentarios:"" });
export const newInvestGlb = () => ({ dataRef:"", instituicao:"", valor:"0", comentarios:"" });
export const newImovel    = () => ({ descricao:"", tipo:"", estado:"", cidade:"", valor:"0" });
export const newVeiculo   = () => ({ descricao:"", tipo:"", valor:"0" });
export const newEmpresa   = () => ({ nome:"", cnpj:"", valorEmpresa:"0", participacao:"" });
export const newOutroBem  = () => ({ descricao:"", valor:"0" });

export const INITIAL_FORM = {
  nomeCompleto:"",
  estadoCivilCliente:"", nomeConjuge:"", dataNascConjuge:"",
  membros:[],
  idadeAposentadoria:"", formaResgate:"", rendaAposentadoria:"0", expectativaVida:"",
  rendas:[],
  despesas:[],
  investNacionais:[],
  investGlobais:[],
  imoveis:[],
  veiculos:[],
  empresas:[],
  outrosBens:[],
};
