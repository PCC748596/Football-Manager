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

/*
A TROCA QUE O 3D FEZ SOZINHO (mensagem `substituicao_feita { lado, sai, entra, corrige }`, ids reais do motor = digitos de 'p-269063'): o goleiro reserva depois da espera, ou o
pedido do manager cujo `sai` (o goleiro expulso) ja nao estava em campo e o 3D tirou outro (`corrige` = esse `sai`). Devolve a escalacao e o banco do manager iguais aos do 3D e
se a troca CONTA (no pedido corrigido o manager ja a tinha contado). Pura, para o teste (tests/aviso_goleiro.test.ts).
  . normal: `sai` no lugar dele passa a `entra`; `entra` sai do banco e `sai` fica no lugar dele no banco.
  . corrigida: `entra` ja esta na escalacao (o manager pô-lo no lugar do expulso, que foi para o banco): `sai` troca com o expulso — o expulso (vermelho, nao conta nas notas)
    fica no lugar de `sai` e `sai` vai para o banco.
*/
const digitos = (id: string | null | undefined): number | null => { const m = /(\d+)$/.exec(String(id || '')); return m ? Number(m[1]) : null; };
export function aplicarTrocaDo3d(
  lineup: string[], bench: string[], m: { sai: number | null; entra: number | null; corrige?: number | null }
): { lineup: string[]; bench: string[]; conta: boolean; sai: string | null; entra: string | null } | null {
  const achar = (lista: string[], n: number | null | undefined) => (n === null || n === undefined) ? -1 : lista.findIndex(id => digitos(id) === n);
  const L = lineup.slice(), B = bench.slice();
  const iS = achar(L, m.sai);
  if (iS < 0) return null;
  const sai = L[iS];
  const iE = achar(L, m.entra);
  if (iE >= 0) {
    // Corrigida: o expulso (o `corrige`) esta no banco, onde o manager o pos.
    const bC = achar(B, m.corrige);
    if (bC < 0) return null;
    const expulso = B[bC];
    L[iS] = expulso; B[bC] = sai;
    return { lineup: L, bench: B, conta: false, sai, entra: L[iE] };
  }
  const bE = achar(B, m.entra);
  if (bE < 0) return null;
  const entra = B[bE];
  L[iS] = entra; B[bE] = sai;
  return { lineup: L, bench: B, conta: true, sai, entra };
}
