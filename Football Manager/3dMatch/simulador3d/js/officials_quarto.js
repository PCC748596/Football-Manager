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
    alturaDoCentro: 2.17,     // do relvado ao centro da placa, com os bracos erguidos (m)
    xPlaca: 35.2,             // com a placa no ar o 4.o arbitro chega-se a linha lateral (34); sem ela volta ao x de cima
    recuoPlaca: 0.06,         // a placa a esta distancia do corpo, para a frente (m)
    // Bracos erguidos (rad, convencao do rig: x negativo = para a frente/cima).
    bracoX: -3.0, bracoZ: 0.22, cotovelo: -0.10
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
        g.position.set(0, Q.alturaDoCentro / esc, Q.recuoPlaca / esc);
        o.model.add(g);
        return g;
    },

    // Escreve os numeros: `sai` a vermelho (esquerda), `entra` a verde (direita), em PONTOS de led (matriz 5x7 por digito, os apagados em tom escuro).
    mostrarPlaca: function (sai, entra) {
        const o = this.quarto;
        if (!o || !o.placa) return;
        const FONTE = {
            '0': ['01110','10001','10011','10101','11001','10001','01110'], '1': ['00100','01100','00100','00100','00100','00100','01110'],
            '2': ['01110','10001','00001','00010','00100','01000','11111'], '3': ['11110','00001','00001','01110','00001','00001','11110'],
            '4': ['00010','00110','01010','10010','11111','00010','00010'], '5': ['11111','10000','11110','00001','00001','10001','01110'],
            '6': ['00110','01000','10000','11110','10001','10001','01110'], '7': ['11111','00001','00010','00100','01000','01000','01000'],
            '8': ['01110','10001','10001','01110','10001','10001','01110'], '9': ['01110','10001','10001','01111','00001','00010','01100'],
            ' ': ['00000','00000','00000','00000','00000','00000','00000']
        };
        const cv = o.placa.userData.cv, c = cv.getContext('2d');
        c.fillStyle = '#0b0d10'; c.fillRect(0, 0, 512, 256);
        const celX = 21, celY = 26, r = 8.5;          // 11 colunas (2 digitos + 1 de espaco) x 7 linhas por numero
        const desenhar = (n, x0, aceso, apagado, brilho) => {
            const txt = String(n).padStart(2, ' ').slice(-2);
            for (let d = 0; d < 2; d++) {
                const g = FONTE[txt[d]] || FONTE[' '];
                for (let l = 0; l < 7; l++) for (let col = 0; col < 5; col++) {
                    const on = g[l][col] === '1';
                    c.shadowBlur = on ? 10 : 0; c.shadowColor = brilho;
                    c.fillStyle = on ? aceso : apagado;
                    c.beginPath(); c.arc(x0 + (d * 6 + col) * celX + celX / 2, 37 + l * celY + celY / 2, r, 0, Math.PI * 2); c.fill();
                }
            }
            c.shadowBlur = 0;
        };
        desenhar(sai, 12, '#ff3b30', '#2a1210', '#ff2a2a');
        desenhar(entra, 270, '#30d158', '#10241a', '#2dff6a');
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
        o.model.position.x = Q.x + (Q.xPlaca - Q.x) * k;
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
