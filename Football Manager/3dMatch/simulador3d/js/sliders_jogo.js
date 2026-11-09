/*
SLIDERS DE AJUSTE EM TEMPO REAL (como os sliders do FIFA).

O botao "Sliders" da barra de tela cheia (js/narracao/ponte.js) abre um painel com os parametros que se estao a afinar. Cada slider vai de 0 a 100
e 50 e SEMPRE o valor padrao que esta no codigo: o valor aplicado e `padrao * slider / 50` (0 = zero, 100 = o dobro), limitado a `max` quando o parametro
tem teto (probabilidades, por exemplo). Mexer no slider muda o valor JA, no jogo a correr.

"Copy values" copia para a area de transferencia o valor final de cada parametro (JSON) para colar na conversa e virar o novo padrao. "Reset" volta tudo a 50.
Nao ha persistencia: ao recarregar a partida volta tudo ao padrao do codigo.

Para juntar um parametro novo basta uma linha em `SlidersJogo.parametros`: { id, nome, grupo, ler, escrever, max?, casas? }.
*/
const SlidersJogo = {
    aberto: false,
    padroes: null,   // id -> valor do codigo, capturado na primeira abertura
    posicoes: {},    // id -> posicao do slider (0..100)

    /*
    Um slider que multiplica VARIOS campos de uma vez (o padrao do slider e 1.0 = x1): `campos` e uma lista de [() => objecto, 'chave'].
    Os valores originais ficam guardados na primeira leitura. `teto` limita cada campo (probabilidades).
    */
    _fator(campos, teto) {
        const orig = [];
        const cap = () => { if (!orig.length) for (const [o, k] of campos) orig.push(o()[k]); };
        return {
            ler: () => 1,
            escrever: (f) => { cap(); campos.forEach(([o, k], i) => { let v = orig[i] * f; if (typeof teto === 'number') v = Math.min(teto, v); o()[k] = v; }); }
        };
    },

    parametros: [
        { id: 'VelocidadeHumana.escala', grupo: 'Movement', nome: 'Sprint speed (x)', ler: () => VelocidadeHumana.escala, escrever: v => { VelocidadeHumana.escala = v; }, casas: 2 },
        { id: 'PassErrorModel.fator', grupo: 'Passing', nome: 'Pass error (x)', casas: 2 },
        { id: 'PassModel.velMaxSaida', grupo: 'Passing', nome: 'Pass speed cap (m/s)', ler: () => PassModel.velMaxSaida, escrever: v => { PassModel.velMaxSaida = v; }, casas: 1 },
        { id: 'ShotModel.erro.escalaGlobal', grupo: 'Shooting', nome: 'Shot error (x)', ler: () => ShotModel.erro.escalaGlobal, escrever: v => { ShotModel.erro.escalaGlobal = v; }, casas: 2 },
        { id: 'ShotModel.factorForca', grupo: 'Shooting', nome: 'Shot speed (x)', ler: () => ShotModel.factorForca, escrever: v => { ShotModel.factorForca = v; }, casas: 2 },
        { id: 'FirstTouchModel.chance', grupo: 'Ball control', nome: 'First-touch control chance (x)', casas: 2 },
        { id: 'GoalkeeperDive.alcanceBraco', grupo: 'Goalkeeper', nome: 'GK arm reach (m)', ler: () => GoalkeeperDive.alcanceBraco, escrever: v => { GoalkeeperDive.alcanceBraco = v; }, casas: 2 },
        { id: 'GoalkeeperDive.velLateral', grupo: 'Goalkeeper', nome: 'GK dive speed (m/s)', ler: () => GoalkeeperDive.velLateral, escrever: v => { GoalkeeperDive.velLateral = v; }, casas: 1 },
        { id: 'MarkingModel.distancia', grupo: 'Defending', nome: 'Marking distance (m)', ler: () => MarkingModel.distancia, escrever: v => { MarkingModel.distancia = v; }, casas: 2 },
        { id: 'WideAnchor.lateral', grupo: 'Positioning', nome: 'Fullback width (x)', casas: 2 },
        { id: 'WideAnchor.ala', grupo: 'Positioning', nome: 'Wide midfielder width (x)', casas: 2 },
        { id: 'TurnModel.escala', grupo: 'Movement', nome: 'Body turn speed (x base)', ler: () => TurnModel.escala, escrever: v => { TurnModel.escala = v; }, casas: 2 },
        { id: 'TurnModel.amplitude', grupo: 'Movement', nome: 'Agility influence on turn', ler: () => TurnModel.amplitude, escrever: v => { TurnModel.amplitude = v; }, casas: 2 },
        { id: 'PassModel.bonusVirada', grupo: 'Passing', nome: 'Switch-of-play bonus (pts)', ler: () => PassModel.bonusVirada, escrever: v => { PassModel.bonusVirada = v; }, casas: 0 },
        { id: 'PassModel.viradaJanela', grupo: 'Passing', nome: 'Switch-of-play window (s)', ler: () => PassModel.viradaJanela, escrever: v => { PassModel.viradaJanela = v; }, casas: 1 },
        { id: 'PassModel.bonusSectorActivo', grupo: 'Passing', nome: 'Active sector pass bonus', ler: () => PassModel.bonusSectorActivo, escrever: v => { PassModel.bonusSectorActivo = v; }, casas: 2 },
        { id: 'FreeKickModel.cruzamentoDeLongeProb', grupo: 'Set pieces', nome: 'Long free kick crossed (%)', ler: () => FreeKickModel.cruzamentoDeLongeProb, escrever: v => { FreeKickModel.cruzamentoDeLongeProb = v; }, max: 1, casas: 2 }
    ],

    // Liga aos parametros "x" (varios campos) o seu ler/escrever; chamado uma vez ao capturar os padroes.
    _ligarFatores() {
        const mapa = {
            'PassErrorModel.fator': this._fator([[() => PassErrorModel, 'sigmaMax'], [() => PassErrorModel, 'sigmaMin'], [() => PassErrorModel, 'sigmaTecto']]),
            'FirstTouchModel.chance': this._fator([[() => FirstTouchModel, 'chanceMin'], [() => FirstTouchModel, 'chanceMax']], 1),
            'WideAnchor.lateral': this._fator([[() => WideAnchor.lateral, 'comBola'], [() => WideAnchor.lateral, 'semBola']]),
            'WideAnchor.ala': this._fator([[() => WideAnchor.ala, 'comBola'], [() => WideAnchor.ala, 'semBola']])
        };
        for (const p of this.parametros) if (mapa[p.id]) { p.ler = mapa[p.id].ler; p.escrever = mapa[p.id].escrever; }
    },

    _valorDe(p, pos) {
        let v = this.padroes[p.id] * pos / 50;
        if (typeof p.max === 'number') v = Math.min(p.max, v);
        const k = Math.pow(10, p.casas === undefined ? 2 : p.casas);
        return Math.round(v * k) / k;
    },

    _capturarPadroes() {
        if (this.padroes) return;
        this._ligarFatores();
        this.padroes = {};
        for (const p of this.parametros) { try { this.padroes[p.id] = p.ler(); } catch (e) { this.padroes[p.id] = 0; } }
    },

    _montar() {
        if (document.getElementById('painel-sliders')) return;
        const css = document.createElement('style');
        css.textContent =
            '#painel-sliders{position:fixed;left:12px;top:150px;width:310px;max-height:calc(100vh - 170px);overflow-y:auto;z-index:2100;background:rgba(0,0,0,.82);color:#ecf0f1;font:600 12px system-ui,sans-serif;padding:10px 12px;display:none}' +
            '#painel-sliders h4{margin:10px 0 4px;font:800 11px system-ui,sans-serif;letter-spacing:1px;color:#7dd3fc;text-transform:uppercase}' +
            '#painel-sliders h4:first-child{margin-top:0}' +
            '#painel-sliders .sl-linha{margin:6px 0}' +
            '#painel-sliders .sl-topo{display:flex;justify-content:space-between;gap:8px}' +
            '#painel-sliders .sl-val{font-variant-numeric:tabular-nums;color:#facc15;white-space:nowrap}' +
            '#painel-sliders input[type=range]{width:100%;margin:2px 0 0}' +
            '#painel-sliders .sl-botoes{display:flex;gap:6px;margin-top:10px}' +
            '#painel-sliders button{flex:1;height:30px;border:0;background:rgba(51,65,85,.95);color:#fff;font:700 11px system-ui,sans-serif;cursor:pointer}' +
            '#painel-sliders button:hover{background:rgba(2,132,199,.9)}' +
            '#painel-sliders .sl-aviso{margin-top:6px;font-weight:500;color:#94a3b8;font-size:11px}';
        document.head.appendChild(css);
        const painel = document.createElement('div');
        painel.id = 'painel-sliders';
        let grupo = null, html = '';
        for (const p of this.parametros) {
            if (p.grupo !== grupo) { grupo = p.grupo; html += '<h4>' + grupo + '</h4>'; }
            html += '<div class="sl-linha"><div class="sl-topo"><span>' + p.nome + '</span><span class="sl-val" data-val="' + p.id + '"></span></div>' +
                '<input type="range" min="0" max="100" step="1" value="50" data-id="' + p.id + '"></div>';
        }
        html += '<div class="sl-botoes"><button data-acao="copiar">Copy values</button><button data-acao="reset">Reset (all 50)</button></div>' +
            '<div class="sl-aviso">50 = current default. Values apply live and are not saved.</div>';
        painel.innerHTML = html;
        document.body.appendChild(painel);
        painel.addEventListener('input', (e) => {
            const r = e.target.closest('input[type=range]'); if (!r) return;
            this._aplicar(r.dataset.id, Number(r.value));
        });
        painel.addEventListener('click', (e) => {
            const b = e.target.closest('button'); if (!b) return;
            b.blur();
            if (b.dataset.acao === 'reset') this.reset();
            else if (b.dataset.acao === 'copiar') this.copiar(b);
        });
        // As teclas do jogo (espaco, setas) nao devem mexer no slider em foco.
        painel.addEventListener('keydown', (e) => e.stopPropagation());
        this._atualizarTextos();
    },

    _aplicar(id, pos) {
        const p = this.parametros.find(x => x.id === id); if (!p) return;
        this.posicoes[id] = pos;
        const v = this._valorDe(p, pos);
        try { p.escrever(v); } catch (e) { /* o modulo desse parametro nao esta carregado */ }
        this._atualizarTextos();
    },

    _atualizarTextos() {
        for (const p of this.parametros) {
            const el = document.querySelector('#painel-sliders [data-val="' + p.id + '"]');
            if (!el) continue;
            const pos = this.posicoes[p.id] === undefined ? 50 : this.posicoes[p.id];
            const v = this._valorDe(p, pos);
            el.textContent = (p.max === 1 ? Math.round(v * 100) + '%' : v) + '  (default ' + (p.max === 1 ? Math.round(this.padroes[p.id] * 100) + '%' : this.padroes[p.id]) + ')';
        }
    },

    reset() {
        for (const p of this.parametros) {
            this.posicoes[p.id] = 50;
            try { p.escrever(this.padroes[p.id]); } catch (e) { /* idem */ }
            const r = document.querySelector('#painel-sliders input[data-id="' + p.id + '"]');
            if (r) r.value = 50;
        }
        this._atualizarTextos();
    },

    valores() {
        const o = {};
        for (const p of this.parametros) {
            const pos = this.posicoes[p.id] === undefined ? 50 : this.posicoes[p.id];
            o[p.id] = this._valorDe(p, pos);
        }
        return o;
    },

    copiar(botao) {
        const texto = JSON.stringify(this.valores(), null, 2);
        console.log('[SlidersJogo] valores:\n' + texto);
        const feito = () => { if (botao) { const t = botao.textContent; botao.textContent = 'Copied!'; setTimeout(() => { botao.textContent = t; }, 1200); } };
        const reserva = () => {
            const ta = document.createElement('textarea'); ta.value = texto; document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); feito(); } catch (e) { window.prompt('Copy:', texto); }
            ta.remove();
        };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(feito, reserva); else reserva();
    },

    alternar(ligado) {
        this._capturarPadroes();
        this._montar();
        this.aberto = (typeof ligado === 'boolean') ? ligado : !this.aberto;
        document.getElementById('painel-sliders').style.display = this.aberto ? 'block' : 'none';
        const b = document.getElementById('tc-sliders');
        if (b) b.classList.toggle('on', this.aberto);
        return this.aberto;
    }
};
if (typeof window !== 'undefined') window.SlidersJogo = SlidersJogo;
