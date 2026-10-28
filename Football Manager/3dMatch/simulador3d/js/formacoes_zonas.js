/*
=============================================================================
FORMAÇÕES POR ZONA — a leitura das tabelas do tacticsEditor.html (data/formacoes_zonas.js)
=============================================================================
Cada formação tem, para as duas fases (`com` bola e `sem` bola), 9 posições-de-equipa (uma por ZONA da bola, 3x3) com os 11 jogadores. Este módulo é
só a LEITURA: dado onde a bola está (no referencial de ataque da equipa) devolve onde cada jogador deve estar, com INTERPOLAÇÃO bilinear entre as 4 zonas
mais próximas — assim a equipa desliza com a bola em vez de saltar ao cruzar a fronteira de uma zona.

Coordenadas (as da tabela): normalizadas no referencial de ataque, x em [-1, 1] (meia-largura de 34 m; o sinal é o de FormationsData: +x = o lado do lateral
esquerdo), z em [-1, 1] (meia-altura de 53 m; +1 = a baliza adversária).

As zonas: colunas pelo x da bola (esquerda < -`corredorX` <= centro <= `corredorX` < direita), linhas pelo z (terço defensivo < -`terco` <= meio <= `terco` < ofensivo).
Índice = linha * 3 + coluna. Os CENTROS usados na interpolação são os do meio de cada zona: x em {-(corredorX + L)/2, 0, +...}, z em {-(terco + H)/2, 0, +...}.

Puro: sem Three.js, sem Match. Usado pelo editor (preview) e, quando o motor o ligar, pela camada de posicionamento.
=============================================================================
*/
const FormacoesZonasLib = {
    // 'mgr:4-4-2#fora' -> '4-4-2'; '433' -> '433'.
    chaveDaFormacao: function (chave) {
        return String(chave || '').replace(/^mgr:/, '').replace(/#fora$/, '');
    },

    // Centros das 3 colunas (x, em metros, referencial de ataque) e das 3 linhas (z), a partir das fronteiras da tabela.
    centros: function (T) {
        const L = (T && T.meiaLargura) || 34, H = (T && T.meiaAltura) || 53;
        const cx = (T && T.corredorX) || 11.33, tz = (T && T.terco) || 18.25;
        return { x: [-(cx + L) / 2, 0, (cx + L) / 2], z: [-(tz + H) / 2, 0, (tz + H) / 2] };
    },

    // A zona (0..8) onde a bola está (metros, referencial de ataque).
    zonaDaBola: function (T, xAtk, zAtk) {
        const cx = (T && T.corredorX) || 11.33, tz = (T && T.terco) || 18.25;
        const col = xAtk < -cx ? 0 : (xAtk > cx ? 2 : 1);
        const lin = zAtk < -tz ? 0 : (zAtk > tz ? 2 : 1);
        return lin * 3 + col;
    },

    // Pesos bilineares: até 4 zonas { zona, w } com soma 1, para a bola em (xAtk, zAtk) metros.
    pesos: function (T, xAtk, zAtk) {
        const C = this.centros(T);
        const eixo = (v, c) => {
            if (v <= c[0]) return [[0, 1]];
            if (v >= c[2]) return [[2, 1]];
            const i = v < c[1] ? 0 : 1;
            const t = (v - c[i]) / (c[i + 1] - c[i]);
            return [[i, 1 - t], [i + 1, t]];
        };
        const out = [];
        for (const [lin, wl] of eixo(zAtk, C.z)) for (const [col, wc] of eixo(xAtk, C.x)) {
            const w = wl * wc;
            if (w > 1e-9) out.push({ zona: lin * 3 + col, w });
        }
        return out;
    },

    // As 11 posições (normalizadas) da formação para a bola em (xAtk, zAtk) e a fase; null se a formação não existe.
    posicoes: function (T, chave, xAtk, zAtk, comBola) {
        // A chave exacta primeiro ('mgr:4-4-2' / 'mgr:4-4-2#fora': tabela PROPRIA da equipa, com os ajustes do treinador; ver AdaptadorManager.registarZonas), depois a da formacao.
        const F = T && T.formacoes ? (T.formacoes[chave] || T.formacoes[this.chaveDaFormacao(chave)]) : null;
        if (!F) return null;
        // `comBola` pode ser um numero 0..1 (a parte da tabela COM bola): na transicao as duas fases misturam-se em vez de uma saltar para a outra.
        const wc = comBola === true ? 1 : (comBola === false || !comBola ? 0 : Math.max(0, Math.min(1, comBola)));
        const ps = this.pesos(T, xAtk, zAtk);
        const n = F.slots.length, res = [];
        for (let i = 0; i < n; i++) {
            let x = 0, z = 0;
            for (const p of ps) {
                const c = F.com[p.zona][i], s = F.sem[p.zona][i];
                x += (c.x * wc + s.x * (1 - wc)) * p.w; z += (c.z * wc + s.z * (1 - wc)) * p.w;
            }
            res.push({ x, z });
        }
        return res;
    },

    // O jogador `slot` em metros do referencial de ataque (x e z multiplicados pela meia-largura/meia-altura).
    emMetros: function (T, p) {
        return { x: p.x * ((T && T.meiaLargura) || 34), z: p.z * ((T && T.meiaAltura) || 53) };
    }
};
if (typeof window !== 'undefined') window.FormacoesZonasLib = FormacoesZonasLib;
if (typeof module !== 'undefined' && module.exports) module.exports = FormacoesZonasLib;
