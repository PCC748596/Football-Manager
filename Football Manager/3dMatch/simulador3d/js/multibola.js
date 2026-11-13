/*
=============================================================================
MultiBola — os cones com as bolas de reserva e a busca da bola nas reposicoes
=============================================================================
Spec: docs/superpowers/specs/2026-11-12-multibola-design.md; config: MultiBolaModel (js/config/multibola.js).
Lateral primeiro; o tiro de meta e o canto reaproveitam a mesma busca.
=============================================================================
*/
const MultiBola = {
    cones: [],          // [{ x, z, temBola, grupo }]
    busca: null,        // a busca em curso (ver comecarLateral)

    /** As posicoes dos 15 cones (puras: so da config). */
    posicoesDosCones() {
        const M = MultiBolaModel;
        const meiaL = CAMPO_LARG / 2, meiaC = CAMPO_COMP / 2;
        const ladoBancos = Math.sign((typeof TunelJogadores !== 'undefined' && TunelJogadores.lado) || -1) || -1;
        const out = [];
        for (const z of M.zLateralOposta) out.push({ x: -ladoBancos * (meiaL + M.foraDaLinha), z });
        for (const z of M.zLateralBancos) out.push({ x: ladoBancos * (meiaL + M.foraDaLinha), z });
        for (const s of [-1, 1]) for (const x of M.xAtrasDaBaliza) out.push({ x, z: s * (meiaC + M.foraDaLinha) });
        return out;
    },

    /** Cria os cones (e, com `scene`, o desenho deles). Chamar uma vez por jogo. */
    iniciar(scene) {
        for (const c of this.cones) if (c.grupo && c.grupo.parent) c.grupo.parent.remove(c.grupo);
        this.cones = this.posicoesDosCones().map(p => ({ x: p.x, z: p.z, temBola: true, grupo: null, bola: null }));
        this.busca = null;
        if (!scene || typeof THREE === 'undefined') return;
        const C = MultiBolaModel.cone;
        const matCone = new THREE.MeshStandardMaterial({ color: C.cor, roughness: 0.6 });
        const geoCone = new THREE.ConeGeometry(C.raio, C.altura, 16);
        const raio = (typeof BallPhysics !== 'undefined' && BallPhysics.raio) || 0.11;
        for (const c of this.cones) {
            const g = new THREE.Group();
            const cone = new THREE.Mesh(geoCone, matCone);
            cone.position.y = C.altura / 2;
            g.add(cone);
            // A bola de reserva: uma copia do desenho da bola de jogo, se houver; senao uma esfera branca.
            let bola = null;
            if (typeof Match !== 'undefined' && Match.ballVisual && Match.ballVisual.clone) bola = Match.ballVisual.clone(true);
            else bola = new THREE.Mesh(new THREE.SphereGeometry(raio, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
            bola.position.set(0, C.altura + raio * 0.8, 0);
            g.add(bola);
            g.position.set(c.x, 0, c.z);
            scene.add(g);
            c.grupo = g; c.bola = bola;
        }
    },

    /** O indice do cone COM BOLA mais proximo de (x, z); -1 se nao ha nenhum. */
    coneMaisProximo(x, z) {
        let melhor = -1, d = Infinity;
        const lista = this.cones.length ? this.cones : this.posicoesDosCones().map(p => Object.assign({ temBola: true }, p));
        lista.forEach((c, i) => {
            if (!c.temBola) return;
            const di = Math.hypot(c.x - x, c.z - z);
            if (di < d) { d = di; melhor = i; }
        });
        return melhor;
    },

    _mostrarBolaDoCone(i, sim) {
        const c = this.cones[i];
        if (!c) return;
        c.temBola = sim;
        if (c.bola) c.bola.visible = sim;
    }
};

if (typeof window !== 'undefined') window.MultiBola = MultiBola;
