/*
=============================================================================
A DISPUTA DE PENALTIS — as medidas (ver js/disputa_penaltis.js)
=============================================================================
Geometria PURA (sem THREE): os testes (tests/disputa_posicoes.test.js) leem este ficheiro e correm as funcoes. Eixos: x lateral (-34..+34), z do campo (-53..+53);
`sinalZ` e o sinal da baliza usada (+1: baliza em z = +53), `ladoBanco` o sinal de x onde ficam os bancos e os tecnicos.

  tecnico    4 m para dentro da linha lateral, em z perto do meio-campo, no lado do banco do time (`posTecnico`).
  meia-lua   o time em duas fileiras (raios 5 m e 7 m) em volta do tecnico, abertas para o campo, em posicoes aleatorias sem colisao (`meiaLua`).
  fila       os que esperam, lado a lado sobre a linha do meio, um time de cada lado da marca central (`filaCentral`).
  baliza     o goleiro que NAO defende espera SOBRE a linha lateral da grande area, a 5 m da linha de fundo; o bandeirinha fica sobre a linha de fundo, em cima da
             linha da grande area, do OUTRO lado (os dois nunca no mesmo sitio). O juiz fica onde fica no penalti em jogo (PenaltyModel.arbitroX, ver
             Officials.pontoDoArbitro); o batedor espera ao lado da linha da bola como no penalti em jogo (PenaltyModel.desvioBatedor).
=============================================================================
*/
const DisputaModel = {
    campo: { larg: typeof CAMPO_LARG !== 'undefined' ? CAMPO_LARG : 68, comp: typeof CAMPO_COMP !== 'undefined' ? CAMPO_COMP : 106 },
    area: {
        marcaZ: typeof Area !== 'undefined' ? Area.distanciaPenalti : 11.0,           // da linha de fundo a marca
        pequenaMeiaLargura: typeof Area !== 'undefined' ? Area.pequenaMeiaLargura : 9.16,
        grandeMeiaLargura: typeof Area !== 'undefined' ? Area.meiaLargura : 20.16
    },
    recuoBatedor: typeof PenaltyModel !== 'undefined' ? PenaltyModel.recuoBatedor : 5.7,   // onde o batedor espera, atras da marca
    desvioBatedor: typeof PenaltyModel !== 'undefined' ? PenaltyModel.desvioBatedor : 1.2, // e para o lado contrario ao pe bom (o mesmo do penalti em jogo)
    tecnico: { recuoDaLinha: 4.0, zDoMeio: 8.0 },
    // `distMin`: distancia minima entre dois jogadores (m, garantida pelo `jitter` pequeno); `abertura`: abertura do arco (rad); `jitter`: fracao do passo angular que o sorteio pode mexer.
    meiaLuaCfg: { raios: [5.0, 7.0], abertura: Math.PI * 0.9, jitter: 0.3, distMin: 1.2 },
    fila: { passo: 1.15, folgaDaMarca: 1.5 },
    goleiroEspera: { recuoDaLinhaDeFundo: 5.0 },
    // O juiz: o mesmo sitio do penalti em jogo (Officials.pontoDoArbitro, ramo PENALTY): lateral da pequena area, alinhado com a marca, a esquerda do batedor.
    juiz: { arbitroX: typeof PenaltyModel !== 'undefined' ? PenaltyModel.arbitroX : 9.16 },
    // m/s. Eram 1.9 / 1.4 / 1.9 / 2.4 / 2.4 (passo de passeio: relato "andam para o tecnico certo, mas devagar; o jogo parece lento"): agora um trote vivo para a meia-lua,
    // a fila e os postos (cada `dt` ja vem multiplicado pela velocidade do jogo do manager, `speedMultiplier`, como no jogo normal).
    velocidade: { jogador: 3.2, tecnico: 2.2, juiz: 3.0, goleiro: 3.5, bandeirinha: 3.5 },
    prazo: { reuniao: 45, preparo: 30, app: 30, ordem: 300, cobranca: 7 },   // `app`: a resposta automatica da app entre cobrancas; `ordem`: a decisao HUMANA da ordem dos batedores (o modal do manager)
    // `esperaBatida`: s PARADO na espera antes de a corrida do penalti comecar (pedido: "uns 4 segundos"), somado antes da corrida do penalti em jogo (Match.penaltiEspera).
    pausa: { entrega: 1.0, ajeitar: 0.8, aposContato: 1.2, fim: 4.0, levantar: 0.8, esperaBatida: 4.0 },   // `levantar`: s depois do fim da cobranca ate o goleiro (e o batedor) ficarem de pe onde estao

    // O tecnico, ao lado do banco: `zBanco` e o z do centro do banco do time; fica a `zDoMeio` do meio-campo, no mesmo lado do eixo.
    posTecnico(ladoBanco, zBanco) {
        return { x: ladoBanco * (this.campo.larg / 2 - this.tecnico.recuoDaLinha), z: (Math.sign(zBanco) || 1) * (Math.abs(zBanco) < this.tecnico.zDoMeio ? Math.abs(zBanco) : this.tecnico.zDoMeio) };
    },

    /*
    A meia-lua: `n` pontos em volta de `centro`, abertos para o CAMPO (o lado oposto ao banco). Duas fileiras: a de dentro (raio menor) leva ceil(n/2). Em cada uma os angulos
    saem equidistantes dentro da abertura, com um sorteio de ate `jitter` do passo angular — posicoes aleatorias, mas nunca coladas (distMin).
    */
    meiaLua(centro, n, ladoBanco, rnd) {
        const C = this.meiaLuaCfg;
        const out = [];
        const nInterna = Math.ceil(n / 2);
        const fileiras = [{ r: C.raios[0], m: nInterna }, { r: C.raios[1], m: n - nInterna }];
        for (const f of fileiras) {
            for (let i = 0; i < f.m; i++) {
                const passo = C.abertura / f.m;
                const ang = -C.abertura / 2 + (i + 0.5) * passo + (rnd() - 0.5) * 2 * C.jitter * passo * 0.5;
                out.push({ x: centro.x - ladoBanco * f.r * Math.cos(ang), z: centro.z + f.r * Math.sin(ang) });
            }
        }
        // Mais de uma volta para baralhar quem fica em cada lugar (o sorteio e dos lugares, nao dos jogadores: quem chama atribui por indice).
        for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = out[i]; out[i] = out[j]; out[j] = t; }
        return out;
    },

    // Lado a lado sobre a linha do meio (z = 0): a casa para -x, o fora para +x, a partir da marca central, `passo` entre eles.
    filaCentral(nCasa, nFora) {
        const F = this.fila;
        const fazer = (n, s) => Array.from({ length: n }, (_, i) => ({ x: s * (F.folgaDaMarca + i * F.passo), z: 0 }));
        return { casa: fazer(nCasa, -1), fora: fazer(nFora, 1) };
    },

    posGol(sinalZ) { return { x: 0, z: sinalZ * this.campo.comp / 2 }; },
    posMarca(sinalZ) { return { x: 0, z: sinalZ * (this.campo.comp / 2 - this.area.marcaZ) }; },
    /*
    O batedor a espera: `recuoBatedor` atras da marca e `desvioBatedor` para o lado contrario ao pe bom, com a conta do `setupSetPiece` (PENALTY): destro (pe != 'e') para a
    esquerda de quem corre no sentido `sinalZ` (x = +sinalZ), canhoto para a direita.
    */
    posEsperaBatedor(sinalZ, pe) {
        const m = this.posMarca(sinalZ), lado = (pe === 'e') ? -1 : 1;
        return { x: lado * sinalZ * this.desvioBatedor, z: m.z - sinalZ * this.recuoBatedor };
    },
    // O juiz, como no penalti em jogo: x = arbitroX * attDir (attDir = sinalZ, o sentido do batedor), z da marca.
    posJuiz(sinalZ) { const m = this.posMarca(sinalZ); return { x: this.juiz.arbitroX * sinalZ, z: m.z }; },

    // O goleiro que nao defende: SOBRE a linha lateral da grande area, a 5 m da linha de fundo, do lado `ladoX` (o contrario do bandeirinha).
    posGoleiroEspera(sinalZ, ladoX) {
        return { x: ladoX * this.area.grandeMeiaLargura, z: sinalZ * (this.campo.comp / 2 - this.goleiroEspera.recuoDaLinhaDeFundo) };
    },

    // O bandeirinha: sobre a linha de fundo, em cima da linha lateral da grande area.
    posBandeirinha(sinalZ, ladoX) { return { x: ladoX * this.area.grandeMeiaLargura, z: sinalZ * this.campo.comp / 2 }; }
};
if (typeof window !== 'undefined') window.DisputaModel = DisputaModel;
