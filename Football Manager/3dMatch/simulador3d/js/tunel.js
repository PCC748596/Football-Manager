/*
=============================================================================
O TUNEL DOS JOGADORES — a caixa (ver TunelJogadores, config/tunel.js)
=============================================================================
O corte nos degraus e as aberturas nas placas/no pessoal fazem-se no createField (match_setup.js) e no
Staff.build. Aqui fica so a CAIXA que fecha o buraco: chao escuro, duas paredes, tecto, fundo e uma faixa de luz
sob o tecto (emissiva — nao custa uma luz a sério) para o corredor nao ler como um buraco preto.

A caixa fica entre `xBoca` (a frente do 1.o degrau) e `xFundo` (a frente do degrau a seguir ao ultimo cortado, que
serve de parede do fundo). Tudo em x do lado `lado`; a abertura e em z = 0.
=============================================================================
*/
const Tunel = {
    construir: function (grupo) {
        const T = (typeof TunelJogadores !== 'undefined') ? TunelJogadores : null;
        if (!T || !T.activo || !grupo || typeof THREE === 'undefined') return null;

        const L = Math.abs(T.xFundo - T.xBoca);
        const xc = (T.xBoca + T.xFundo) / 2;
        const W = T.largura, H = T.alturaPassagem, t = T.espessuraParede;
        const g = new THREE.Group();
        g.name = 'tunel_jogadores';

        const mat = (cor, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: cor, roughness: 0.9 }, extra || {}));
        const caixa = (dx, dy, dz, x, y, z, m, sombra) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(dx, dy, dz), m);
            mesh.position.set(x, y, z);
            mesh.castShadow = !!sombra;
            mesh.receiveShadow = false;
            g.add(mesh);
            return mesh;
        };

        // Chao (um dedo acima do relvado: nao briga com ele no teste de profundidade).
        caixa(L, 0.06, W, xc, 0.04, 0, mat(T.cores.chao), false);
        // Paredes e tecto.
        const hP = H + 0.3;
        // Com `cores.dentro` (estádio oval) só a face de DENTRO é dessa cor (preta); o resto, por fora, fica na cor da parede/tecto.
        // Ordem das faces de uma caixa: +x, -x, +y, -y, +z, -z.
        const comDentro = (fora, idx) => {
            if (!T.cores.dentro) return mat(fora);
            const d = mat(T.cores.dentro), f = mat(fora);
            return [0, 1, 2, 3, 4, 5].map(i => i === idx ? d : f);
        };
        caixa(L, hP, t, xc, hP / 2, W / 2 + t / 2, comDentro(T.cores.parede, 5), true);
        caixa(L, hP, t, xc, hP / 2, -(W / 2 + t / 2), comDentro(T.cores.parede, 4), true);
        // O tecto e um pouco MAIOR em altura e mais curto/estreito do que as paredes (2 cm / 1 cm): com as mesmas medidas as faces do topo, as
        // pontas e as faces de fora das paredes e do tecto ficavam no MESMO plano e brigavam no teste de profundidade (textura a piscar).
        caixa(L - 0.02, 0.32, W + 2 * t - 0.02, xc, H + 0.16, 0, comDentro(T.cores.tecto, 3), true);
        // Fundo escuro, a frente da face do degrau que fecha o corredor.
        caixa(0.1, H, W, T.xFundo - T.lado * 0.05, H / 2, 0,
            new THREE.MeshBasicMaterial({ color: T.cores.fundo }), false);
        // Com `cores.dentro`: um revestimento PRETO por dentro de tudo (uma caixa vista de dentro, sem luz): o que está atrás das paredes
        // e do tecto — os degraus que sobem na diagonal — deixa de se ver. Só a boca, a frente, fica aberta.
        if (T.cores.dentro) {
            const fx = L - 0.12, fy = H - 0.04, fz = W - 0.04;
            const forro = new THREE.Mesh(new THREE.BoxGeometry(fx, fy, fz), new THREE.MeshBasicMaterial({ color: T.cores.dentro, side: THREE.BackSide }));
            forro.position.set(xc, 0.07 + fy / 2, 0);
            g.add(forro);
        }
        // A luz do tecto: faixa emissiva (nao ilumina nada, mas le-se como iluminacao).
        caixa(L - 0.6, 0.04, 0.5, xc, H - 0.03, 0,
            new THREE.MeshBasicMaterial({ color: 0xfff1c9 }), false);

        grupo.add(g);
        return g;
    }
};
if (typeof window !== 'undefined') window.Tunel = Tunel;
