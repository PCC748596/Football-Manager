/*
ACESSOS E DESCENSOS — o plano do fim da temporada.

Dado o fim de uma temporada (a classificacao final de cada liga), calcula quem desce, quem sobe e quem fica em STANDBY ("unassigned teams": os clubes sem liga, `reserveTeamIds` do pais), SEM tocar nos dados.
Quem aplica o plano (a virada de temporada do jogo) escreve o resultado nos `teamIds` das ligas e na reserva do pais.

REGRAS
 . Dentro de um pais, as divisoes (as que nao sao `hidden`) ordenam-se por `tier`. Para cada par (cima, baixo): descem os `cima.relegated` ULTIMOS de cima e sobem os `baixo.promoted` PRIMEIROS de baixo.
   Se os dois numeros nao batem, o excesso de quem desce vai para o standby e a falta de quem sobe sai do standby (sorteio).
 . A ULTIMA divisao do pais nao tem ninguem abaixo: os seus rebaixados vao para o STANDBY, e entram no lugar deles clubes tirados do standby (sorteio entre os que la estavam ANTES; os recem-rebaixados
   nao voltam logo). Sem clubes no standby (Inglaterra, Espanha, Alemanha, Italia e Franca nao tem reserva), ninguem os substitui e os rebaixados FICAM na liga (`semReposicao`): o tamanho da liga nao muda.
 . O que o plano devolve mantem o tamanho de cada liga (a soma de quem sai e igual a de quem entra) e nunca duplica um clube.
*/

export interface PaisPlano {
  id: string; name: string;
  leagues: { id: string; name: string; tier: number; hidden?: boolean; promoted?: number; relegated?: number; teamIds: number[] }[];
  reserveTeamIds?: number[];
}

export interface MovimentoDivisao {
  paisId: string; paisNome: string; ligaId: string; ligaNome: string; tier: number;
  rebaixados: string[];          // saem DESTA liga para a de baixo
  promovidos: string[];          // saem DESTA liga para a de cima
  chegamDeCima: string[];        // entram nesta liga, rebaixados da de cima
  chegamDeBaixo: string[];       // entram nesta liga, promovidos da de baixo
  paraStandby: string[];         // saem desta liga e ficam sem liga (so na ultima divisao do pais)
  doStandby: string[];           // entram nesta liga vindos do standby
  ficaram: string[];             // rebaixados que ficaram por falta de clube que os substitua
}

export interface PlanoAcessos {
  movimentos: MovimentoDivisao[];
  novosTeamIds: Record<string, string[]>;     // ligaId -> clubes (ids como texto) depois do plano
  standby: Record<string, string[]>;          // paisId -> clubes sem liga depois do plano
  standbyAntes: Record<string, string[]>;
}

const embaralhar = <T,>(a: T[], rnd: () => number): T[] => {
  const o = a.slice();
  for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  return o;
};

/** `classificacao`: ligaId -> ids dos clubes, do 1.o ao ultimo (so as ligas que jogam; a falta dela deixa a liga fora do plano). */
export const planearAcessosEDescensos = (paises: PaisPlano[], classificacao: Record<string, string[]>, rnd: () => number = Math.random): PlanoAcessos => {
  const movimentos: MovimentoDivisao[] = [];
  const novosTeamIds: Record<string, string[]> = {};
  const standby: Record<string, string[]> = {};
  const standbyAntes: Record<string, string[]> = {};

  for (const p of paises) {
    const ligas = p.leagues.filter(l => !l.hidden).sort((a, b) => a.tier - b.tier);
    const reservaInicial = (p.reserveTeamIds || []).map(String);
    let reserva = reservaInicial.slice();
    standbyAntes[p.id] = reservaInicial.slice();
    const doStandbyDisponivel = reservaInicial.slice();   // so estes podem ser sorteados (os recem-rebaixados nao voltam)
    const nomeTemp: Record<string, MovimentoDivisao> = {};
    ligas.forEach(l => {
      novosTeamIds[l.id] = (classificacao[l.id] || l.teamIds.map(String)).slice();
      nomeTemp[l.id] = { paisId: p.id, paisNome: p.name, ligaId: l.id, ligaNome: l.name, tier: l.tier, rebaixados: [], promovidos: [], chegamDeCima: [], chegamDeBaixo: [], paraStandby: [], doStandby: [], ficaram: [] };
    });
    const tirarDoStandby = (n: number): string[] => {
      const escolhidos = embaralhar(doStandbyDisponivel, rnd).slice(0, n);
      escolhidos.forEach(id => { doStandbyDisponivel.splice(doStandbyDisponivel.indexOf(id), 1); reserva = reserva.filter(x => x !== id); });
      return escolhidos;
    };

    // ordem de cada liga (a final); as que nao tem classificacao nao se mexem
    const rank = (l: PaisPlano['leagues'][0]) => classificacao[l.id] || null;

    for (let i = 0; i < ligas.length; i++) {
      const cima = ligas[i], baixo = ligas[i + 1];
      const rc = rank(cima);
      const nDesce = cima.relegated || 0;
      if (!rc || nDesce <= 0) continue;
      const descem = rc.slice(-nDesce);
      const mc = nomeTemp[cima.id];
      if (baixo) {
        // Troca 1 por 1 com a divisao de baixo: descem os ultimos de cima e sobem os primeiros de baixo. Se os numeros nao batem, so se trocam `n` (o resto de quem devia descer fica).
        const rb = rank(baixo);
        const sobem = rb ? rb.slice(0, baixo.promoted || 0) : [];
        const n = Math.min(descem.length, sobem.length);
        const descemTroca = descem.slice(descem.length - n), sobemTroca = sobem.slice(0, n);
        const mb = nomeTemp[baixo.id];
        mc.rebaixados.push(...descemTroca); mc.chegamDeBaixo.push(...sobemTroca); mc.ficaram.push(...descem.slice(0, descem.length - n));
        mb.promovidos.push(...sobemTroca); mb.chegamDeCima.push(...descemTroca);
        novosTeamIds[cima.id] = novosTeamIds[cima.id].filter(id => !descemTroca.includes(id)).concat(sobemTroca);
        novosTeamIds[baixo.id] = novosTeamIds[baixo.id].filter(id => !sobemTroca.includes(id)).concat(descemTroca);
      } else {
        // A ULTIMA divisao: os rebaixados vao para o standby e entram clubes de la (sorteio entre os que ja la estavam). Sem clubes suficientes os rebaixados que sobram ficam.
        const entram = tirarDoStandby(descem.length);
        const saem = descem.slice(descem.length - entram.length);          // saem os piores; os melhores dos rebaixados e que ficam se faltar substituto
        mc.rebaixados.push(...saem); mc.paraStandby.push(...saem); mc.doStandby.push(...entram);
        mc.ficaram.push(...descem.slice(0, descem.length - entram.length));
        reserva.push(...saem);
        novosTeamIds[cima.id] = novosTeamIds[cima.id].filter(id => !saem.includes(id)).concat(entram);
      }
    }
    ligas.forEach(l => movimentos.push(nomeTemp[l.id]));
    standby[p.id] = reserva;
  }
  return { movimentos, novosTeamIds, standby, standbyAntes };
};
