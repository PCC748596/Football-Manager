/*
=============================================================================
IK — cinemática inversa de duas articulações (§10, §11, §12 do spec)
=============================================================================
O rig deste projecto (ver buildBody em player.js) não é um THREE.Skeleton com
skinning: são Groups aninhados com posições locais fixas. Isso torna o IK
trivial de aplicar — resolver a pose é escrever `quaternion` no Group da raiz
e `rotation.x` no Group do meio, e a hierarquia trata do resto.

Cadeias disponíveis e os seus comprimentos, em unidades do MODELO (o `corpo`
tem scale 1.8/5.5, mas isso é absorvido pela conversão de espaço — ver
`paraEspacoDoPai`):

    braço:  lArm  -> lElbow -> lHand     L1 = 1.0   L2 = 0.8
    perna:  lLeg  -> lKnee  -> lFoot     L1 = 1.0   L2 = 0.9

CONVENÇÃO IMPORTANTE: em repouso todos estes membros apontam para -Y (o osso
de baixo está em `position.y = -L1`). Logo o "eixo do osso" é (0,-1,0), e não
o (0,1,0) habitual noutros rigs. O código todo aqui assume isso.

A flexão do meio (cotovelo/joelho) faz-se em `rotation.x` NEGATIVO — é a
convenção que o resto do projecto já usa (`lElbow.rotation.x = -0.5` na
corrida). Rodar -θ em X leva o antebraço de (0,-1,0) para (0,-cosθ,+sinθ),
ou seja para a FRENTE. Confirmado contra a pose de corrida existente.

--- Porque é que o pole vector importa -------------------------------------
`setFromUnitVectors` produz uma rotação que leva o eixo do osso ao alvo, mas
com um ROLL arbitrário à volta dessa direcção. Com o roll arbitrário, o
cotovelo aponta para onde calhar — para dentro do peito, para cima, para
trás. É a diferença entre um braço e um braço partido.

Por isso a base é construída à mão a partir de três eixos ortonormais, com o
+Z local (o lado para onde a mão balança quando o cotovelo dobra) alinhado
com um `plano` dado por quem chama. Para um braço a alcançar a bola, esse
plano é o "para cima" do mundo: assim o cotovelo fica SEMPRE por baixo da
linha ombro-mão, que é o que um humano faz.
=============================================================================
*/

const IK = {
    // Temporários reutilizados — nada de alocar por frame (§46).
    _m: new THREE.Matrix4(),
    _mBase: new THREE.Matrix4(),
    _alvo: new THREE.Vector3(),
    _origem: new THREE.Vector3(),
    _polo: new THREE.Vector3(),
    _d: new THREE.Vector3(),
    _xA: new THREE.Vector3(),
    _yA: new THREE.Vector3(),
    _zA: new THREE.Vector3(),
    _q: new THREE.Quaternion(),
    _qBend: new THREE.Quaternion(),
    _eixoX: new THREE.Vector3(1, 0, 0),

    /*
    Converte um ponto do mundo para o espaço do PAI da raiz da cadeia.

    É nesse espaço que `raiz.position` e `raiz.quaternion` vivem, por isso é
    lá que a conta tem de ser feita. A inversa da matriz de mundo do pai
    absorve automaticamente a escala do modelo (1.8/5.5) — daí os
    comprimentos poderem ficar em unidades do modelo.
    */
    paraEspacoDoPai(raiz, pontoMundo, saida) {
        const pai = raiz.parent;
        if (!pai) return saida.copy(pontoMundo);
        pai.updateWorldMatrix(true, false);
        this._m.copy(pai.matrixWorld).invert();
        return saida.copy(pontoMundo).applyMatrix4(this._m);
    },

    /*
    Resolve a cadeia de dois ossos.

        raiz      Group da articulação de cima (ombro / anca)
        meio      Group da articulação do meio (cotovelo / joelho)
        L1, L2    comprimentos, em unidades do modelo
        alvoMundo ponto do mundo que a extremidade deve alcançar
        planoMundo direcção do mundo para onde o +Z local deve apontar; é o
                  pole vector, e define o lado para onde a articulação do
                  meio dobra. Ver a nota no topo do ficheiro.

    Devolve `true` se o alvo estava ao alcance, `false` se teve de esticar
    (nesse caso aponta na direcção certa, esticado — que é o comportamento
    humano correcto: se não chegas, esticas).
    */
    resolver(raiz, meio, L1, L2, alvoMundo, planoMundo) {
        this.paraEspacoDoPai(raiz, alvoMundo, this._alvo);

        // O pole vector é uma DIRECÇÃO: converte-se levando dois pontos e
        // subtraindo, senão a translação do pai entrava na conta.
        this._origem.copy(raiz.getWorldPosition(this._d));
        this.paraEspacoDoPai(raiz, this._origem, this._polo);
        this._d.copy(this._origem).add(planoMundo);
        this.paraEspacoDoPai(raiz, this._d, this._d);
        this._polo.subVectors(this._d, this._polo);

        // Vector raiz -> alvo, no espaço do pai.
        this._d.subVectors(this._alvo, raiz.position);
        let D = this._d.length();
        if (D < 1e-5) return false;

        // Fora de alcance (ou dobrado de mais): limita antes do acos, senão
        // o argumento sai de [-1,1] e o acos devolve NaN (§10).
        const Dmin = Math.abs(L1 - L2) + 1e-3;
        const Dmax = L1 + L2 - 1e-3;
        const alcancou = (D <= Dmax && D >= Dmin);
        D = Math.min(Dmax, Math.max(Dmin, D));

        // Lei dos cossenos.
        //   B = ângulo interno no meio (π = esticado)
        //   A = ângulo entre o osso de cima e a linha raiz->alvo
        const cosB = (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2);
        const cosA = (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D);
        const B = Math.acos(Math.min(1, Math.max(-1, cosB)));
        const A = Math.acos(Math.min(1, Math.max(-1, cosA)));

        // Flexão do meio. Ver a convenção de sinal no topo.
        meio.rotation.set(-(Math.PI - B), 0, 0);

        /*
        Base ortonormal da raiz:
            -Y local  ->  direcção raiz->alvo   (o osso aponta ao alvo)
            +Z local  ->  o plano de dobra pedido
        Depois roda-se +A à volta do X local para compensar a flexão: com o
        meio dobrado, a extremidade fica a A graus do eixo do osso, e é isso
        que esta rotação desfaz para a pôr exactamente no alvo.
        */
        this._d.normalize();
        this._yA.copy(this._d).multiplyScalar(-1);          // +Y local = -dir

        // Ortogonaliza o plano contra o eixo do osso. Se forem paralelos
        // (alvo exactamente na direcção do plano) escolhe-se um perpendicular
        // qualquer — o roll é indiferente nesse caso degenerado.
        this._zA.copy(this._polo).addScaledVector(this._yA, -this._polo.dot(this._yA));
        if (this._zA.lengthSq() < 1e-6) {
            this._zA.set(0, 0, 1).addScaledVector(this._yA, -this._yA.z);
            if (this._zA.lengthSq() < 1e-6) this._zA.set(1, 0, 0);
        }
        this._zA.normalize();
        this._xA.crossVectors(this._yA, this._zA).normalize();

        this._mBase.makeBasis(this._xA, this._yA, this._zA);
        this._q.setFromRotationMatrix(this._mBase);
        this._qBend.setFromAxisAngle(this._eixoX, A);
        raiz.quaternion.copy(this._q).multiply(this._qBend);

        return alcancou;
    },

    /*
    Mistura o resultado do IK com a pose que já lá estava, para o membro não
    "saltar" para o alvo num frame só. `peso` 0 = pose antiga, 1 = IK puro.

    CUIDADO com a ordem, que já esteve errada aqui. A linha era:

        raiz.quaternion.copy(qAnt).slerp(raiz.quaternion, peso);

    — copia a pose ANTIGA para `raiz.quaternion` e só depois faz slerp para
    `raiz.quaternion`, que nesse instante já é a pose antiga. Interpolava
    entre uma coisa e ela própria, e portanto a rotação que o `resolver`
    tinha acabado de escrever era deitada fora: sobrevivia só a flexão do
    meio. Medido com peso 1.0, que devia ser IK puro, a ponta ficava a 5-24 cm
    do alvo. O mergulho do guarda-redes usa esta função — os braços dele nunca
    foram exactamente para onde o IK mandava.

    A solução resolvida tem de ser guardada num quaternião à parte ANTES de a
    raiz ser reposta.
    */
    /*
    A PERNA COMO O RIG A POSE (anca com `rotation.x` e `rotation.z`, joelho com `rotation.x` POSITIVO = canela para trás): o `resolver` acima é feito para o
    braço (o meio dobra para a frente) e deixava o joelho ao contrario. Aqui a conta é a do rig:

        coxa   u1 = (sin rz, -cos rz cos rx, -cos rz sin rx)            (Rx(rx) Rz(rz) aplicado a (0,-1,0))
        canela u2 = Rx(rx) Rz(rz) (0, -cos k, -sin k)                    (k = a flexão do joelho)
        pé     d  = L1 u1 + L2 u2

    `d` é o vector anca -> pé NO ESPAÇO DO PAI da anca (a pélvis). Resolve-se (rx, rz, k) por Newton (jacobiano numérico), a partir dos valores actuais (o
    arranque a quente dá a solução continua entre frames: a mesma perna não salta de um ramo da solução para o outro). Devolve { rx, rz, k, erro } ou null.
    */
    resolverPerna(L1, L2, d, rx0, rz0, k0) {
        // Alvo fora de alcance (ou colado a anca): leva-se ao alcance da perna esticada (98.5%) / dobrada ao minimo: o pe pára onde a perna chega em vez de
        // a solucao falhar e o osso ficar parado na ultima pose (medido: um terco das chamadas do chute falhavam e a perna ficava atras).
        const dl = Math.hypot(d.x, d.y, d.z);
        const dMax = 0.985 * (L1 + L2), dMin = Math.abs(L1 - L2) + 0.08;
        if (dl > dMax || dl < dMin) {
            const k = (dl > dMax ? dMax : dMin) / (dl || 1);
            d = { x: d.x * k, y: d.y * k, z: d.z * k };
        }
        const f = (rx, rz, k, o) => {
            const cz = Math.cos(rz), sz = Math.sin(rz), cx = Math.cos(rx), sx = Math.sin(rx);
            // u1
            const u1x = sz, u1y = -cz * cx, u1z = -cz * sx;
            // v = (0, -cos k, -sin k): Rz depois Rx
            const vx = 0, vy = -Math.cos(k), vz = -Math.sin(k);
            const ax = vx * cz - vy * sz, ay = vx * sz + vy * cz, az = vz;     // Rz(rz) v
            const bx = ax, by = ay * cx - az * sx, bz = ay * sx + az * cx;      // Rx(rx) (...)
            o[0] = L1 * u1x + L2 * bx; o[1] = L1 * u1y + L2 * by; o[2] = L1 * u1z + L2 * bz;
        };
        let rx = rx0, rz = rz0, k = Math.max(0.05, k0);
        const F = [0, 0, 0], G = [0, 0, 0];
        const h = 1e-4;
        let erro = Infinity;
        for (let it = 0; it < 30; it++) {
            f(rx, rz, k, F);
            const e = [d.x - F[0], d.y - F[1], d.z - F[2]];
            erro = Math.hypot(e[0], e[1], e[2]);
            if (erro < 1e-4) break;
            // Jacobiano numerico (colunas = d f / d rx, rz, k).
            const J = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
            const ps = [rx, rz, k];
            for (let c = 0; c < 3; c++) {
                const q = ps.slice(); q[c] += h; f(q[0], q[1], q[2], G);
                for (let r = 0; r < 3; r++) J[r][c] = (G[r] - F[r]) / h;
            }
            // Resolve J dq = e (Cramer, 3x3).
            const det = J[0][0] * (J[1][1] * J[2][2] - J[1][2] * J[2][1]) - J[0][1] * (J[1][0] * J[2][2] - J[1][2] * J[2][0]) + J[0][2] * (J[1][0] * J[2][1] - J[1][1] * J[2][0]);
            if (Math.abs(det) < 1e-9) break;
            const col = (c, v) => { const M = [J[0].slice(), J[1].slice(), J[2].slice()]; for (let r = 0; r < 3; r++) M[r][c] = v[r]; return M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]); };
            const dq = [col(0, e) / det, col(1, e) / det, col(2, e) / det];
            const passo = Math.min(1, 0.6 / Math.max(1e-6, Math.max(Math.abs(dq[0]), Math.abs(dq[1]), Math.abs(dq[2]))));   // passo limitado: ~0.6 rad
            rx += dq[0] * passo; rz += dq[1] * passo; k = Math.min(2.6, Math.max(0.05, k + dq[2] * passo));
        }
        return erro < 5e-3 ? { rx, rz, k, erro } : (erro < 0.12 ? { rx, rz, k, erro } : null);   // quase la: serve (o erro e em unidades do corpo, 0.12 = 4 cm)
    },

    // Giro maximo do ombro por frame (graus) no `resolverSuave`: 0 desliga. 60 fps -> 1800 graus/s e um ombro que se mexe depressa mas nao salta.
    maxGrausPorFrame: 30,

    resolverSuave(raiz, meio, L1, L2, alvoMundo, planoMundo, peso) {
        const qAnt = this._qAnt || (this._qAnt = new THREE.Quaternion());
        const qNovo = this._qNovo || (this._qNovo = new THREE.Quaternion());
        const xAnt = meio.rotation.x;
        qAnt.copy(raiz.quaternion);

        const ok = this.resolver(raiz, meio, L1, L2, alvoMundo, planoMundo);

        qNovo.copy(raiz.quaternion);
        /*
        O BRACO NAO DA SALTOS: a solucao do IK pode mudar de um frame para o outro (o alvo atravessa o plano do peito, o pole vector vira) e o `slerp` por peso levava essa descontinuidade
        directa ao osso — medido (tools/headless/gk_bracos_giro.js): picos de 90 a 120 graus POR FRAME na defesa alta. Limita-se o giro por frame (`maxGrausPorFrame`): o braco vai ao
        sitio, mas a uma velocidade que um ombro tem.
        */
        let pesoEf = peso;
        const maxRad = (this.maxGrausPorFrame || 0) * Math.PI / 180;
        if (maxRad > 0) {
            const ang = 2 * Math.acos(Math.min(1, Math.abs(qAnt.dot(qNovo))));
            if (ang * peso > maxRad) pesoEf = maxRad / ang;
        }
        raiz.quaternion.copy(qAnt).slerp(qNovo, pesoEf);
        meio.rotation.x = xAnt + (meio.rotation.x - xAnt) * pesoEf;
        return ok;
    }
};

// Comprimentos do rig deste modelo, lidos de buildBody (player.js).
const IKChains = {
    braco: { L1: 1.0, L2: 0.8 },
    perna: { L1: 1.0, L2: 0.9 }
};
