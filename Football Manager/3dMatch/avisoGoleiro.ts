/*
O AVISO DO GOLEIRO EXPULSO (ver Match.goleiroExpulso no 3D). O 3D manda `expulsao { lado: 'A'|'B', goleiro }` quando um goleiro leva o vermelho e `goleiro_trocado { lado:
'casa'|'fora' }` quando um time volta a ter goleiro. O aviso (no Tactics) liga so com o goleiro do UTILIZADOR (lado 'A' = casa) e desliga com a troca do lado DELE (a troca do
adversario nao o apaga) ou com o fim do jogo. Fica aqui, sem React, para a derivacao do lado ter um teste (tests/aviso_goleiro.test.ts) e ser a mesma no MatchDay e no GameContext.
*/
// true = ligar o aviso, false = desligar, null = a mensagem nao mexe nele.
export function avisoDoGoleiro(m: { tipo?: string; lado?: string; goleiro?: boolean } | null | undefined, casaId: string | null | undefined, utilizadorId: string | null | undefined): boolean | null {
  if (!m) return null;
  if (m.tipo === 'expulsao' && m.goleiro) {
    if (!casaId || !utilizadorId) return null;
    return m.lado === (casaId === utilizadorId ? 'A' : 'B') ? true : null;
  }
  if (m.tipo === 'goleiro_trocado') {
    // Sem lado (mensagem antiga) ou sem saber o lado do utilizador: desliga, como antes.
    if (!m.lado || !casaId || !utilizadorId) return false;
    return m.lado === (casaId === utilizadorId ? 'casa' : 'fora') ? false : null;
  }
  if (m.tipo === 'fim') return false;
  return null;
}

/*
A TROCA QUE O 3D FEZ SOZINHO (mensagem `substituicao_feita { lado, sai, entra, expulso, corrige }`, ids reais do motor = digitos de 'p-269063'), espelhada na escalacao e no
banco do manager. No 3D o goleiro que entra fica no posto do goleiro EXPULSO e quem sai (`sai`, um de linha) deixa o time com menos um. No manager o expulso (vermelho) fica na
escalacao e nao conta (o motor de texto e as notas leem os vermelhos), por isso a escalacao continua com 11 ids, sem buracos (um buraco trava o "continuar":
`escalacaoBloqueiaJogo`/`slotsVazios`):
  . automatica (o manager nao fez nada; `entra` esta no banco): o posto do expulso passa a `entra`, o posto de `sai` passa ao expulso (vermelho), `sai` vai para o lugar de
    `entra` no banco. CONTA (+1 troca). Sem `expulso` na escalacao e uma troca normal: o posto de `sai` passa a `entra`.
  . corrigida (`entra` ja esta na escalacao: o manager arrastou o reserva para o posto do expulso; o TacticsView, com o alvo vermelho, TIRA o expulso da escalacao e do banco
    e encolhe o banco): o posto de `sai` passa ao expulso, `sai` vai para o banco (no fim). NAO conta (o manager ja contou).
  . `entra` em lado nenhum (o 3D tirou o reserva do plantel inteiro, com o banco do manager vazio), `sai` fora da escalacao, ou `sai === entra` (promocao: o mesmo jogador vai
    ao gol, nao ha troca): devolve null e nada muda.
`plantel`: os ids do manager do time (para achar o expulso, que no caso corrigido ja nao esta nem na escalacao nem no banco).
*/
const digitos = (id: string | null | undefined): number | null => { const m = /(\d+)$/.exec(String(id || '')); return m ? Number(m[1]) : null; };
export function aplicarTrocaDo3d(
  lineup: string[], bench: string[], m: { sai: number | null; entra: number | null; expulso?: number | null; corrige?: number | null }, plantel: string[] = []
): { lineup: string[]; bench: string[]; conta: boolean; sai: string | null; entra: string | null } | null {
  const achar = (lista: string[], n: number | null | undefined) => (n === null || n === undefined) ? -1 : lista.findIndex(id => digitos(id) === n);
  if (m.sai === null || m.entra === null || m.sai === m.entra) return null;
  const L = lineup.slice(), B = bench.slice();
  const iS = achar(L, m.sai);
  if (iS < 0) return null;
  const sai = L[iS];
  const nExpulso = (m.expulso !== undefined && m.expulso !== null) ? m.expulso : (m.corrige !== undefined ? m.corrige : null);
  const idExpulso = (() => { const k = achar(L, nExpulso); if (k >= 0) return L[k]; const b = achar(B, nExpulso); if (b >= 0) return B[b]; const p = achar(plantel, nExpulso); return p >= 0 ? plantel[p] : null; })();
  const iE = achar(L, m.entra);
  if (iE >= 0) {
    // Corrigida: o reserva ja esta no posto do goleiro. Quem saiu da lugar ao expulso (vermelho) e vai para o banco.
    if (!idExpulso) return null;
    const bX = B.indexOf(idExpulso);
    if (bX >= 0) B.splice(bX, 1);
    L[iS] = idExpulso;
    const bE = achar(B, m.entra);
    if (bE >= 0) B.splice(bE, 1);
    if (!B.includes(sai)) B.push(sai);
    return { lineup: L, bench: B, conta: false, sai, entra: L[iE] };
  }
  const bE = achar(B, m.entra);
  if (bE < 0) return null;
  const entra = B[bE];
  const iX = idExpulso ? L.indexOf(idExpulso) : -1;
  if (iX >= 0 && iX !== iS) { L[iX] = entra; L[iS] = idExpulso as string; }
  else L[iS] = entra;
  B[bE] = sai;
  return { lineup: L, bench: B, conta: true, sai, entra };
}
