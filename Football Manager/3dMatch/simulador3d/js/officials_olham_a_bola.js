/*
=============================================================================
OS OFICIAIS NUNCA FICAM DE COSTAS PARA A BOLA — guarda final, num ficheiro só dele
=============================================================================
Relato, repetido muitas vezes: *"o juiz e os bandeirinhas estão caminhando de costas para a bola"*. Foi corrigido
dentro do `Officials.mover` (RefereeModel.anguloMaxDaBola) e voltou sempre: o `mover` só corrige quando o oficial
está a andar, e há outros caminhos que escrevem a frente dele (a viragem para o jogador, a coreografia, o
reposicionamento depois de uma falta, os assistentes na linha...). Cada alteração a um deles desfazia a regra.

Por isso a regra vive AQUI, depois de tudo: este ficheiro carrega depois do officials.js e embrulha o
`Officials.update`. Quando o update original acaba — seja por onde for que tenha escrito o `rotation.y` —, se a
bola ficou a mais de `anguloMax` da frente de um oficial, a frente é trazida de volta para esse limite. Não depende
de nenhum estado interno do officials.js, e `tests/oficiais_olham_a_bola.test.js` mede-o com o jogo a correr.

Excepções (a frente é deles de propósito): a coreografia de abertura, e o árbitro enquanto faz um sinal para um
jogador (marcação — `arbitro.sinal`) ou lhe mostra o cartão (`Officials.cartaoEmCurso`).
=============================================================================
*/
const OficiaisOlhamABola = {
    activo: true,
    // O máximo que a frente do oficial pode afastar-se da direcção da bola (graus). 90 = a bola nunca fica atrás.
    anguloMaxGraus: { arbitro: 80, assistente: 90 },
    // Só se corrige com a bola a mais de isto (m): colado a ela a direcção não é fiável.
    distMin: 1.5,
    /*
    NUNCA CORRER DE COSTAS (relato, outra vez: *"o juiz está correndo de costas"*). A regra da bola sozinha fazia isso: com a bola atrás do rumo dele (a ir para o posto da saída de bola, a recuar num contra-ataque)
    o juiz mantinha a frente a menos de `anguloMax` da bola e corria de costas para onde ia (medido: 19% dos frames a andar na caminhada para a saída de bola, pior caso 107 graus). Agora, a andar
    (`velMin` m/s ou mais), a frente nunca passa de `anguloMaxMov` graus do RUMO — esta regra manda sobre a da bola.
    */
    anguloMaxMovGraus: { arbitro: 70, assistente: 100 },
    velMin: 0.8,
    // Com a frente livre (sinal / cartao) so a corrida a serio conta: a andar devagar de frente para o jogador e o gesto.
    velMinLivre: 2.0,

    _wrapped: false,

    // Corrige um oficial. Devolve o desvio (rad) que havia antes de corrigir, para a medição.
    _corrigir(o, maxRad, dt, maxMovRad, velMin) {
        if (!o || !o.model || !Match || !Match.ball) return 0;
        // O rumo (da posicao de um frame para o seguinte); saltos (reposicionamento) nao contam.
        let vx = 0, vz = 0, v = 0;
        const g = o._gPos || (o._gPos = { x: o.model.position.x, z: o.model.position.z });
        if (dt > 0) { vx = (o.model.position.x - g.x) / dt; vz = (o.model.position.z - g.z) / dt; v = Math.hypot(vx, vz); }
        g.x = o.model.position.x; g.z = o.model.position.z;
        // O rumo corrige-se PRIMEIRO e a bola DEPOIS: a bola tem a ultima palavra. Com o rumo por cima (como estava), ao afastar-se da bola (a fuga, o recuo) o juiz virava-se para onde ia e
        // ficava de costas para ela (relato com prints: "em todos olhando para o lado contrario da bola"). Agora, afastando-se, corre de lado/de ombro para o rumo mas nunca de costas para a bola.
        if (maxMovRad !== undefined && v >= (velMin || this.velMin) && v < 12) {
            const mov = Math.atan2(vx, vz);
            const d2 = Math.atan2(Math.sin(o.model.rotation.y - mov), Math.cos(o.model.rotation.y - mov));
            if (Math.abs(d2) > maxMovRad) o.model.rotation.y = mov + Math.sign(d2) * maxMovRad;
        }
        return this._corrigirBola(o, maxRad);
    },

    _corrigirBola(o, maxRad) {
        const ox = Match.ball.position.x - o.model.position.x;
        const oz = Match.ball.position.z - o.model.position.z;
        if (Math.hypot(ox, oz) < this.distMin) return 0;
        const paraBola = Math.atan2(ox, oz);
        const desvio = Math.atan2(Math.sin(o.model.rotation.y - paraBola), Math.cos(o.model.rotation.y - paraBola));
        if (Math.abs(desvio) <= maxRad) return Math.abs(desvio);
        const alvo = paraBola + Math.sign(desvio) * maxRad;
        // Direto ao limite, sem suavizar: o officials.js reescreve a frente INTEIRA todos os frames, e uma correcção
        // parcial por frame nunca a trazia de volta (medido: continuava de costas).
        o.model.rotation.y = alvo;
        return Math.abs(desvio);
    },

    aplicar(dt) {
        if (!this.activo || typeof Officials === 'undefined') return;
        if (typeof Abertura !== 'undefined' && Abertura.activa) return;
        const G = this.anguloMaxGraus, k = Math.PI / 180;
        const arb = Officials.arbitro;
        // No CARTAO a frente e do jogador (ele corre para ele e mostra-lhe o cartao de frente): a guarda da bola desfazia-o (medido: 57 graus de desvio mediano ao mostrar).
        if (arb) {
            const livre = !!arb.sinal || !!Officials.cartaoEmCurso;
            this._corrigir(arb, livre ? Math.PI : G.arbitro * k, dt, this.anguloMaxMovGraus.arbitro * k, livre ? this.velMinLivre : this.velMin);
        }
        for (const a of (Officials.assistentes || [])) {
            /*
            O ASSISTENTE A CAMINHO DO POSTO (so na caminhada para a saida de bola depois da abertura/intervalo: estado GOAL sem festa de golo) VAI DE
            FRENTE PARA ONDE ANDA. Com a bola atras dele a guarda virava-o 90 graus para o lado e a passada era de frente: movimento
            para um lado, animacao para o outro. Quando chega perto da linha (`emTransito` falso) a regra volta.
            */
            /*
            O ASSISTENTE A CAMINHO DO POSTO (caminhada para a saida de bola depois da abertura/intervalo: estado GOAL sem festa de golo) VAI DE FRENTE PARA ONDE ANDA.
            Com a regra da bola ele corria de lado ou de costas para o rumo (relato do 2.o tempo: "correm para o lado certo mas virados de costas"). Quando chega perto
            da linha (`emTransito` falso) a regra volta.
            */
            if (a.emTransito && typeof Match !== 'undefined' && Match.state === 'GOAL' && Match.semFestaDeGolo) { this._corrigir(a, Math.PI, dt, this.anguloMaxMovGraus.assistente * k); continue; }
            this._corrigir(a, G.assistente * k, dt, this.anguloMaxMovGraus.assistente * k);
        }
    },

    // Embrulha o Officials.update uma vez só.
    instalar() {
        if (this._wrapped || typeof Officials === 'undefined' || typeof Officials.update !== 'function') return;
        this._wrapped = true;
        const original = Officials.update;
        Officials.update = function (dt) {
            const r = original.call(this, dt);
            OficiaisOlhamABola.aplicar(dt);
            return r;
        };
    }
};
OficiaisOlhamABola.instalar();
if (typeof window !== 'undefined') window.OficiaisOlhamABola = OficiaisOlhamABola;
