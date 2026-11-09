/*
FIAPOS DE GRAMA VOADOS (pedido: *"quando o jogador furar o chute quero que saia um tufo de grama voado"*). Quando o chute FURA (o gesto completa-se e a bola nao esta no pe, ver `initiateShoot`
em player.js), a chuteira rasga o relvado: `Torroes.lancar(x, z, dirX, dirZ)` solta alguns tufos — fiapos verdes escuros, sem terra — para cima e um pouco para a frente, que descrevem uma
parabola, rodam e se encolhem ao fim de `vida` s. Puro visual: nao toca na bola, no jogador nem em nenhuma estatistica. Um grupo na cena e uma piscina de tufos reaproveitados.
*/
const Torroes = {
    tufosPorLance: 10,
    piscina: 60,
    vida: 1.5,           // s
    gravidade: 9.8,
    vUp: [1.5, 2.8],     // m/s para cima (apice ~0.1-0.4 m: antes subia ate 1.6 m e "ia muito alto")
    vFrente: [1.2, 4.2], // m/s na direcao do chute
    vLado: 1.8,          // m/s para os lados (+-)
    _grupo: null, _tufos: [], _t0: 0,

    _construir() {
        if (typeof THREE === 'undefined' || typeof Match === 'undefined' || !Match.scene) return false;
        if (this._grupo && this._grupo.parent === Match.scene) return true;
        const g = new THREE.Group(); g.name = 'torroes';
        // So FIAPOS de relva verde escura (sem terra): laminas finas, material sem luz para a cor nao "suja" para o marrom.
        const verdes = [0x1c5a22, 0x164a1b, 0x24692a].map(c => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
        const laminaGeo = new THREE.ConeGeometry(0.012, 0.22, 3);
        this._tufos = [];
        for (let i = 0; i < this.piscina; i++) {
            const t = new THREE.Group();
            for (let k = 0; k < 7; k++) {
                const l = new THREE.Mesh(laminaGeo, verdes[k % verdes.length]);
                l.position.set((Math.random() - 0.5) * 0.1, 0.0, (Math.random() - 0.5) * 0.1);
                l.rotation.set((Math.random() - 0.5) * 1.1, 0, (Math.random() - 0.5) * 1.1);
                l.scale.y = 0.7 + Math.random() * 0.8;
                t.add(l);
            }
            t.visible = false;
            g.add(t);
            this._tufos.push({ obj: t, vivo: false, vx: 0, vy: 0, vz: 0, rx: 0, rz: 0, idade: 0 });
        }
        Match.scene.add(g);
        this._grupo = g;
        return true;
    },

    lancar(x, z, dirX, dirZ, qtd) {   // `qtd`: quantos tufos (omissao `tufosPorLance`); os chutes e lancamentos normais soltam poucos
        try {
            if (typeof window === 'undefined' || !this._construir()) return;
            const n = Math.hypot(dirX, dirZ) || 1; dirX /= n; dirZ /= n;
            const sx = -dirZ, sz = dirX;   // perpendicular (lado)
            const r = (a, b) => a + Math.random() * (b - a);
            let feitos = 0;
            for (const t of this._tufos) {
                if (t.vivo) continue;
                const f = r(this.vFrente[0], this.vFrente[1]), l = (Math.random() - 0.5) * 2 * this.vLado;
                t.vx = dirX * f + sx * l; t.vz = dirZ * f + sz * l; t.vy = r(this.vUp[0], this.vUp[1]);
                t.rx = (Math.random() - 0.5) * 14; t.rz = (Math.random() - 0.5) * 14;
                t.idade = 0; t.vivo = true;
                t.obj.position.set(x + dirX * 0.35 + (Math.random() - 0.5) * 0.25, 0.08, z + dirZ * 0.35 + (Math.random() - 0.5) * 0.25);
                t.obj.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
                t.obj.scale.setScalar(r(0.8, 1.5));
                t.obj.visible = true;
                if (++feitos >= (qtd || this.tufosPorLance)) break;
            }
        } catch (e) { /* visual: nunca derruba o jogo */ }
    },

    // Chamado do ciclo de desenho (main.js, junto de PlacasLed.tick).
    tick() {
        if (!this._grupo) return;
        const agora = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000;
        const dt = this._t0 ? Math.min(0.05, agora - this._t0) : 0; this._t0 = agora;
        for (const t of this._tufos) {
            if (!t.vivo) continue;
            t.idade += dt;
            if (t.idade >= this.vida) { t.vivo = false; t.obj.visible = false; continue; }
            const o = t.obj;
            if (o.position.y > 0.05 || t.vy > 0) {
                t.vy -= this.gravidade * dt;
                o.position.x += t.vx * dt; o.position.z += t.vz * dt; o.position.y += t.vy * dt;
                o.rotation.x += t.rx * dt; o.rotation.z += t.rz * dt;
                if (o.position.y <= 0.05) { o.position.y = 0.05; t.vx = t.vz = t.vy = 0; }   // pousou
            }
            const fim = this.vida - t.idade;   // encolhe nos ultimos 0.4 s
            if (fim < 0.4) o.scale.multiplyScalar(Math.max(0.01, 1 - dt * 3.0));
        }
    }
};
if (typeof window !== 'undefined') window.Torroes = Torroes;
