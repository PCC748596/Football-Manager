/*
=============================================================================
O ARBITRO RESERVA (4.o arbitro) E A PLACA DE SUBSTITUICOES
=============================================================================
Na lateral do lado dos bancos, no meio entre os dois (z = 0), com o uniforme do trio (o `Officials.vestir` inclui-o). Parado de frente para o campo; numa
substituicao levanta a placa com dois numeros — VERMELHO quem sai, VERDE quem entra — e baixa-a depois (ver match_substituicoes.js).

`Officials.quarto` = { model, rig, jogador, placa, braco } como os outros oficiais. `braco` (0..1) e o quanto os bracos estao erguidos.
=============================================================================
*/
const QuartoArbitro = {
    activo: true,
    x: 37.4,                  // entre a linha lateral (34) e as placas de publicidade (39), no meio entre os dois bancos
    z: 0,
    larguraPlaca: 0.95, alturaPlaca: 0.46,   // metros
    alturaDoCentro: 2.45,     // do relvado ao centro da placa, com os bracos erguidos (m)
    // Bracos erguidos (rad, convencao do rig: x negativo = para a frente/cima).
    bracoX: -2.85, bracoZ: 0.22, cotovelo: -0.25
};
if (typeof window !== 'undefined') window.QuartoArbitro = QuartoArbitro;

Object.assign(Officials, {
    quarto: null,

    criarQuarto: function (scene) {
        const Q = QuartoArbitro;
        if (!Q.activo || this.quarto) return null;
        const o = this.criarOficial(scene, 3, 'Q');
        o.model.position.set(Q.x, 0, Q.z);
        o.model.rotation.y = -Math.PI / 2;           // de frente para o campo (-X)
        o.braco = 0;
        o.placa = this._criarPlaca(o);
        this.quarto = o;
        return o;
    },

    // A placa: uma caixa fina com a textura dos dois numeros, pendurada do corpo (escala do corpo compensada).
    _criarPlaca: function (o) {
        const Q = QuartoArbitro;
        const esc = o.model.scale.x || 1;
        const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
        const tex = new THREE.CanvasTexture(cv);
        const mat = new THREE.MeshBasicMaterial({ map: tex });
        const corpoMat = new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.6 });
        const g = new THREE.Mesh(new THREE.BoxGeometry(Q.larguraPlaca / esc, Q.alturaPlaca / esc, 0.05 / esc), [corpoMat, corpoMat, corpoMat, corpoMat, mat, mat]);
        g.visible = false;
        g.userData = { cv: cv, tex: tex };
        // Acima da cabeca, virada para o campo (o corpo olha para -X; o `model` roda, a placa e filha dele: a face +z do filho e a frente).
        g.position.set(0, Q.alturaDoCentro / esc, 0.25 / esc);
        o.model.add(g);
        return g;
    },

    // Escreve os numeros: `sai` a vermelho (esquerda), `entra` a verde (direita), em "digitos" de led.
    mostrarPlaca: function (sai, entra) {
        const o = this.quarto;
        if (!o || !o.placa) return;
        const cv = o.placa.userData.cv, c = cv.getContext('2d');
        c.fillStyle = '#0b0d10'; c.fillRect(0, 0, 512, 256);
        c.fillStyle = '#6b7280'; c.fillRect(8, 8, 496, 6); c.fillRect(8, 242, 496, 6);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = 'bold 190px "Courier New", monospace';
        const digitos = (n) => String(n).padStart(2, ' ');
        c.shadowBlur = 18;
        c.shadowColor = '#ff2a2a'; c.fillStyle = '#ff3b30'; c.fillText(digitos(sai), 135, 132);
        c.shadowColor = '#2dff6a'; c.fillStyle = '#30d158'; c.fillText(digitos(entra), 380, 132);
        c.shadowBlur = 0;
        o.placa.userData.tex.needsUpdate = true;
        o.placa.visible = true;
        o.placa.userData.numeros = { sai: sai, entra: entra };
    },

    esconderPlaca: function () {
        const o = this.quarto;
        if (o && o.placa) o.placa.visible = false;
    },

    // Os bracos sobem (k -> 1) ou descem (k -> 0) em `dur` s; escreve a pose todos os frames (o quarto nao passa pelo `mover`).
    tickQuarto: function (dt, erguer) {
        const o = this.quarto;
        if (!o || !o.rig) return;
        const Q = QuartoArbitro;
        const alvo = erguer ? 1 : 0;
        o.braco += Math.max(-1, Math.min(1, alvo - o.braco)) * Math.min(1, dt / 0.7);
        if (Math.abs(alvo - o.braco) < 0.01) o.braco = alvo;
        const k = o.braco;
        const r = o.rig;
        if (k > 0 || o._erguido) {
            r.lArm.rotation.x = Q.bracoX * k; r.rArm.rotation.x = Q.bracoX * k;
            r.lArm.rotation.z = Q.bracoZ * k; r.rArm.rotation.z = -Q.bracoZ * k;
            r.lElbow.rotation.x = Q.cotovelo * k; r.rElbow.rotation.x = Q.cotovelo * k;
            o._erguido = k > 0;
            if (k === 0) { r.lArm.rotation.set(0, 0, Math.PI / 12); r.rArm.rotation.set(0, 0, -Math.PI / 12); }
        }
        if (k === 0 && o.placa && !erguer) o.placa.visible = false;
    }
});

/*
=============================================================================
O BANDEIRINHA SINALIZA A SUBSTITUICAO (imagem 15B0): com a troca em curso o assistente do lado dos bancos levanta a bandeira com as DUAS maos acima da cabeca, na
horizontal, depois das marcacoes normais, e baixa-a quando a troca acaba. Escreve a pose DEPOIS do `Officials.update` (que reescreve os bracos todos os frames).
`Match.subsEmCurso` liga-o (ver match_substituicoes.js).
=============================================================================
*/
const BandeiraSubstituicao = { braco: -2.75, abre: 0.30, cotovelo: -0.30, bandeiraRoll: Math.PI / 2, velocidade: 0.8 };
if (typeof window !== 'undefined') window.BandeiraSubstituicao = BandeiraSubstituicao;

Object.assign(Officials, {
    _kBandeiraSub: 0,

    _aplicarBandeiraSubstituicao: function (dt) {
        const a = this.assistentes && this.assistentes[0];
        if (!a || !a.rig) return;
        const B = BandeiraSubstituicao;
        const alvo = (typeof Match !== 'undefined' && Match.subsEmCurso) ? 1 : 0;
        const k0 = this._kBandeiraSub;
        this._kBandeiraSub += Math.max(-1, Math.min(1, alvo - k0)) * Math.min(1, dt / B.velocidade);
        if (Math.abs(alvo - this._kBandeiraSub) < 0.01) this._kBandeiraSub = alvo;
        const k = this._kBandeiraSub;
        if (k === 0 && k0 === 0) return;
        const r = a.rig;
        r.lArm.rotation.set(B.braco * k, 0, B.abre * k);
        r.rArm.rotation.set(B.braco * k, 0, -B.abre * k);
        r.lElbow.rotation.x = B.cotovelo * k; r.rElbow.rotation.x = B.cotovelo * k;
        if (a.bandeiraMesh) a.bandeiraMesh.rotation.z = B.bandeiraRoll * k;
    },

    _instalarBandeiraSubstituicao: function () {
        if (this._wrapBandeiraSub || typeof this.update !== 'function') return;
        this._wrapBandeiraSub = true;
        const original = this.update;
        this.update = function (dt) {
            const r = original.call(this, dt);
            this._aplicarBandeiraSubstituicao(dt);
            return r;
        };
    }
});
Officials._instalarBandeiraSubstituicao();
