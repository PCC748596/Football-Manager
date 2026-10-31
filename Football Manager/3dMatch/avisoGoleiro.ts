/*
O AVISO DO GOLEIRO EXPULSO (ver Match.goleiroExpulso no 3D). O 3D manda `expulsao { lado: 'A'|'B', goleiro }` quando um goleiro leva o vermelho e `goleiro_trocado`
quando o time volta a ter goleiro. O aviso (no Tactics) liga so com o goleiro do UTILIZADOR (lado 'A' = casa), desliga com a troca ou o fim do jogo.
Fica aqui, sem React, para a derivacao do lado ter um teste (tests/aviso_goleiro.test.ts) e ser a mesma no MatchDay e no GameContext.
*/
// true = ligar o aviso, false = desligar, null = a mensagem nao mexe nele.
export function avisoDoGoleiro(m: { tipo?: string; lado?: string; goleiro?: boolean } | null | undefined, casaId: string | null | undefined, utilizadorId: string | null | undefined): boolean | null {
  if (!m) return null;
  if (m.tipo === 'expulsao' && m.goleiro) {
    if (!casaId || !utilizadorId) return null;
    return m.lado === (casaId === utilizadorId ? 'A' : 'B') ? true : null;
  }
  if (m.tipo === 'goleiro_trocado' || m.tipo === 'fim') return false;
  return null;
}
