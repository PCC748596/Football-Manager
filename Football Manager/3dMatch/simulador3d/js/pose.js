/*
=============================================================================
POSE — o corpo do jogador e as poses dos clips, sem depender do jogo
=============================================================================
Tudo aqui é função pura: recebe um `rig` e números, escreve rotações. Não sabe
o que é o `Match`, não sabe o que é um `FootballPlayer`, e não guarda estado.

PORQUÊ ISTO EXISTE. Os gestos do jogo (remate, chutão, tiro de meta,
lançamento do GR, arremesso lateral) são clips de keyframes no `js/config.js`,
e afiná-los à mão é escrever radianos às cegas. O editor de animação
(`animEditor.html`) mostra-os num boneco, mas para servir de alguma coisa tem
de desenhar EXACTAMENTE o que o jogo desenha.

    Se o editor tivesse a sua própria leitura dos ângulos, afinava-se uma pose
    ali e no jogo ficava outra, sem aviso. Uma ferramenta que mente é pior do
    que não ter ferramenta.

Por isso as poses vivem aqui, e são as MESMAS funções que o `js/player.js` e o
editor chamam. Uma implementação só.

Ver docs/superpowers/specs/2026-08-25-editor-de-animacao-design.md.
=============================================================================
*/

/*
O CORPO. Era o método `buildBody` do FootballPlayer, e só usava da instância a
aparência (tons de pele e cabelo) e o material das costas da camisola — ambos
passam agora pelos argumentos e pelo valor devolvido.

Devolve `{ corpo, rig, backMat }`:
  `corpo`    o Group já à escala do jogo, para pendurar na cena
  `rig`      os nós articulados, que é o que as poses daqui para baixo mexem
  `backMat`  o material das costas, onde o número da camisola é desenhado
*/
/*
O PADRAO DE UMA PECA DE EQUIPAMENTO, pintado num canvas.

As camisolas pedidas tem desenho e nao cor (ver Uniformes em
config/uniformes.js): faixas horizontais no Flamengo, listras verticais no
Fluminense. Um `#hex` no material nao as sabe dizer, portanto a peca passa a
levar textura.

    'faixas'    barras horizontais, alternando as cores
    'listras'   barras verticais, ciclando as cores
    'solido'    (ou peca sem padrao) uma cor so

`divisoes` e quantas barras aparecem NA PECA. As faces do tronco sao mapeadas
0..1 cada uma, portanto e o numero que se conta no ecra — nao ha repeticao de
textura a multiplicar por tras.

Devolve o proprio ctx pintado, para quem o quiser continuar a desenhar (o
decote na frente, o numero nas costas).
*/
/*
O DESENHO DE UM KIT DO MANAGER, igual ao do icone dele (components/ShirtIcon.tsx, renderPattern): as mesmas formas, no mesmo
quadrado de 200 x 200, escaladas para o canvas. `kit` = { c1, c2, c3, diagonal, diagonalWidth, horizontal, multipleDiagonals,
dualDiagonal, centerVerticalStripes, gradient, spfcStripes, criciumaStripes } (ver uniformeDoKit em simulador3dCliente.ts).
E assim que o uniforme do 3D fica igual ao que o utilizador escolheu: o 3D nao reinterpreta o kit, copia o desenho.
*/
function pintarKitComoIcone(ctx, largura, altura, kit) {
    const c1 = kit.c1, c2 = kit.c2, c3 = kit.c3;
    ctx.save();
    ctx.scale(largura / 200, altura / 200);
    if (kit.gradient && c2) {
        const g = ctx.createLinearGradient ? ctx.createLinearGradient(0, 0, 0, 200) : null;
        if (g && g.addColorStop) { g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; } else ctx.fillStyle = c1;
    } else ctx.fillStyle = c1;
    ctx.fillRect(0, 0, 200, 200);
    const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const poly = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill(); };
    const tem = (c) => !!c && c !== 'transparent';
    const hasTri = tem(c3) && c3 !== c1 && c3 !== c2;
    const hasStripes = !kit.diagonal && !kit.gradient && tem(c2) && c2 !== c1;
    const dw = (kit.diagonalWidth || 10) * 1.5;
    if (kit.criciumaStripes) {
        rect(0, 0, 200, 80, c1); rect(0, 80, 200, 80, c2); rect(0, 133, 200, 67, c3);
    } else if (kit.centerVerticalStripes && c2 && c3) {
        rect(85, 0, 20, 200, c2); rect(100, 0, 20, 200, c3);
    } else if (kit.dualDiagonal && c2 && c3) {
        poly([[200, 0], [200 - dw, -dw], [-dw, 200 - dw], [0, 200]], c2);
        poly([[200 + dw, dw], [200, 0], [0, 200], [dw, 200 + dw]], c3);
    } else if (kit.diagonal && c2) {
        poly([[200 + dw, dw], [200 - dw, -dw], [-dw, 200 - dw], [dw, 200 + dw]], c2);
    } else if (kit.multipleDiagonals && c2) {
        ctx.translate(100, 100); ctx.rotate(Math.PI / 4); ctx.translate(-100, -100);
        for (let x = -100; x < 300; x += 25) rect(x, -100, 12, 400, c2);
    } else if (kit.spfcStripes && c2 && c3) {
        rect(0, 120, 190, 15, c2); rect(0, 140, 190, 15, c3);
    } else if (kit.horizontal && c2) {
        for (let y = 20; y < 200; y += 60) rect(0, y, 200, 25, c2);
    } else if (hasTri) {
        for (let x = -22.5; x < 200; x += 56) {
            rect(x + 21, 0, 7, 200, c2); rect(x + 28, 0, 21, 200, c3); rect(x + 49, 0, 7, 200, c2);
        }
    } else if (hasStripes) {
        for (let x = 10; x < 200; x += 40) rect(x, 0, 20, 200, c2);
    }
    ctx.restore();
}
if (typeof window !== 'undefined') window.pintarKitComoIcone = pintarKitComoIcone;

function pintarPadraoDeEquipamento(ctx, largura, altura, peca, corBase) {
    const cores = (peca && peca.cores && peca.cores.length) ? peca.cores : [corBase];
    const padrao = (peca && peca.padrao) ? peca.padrao : 'solido';
    // Kit do manager: o desenho e o do icone (pintarKitComoIcone), com a barra por cima como nos outros.
    if (padrao === 'kit' && peca.kit) {
        pintarKitComoIcone(ctx, largura, altura, peca.kit);
        return ctx;
    }

    /*
    A BARRA INFERIOR (`peca.barra`) e pintada por CIMA de tudo o resto, e por
    isso mora numa funcao a parte chamada no fim dos dois caminhos: e a barra
    vermelha na bainha do Flamengo e a verde no calcao do Fluminense.

    `altura` e uma FRACCAO da peca (0.12 = 12% em baixo), e nao pixeis: a mesma
    peca e pintada em canvas de 256 e de 512 conforme onde e usada, e uma
    barra em pixeis ficava com espessuras diferentes na mesma camisola.

    Em baixo no CANVAS e em baixo na peca: o topo da textura e o ombro (e la
    que a gola e desenhada), portanto as ultimas linhas sao a bainha.
    */
    const barra = (peca && peca.barra) ? peca.barra : null;
    const pintarBarra = () => {
        if (!barra) return;
        const coresBarra = Array.isArray(barra.cores) && barra.cores.length > 0
            ? barra.cores
            : (barra.cor ? [barra.cor] : []);
        if (coresBarra.length === 0) return;
        const hTotal = Math.max(coresBarra.length, Math.round(altura * (barra.altura || 0.1)));
        const nSub = coresBarra.length;
        for (let i = 0; i < nSub; i++) {
            const y0 = Math.round(altura - hTotal + (i * hTotal) / nSub);
            const y1 = Math.round(altura - hTotal + ((i + 1) * hTotal) / nSub);
            ctx.fillStyle = coresBarra[i];
            ctx.fillRect(0, y0, largura, y1 - y0);
        }
    };

    if (padrao === 'solido' || cores.length < 2) {
        ctx.fillStyle = cores[0];
        ctx.fillRect(0, 0, largura, altura);
        pintarBarra();
        return ctx;
    }

    const n = Math.max(2, (peca && peca.divisoes) || cores.length * 2);
    /*
    A PRIMEIRA COR PINTA O FUNDO ANTES DAS BARRAS. Com as barras desenhadas
    lado a lado por arredondamento, sobram linhas de um pixel entre elas — e um
    pixel transparente numa textura de camisola le-se como uma risca preta.
    */
    ctx.fillStyle = cores[0];
    ctx.fillRect(0, 0, largura, altura);

    /*
    AS BARRAS PODEM TER LARGURAS DIFERENTES (`peca.pesos`, ver Uniformes): no
    tricolor do Fluminense o branco e uma risca fina entre duas faixas largas,
    e com barras iguais as tres cores dividiam a camisola por igual.

    A conta e por FRACCAO ACUMULADA e nao por passo fixo: soma-se o peso de
    cada barra, divide-se pelo total, e cada barra ocupa a sua fatia. Com pesos
    todos iguais da exactamente o passo constante de antes.
    */
    const pesos = [];
    for (let i = 0; i < n; i++) {
        const w = (peca && peca.pesos && peca.pesos.length)
            ? peca.pesos[i % peca.pesos.length] : 1;
        pesos.push(w > 0 ? w : 1);
    }
    const somaPesos = pesos.reduce((a, w) => a + w, 0);

    const vertical = (padrao === 'listras');
    const total = vertical ? largura : altura;

    /*
    UMA BARRA LARGA ALINHADA COM O MEIO DA PECA (`peca.centrada`).

    Pedido: *"as camisas tricolores com 12 listras, mas com uma grossa alinhada
    no meio da camisa"*. E como uma camisola as riscas e desenhada: a listra
    central esta no eixo do peito, e as outras crescem para os dois lados a
    partir dela. Sem isto, onde cai o corte depende de quantas listras cabem e
    dos pesos delas — o meio calhava numa risca fina ou a meio de uma larga.

    A CONTA: mede-se o centro da primeira barra MAIS LARGA e desloca-se o
    padrao todo pelo que falta para ele cair no meio da peca. O deslocamento e
    circular — a barra que sai por uma borda volta a entrar pela outra —, e e
    isso que mantem a peca coberta de ponta a ponta com o mesmo desenho.
    */
    let deslocamento = 0;
    if (peca && peca.centrada) {
        let melhor = 0, pesoMax = -1, inicio = 0, inicioMelhor = 0;
        for (let i = 0; i < n; i++) {
            if (pesos[i] > pesoMax) { pesoMax = pesos[i]; melhor = i; inicioMelhor = inicio; }
            inicio += pesos[i];
        }
        void melhor;
        deslocamento = (somaPesos / 2) - (inicioMelhor + pesoMax / 2);
    }

    /*
    Cada barra e pintada em unidades de peso e so no fim convertida em pixeis.
    Com o deslocamento, uma barra pode ficar a cavalo da borda: nesse caso e
    desenhada duas vezes, uma de cada lado, que e o que fecha o anel sem
    deixar a fatia de fora.
    */
    const pintar = (iniUnid, fimUnid, cor) => {
        ctx.fillStyle = cor;
        for (const desvio of [-somaPesos, 0, somaPesos]) {
            const a0 = iniUnid + desvio, b0 = fimUnid + desvio;
            if (b0 <= 0 || a0 >= somaPesos) continue;
            const a = Math.floor(total * (Math.max(0, a0) / somaPesos));
            const b = Math.ceil(total * (Math.min(somaPesos, b0) / somaPesos));
            if (b <= a) continue;
            if (vertical) ctx.fillRect(a, 0, b - a, altura);
            else ctx.fillRect(0, a, largura, b - a);
        }
    };

    let acumulado = deslocamento;
    for (let i = 0; i < n; i++) {
        pintar(acumulado, acumulado + pesos[i], cores[i % cores.length]);
        acumulado += pesos[i];
    }
    pintarBarra();
    return ctx;
}
if (typeof window !== 'undefined') window.pintarPadraoDeEquipamento = pintarPadraoDeEquipamento;

/*
`uniforme` (opcional) e o equipamento do clube — ver Uniformes
(config/uniformes.js). Sem ele, o corpo sai como sempre saiu: camisa e meiao
da cor `corCamisa`, calcao de `corCalcao`.
*/
/*
`leve` 1 e 3 foram RETIRADOS (viram o 4). `leve` (0, 1 ou 2) gasta menos triangulos no MESMO corpo, para comparar no editor (animEditor): 0 = o de sempre (6544 triangulos); 1 = metade (~3500): o torax
deixa de ser subdividido em X (so a subdivisao em Y mantem a textura direita no afunilamento) e as juntas esfericas levam menos segmentos; 2 = minimo (~1700):
juntas ainda mais simples. O corpo dos jogadores continua em 0.
NOTA: os numeros acima sao de antes; medido agora (T-pose): 0 = 6520, 1 = 888, 2 = 856, 3 = 952 triangulos.
`leve` 5 = MINIMO (280 triangulos, era 424): sem o torax nu (fica dentro da camisa), cabelo so topo+costas, mao so com a palma (sem dedos nem polegar), sem lingueta nas chuteiras, sem travas.
`leve` 4 = METADE do 1 (456 triangulos, 51%): o do 1 sem as 12 travas das chuteiras (-384) e com a casca do torax em 2 subdivisoes de altura em vez de 8 (-48).
*/
/*
A FACE PERSONALIZADA (Editor de Faces do manager: data/faces.js, `FacesPersonalizadas`; o mesmo desenho do `PlayerFace` 2D, components/PlayerFace.tsx). Sobre o cabelo de blocos de sempre
(topo `hT`, costas `hB`, lados `hL`/`hR`, franja `hF`) a face pode levar:
  estilo  curto (o de sempre), raspado, longo, topete, careca;
  barba   rala (a cor da pele escurecida), cheia (cor do cabelo, com os labios por cima), bigode;
  oculos  armacao fina em volta dos olhos;
  largura a cabeca mais estreita ou mais larga (aplicada depois da proporcao da cabeca, ver `construirCorpo`).
So corre quando a aparencia traz `estilo`/`barba`/`oculos` (faces personalizadas): quem nao tem nao muda em nada.
*/
/*
A CARA EM PIXELS (Editor de Faces: `rosto`, um PNG de 20 x 25 pixels gerado da foto): vai na face da FRENTE da cabeca (a caixa de 0.8 x 1.0), com filtro `nearest` para ficar de voxels. Custo: nenhum
triangulo a mais (a cabeca continua a ser uma caixa) e uma textura de ~1 KB por jogador, em cache por imagem. Os olhos, o nariz e a boca desenhados escondem-se (ja vem na foto). So jogadores e
arbitros (construirCorpo com `leve` = 0): a torcida usa as faces simples.
*/
/*
OS OLHOS DA CARA EM PIXELS: o branco com a pupila escura no meio. A foto reduzida a 20 x 25 deixa so 2 pixels escuros por olho, sem o branco, e em pele escura isso le-se como dois
tracos (relato). Aqui acha-se a pupila (os pixels escuros da faixa dos olhos, a mesma regra do relevo em `profundidadesDoRosto`) e pintam-se de branco os vizinhos da esquerda e da
direita que nao sao escuros. Altera `px` (RGBA) no sitio. Serve a textura e o relevo, para ficarem iguais.
*/
function pintarOlhosDoRosto(px, W, H) {
    const lum = (x, y) => { const i = (y * W + x) * 4; return 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; };
    const amostra = [];
    for (let y = Math.round(H * 0.2); y <= Math.round(H * 0.5); y++) for (let x = Math.round(W * 0.15); x <= Math.round(W * 0.85); x++) amostra.push(lum(x, y));
    amostra.sort((a, b) => a - b);
    const pele = amostra[Math.floor(amostra.length * 0.7)];
    const escuro = (x, y) => lum(x, y) < pele * 0.62;
    const cx = (W - 1) / 2, pupilas = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const fy = y / (H - 1), lado = Math.abs(x - cx) / cx;
        if (fy > 0.3 && fy < 0.46 && lado > 0.12 && lado < 0.8 && escuro(x, y)) pupilas.push([x, y]);
    }
    const ehPupila = (x, y) => pupilas.some(p => p[0] === x && p[1] === y);
    for (const [x, y] of pupilas) {
        for (const dx of [-1, 1]) {
            const nx = x + dx;
            if (nx < 0 || nx >= W || ehPupila(nx, y) || escuro(nx, y)) continue;
            const i = (y * W + nx) * 4; px[i] = 233; px[i + 1] = 228; px[i + 2] = 220; px[i + 3] = 255;
        }
    }
}
function texturaDoRostoPixelado(url) {
    const cache = texturaDoRostoPixelado._cache || (texturaDoRostoPixelado._cache = {});
    if (cache[url]) return cache[url];
    const img = new Image();
    const tex = new THREE.Texture(img);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    tex.userData = { filhas: [] };   // as sub-texturas (o nariz) que usam a mesma imagem
    img.onload = () => {
        // A cara com os olhos pintados (o branco com a pupila no meio): vai para uma canvas e a textura passa a usa-la.
        try {
            const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
            const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
            const dados = cx.getImageData(0, 0, c.width, c.height);
            pintarOlhosDoRosto(dados.data, c.width, c.height); cx.putImageData(dados, 0, 0);
            tex.image = c;
        } catch (e) { /* sem canvas: fica a foto como veio */ }
        tex.needsUpdate = true; tex.userData.filhas.forEach(t => { t.needsUpdate = true; });
    };
    img.src = url;
    cache[url] = tex;
    return tex;
}
/*
UMA CAIXA COM A FRENTE DIFERENTE EM 2 CHAMADAS DE DESENHO, e nao 6: um BoxGeometry com um material por face desenha cada face separada (6 `draw calls`). Aqui as 5 faces que levam o mesmo material
ficam contiguas e a frente fica sozinha (2 grupos: material 0 = as 5, material 1 = a frente). Para as caixas da cabeca (rosto), do topo do cabelo (faixa) e do nariz.
*/
function dividirFrente(geo) {
    const idx = geo.index.array, novo = new idx.constructor(idx.length);
    [0, 1, 2, 3, 5, 4].forEach((f, i) => { for (let k = 0; k < 6; k++) novo[i * 6 + k] = idx[f * 6 + k]; });   // +x, -x, +y, -y, -z e por fim +z (a frente)
    geo.setIndex(new THREE.BufferAttribute(novo, 1));
    geo.clearGroups(); geo.addGroup(0, 30, 0); geo.addGroup(30, 6, 1);
    return geo;
}
/** Um pedaco da textura (u, v em 0..1, a partir de baixo e da esquerda): o relevo do nariz mostra a parte do nariz da foto. */
function subTextura(tex, u0, v0, du, dv) {
    const t = tex.clone();
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.repeat.set(du, dv); t.offset.set(u0, v0);
    tex.userData.filhas.push(t);
    if (tex.image && tex.image.complete) t.needsUpdate = true;
    return t;
}

/*
A CARA EM VOXELS (relevo): a mesma cara de 20 x 25 pixels, mas cada pixel e uma COLUNA que sai da frente da cabeca, com a altura (em degraus de `PASSO_VOXEL`) tirada da propria foto e de um molde de rosto:
  . o cabelo (pixels escuros no alto e nas laterais) e a barba (escuros na parte de baixo) saem 2 degraus; as sobrancelhas 1; o nariz 2-3 (ponta no meio); os labios e o queixo 1;
  . os olhos (escuros) ficam no fundo (0): ali aparece a foto plana da face da caixa.
So as faces voltadas a frente, ao lado e acima/abaixo de cada coluna que sobe sao desenhadas (uma malha so, 1 chamada de desenho, ~2 mil triangulos); a luz do jogo faz o resto do sombreado.
Resolucao, altura e molde: aqui (e RESOLUCAO_ROSTO em textSim/faceFromPhoto.ts).
*/
const PASSO_VOXEL = 0.055;
function profundidadesDoRosto(px, W, H) {
    const lum = (x, y) => { const i = (y * W + x) * 4; return 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; };
    const amostra = [];
    for (let y = Math.round(H * 0.2); y <= Math.round(H * 0.5); y++) for (let x = Math.round(W * 0.15); x <= Math.round(W * 0.85); x++) amostra.push(lum(x, y));
    amostra.sort((a, b) => a - b);
    const pele = amostra[Math.floor(amostra.length * 0.7)];   // a luminosidade da pele: o percentil 70 (os olhos e as sobrancelhas sao a minoria escura)
    const escuro = (x, y) => lum(x, y) < pele * 0.62;
    const d = [];
    const cx = (W - 1) / 2;
    for (let y = 0; y < H; y++) {
        d.push([]);
        for (let x = 0; x < W; x++) {
            const fy = y / (H - 1), lado = Math.abs(x - cx) / cx;   // fy: 0 topo .. 1 queixo; lado: 0 centro .. 1 borda
            let v = 1;
            if (fy < 0.22 && escuro(x, y)) v = 4;                                    // volume do cabelo
            else if (fy < 0.55 && lado > 0.82 && escuro(x, y)) v = 2;               // costeletas
            else if (fy > 0.55 && escuro(x, y)) v = 2;                                // barba
            else if (fy > 0.28 && fy < 0.46 && lado > 0.12 && lado < 0.8 && escuro(x, y)) v = 0;   // olhos
            else if (fy > 0.26 && fy < 0.34 && lado > 0.12 && lado < 0.8) v = 2;      // sobrancelhas
            if (v === 1 || v === 2) {
                if (lado < 0.14 && fy >= 0.4 && fy <= 0.62) v = fy >= 0.52 ? 4 : 3;   // o nariz: mais alto na ponta
                else if (lado < 0.34 && fy >= 0.5 && fy <= 0.62) v = Math.max(v, 3);  // as asas do nariz
                else if (lado < 0.4 && fy >= 0.68 && fy <= 0.76) v = Math.max(v, 2);  // os labios
                else if (lado < 0.4 && fy > 0.9) v = Math.max(v, 2);                  // o queixo
            }
            if (lado > 0.95 && v > 1) v = 1;
            d[y].push(v);
        }
    }
    return d;
}
function geometriaVoxelDoRosto(px, W, H, u) {
    const d = profundidadesDoRosto(px, W, H);
    pintarOlhosDoRosto(px, W, H);   // depois do relevo (que usa o escuro das pupilas) e antes das cores
    const cw = 0.8 * u / W, ch = 1.0 * u / H, z0 = 0.425 * u + 0.003 * u;
    const pos = [], cor = [];
    const quad = (a, b, c, e, rgb) => { for (const p of [a, b, c, a, c, e]) { pos.push(p[0], p[1], p[2]); cor.push(rgb[0], rgb[1], rgb[2]); } };
    const prof = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : d[y][x];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = d[y][x]; if (k <= 0) continue;
        const i = (y * W + x) * 4, rgb = [px[i] / 255 * 0.86, px[i + 1] / 255 * 0.86, px[i + 2] / 255 * 0.86];
        const xa = -0.4 * u + x * cw, xb = xa + cw, yb = 0.5 * u - y * ch, ya = yb - ch, z = z0 + k * PASSO_VOXEL * u;
        quad([xa, ya, z], [xb, ya, z], [xb, yb, z], [xa, yb, z], rgb);   // a frente da coluna
        const lados = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dx, dy] of lados) {
            const vizinho = prof(x + dx, y + dy);
            if (vizinho >= k) continue;
            const zv = z0 + vizinho * PASSO_VOXEL * u, escuroLado = [rgb[0] * 0.8, rgb[1] * 0.8, rgb[2] * 0.8];
            if (dx === -1) quad([xa, ya, zv], [xa, ya, z], [xa, yb, z], [xa, yb, zv], escuroLado);
            else if (dx === 1) quad([xb, ya, z], [xb, ya, zv], [xb, yb, zv], [xb, yb, z], escuroLado);
            else if (dy === -1) quad([xa, yb, z], [xb, yb, z], [xb, yb, zv], [xa, yb, zv], escuroLado);
            else quad([xa, ya, zv], [xb, ya, zv], [xb, ya, z], [xa, ya, z], escuroLado);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
    g.computeVertexNormals();
    return g;
}
/** A malha do relevo da cara (url = a PNG do rosto): vazia ate a imagem carregar; a geometria e partilhada entre os jogadores com a mesma cara. */
function malhaVoxelDoRosto(url, u) {
    const cache = malhaVoxelDoRosto._cache || (malhaVoxelDoRosto._cache = {});
    const mat = malhaVoxelDoRosto._mat || (malhaVoxelDoRosto._mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }));
    const malha = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    malha.castShadow = false;
    const aplicar = (g) => { malha.geometry = g; };
    if (cache[url] && cache[url].geo) { aplicar(cache[url].geo); return malha; }
    const entrada = cache[url] || (cache[url] = { geo: null, esperando: [] });
    entrada.esperando.push(aplicar);
    if (entrada.esperando.length === 1) {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
            const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
            entrada.geo = geometriaVoxelDoRosto(cx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, u);
            entrada.esperando.forEach(f => f(entrada.geo)); entrada.esperando = [];
        };
        img.src = url;
    }
    return malha;
}

/*
OS ESTILOS DE CABELO — o cabelo e feito das 5 caixas de sempre (topo `hT`, costas `hB`, lados `hL`/`hR`, franja `hF`); cada estilo as encolhe, estica, esconde ou acrescenta caixas. Estilos:
  curto (o de sempre), careca, raspado, degrade, longo, topete (os do Editor de Faces) e os novos: militar (flat top com lados rapados), partido (ao meio), afro (volume redondo), cacheado
  (cachos: cubinhos sobre o topo). Os novos custam: careca -60 triangulos, militar 0, partido +36, afro ~0 (-60 +24...), cacheado +96. `leve` 5 (extras) nao os usa.
*/
/*
A COR DO CABELO PINTADO (moicano, picos): nas cores do CLUBE, de preferencia (pedido). Sai da camisa do uniforme (as cores dela e a principal): a mais viva — saturada e nem muito escura nem muito clara —
ganha; branco, preto e cinzas ficam de fora. Sem uniforme (arbitros, torcida) ou sem cor viva, fica null e o estilo usa a sua cor de sempre (azul no moicano, verde nos picos).
*/
function corPintadaDoClube(uniforme) {
    if (!uniforme) return null;
    const lista = [].concat((uniforme.camisa && uniforme.camisa.cores) || [], uniforme.corPrincipal ? [uniforme.corPrincipal] : []);
    let melhor = null, nota = 0.25;
    const hsl = { h: 0, s: 0, l: 0 };
    for (const c of lista) {
        let cor; try { cor = new THREE.Color(c); } catch (e) { continue; }
        cor.getHSL(hsl, THREE.SRGBColorSpace);   // em sRGB (a cor que se ve), nao no espaco linear
        if (hsl.l < 0.2 || hsl.l > 0.85) continue;
        const n = hsl.s * (1 - Math.abs(hsl.l - 0.5));
        if (n > nota) { nota = n; melhor = cor.getHex(); }
    }
    return melhor;
}

function aplicarEstiloCabelo(estilo, ap, head, partes, u) {
    const { hT, hB, hL, hR, hF } = partes;
    const ajusta = (m, escalaY, topo, folgaX) => {   // encolhe/estica a peca mantendo o TOPO onde estava
        const h0 = m.geometry.parameters.height * u;
        m.scale.y = escalaY;
        m.position.y = topo - (h0 * escalaY) / 2;
        if (folgaX) m.position.x += folgaX;
    };
    const mat = hT.material;
    const novaCaixa = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(u * w, u * h, u * d), mat); m.position.set(u * x, u * y, u * z); m.receiveShadow = true; head.add(m); return m; };
    const esconde = () => { hT.visible = hB.visible = hL.visible = hR.visible = hF.visible = false; };
    const corEspecial = (cor) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.9 });   // cabelo tingido: nao segue a cor do tipo
    if (estilo === 'careca') { hT.visible = hB.visible = hL.visible = hR.visible = hF.visible = false; }
    else if (estilo === 'raspado') {
        ajusta(hT, 0.48, u * 0.625); ajusta(hB, 0.4, u * 0.5); ajusta(hL, 0.45, u * 0.5); ajusta(hR, 0.45, u * 0.5); hF.visible = false;
    } else if (estilo === 'degrade') {
        // Degrade (fade): lados e costas baixos e finos, de uma cor mais clara (a sombra do pelo); topo e franja de sempre
        const fade = new THREE.MeshStandardMaterial({ color: new THREE.Color(ap.cabelo).lerp(new THREE.Color(ap.pele), 0.45), roughness: 0.9 });
        ajusta(hL, 0.45, u * 0.5, u * 0.045); ajusta(hR, 0.45, u * 0.5, -u * 0.045); ajusta(hB, 0.45, u * 0.5);
        hL.scale.x = hR.scale.x = 0.5; hL.material = hR.material = hB.material = fade;
    } else if (estilo === 'longo') {
        ajusta(hB, 1.7, u * 0.5); ajusta(hL, 1.7, u * 0.5, -u * 0.03); ajusta(hR, 1.7, u * 0.5, u * 0.03);
    } else if (estilo === 'topete') {
        ajusta(hT, 1.7, u * 0.8); ajusta(hL, 0.75, u * 0.5); ajusta(hR, 0.75, u * 0.5);
        hF.scale.y = 1.2; hF.position.y = u * 0.52;
    } else if (estilo === 'militar') {
        // Flat top: o topo alto e plano, lados e costas rapados, sem franja
        ajusta(hT, 1.35, u * 0.66); ajusta(hL, 0.4, u * 0.5); ajusta(hR, 0.4, u * 0.5); ajusta(hB, 0.35, u * 0.5); hF.visible = false;
    } else if (estilo === 'partido') {
        // Partido ao meio: o topo e a franja viram duas metades, inclinadas para fora, com a risca no meio
        hT.visible = hF.visible = false;
        const e = novaCaixa(0.45, 0.25, 0.9, -0.225, 0.5, 0); e.rotation.z = 0.12;
        const d = novaCaixa(0.45, 0.25, 0.9, 0.225, 0.5, 0); d.rotation.z = -0.12;
        const fe = novaCaixa(0.43, 0.15, 0.2, -0.225, 0.43, 0.38); fe.rotation.z = 0.12;
        const fd = novaCaixa(0.43, 0.15, 0.2, 0.225, 0.43, 0.38); fd.rotation.z = -0.12;
        ajusta(hL, 1.15, u * 0.5); ajusta(hR, 1.15, u * 0.5);
    } else if (estilo === 'afro') {
        // Afro: uma bola de cabelo (miolo + tampa) a cobrir o topo, os lados e as costas
        esconde();
        novaCaixa(1.22, 0.9, 1.22, 0, 0.32, -0.05); novaCaixa(0.98, 0.22, 0.98, 0, 0.88, -0.03);
    } else if (estilo === 'cacheado') {
        // Cacheado: o cabelo de sempre, mais baixo, com cachos (cubinhos) por cima e nos lados; sem franja lisa
        hF.visible = false; ajusta(hT, 0.8, u * 0.62);
        [[-0.3, 0.74, -0.25], [0.3, 0.74, -0.25], [-0.3, 0.74, 0.25], [0.3, 0.74, 0.25], [0, 0.84, 0], [-0.47, 0.45, 0.1], [0.47, 0.45, 0.1], [0, 0.62, 0.47]]
            .forEach(([x, y, z]) => novaCaixa(0.28, 0.28, 0.28, x, y, z));
    } else if (estilo === 'moicano') {
        // Moicano: so a crista ao longo do meio (azul), cabeca rapada dos lados e atras
        hT.visible = hL.visible = hR.visible = hF.visible = hB.visible = false;
        [[-0.38, 0.5], [-0.19, 0.62], [0, 0.7], [0.19, 0.62], [0.38, 0.5]].forEach(([z, h]) => { const c = novaCaixa(0.16, h, 0.2, 0, 0.5 + h / 2 - 0.12, z); c.material = corEspecial(ap.corPintada || 0x1e90ff); });
    } else if (estilo === 'dreads') {
        // Dreads: o topo e as costas de sempre e oito madeixas grossas a cair pelas costas e pelos lados
        hF.visible = false; ajusta(hT, 1.1, u * 0.64); ajusta(hB, 1.4, u * 0.5);
        [[-0.36, -0.4], [-0.12, -0.42], [0.12, -0.42], [0.36, -0.4], [-0.46, -0.05], [0.46, -0.05], [-0.46, 0.2], [0.46, 0.2]].forEach(([x, z]) => novaCaixa(0.13, 0.85, 0.13, x, -0.15, z));
    } else if (estilo === 'coque') {
        // Coque samurai: lados e costas rapados, o cabelo do topo puxado para um coque
        hF.visible = false; ajusta(hL, 0.45, u * 0.5); ajusta(hR, 0.45, u * 0.5); ajusta(hB, 0.55, u * 0.5); ajusta(hT, 0.9, u * 0.62);
        novaCaixa(0.34, 0.34, 0.34, 0, 0.88, -0.15);
    } else if (estilo === 'franja') {
        // Franja: a franja desce sobre a testa e os lados caem em cortina
        ajusta(hF, 2.8, u * 0.525); ajusta(hL, 1.2, u * 0.5); ajusta(hR, 1.2, u * 0.5);
    } else if (estilo === 'mullet') {
        // Mullet: curto na frente e nos lados, comprido atras
        hF.visible = false; ajusta(hT, 0.8, u * 0.62); ajusta(hL, 0.6, u * 0.5); ajusta(hR, 0.6, u * 0.5); ajusta(hB, 2.3, u * 0.5);
    } else if (estilo === 'trancas') {
        // Trancas (braids): o couro cabeludo rente e seis trancas finas a cair pelas costas
        hF.visible = false; ajusta(hT, 0.6, u * 0.6); ajusta(hL, 0.5, u * 0.5); ajusta(hR, 0.5, u * 0.5); ajusta(hB, 0.7, u * 0.5);
        [-0.36, -0.22, -0.07, 0.07, 0.22, 0.36].forEach(x => novaCaixa(0.08, 0.95, 0.08, x, -0.2, -0.43));
    } else if (estilo === 'platinado') {
        // Platinado: descolorido (quase branco), topo alto e desalinhado
        const pla = corEspecial(0xe9e4c8); [hT, hB, hL, hR, hF].forEach(m => { m.material = pla; });
        ajusta(hT, 1.5, u * 0.74); ajusta(hL, 0.8, u * 0.5); ajusta(hR, 0.8, u * 0.5); hF.scale.y = 1.3; hF.position.y = u * 0.5;
    } else if (estilo === 'picos') {
        // Picos coloridos: uma camada reta de cabelo (a do jogador) cobre o couro cabeludo e os oito espetos verdes assentam em cima dela — sem ela os picos pareciam espetados numa cabeca careca
        hF.visible = false; ajusta(hT, 1.0, u * 0.625); ajusta(hL, 0.7, u * 0.5); ajusta(hR, 0.7, u * 0.5); ajusta(hB, 0.7, u * 0.5);
        [[-0.3, -0.25, 0.4], [0, -0.3, 0.52], [0.3, -0.25, 0.4], [-0.3, 0.1, 0.5], [0.3, 0.1, 0.5], [0, 0, 0.42], [-0.15, 0.35, 0.36], [0.15, 0.35, 0.36]]
            .forEach(([x, z, h]) => { const c = novaCaixa(0.15, h, 0.15, x, 0.625 + h / 2 - 0.02, z); c.material = corEspecial(ap.corPintada || 0x2f9e44); });
    }
}

/*
AS BARBAS (pedido, com o print: Barba Cheia, Bigode, Barba e Bigode, Cavanhaque, Barba Por Fazer). `barba`: 'cheia', 'bigode', 'cheia_bigode', 'cavanhaque', 'rala' (a por fazer); 'nenhuma' = nada.
Sao caixas coladas ao rosto (a barba comeca logo abaixo do nariz, que acaba em y = -0.08), na cor do cabelo do jogador (a por fazer e o cavanhaque ralo levam a cor da pele puxada para a do cabelo). Custo:
rala 12 triangulos, bigode 24, cavanhaque 48, cheia 60, cheia_bigode 84.
*/
function aplicarBarba(barba, ap, head, boca, u) {
    if (!barba || barba === 'nenhuma') return;
    const mat = (cor) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.9 });
    const caixa = (w, h, d, x, y, z, cor) => { const m = new THREE.Mesh(new THREE.BoxGeometry(u * w, u * h, u * d), mat(cor)); m.position.set(u * x, u * y, u * z); head.add(m); return m; };
    const pele = new THREE.Color(ap.pele), cabelo = new THREE.Color(ap.cabelo);
    const mistura = (t) => pele.clone().lerp(cabelo, t);
    const labios = () => { if (boca) boca.visible = false; caixa(0.22, 0.05, 0.03, 0, -0.225, 0.452, pele.clone().lerp(new THREE.Color(0xb0524f), 0.45)); };
    const moustache = (c) => { caixa(0.44, 0.085, 0.06, 0, -0.14, 0.44, c); caixa(0.07, 0.14, 0.05, -0.2, -0.2, 0.44, c); caixa(0.07, 0.14, 0.05, 0.2, -0.2, 0.44, c); };
    if (barba === 'rala') {
        // Barba por fazer: uma sombra fina por todo o maxilar, mais clara que a barba cheia
        caixa(0.82, 0.4, 0.045, 0, -0.3, 0.43, mistura(0.3));
    } else if (barba === 'cavanhaque') {
        // Cavanhaque: o queixo (uma tira que sobe ate abaixo dos labios) e um fio de bigode
        const c = mistura(0.95);
        caixa(0.34, 0.26, 0.06, 0, -0.38, 0.435, c); caixa(0.5, 0.05, 0.04, 0, -0.145, 0.435, c); caixa(0.07, 0.2, 0.05, -0.2, -0.26, 0.435, c); caixa(0.07, 0.2, 0.05, 0.2, -0.26, 0.435, c);   // a linha da boca fica a mostra no cavanhaque
    } else if (barba === 'bigode') {
        // So o bigode: uma barra por cima do labio com as pontas a descer
        moustache(cabelo); labios();
    } else if (barba === 'cheia' || barba === 'cheia_bigode') {
        const c = mistura(0.97);
        caixa(0.86, 0.4, 0.06, 0, -0.3, 0.43, c);                                             // o maxilar e o queixo
        caixa(0.06, 0.36, 0.72, -0.42, -0.12, -0.04, c); caixa(0.06, 0.36, 0.72, 0.42, -0.12, -0.04, c);   // as patilhas, ate as orelhas
        caixa(0.56, 0.1, 0.07, 0, -0.5, 0.43, c);                                              // o volume por baixo do queixo
        if (barba === 'cheia_bigode') moustache(c); else caixa(0.5, 0.07, 0.05, 0, -0.145, 0.44, c);   // na cheia, a barba chega ao nariz (a boca fica no meio)
        labios();
    }
}

function aplicarFaceCustom(ap, head, boca, partes, u) {
    const estilo = ap.estilo || 'curto', barba = ap.rosto ? 'nenhuma' : (ap.barba || 'nenhuma');   // com a cara em pixels a barba ja vem nela
    aplicarEstiloCabelo(estilo, ap, head, partes, u);
    aplicarBarba(barba, ap, head, boca, u);
    const mat = (cor) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85 });
    const caixa = (w, h, d, x, y, z, cor) => { const m = new THREE.Mesh(new THREE.BoxGeometry(u * w, u * h, u * d), mat(cor)); m.position.set(u * x, u * y, u * z); head.add(m); return m; };
    if (ap.oculos && !ap.rosto) {
        const aro = 0x1f2937;
        [-0.16, 0.16].forEach((cx) => {
            caixa(0.28, 0.03, 0.03, cx, 0.26, 0.44, aro); caixa(0.28, 0.03, 0.03, cx, 0.04, 0.44, aro);
            caixa(0.03, 0.22, 0.03, cx - 0.135, 0.15, 0.44, aro); caixa(0.03, 0.22, 0.03, cx + 0.135, 0.15, 0.44, aro);
        });
        caixa(0.06, 0.03, 0.03, 0, 0.18, 0.44, aro);
    }
}

function construirCorpo(corCamisa, corCalcao, aparencia, uniforme, leve) {
    leve = leve || 0;
    // Os corpos de 912 (`leve` 1) e de 976 (`leve` 3) triangulos foram retirados: quem os pedir recebe o `leve` 4 (480, o do jogo). O de 6548 (`leve` 0) fica so para o avatar do treinador e as paginas de face.
    if (leve === 1 || leve === 3) leve = 4;
    // Pele e juntas seguem o tom do jogador; as juntas ficam um pouco mais
    // escuras que a pele, para o contorno das articulações não desaparecer.
    const ap = aparencia || escolherAparencia(0, 11, 0);
    const corPele = ap.pele;
    const corJunta = new THREE.Color(corPele).multiplyScalar(0.72).getHex();
    const blockMat = new THREE.MeshStandardMaterial({ color: corPele, roughness: 0.8 }); const jointMat = new THREE.MeshStandardMaterial({ color: corJunta, roughness: 0.6 });
    /*
    A CAMISA E O CALCAO SAEM DO UNIFORME, se houver um.

    `pecaCamisa` e `pecaMeiao` sao os desenhos (padrao + cores); o calcao e
    sempre de uma cor, porque nenhum dos pedidos tem calcao padronizado e uma
    textura por peca custa memoria de GPU a troco de nada.

    O `shirtMat` leva a textura do padrao TAMBEM nas mangas e nas laterais do
    tronco: com a textura so na frente, um jogador de perfil aparecia com meia
    camisola lisa.
    */
    const UNI = uniforme || null;
    /*
    MANGA COMPRIDA — e o que distingue a camisola do guarda-redes.

    Pedido: *"ajusta a camisa do goleiro para manga comprida"*. E a camisola
    dele em qualquer estadio: manga comprida com o cotovelo protegido, e e uma
    das coisas que o faz ler como guarda-redes de longe, com o equipamento de
    outra cor.

    Vem do `uniforme` como uma bandeira e nao de um argumento proprio: o
    guarda-redes ja recebe um uniforme so dele (ver UniformeGuardaRedes em
    config/uniformes.js), e um segundo parametro para a mesma decisao era mais
    um sitio por onde ela se podia perder.
    */
    const mangaComprida = !!(UNI && UNI.mangaComprida);
    /*
    LUVAS (so o guarda-redes, e so com `uniforme.luvas`, ver sortearLuvas): o
    punho, a palma, os dedos e o polegar vestem a cor das COSTAS; a face da
    palma leva uma placa fina da cor da PALMA. Sem `luvas`, a mao e de pele.
    */
    const LUVAS = (mangaComprida && UNI.luvas) ? UNI.luvas : null;
    const luvaCostasMat = LUVAS ? new THREE.MeshStandardMaterial({ color: LUVAS.costas, roughness: 0.55 }) : null;
    const luvaPalmaMat = LUVAS ? new THREE.MeshStandardMaterial({ color: LUVAS.palma, roughness: 0.55 }) : null;
    const pecaCamisa = UNI ? UNI.camisa : null;
    /*
    A COR BASE DA CAMISA SAI DO UNIFORME, quando ele a tem. A frente e pintada por `pintarPadraoDeEquipamento` com a
    cor do uniforme, mas os lados, as mangas e as costas usavam `corCamisa` — a cor fixa do `createTeams` (amarelo e
    laranja nos guarda-redes). Resultado: frente na cor do kit e mangas e costas noutra. So afecta o desenho solido;
    os com padrao ja tem a textura propria nas mangas e nos lados.
    */
    if (pecaCamisa && pecaCamisa.cores && pecaCamisa.cores.length && !(pecaCamisa.padrao && pecaCamisa.padrao !== 'solido')) {
        corCamisa = pecaCamisa.cores[0];
    }
    const pecaMeiao = UNI ? UNI.meiao : null;
    /*
    O CALCAO PODE SER UMA PECA e nao so uma cor — pedido: *"coloca uma barra
    verde no short tambem"*. Aceita as duas formas:

        calcao: '#f2f2f2'                              uma cor, como antes
        calcao: { cores: ['#f2f2f2'], barra: {...} }    desenho com barra

    Sendo uma string, nada muda e nao se gasta uma textura: um calcao de uma
    cor so nao precisa de canvas nenhum.
    */
    const pecaCalcao = (UNI && UNI.calcao && typeof UNI.calcao === 'object') ? UNI.calcao : null;
    const corCalcaoFinal = pecaCalcao
        ? ((pecaCalcao.cores && pecaCalcao.cores[0]) || corCalcao)
        : ((UNI && UNI.calcao) ? UNI.calcao : corCalcao);
    const temPadraoCamisa = !!(pecaCamisa && pecaCamisa.padrao && pecaCamisa.padrao !== 'solido');

    let shirtMat;
    // MANGA de uma cor so (uniforme.camisa.manga): ver criarBraco. Sem ela, a manga leva o padrao.
    /*
    FAIXA DIAGONAL UNICA (Vasco-RJ): a faixa so existe na FRENTE e nas COSTAS. As mangas e as laterais/topo do tronco sao da cor de fundo
    (c1), lisas — pedido: *"manga da camisa e a parte de cima do uniforme do Vasco sao pretas; a faixa e so na frente e atras"*.
    */
    const kitFaixa = (pecaCamisa && pecaCamisa.padrao === 'kit' && pecaCamisa.kit && pecaCamisa.kit.diagonal && pecaCamisa.kit.c2 &&
        !pecaCamisa.kit.multipleDiagonals && !pecaCamisa.kit.dualDiagonal) ? pecaCamisa.kit : null;
    const corManga = (pecaCamisa && pecaCamisa.manga) ? pecaCamisa.manga : (kitFaixa ? kitFaixa.c1 : null);
    if (temPadraoCamisa) {
        const cvsC = document.createElement('canvas'); cvsC.width = 256; cvsC.height = 256;
        pintarPadraoDeEquipamento(cvsC.getContext('2d'), 256, 256, pecaCamisa, corCamisa);
        shirtMat = new THREE.MeshStandardMaterial({
            map: new THREE.CanvasTexture(cvsC), roughness: 0.9
        });
    } else {
        shirtMat = new THREE.MeshStandardMaterial({ color: corCamisa, roughness: 0.9 });
    }
    /*
    A FRENTE DO CALCAO LEVA O NUMERO, na perna ESQUERDA do jogador (x > 0; a
    direita de quem o olha de frente). Estava na outra: *"ajusta o numero do
    calcao para a perna esquerda"*. Pedido: *"que apareca o numero do jogador na parte
    da frente do short, na esquerda"*. Material proprio, so para essa face: o resto do
    calcao fica com o `shortMat`. O desenho do numero e do `Player.pintarNumeroNoShort`,
    que e quem o sabe; aqui pinta-se o fundo igual ao calcao.
    */
    const cvsKF = document.createElement('canvas'); cvsKF.width = 256; cvsKF.height = 256;
    const ctxKF = cvsKF.getContext('2d');
    if (pecaCalcao) pintarPadraoDeEquipamento(ctxKF, 256, 256, pecaCalcao, corCalcaoFinal);
    else { ctxKF.fillStyle = (typeof corCalcaoFinal === 'number') ? '#' + corCalcaoFinal.toString(16).padStart(6, '0') : corCalcaoFinal; ctxKF.fillRect(0, 0, 256, 256); }
    const shortFrenteMat = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cvsKF), roughness: 0.9 });
    const shortFrente = { mat: shortFrenteMat, cvs: cvsKF, peca: pecaCalcao, cor: corCalcaoFinal };
    /*
    A MANGA DA CAMISA TRICOLOR (kit do manager com as 3 cores: c1 grena, c2 branco, c3 verde — Fluminense, Gremio): 5 faixas de cor, 3 da
    primeira e 2 da terceira, ALTERNADAS E COM O BRANCO ENTRE CADA UMA (cor, branco, cor, branco, ... : 9 faixas). Antes a manga levava a
    textura da camisa esticada na caixa do braco, sem este desenho. Sem a cor da manga (`camisa.manga`) do kit; com ela vale a cor lisa.
    */
    const kitTri = (pecaCamisa && pecaCamisa.padrao === 'kit' && pecaCamisa.kit) ? pecaCamisa.kit : null;
    const ehTricolor = !!(kitTri && kitTri.c1 && kitTri.c2 && kitTri.c3 && kitTri.c3 !== kitTri.c1 && kitTri.c3 !== kitTri.c2 &&
        !kitTri.criciumaStripes && !kitTri.spfcStripes && !kitTri.horizontal && !kitTri.diagonal && !kitTri.dualDiagonal && !kitTri.multipleDiagonals);
    let mangaTricolorMat = null;
    if (ehTricolor && !corManga) {
        const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
        const cx = cv.getContext('2d');
        // c1, c2, c3, c2, c1, c2, c3, c2, c1: peso 1 nas cores e 0.5 no branco.
        const seq = [kitTri.c1, kitTri.c2, kitTri.c3, kitTri.c2, kitTri.c1, kitTri.c2, kitTri.c3, kitTri.c2, kitTri.c1];
        const pesos = seq.map((_, i) => (i % 2 === 0) ? 1 : 0.5);
        const soma = pesos.reduce((a, w) => a + w, 0);
        let acc = 0;
        seq.forEach((cor, i) => {
            const x0 = Math.round(128 * acc / soma); acc += pesos[i]; const x1 = Math.round(128 * acc / soma);
            cx.fillStyle = cor; cx.fillRect(x0, 0, Math.max(1, x1 - x0), 128);
        });
        mangaTricolorMat = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cv), roughness: 0.9 });
    }
    const mangaMat = corManga ? new THREE.MeshStandardMaterial({ color: corManga, roughness: 0.9 }) : (mangaTricolorMat || shirtMat);
    let shortMat;
    if (pecaCalcao) {
        const cvsK = document.createElement('canvas'); cvsK.width = 256; cvsK.height = 256;
        pintarPadraoDeEquipamento(cvsK.getContext('2d'), 256, 256, pecaCalcao, corCalcaoFinal);
        shortMat = new THREE.MeshStandardMaterial({
            map: new THREE.CanvasTexture(cvsK), roughness: 0.9
        });
    } else {
        shortMat = new THREE.MeshStandardMaterial({ color: corCalcaoFinal, roughness: 0.9 });
    }
    const bootMat = new THREE.MeshStandardMaterial({ color: ap.corChuteira, roughness: 0.5 }); const studMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const hairMat = new THREE.MeshStandardMaterial({ color: ap.cabelo, roughness: 0.9 });
    /*
    A TINTA DO ROSTO SAI DA PELE.

    Relato: *"os modelos de pele escura estão sem rosto"*. E estavam mesmo —
    olhos, nariz e boca eram 0x2f3640 fixo para toda a gente. Medido em
    luminância (linear, que é como o THREE.Color guarda): esse cinzento dá
    0.04 e a pele do tipo `negro` (0x6b4630, ver config/player_behavior.js) dá
    0.08. Quatro centésimos de diferença — a cara existia, só que desenhada em
    cima da própria pele. As outras três peles andam entre 0.62 e 0.75 e aí
    vê-se bem, que é porque isto passou despercebido.

    Agora a tinta INVERTE-SE em pele escura: a mesma cor da pele puxada 72%
    para o branco, o que dá contraste sem deixar de pertencer à cara — preto
    puro numa pele escura fica sujo, e branco puro fica máscara.

    O corte está em 0.42 de luminância, e não há pele nenhuma perto dele: a
    escura está em 0.08, a mais escura das claras em 0.62. Contraste medido
    depois da mudança: 0.66 na pele escura (tinta #e2dfde), 0.58 a 0.72 nas
    outras.
    */
    const lumPele = (() => {
        const c = new THREE.Color(corPele);
        return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    })();
    const corTinta = lumPele < 0.42
        ? new THREE.Color(corPele).lerp(new THREE.Color(0xffffff), 0.72).getHex()
        : 0x2f3640;

    const edgeMat = new THREE.LineBasicMaterial({ color: corTinta, linewidth: 2 }); const lineMat = new THREE.LineBasicMaterial({ color: corTinta });

    /*
    A FRENTE: o padrao do uniforme por BAIXO e o decote por cima. A ordem
    importa — pintar o decote primeiro e o padrao a seguir tapava-o.
    */
    const cvsV = document.createElement('canvas'); cvsV.width = 512; cvsV.height = 512; const ctxV = cvsV.getContext('2d');
    pintarPadraoDeEquipamento(ctxV, 512, 512, pecaCamisa, corCamisa);
    /*
    A GOLA E REDONDA, e pequena.

    Era um V: um triangulo de (136,0) a (376,0) com o bico em y=280 — mais de
    metade da altura do tronco, num decote de 240 px de boca. Pedido: *"a gola
    V das camisas esta muito grande; transforma em gola redonda"*.

    Agora e um arco: 86 px de raio centrado no topo do tronco, ou seja 172 de
    boca e 86 de queda — menos de um terco do que o V descia. `Math.PI` a `0`
    desenha a metade de BAIXO da circunferencia (no canvas o y cresce para
    baixo), que e o que fica a vista abaixo da linha do ombro; a metade de cima
    ficaria fora da textura.

    O `#dcdde1` e o mesmo cinza claro de antes — e o tom da gola, nao da
    camisola, e por isso nao sai do uniforme.
    */
    /*
    CRUZ DE MALTA na faixa (kit.cruzMalta): a altura do coracao (a ~30% da altura do tronco, para o lado do coracao do jogador = a direita de quem
    olha de frente). Acha-se a faixa LENDO a textura: na linha do coracao procura-se o troco branco (c2) mais perto desse lado e centra-se la a cruz.
    */
    if (pecaCamisa && pecaCamisa.kit && pecaCamisa.kit.cruzMalta) {
        const yC = Math.round(512 * 0.26);
        const linha = ctxV.getImageData(0, yC, 512, 1).data;
        const claro = (i) => linha[i * 4] > 200 && linha[i * 4 + 1] > 200 && linha[i * 4 + 2] > 200;
        let ini = -1, melhor = null;
        for (let x = 0; x <= 512; x++) {
            const c = x < 512 && claro(x);
            if (c && ini < 0) ini = x;
            if (!c && ini >= 0) { const tr = { a: ini, b: x - 1 }; if (!melhor || (tr.a + tr.b) > (melhor.a + melhor.b)) melhor = tr; ini = -1; }
        }
        const cx = melhor ? (melhor.a + melhor.b) / 2 : 330;
        const R = 46;
        ctxV.save();
        ctxV.translate(cx, yC);
        ctxV.fillStyle = '#d4101f';
        // Cruz de malta: quatro pontas em V (triangulos de bico cortado) a volta do centro.
        for (let k = 0; k < 4; k++) {
            ctxV.rotate(Math.PI / 2);
            ctxV.beginPath();
            ctxV.moveTo(0, 0); ctxV.lineTo(-R * 0.34, -R * 0.55); ctxV.lineTo(-R * 0.5, -R); ctxV.lineTo(0, -R * 0.78); ctxV.lineTo(R * 0.5, -R); ctxV.lineTo(R * 0.34, -R * 0.55);
            ctxV.closePath(); ctxV.fill();
        }
        ctxV.restore();
    }
    /*
    O ESCUDO DO CLUBE NO PEITO (`uniforme.escudo`: { logo, cores }): do lado do CORACAO (a direita de quem olha de frente), por baixo da gola. Com a imagem do clube
    (`logo`) desenha-se quando ela carrega (a textura e marcada para actualizar); sem imagem, ou se ela falhar, o escudo gerado: tres barras verticais com as
    cores do clube, na forma do TeamShield do manager. O Vasco-RJ nao leva (a cruz de malta, acima, e a marca dele).
    */
    let texFrenteEscudo = null;
    const escudoU = (UNI && UNI.escudo) ? UNI.escudo : null;
    const desenharEscudo = (img) => {
        const w = 124, h = 148, x0 = 345, y0 = 67;   // 2x o tamanho original (62 x 74); 10 cm mais alto, menos 5 cm (53 px) depois de ficar alto demais (o peito tem ~0.48 m em 512 px: 106 px), e mais para o lado para nao tocar na gola
        ctxV.save();
        ctxV.translate(x0, y0);
        if (img) {
            const r = Math.min(w / img.width, h / img.height);
            ctxV.drawImage(img, (w - img.width * r) / 2, (h - img.height * r) / 2, img.width * r, img.height * r);
        } else if (escudoU && escudoU.cores && typeof Path2D !== 'undefined') {
            const c = escudoU.cores, c1 = c[0] || '#333', c2 = c[1] || '#fff', c3 = (c[2] && c[2] !== 'transparent') ? c[2] : c1;
            ctxV.scale(w / 100, h / 120);
            const caminho = new Path2D('M0 0 L100 0 L100 40 C100 100 50 120 50 120 C50 120 0 100 0 40 Z');
            ctxV.save(); ctxV.clip(caminho);
            ctxV.fillStyle = c1; ctxV.fillRect(0, 0, 33, 120);
            ctxV.fillStyle = c2; ctxV.fillRect(33, 0, 34, 120);
            ctxV.fillStyle = c3; ctxV.fillRect(67, 0, 33, 120);
            ctxV.restore();
            ctxV.lineWidth = 5; ctxV.strokeStyle = 'rgba(0,0,0,0.35)'; ctxV.stroke(caminho);
        }
        ctxV.restore();
    };
    if (escudoU) {
        if (escudoU.logo && typeof Image !== 'undefined') {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => { desenharEscudo(img); if (texFrenteEscudo) texFrenteEscudo.needsUpdate = true; };
            img.onerror = () => { desenharEscudo(null); if (texFrenteEscudo) texFrenteEscudo.needsUpdate = true; };
            img.src = escudoU.logo;
        } else {
            desenharEscudo(null);
        }
    }
    const RAIO_GOLA = 86;
    // DENTRO DO DECOTE: a cor da pele do jogador (a gola e so a borda, ver abaixo).
    ctxV.fillStyle = new THREE.Color(corPele).getStyle();
    ctxV.beginPath();
    ctxV.arc(256, 0, RAIO_GOLA, 0, Math.PI);
    ctxV.closePath();
    ctxV.fill();
    /*
    A COR DA GOLA DO KIT E A BORDA (o debrum do decote), nao o miolo: pintar o decote por dentro dava um disco vermelho no peito.
    Com `uniforme.gola` a borda e dessa cor e mais larga; sem ela fica o traco escuro de sempre.
    */
    ctxV.strokeStyle = (UNI && UNI.gola) ? UNI.gola : '#2f3640';
    ctxV.lineWidth = (UNI && UNI.gola) ? 22 : 10;
    ctxV.beginPath();
    ctxV.arc(256, 0, RAIO_GOLA, 0, Math.PI);
    ctxV.stroke();

    /*
    AS COSTAS ficam com o mesmo material de sempre — e o `updateShirt`
    (player.js) que lhes desenha o numero, e e ele que repinta o padrao por
    baixo dele, porque so lá se sabe qual e o numero.
    */
    const backMat = new THREE.MeshStandardMaterial({ color: corCamisa, roughness: 0.9 });
    const ladoMat = kitFaixa ? new THREE.MeshStandardMaterial({ color: kitFaixa.c1, roughness: 0.9 }) : shirtMat;
    texFrenteEscudo = new THREE.CanvasTexture(cvsV);
    const chestMats = [ladoMat, ladoMat, ladoMat, ladoMat, new THREE.MeshStandardMaterial({ map: texFrenteEscudo }), backMat];

    /*
    O MEIAO. Sem uniforme fica o de sempre: a cor da camisa com duas argolas
    brancas no cano. Com uniforme, o padrao dele manda e as argolas caem — as
    do Flamengo sao as proprias faixas, e o do Fluminense e branco liso.
    */
    const cvsS = document.createElement('canvas'); cvsS.width = 256; cvsS.height = 256; const ctxS = cvsS.getContext('2d');
    const corMeiaoBase = (pecaMeiao && pecaMeiao.cores && pecaMeiao.cores.length)
        ? pecaMeiao.cores[0] : corCamisa;
    if (pecaMeiao) {
        pintarPadraoDeEquipamento(ctxS, 256, 256, pecaMeiao, corCamisa);
    } else {
        ctxS.fillStyle = corCamisa; ctxS.fillRect(0, 0, 256, 256); ctxS.fillStyle = (UNI && UNI.argolas) ? UNI.argolas : '#ffffff'; ctxS.fillRect(0, 20, 256, 30); ctxS.fillRect(0, 70, 256, 15);
    }
    // (sem moldura: o contorno escuro pintado nas bordas da textura era o que marcava as arestas do meião)
    const sockTex = new THREE.CanvasTexture(cvsS);
    const sockMats = [new THREE.MeshStandardMaterial({ map: sockTex }), new THREE.MeshStandardMaterial({ map: sockTex }), new THREE.MeshStandardMaterial({ color: corMeiaoBase }), new THREE.MeshStandardMaterial({ color: corMeiaoBase }), new THREE.MeshStandardMaterial({ map: sockTex }), new THREE.MeshStandardMaterial({ map: sockTex })];

    const u = 1.0; const corpo = new THREE.Group();
    const rig = { pelvis: null, chest: null, neck: null, lArm: null, rArm: null, lElbow: null, rElbow: null, lHand: null, rHand: null, lLeg: null, rLeg: null, lKnee: null, rKnee: null, lFoot: null, rFoot: null, olhoEsq: null, olhoDir: null };

    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 850);
    /*
    QUEM PROJECTA SOMBRA.

    Das 24 pecas do corpo so a BACIA tinha `castShadow` — a sombra no relvado
    era uma manchinha do tamanho da anca, sem tronco, sem cabeca e sem pernas.
    Agora as pecas ESTRUTURAIS projectam (tronco, cabeca, bracos, coxas,
    canelas, chuteiras) e as decorativas nao: o cabelo, as mangas, os calcoes,
    os meioes, as juntas e as travas das chuteiras estao todos DENTRO de uma
    peca que ja projecta, e a sombra deles seria a mesma silhueta desenhada
    duas vezes — custo no shadow pass a troco de nada.

    Em tablets continua tudo desligado, como estava.
    */
    /*
    UMA CAIXA COM A PONTA MAIS FINA DO QUE A BASE.

    A geometria continua a ser uma BoxGeometry — só os quatro vértices da ponta
    são puxados para dentro. Um `CylinderGeometry` afunilado era mais curto de
    escrever e arredondava o dedo; este modelo é todo de faces planas e um dedo
    redondo ficava a destoar de tudo o resto.

    A PONTA É O -Y: na mão, o y desce da palma para as unhas (ver criarBraco),
    portanto pinçam-se os vértices com y negativo. Pinçar os de cima afinava o
    dedo do lado errado, junto à palma.

    O `computeVertexNormals` no fim não é opcional: sem ele as normais ficam as
    da caixa recta e as quatro faces laterais apanham luz como se fossem
    verticais, o que apaga o afunilamento no ecrã.
    */
    // O CONTRARIO: afina o TOPO (+y) em vez da ponta — a parte de cima da palma, junto ao punho (ver `MAO_TOPO_AFUNIL`).
    function caixaAfuniladaNoTopo(w, h, d, afunil) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            if (pos.getY(i) > 0) {
                pos.setX(i, pos.getX(i) * afunil);
                pos.setZ(i, pos.getZ(i) * afunil);
            }
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        return geo;
    }
    function caixaAfunilada(w, h, d, afunil) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            if (pos.getY(i) < 0) {
                pos.setX(i, pos.getX(i) * afunil);
                pos.setZ(i, pos.getZ(i) * afunil);
            }
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        return geo;
    }

    function criarPeca(geo, mat, castShadow = false) { 
        const m = new THREE.Mesh(geo, mat); 
        m.castShadow = isTouchDevice ? false : castShadow; 
        m.receiveShadow = true; 
        return m; 
    }

    /*
    =========================================================================
    NÃO HÁ PÉLVIS. O CALÇÃO É A PERNA TODA DE CIMA.
    =========================================================================
    Pedido, com três fotografias: *"não é pra ter pelvis. O short já começa de
    cima e vai até o final da coxa, quase no joelho"*.

    Isto já foi, por esta ordem: uma caixa de calção presa à anca (a coxa
    rodava de DENTRO dela — *"a perna está entrando por dentro do short"*),
    depois uma bainha de camisa a descer sobre a anca, depois a própria caixa
    da pélvis pintada de calção. Todas partilhavam o mesmo defeito: a anca era
    uma peça PARADA e o calção ficava partido em duas, uma que não se mexia e
    outra que se mexia.

    Agora `rig.pelvis` é só o nó da anca — um Group sem malha nenhuma. Continua
    a ser a raiz do corpo (o fsm e o replay escrevem-lhe posição e rotação, e
    nada disso lê geometria); o que desapareceu foi o bloco visível. Quem veste
    a anca são os dois calções das coxas, que sobem acima da articulação e se
    sobrepõem ao meio — ver `criarPerna`.
    =========================================================================
    */
    const pelvis = new THREE.Group(); pelvis.position.y = 2.6; corpo.add(pelvis); rig.pelvis = pelvis;
    /*
    TRONCO — uma peça só (pedido).

    Eram três caixas empilhadas: pelvis (1.30 de largura), belly (1.10) e
    chest (1.40). Como a do meio era a mais ESTREITA das três, o tronco
    fazia uma cintura em degrau — dois vincos visíveis de perfil, que é o
    que se via na captura.

    Agora belly e chest são a mesma caixa: vai de onde começava a barriga
    (y 0.30 no espaço da pelvis) até ao topo do peito (y 1.75), logo
    1.45 de altura, centrada em 1.025. Os filhos do peito (pescoço,
    braços) levam +0.225 para compensar a origem ter descido de 1.25
    para 1.025 — a pose fica idêntica à de antes.
    */
    /*
    CAIXA DO TÓRAX: a parte de cima é 25% menor que a de baixo na largura (X).
    Para evitar a distorção afim/diagonal da textura (que em trapézios de 2 triângulos
    entorta listras e números para o lado ao cruzar a diagonal), a geometria é
    subdividida ao longo de X e Y, e o afunilamento é interpolado suavemente
    da base até o topo:
        fator = 1.0 - (1.0 - afunilTopoX) * t
    onde t vai de 0 na base a 1 no topo. Desta forma, para qualquer altura Y,
    o centro da textura (U=0.5) fica exatamente em X=0 e as listras, faixas,
    gola e número do uniforme mantêm-se retas e perfeitamente simétricas sem
    desvio para o lado.
    */
    function caixaTorax(w, h, d, afunilTopoX = 0.75, segs = 16) {
        // O afunilamento so depende de y: a subdivisao em x nao servia a nada (1152 triangulos por caixa, 2 caixas).
        const geo = new THREE.BoxGeometry(w, h, d, leve ? 1 : segs, segs, 1);
        const pos = geo.attributes.position;
        const yMin = -h / 2;
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const t = Math.max(0, Math.min(1, (y - yMin) / h));
            const fator = 1.0 - (1.0 - afunilTopoX) * t;
            pos.setX(i, pos.getX(i) * fator);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        return geo;
    }

    /*
    =========================================================================
    O TRONCO RODA PELA CINTURA, E NAO PELO SEU PROPRIO MEIO
    =========================================================================
    `rig.chest` — o no que todas as poses rodam — e este Group, posto na
    CINTURA (y 0.275 no espaco da anca, a altura exacta onde a bainha da
    camisa encontra o topo do calcao). A malha do tronco pendura-se nele
    0.75 acima, portanto com rotacao zero fica em 0.275 + 0.75 = 1.025, que
    e onde sempre esteve: a pose neutra nao mexe um milimetro.

    ERA A MALHA QUE RODAVA, E RODAVA A MEIO DE SI PROPRIA. Com o pivo em
    1.025 e a bainha em 0.275, qualquer inclinacao do tronco levantava e
    empurrava a PROPRIA COSTURA, com 0.75 unidades (0.245 m) de braco de
    alavanca. Relato: *"o corpo esta descolado das pernas"*. Medido, o buraco
    nas costas entre a bainha e o calcao:

        chest 0.00   fecha (sobrepoe 8 mm)
        chest 0.20   0.057 m
        chest 0.40   0.110 m
        chest 0.80   0.216 m

    Nao era de um clip: era de todos. O tiro de meta abria 0.135 m no frame
    1, o PlayerKickClip 0.121 m, e o mesmo valia para a corrida, o remate,
    as defesas e o arbitro — qualquer pose com o tronco inclinado.

    Com o pivo na cintura o braco de alavanca da costura passa a ser ZERO: a
    bainha fica cravada no topo do calcao seja qual for o angulo, que e como
    uma camisa se comporta.

    QUEM ADICIONA FILHOS AO TRONCO adiciona-os a MALHA (`chest`), e nao a
    este Group: os offsets do pescoco, da casca e dos bracos continuam a ser
    medidos a partir do meio do tronco, como estavam.

    UM EFEITO A CONHECER: `rig.chest.matrixWorld` passa a ter origem na
    cintura. O unico sitio que o le e o `gk_dive.js`, para projectar o alvo
    das maos para o plano a frente do peito; com o tronco inclinado `a`, esse
    plano desloca-se 0.245*sin(a) metros. Os valores de `chest` do mergulho
    sao pequenos (-0.1 a 0.5), e e um limite de seguranca e nao uma pose.
    =========================================================================
    */
    const cintura = new THREE.Group(); cintura.position.y = 0.275;
    pelvis.add(cintura); rig.chest = cintura;

    const chest = leve === 5 ? new THREE.Group() : criarPeca(caixaTorax(u * 1.4, u * 1.45, u * 0.75, 0.75, leve ? 1 : 16), blockMat);   // leve 5: so a casca da camisa
    chest.position.y = 1.025 - 0.275;
    /*
    A SOMBRA DO TRONCO vive aqui. Era a caixa da pélvis que a projectava e ela
    deixou de existir; sem esta linha o jogador passa a fazer sombra de pernas
    e cabeça com um buraco no meio.
    */
    chest.add(criarPeca(caixaTorax(u * 1.45, u * 1.5, u * 0.8, 0.75, leve === 5 ? 1 : leve === 4 ? 2 : leve === 2 ? 4 : leve === 1 ? 8 : 16), chestMats, true));
    /*
    SEM BAINHA. A camisa acaba no peito — pedido: *"ajusta a cor da camisa só
    no peito"*.

    Houve aqui uma peça extra, cor de camisa, a descer sobre a anca. A casca
    do peito acaba em 0.275 no espaço da anca e o calção das coxas sobe até
    0.30, portanto a costura fecha sem ela.
    */
    cintura.add(chest);
    const neck = criarPeca(new THREE.BoxGeometry(u * 0.35, u * 0.15, u * 0.35), blockMat); neck.position.y = 0.8; chest.add(neck); rig.neck = neck;
    const head = criarPeca(new THREE.BoxGeometry(u * 0.8, u * 1.0, u * 0.85), blockMat, true); head.position.y = 0.575;

    const faceGrp = new THREE.Group(); const faceZ = u * 0.426;
    /*
    PELE ESCURA, ROSTO NATURAL (jogadores e arbitros; a torcida - `leve` - fica como estava). A tinta clara de cima dava contraste mas parecia uma mascara (relato:
    olhos, boca e nariz claros). Agora: os olhos sao o branco do olho com a pupila escura por cima, o nariz e uma sombra mais escura que a pele e a boca e o labio,
    um tom mais claro e avermelhado que a pele.
    */
    const peleEscura = lumPele < 0.42 && !leve;
    const eyeMat = new THREE.MeshBasicMaterial({ color: !leve ? 0x14100e : corTinta });   // jogadores e arbitros, de qualquer pele: pupila preta no meio do branco do olho
    rig.olhoEsq = new THREE.Mesh(new THREE.PlaneGeometry(u * 0.08, u * 0.14), eyeMat); rig.olhoEsq.position.set(-u * 0.16, u * 0.15, faceZ);
    rig.olhoDir = new THREE.Mesh(new THREE.PlaneGeometry(u * 0.08, u * 0.14), eyeMat); rig.olhoDir.position.set(u * 0.16, u * 0.15, faceZ);
    const narizMat = peleEscura ? new THREE.LineBasicMaterial({ color: new THREE.Color(corPele).lerp(new THREE.Color(0x000000), 0.6).getHex() }) : lineMat;
    const bocaMat = peleEscura ? new THREE.LineBasicMaterial({ color: new THREE.Color(corPele).lerp(new THREE.Color(0xb07a6c), 0.4).getHex() }) : lineMat;
    const nariz = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, u * 0.05, faceZ), new THREE.Vector3(0, -u * 0.08, faceZ), new THREE.Vector3(u * 0.06, -u * 0.08, faceZ)]), narizMat);
    const boca = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-u * 0.12, -u * 0.22, faceZ), new THREE.Vector3(u * 0.12, -u * 0.22, faceZ)]), bocaMat);
    faceGrp.add(rig.olhoEsq, rig.olhoDir, nariz, boca);
    if (!leve) {
        // O branco do olho (em TODAS as peles; a torcida - `leve` - fica como estava), um pouco maior que a pupila e logo por tras dela (o nariz e a boca ficam nos seus tons).
        const brancoMat = new THREE.MeshBasicMaterial({ color: 0xe9e4dc });
        for (const lado of [-1, 1]) {
            const b = new THREE.Mesh(new THREE.PlaneGeometry(u * 0.15, u * 0.11), brancoMat);
            b.position.set(lado * u * 0.16, u * 0.15, faceZ);   // na face da cabeca (u * 0.425) ou logo a frente: atras dela o branco ficava escondido pela caixa
            faceGrp.add(b);
        }
        rig.olhoEsq.position.z = rig.olhoDir.position.z = faceZ + u * 0.0015;   // a pupila a frente do branco
        rig.olhoEsq.geometry = rig.olhoDir.geometry = new THREE.PlaneGeometry(u * 0.06, u * 0.09);   // a pupila: preta, no meio do branco do olho
    }
    head.add(faceGrp);

    const hairGrp = new THREE.Group();
    const hT = criarPeca(new THREE.BoxGeometry(u * 0.88, u * 0.25, u * 0.9), hairMat); hT.position.set(0, u * 0.5, 0);
    const hB = criarPeca(new THREE.BoxGeometry(u * 0.88, u * 0.7, u * 0.25), hairMat); hB.position.set(0, u * 0.15, -u * 0.35);
    const hL = criarPeca(new THREE.BoxGeometry(u * 0.15, u * 0.6, u * 0.65), hairMat); hL.position.set(-u * 0.4, u * 0.2, -u * 0.1);
    const hR = criarPeca(new THREE.BoxGeometry(u * 0.15, u * 0.6, u * 0.65), hairMat); hR.position.set(u * 0.4, u * 0.2, -u * 0.1);
    const hF = criarPeca(new THREE.BoxGeometry(u * 0.88, u * 0.15, u * 0.2), hairMat); hF.position.set(0, u * 0.45, u * 0.38);
    if (leve === 5) hairGrp.add(hT, hB); else hairGrp.add(hT, hB, hL, hR, hF);   // leve 5: so o topo e as costas do cabelo (os outros ficam soltos, para a face personalizada nao falhar)
    head.add(hairGrp); neck.add(head);
    const corPintada = corPintadaDoClube(uniforme);   // o cabelo pintado leva as cores do clube
    const apCabelo = corPintada ? Object.assign({}, ap, { corPintada }) : ap;
    if (ap.tipo === 'custom') aplicarFaceCustom(apCabelo, head, boca, { hT, hB, hL, hR, hF }, u);   // face personalizada: estilo do cabelo, barba e oculos
    else if (leve !== 5 && (ap.estilo || ap.barba)) {   // os jogadores sem face personalizada: o cabelo e a barba sorteados pelo id (estiloDeCabeloDe / estiloDeBarbaDe, utils.js)
        if (ap.estilo) aplicarEstiloCabelo(ap.estilo, apCabelo, head, { hT, hB, hL, hR, hF }, u);
        if (ap.barba) aplicarBarba(ap.barba, ap, head, boca, u);
    }   // os jogadores sem face personalizada: o estilo de cabelo sorteado pelo id (estiloDeCabeloDe, utils.js)
    if (ap.tipo === 'custom' && ap.rosto && !leve && typeof Image !== 'undefined') {   // a cara em pixels so nos jogadores e arbitros (a torcida usa `leve`)
        const faceMat = new THREE.MeshStandardMaterial({ map: texturaDoRostoPixelado(ap.rosto), color: 0xdcdcdc, roughness: 0.8 });   // `color` < branco: a luz do jogo estoura a foto
        dividirFrente(head.geometry); head.material = [blockMat, faceMat];   // as 5 faces de pele e a frente com a foto: 2 chamadas de desenho
        rig.olhoEsq.visible = rig.olhoDir.visible = nariz.visible = boca.visible = false;
        // Com a foto na face, o topo do cabelo alinha com ela (sem o degrau de 2.5 cm a frente do rosto nem a aba larga dos lados): menos "laje", mais cabelo.
        hT.position.z -= u * 0.025; hT.scale.x *= 0.94;
        hF.visible = false;   // a franja era um bloco liso sobre a testa: a faixa de cabelo da foto (ou o proprio topo) ocupa o lugar
        // A FAIXA DE CABELO da foto, na frente do bloco do topo (ordem das faces do Box: +x, -x, +y, -y, +z frente, -z)
        if (ap.cabeloTextura) { dividirFrente(hT.geometry); hT.material = [hairMat, new THREE.MeshStandardMaterial({ map: texturaDoRostoPixelado(ap.cabeloTextura), color: 0xdcdcdc, roughness: 0.9 })]; }
        // O RELEVO: orelhas (nas laterais, a altura dos olhos e do nariz) e um nariz que sai do rosto, com o pedaco do nariz da foto na frente.
        const caixaPele = (w, h, d, x, y, z, mats) => { const m = new THREE.Mesh(mats ? dividirFrente(new THREE.BoxGeometry(u * w, u * h, u * d)) : new THREE.BoxGeometry(u * w, u * h, u * d), mats || blockMat); m.position.set(u * x, u * y, u * z); m.castShadow = false; head.add(m); return m; };
        if ((ap.estilo || 'curto') !== 'longo') { caixaPele(0.06, 0.22, 0.14, -0.43, 0.02, -0.02); caixaPele(0.06, 0.22, 0.14, 0.43, 0.02, -0.02); }
        head.add(malhaVoxelDoRosto(ap.rosto, u));   // o relevo: cada pixel da cara e uma coluna (nariz, sobrancelhas, barba, cabelo)
    }

    /*
    A PROPORÇÃO EM CABEÇAS — ver ProporcaoCorpo (config/physics.js).

    Escala-se o `head`, e com ele a cara e o cabelo, que são filhos dele. O
    QUEIXO fica onde está: a caixa da cabeça tem 1.0 de altura centrada em
    0.575, portanto o queixo está em 0.075, e o novo centro é
    `0.075 + 0.5*k` — sem isto encolher a cabeça abria um vão no pescoço.

    Pôr `cabecas: 5.04` devolve `k = 1` e nada disto mexe.
    */
    if (typeof ProporcaoCorpo !== 'undefined') {
        const k = ProporcaoCorpo.escalaCabeca;
        if (Math.abs(k - 1) > 0.001) {
            head.scale.setScalar(k);
            head.position.y = 0.075 + 0.5 * k;
        }
    }
    if (ap.tipo === 'custom' && ap.largura) head.scale.x *= ap.largura;   // face personalizada: a largura do rosto (depois da proporcao da cabeca)

    // Versoes leves (`leve` >= 1): SEM esferas nas juntas — cada membro entra EXTRA unidades no seguinte (antebraco no braco, canela na coxa), para o movimento nao abrir fresta.
    const EXTRA = leve ? 0.18 : 0;
    const segJ = leve === 2 ? [8, 6] : leve === 1 ? [14, 12] : [16, 16];
    const jointGeo = new THREE.SphereGeometry(u * 0.2, segJ[0], segJ[1]); const smallJointGeo = new THREE.SphereGeometry(u * 0.15, segJ[0], segJ[1]);

    function criarBraco(x) {
        /*
        O OMBRO FICA À ALTURA DO TOPO DO TÓRAX — pedido, com fotografia.

        Estava em 0.525, que era "0.30 de antes + 0.225 da nova origem do
        tronco". Medido com `tools/scratch/ombro_altura.js`: isso deixava a
        articulação **0.225 unidades (7.4 cm) ABAIXO** do topo da caixa do
        peito — e como a manga começa no ombro, sobrava um bloco de tronco
        acima dos ombros. Era o que se via: um boneco de ombros caídos com um
        degrau de camisa por cima deles.

        0.75 é exactamente a meia-altura da casca do peito (1.5 / 2), portanto
        o ombro e o topo do tórax ficam à mesma altura e a manga fecha rente.

        Isto sobe as mãos 7.4 cm em todas as poses — incluindo o alcance do IK
        dos braços do guarda-redes, que mede a partir do ombro. É o que se
        pretende: o ombro estava no sítio errado e tudo o que pende dele estava
        com ele.
        */
        const grp = new THREE.Group(); grp.position.set(x, 0.75, 0);
        const up = criarPeca(new THREE.BoxGeometry(u * 0.35, u * 1.0, u * 0.35), blockMat, true); up.position.y = -0.5;
        /*
        A MANGA. Curta cobre a metade de cima do braco (0.5 de 1.0); comprida
        cobre-o inteiro e continua no antebraco, ate ao pulso — ver
        `mangaComprida`.

        As medidas saem das pecas que ela veste e nao de numeros novos: o braco
        de cima e 1.0 de altura e 0.35 de lado, o antebraco 0.8 e 0.30. A manga
        leva 0.05 a mais de lado em cada peca, que e a folga que a faz ler como
        pano por cima do braco em vez de tinta nele.
        */
        // Manga curta: ate 3/4 do braco de cima (era 1/2: "um pouco alta"); comprida: o braco inteiro.
        const alturaManga = mangaComprida ? 1.0 : 0.75;
        // 1 cm a mais no TOPO (0.01 m / 0.33 m por unidade = 0.03): cobre o ombro e não deixa a pele aparecer.
        const extraTopo = 0.03;
        const manga = criarPeca(new THREE.BoxGeometry(u * 0.4, u * (alturaManga + extraTopo), u * 0.4), mangaMat);
        manga.position.y = (0.5 - alturaManga / 2) + extraTopo / 2;
        up.add(manga); grp.add(up);
        /*
        O PUNHO DA MANGA (a barra no fim dela) na cor da gola do kit, como nos icones do Dashboard (ShirtIcon: punhos = collarColor).
        Manga curta: uma faixa no fim da manga, a meio do braco; manga comprida (guarda-redes): no pulso, mais abaixo.
        */
        const corPunho = (UNI && UNI.gola) ? UNI.gola : null;
        const punhoMat = corPunho ? new THREE.MeshStandardMaterial({ color: corPunho, roughness: 0.9 }) : null;
        if (punhoMat && !mangaComprida) {
            const punhoCurto = criarPeca(new THREE.BoxGeometry(u * 0.41, u * 0.12, u * 0.41), punhoMat);
            punhoCurto.position.y = (0.5 - alturaManga) + 0.06;   // no fim da manga
            up.add(punhoCurto);
        }
        const elb = new THREE.Group(); elb.position.y = -1.0; elb.rotation.x = -0.3; grp.add(elb); if (!leve) elb.add(criarPeca(smallJointGeo, jointMat));
        // O ANTEBRACO AFUNILA para o punho: a ponta de baixo fica 25% mais estreita (`ANTEBRACO_AFUNIL`; eram 15%, pedido: "10% mais"), de cima para baixo.
        const ANTEBRACO_AFUNIL = 0.75;
        const low = criarPeca(caixaAfunilada(u * 0.3, u * (0.8 + EXTRA), u * 0.3, ANTEBRACO_AFUNIL), blockMat, true); low.position.y = -0.4 + EXTRA / 2; elb.add(low);
        /*
        A METADE DE BAIXO DA MANGA COMPRIDA, no antebraco. Fica filha do `low`
        e nao do `elb`: assim dobra com o cotovelo em vez de atravessar o braco
        quando ele se dobra — e o cotovelo do guarda-redes dobra o tempo todo.
        */
        if (mangaComprida) {
            const mangaBaixo = criarPeca(caixaAfunilada(u * 0.35, u * 0.8, u * 0.35, ANTEBRACO_AFUNIL), mangaMat);
            mangaBaixo.position.y = -EXTRA / 2;
            low.add(mangaBaixo);
            if (punhoMat) {
                const punhoLongo = criarPeca(new THREE.BoxGeometry(u * 0.36 * 0.8, u * 0.12, u * 0.36 * 0.8), punhoMat);   // 0.8: perto do punho o antebraco e mais estreito
                punhoLongo.position.y = -0.34 - EXTRA / 2;
                low.add(punhoLongo);
            }
        }
        const handG = new THREE.Group(); handG.position.y = -0.8; elb.add(handG);
        /*
        A MÃO. O `handG` é o pivô e NÃO se move: é dele que o IK dos braços, o
        `colarBolaAsMaos` e os testes de contacto lêem a posição (ver
        MaoDetalhada em config/animations.js).

        O `rotation.y = PI/2` é a convenção antiga e fica: põe a largura da
        palma ao longo de Z do antebraço, que é a orientação com que todas as
        poses já foram afinadas. Dentro do sub-grupo o referencial é o da mão —
        x atravessa a palma, y desce pelos dedos, z é a espessura.
        */
        const MD = (typeof MaoDetalhada !== 'undefined') ? MaoDetalhada : null;

        /*
        A JUNTA DO PUNHO, no pivô, como a do cotovelo e a do joelho. Vai no
        `handG` e não no `maoG` — uma esfera é indiferente à rotação, e assim
        não depende da convenção de PI/2 da mão.

        É ela que faz a LIGAÇÃO entre o antebraço e a mão girar sem abrir
        folga, e é o que torna o pulso animável nas defesas do guarda-redes
        (ver MaoDetalhada.juntaRaio, com os canais já existentes).
        */
        if (!leve && MD && MD.activo && MD.juntaRaio > 0) {
            handG.add(criarPeca(new THREE.SphereGeometry(u * MD.juntaRaio, leve === 2 ? 8 : leve === 1 ? 10 : 12, leve === 2 ? 6 : leve === 1 ? 8 : 12), jointMat));
        }

        const maoMat = luvaCostasMat || blockMat;
        const maoG = new THREE.Group(); maoG.rotation.y = Math.PI / 2; handG.add(maoG);

        if (!MD || !MD.activo) {
            // A laje de sempre, para se poder desligar a mão nova num sítio só.
            const mao = criarPeca(new THREE.BoxGeometry(u * 0.35, u * 0.4, u * 0.2), maoMat);
            mao.position.y = -0.2; maoG.add(mao);
        } else {
            /*
            O PUNHO fica entre o antebraço e a palma, e é mais fino do que
            ambos (ver MaoDetalhada). Sai do pivô para baixo, portanto o pivô
            continua no pulso — que é onde a articulação está.
            */
            const punhoComp = MD.punhoComp || 0;
            if (punhoComp > 0) {
                const punho = criarPeca(new THREE.BoxGeometry(
                    u * MD.punhoLarg, u * punhoComp, u * MD.punhoEsp), maoMat);
                punho.position.y = -punhoComp / 2;
                maoG.add(punho);
            }

            /*
            A PALMA E TUDO O QUE LHE ESTÁ PRESO vivem num grupo próprio,
            deslocado para baixo do punho. Assim os dedos e o polegar continuam
            a ser posicionados em relação à palma e não ao pulso — mexer no
            `punhoComp` desloca o conjunto todo sem desalinhar nada.
            */
            const palmaG = new THREE.Group();
            palmaG.position.y = -punhoComp;
            maoG.add(palmaG);

            // A parte de CIMA da mao (junto ao punho) 15% mais fina: pedido. 1 desliga.
            const MAO_TOPO_AFUNIL = 0.85;
            const palma = criarPeca(caixaAfuniladaNoTopo(
                u * MD.palmaLarg, u * MD.palmaComp, u * MD.palmaEsp, MAO_TOPO_AFUNIL), maoMat);
            palma.position.y = -MD.palmaComp / 2;
            palmaG.add(palma);

            /*
            OS DEDOS dividem a largura da palma em partes iguais, com folga
            entre eles: é a folga que os faz ler como dedos e não como um bloco
            ranhurado. O primeiro fica centrado na sua fatia, não na borda.
            */
            // Os dedos vivem num grupo com o pivo na base da palma: rodar `dedosG` em X fecha o punho (ver Player.fecharMaosDoSoco).
            const dedosG = new THREE.Group();
            dedosG.position.y = -MD.palmaComp;
            palmaG.add(dedosG);
            handG.userData.dedosG = dedosG;
            handG.userData.ladoPalma = (x > 0 ? -1 : 1);   // a face da palma (a mesma da placa da luva)
            const n = (leve === 5) ? 0 : Math.max(1, MD.dedos);   // leve 5 (torcida, staff, reservas): a mao e so a palma, sem dedos nem polegar (-5 caixas por mao)
            const fatia = MD.palmaLarg / Math.max(1, n);
            const dedoLarg = Math.max(0.02, fatia - MD.folgaEntreDedos);
            const afunil = (typeof MD.dedoAfunil === 'number') ? MD.dedoAfunil : 1;
            const decaim = (typeof MD.dedoDecaimento === 'number') ? MD.dedoDecaimento : 0;
            for (let i = 0; i < n; i++) {
                /*
                O dedo 0 e o do lado do POLEGAR, e e o mais comprido; dai para o
                outro lado cada um encurta `dedoDecaimento` (ver MaoDetalhada).
                */
                const comp = Math.max(0.03, MD.dedoComp * (1 - decaim * i));
                const dedo = criarPeca(caixaAfunilada(
                    u * dedoLarg, u * comp, u * MD.dedoEsp, afunil), maoMat);
                /*
                TODOS ARRANCAM DA PALMA. O centro de cada um depende do seu
                comprimento, senao os mais curtos ficavam a flutuar com uma
                folga entre a palma e a base do dedo.
                */
                dedo.position.set(
                    u * (-MD.palmaLarg / 2 + fatia * (i + 0.5)),
                    -comp / 2,
                    0);
                dedosG.add(dedo);
            }

            /*
            O POLEGAR APONTA PARA A FRENTE DO CORPO, nas duas mãos.

            Estava espelhado pelo braço (`x < 0 ? -1 : 1`) e saiu errado: com o
            `maoG` rodado PI/2 em Y, o x LOCAL da mão corre ao longo do Z do
            corpo, ou seja frente-trás e não lado-a-lado. Espelhar punha um
            polegar para a frente e o outro PARA TRÁS — que foi o que se viu na
            mão esquerda.

            A rotação de +PI/2 em Y leva o local +x ao -z do corpo, e o +z do
            corpo é a frente (a mesma convenção do eixo do tombo no
            gk_dive.js). Logo a frente é o local -x, igual nas duas mãos: com as
            palmas voltadas ao corpo, os dois polegares apontam para a frente, e
            não há nada para espelhar.

            Roda-se em Z para ele abrir da palma, e o pivô fica no encaixe com a
            palma (o grupo intermédio), senão rodar deslocava-o em vez de o
            abrir.
            */
            /*
            A PLACA DA PALMA: a face de dentro da luva, da base da palma a ponta
            dos dedos. Com os bracos ao longo do corpo a palma olha para dentro:
            local -z na mao esquerda (x > 0), +z na direita.
            */
            if (luvaPalmaMat) {
                const alturaPlaca = MD.palmaComp + MD.dedoComp * 0.85;
                const espMax = Math.max(MD.palmaEsp, MD.dedoEsp);
                const placa = criarPeca(new THREE.BoxGeometry(
                    u * (MD.palmaLarg - 0.02), u * alturaPlaca, u * 0.02), luvaPalmaMat);
                placa.position.set(0, -alturaPlaca / 2, (x > 0 ? -1 : 1) * u * (espMax / 2 + 0.008));
                palmaG.add(placa);
            }

            const ladoPolegar = -1;
            const polegarG = new THREE.Group();
            polegarG.position.set(u * ladoPolegar * MD.palmaLarg / 2, -MD.palmaComp * 0.45, 0);
            polegarG.rotation.z = ladoPolegar * MD.aberturaPolegar;
            palmaG.add(polegarG);
            if (leve !== 5) {
                const polegar = criarPeca(caixaAfunilada(
                    u * MD.polegarLarg, u * MD.polegarComp, u * MD.polegarEsp,
                    (typeof MD.dedoAfunil === 'number') ? MD.dedoAfunil : 1), maoMat);
                polegar.position.y = -MD.polegarComp / 2;
                polegarG.add(polegar);
            }
        }
        grp.rotation.z = x < 0 ? -Math.PI / 16 : Math.PI / 16; chest.add(grp); return { raiz: grp, cotovelo: elb, mao: handG };
    }

    function criarPerna(x) {
        /*
        O PIVO DA PERNA DE CIMA ESTÁ NA CINTURA, não a meio da coxa — pedido:
        *"o pivo da parte de cima da perna tem que estar na cintura"*.

        Estava em -0.30 no espaço da anca, que é mesmo o meio do calção (ele vai
        de +0.30 a -1.15). Rodar a perna rodava o calção à volta do próprio
        centro: a metade de baixo ia para a frente e a de CIMA para trás,
        atravessando a barriga. É o que se via no pontapé alto.

        Agora o nó da perna está em +0.30 — a cintura, o topo do calção — e a
        coxa e o joelho descem os mesmos 0.60 cá dentro (-0.5 → -1.1, -1.0 →
        -1.6). Em pé o corpo fica exactamente onde estava; o que muda é o
        centro da rotação, que passa a ser a cintura, e por isso o topo do
        calção fica quieto enquanto a perna balança.

        A CONTRAPARTIDA, dita já: o braço de alavanca cresceu de 1.00 para 1.60
        (do pivo ao joelho). O mesmo ângulo de anca passa a levar o joelho 1.6x
        mais longe, ou seja a passada abre para o mesmo valor escrito nos
        keyframes. Quem afinar a corrida mexe nos ângulos, não aqui.

        A esfera da anca desce para -0.60 (a anca anatómica, onde estava): no
        pivo ela ficaria meia de fora, na costura da camisa.
        */
        const grp = new THREE.Group(); grp.position.set(x, 0.3, 0);
        if (!leve) { const ancaBola = criarPeca(jointGeo, jointMat); ancaBola.position.y = -0.6; grp.add(ancaBola); }
        const coxa = criarPeca(new THREE.BoxGeometry(u * 0.45, u * 1.0, u * 0.45), blockMat, true); coxa.position.y = -1.1;
        /*
        O CALÇÃO: da cintura a meio da coxa, e nunca mais largo que o tronco.

        Pedido, com fotografia de costas: *"o short tem que ser mais curto e
        não pode ultrapassar a largura do corpo"*. Via-se a anca a sair para
        fora da linha da camisa, de um lado e do outro.

        Contas em espaço da anca (`rig.pelvis`), onde a coxa vai de -0.30 a
        -1.30, o joelho está em -1.30 e a casca do peito tem meia-largura
        0.725:

          . topo em +0.30, 0.025 acima de onde acaba a camisa (0.275) — daí
            não abrir costura. É também onde está o pivo da perna, ver acima;
          . fundo em -0.80, a meia coxa. Foi descendo (-1.15, -0.95) e vai
            parar aqui, a 0.50 do joelho.

        Em espaço da COXA: de +1.10 a 0.00, 1.10 de altura, centro +0.55.

        A LARGURA É ASSIMÉTRICA na perna, e é a única maneira de ter as duas
        coisas ao mesmo tempo. As pernas estão em x ±0.40; um calção CENTRADO
        na perna ou passa a linha do tronco por fora, ou deixa fresta ao meio
        — e sem pélvis por trás, fresta ao meio é ver o campo através do
        jogador. Então a caixa (0.68 de largura) leva 0.08 para DENTRO: cada
        lado vai de -0.02 a +0.66. Por fora sobra 0.065 até à camisa, por
        dentro os dois calções ainda se sobrepõem 0.04 no meio.

        Cobre a coxa toda na mesma — ela vai até 0.625 — e continua muito mais
        larga que ela (0.68 contra 0.45), que é o que o faz ler como pano.
        */
        // Faces do Box: +x, -x, +y, -y, +z (frente), -z. O numero vai na frente da perna ESQUERDA do jogador (x > 0).
        const shortGeo = new THREE.BoxGeometry(u * 0.68, u * 1.10, u * 0.80);
        // A BARRA DO CALCAO 3 cm mais estreita so do lado de DENTRO (o do centro, entre as pernas); o de fora fica (0.03 m / ESCALA_CORPO ~ 0.092): so os vertices de baixo mudam, os triangulos sao os mesmos.
        { const dentro = x > 0 ? -1 : 1,   /* -1: o lado de dentro da perna esquerda (x > 0) e o de x negativo */ ps = shortGeo.attributes.position, f = (u * 0.34 - 0.092) / (u * 0.34); for (let i = 0; i < ps.count; i++) if (ps.getY(i) < 0 && ps.getX(i) * dentro > 0) ps.setX(i, ps.getX(i) * f); ps.needsUpdate = true; shortGeo.computeVertexNormals(); }
        const shortL = criarPeca(shortGeo,
            x > 0 ? [shortMat, shortMat, shortMat, shortMat, shortFrenteMat, shortMat] : shortMat);
        shortL.position.set(x > 0 ? -0.08 : 0.08, 0.55, 0);
        coxa.add(shortL); grp.add(coxa);
        const joelho = new THREE.Group(); joelho.position.y = -1.6; grp.add(joelho); if (!leve) joelho.add(criarPeca(smallJointGeo, jointMat));
        // A PARTE DE BAIXO DA PERNA 15% MAIS FINA (`PERNA_BAIXO_AFUNIL`): canela e meiao afunilam para o tornozelo.
        const PERNA_BAIXO_AFUNIL = 0.85;
        const canela = criarPeca(caixaAfunilada(u * 0.35, u * (0.9 + EXTRA), u * 0.35, PERNA_BAIXO_AFUNIL), blockMat, true); canela.position.y = -0.45 + EXTRA / 2;
        // 7 cm mais comprido para baixo (ESCALA_CORPO ~0.327 m/unidade: 0.07/0.327 = 0.214): o cano chega à chuteira.
        const meiao = criarPeca(caixaAfunilada(u * 0.4, u * 1.064, u * 0.4, PERNA_BAIXO_AFUNIL), sockMats); meiao.position.y = -0.107 - EXTRA / 2; meiao.userData.meiao = { y: -0.107 - EXTRA / 2, meio: u * 1.064 / 2 }; canela.add(meiao); joelho.add(canela);
        const peG = new THREE.Group(); peG.position.y = -0.9; joelho.add(peG);

        // Largura do meião (0.40): os 2 cm de cada lado (0.52) foram retirados a pedido — a chuteira volta a ter a largura do meião.
        const footGeo = new THREE.BoxGeometry(u * 0.40, u * 0.4, u * 1.0); const p = footGeo.attributes.position; for (let i = 0; i < p.count; i++) { if (p.getZ(i) > 0 && p.getY(i) > 0) p.setY(i, p.getY(i) - u * 0.25); } footGeo.computeVertexNormals();
        const chuteira = criarPeca(footGeo, bootMat, true); chuteira.position.set(0, -0.2, u * 0.25); peG.add(chuteira);
        // Guardada para o `assentarNoChao` (player.js) medir a SOLA: é a peça
        // mais baixa do corpo e é por ela que o jogador toca no relvado.
        peG.userData.chuteira = chuteira;
        // A LINGUETA da chuteira: um retangulo da cor dela, a frente da canela, logo acima do pe (todos os modelos).
        if (leve !== 5) { const lingueta = criarPeca(new THREE.BoxGeometry(u * 0.35 * 0.9, u * 0.2, u * 0.04), bootMat); lingueta.position.set(0, -u * 0.03, u * 0.24); peG.add(lingueta); }   // 90% da largura da canela, a sair do topo da chuteira e a frente do meiao

        const studGeo = new THREE.CylinderGeometry(u * 0.03, u * 0.02, u * 0.04, 8);
        const posTravas = [[-u * 0.12, u * 0.25], [u * 0.12, u * 0.25], [-u * 0.12, 0], [u * 0.12, 0], [-u * 0.12, -u * 0.3], [u * 0.12, -u * 0.3]];
        // `leve` 4 (metade dos triangulos): sem travas nas chuteiras — eram 12 cilindros, 384 triangulos, e nao se veem a distancia de jogo.
        if (leve !== 4 && leve !== 5) posTravas.forEach(pos => { const t = criarPeca(studGeo, studMat); t.position.set(pos[0], -0.22, pos[1]); chuteira.add(t); });

        grp.rotation.z = x < 0 ? -Math.PI / 32 : Math.PI / 32; if (leve === 5) { joelho.rotation.y = x < 0 ? -Math.PI / 16 : Math.PI / 16; } else peG.rotation.y = x < 0 ? -Math.PI / 16 : Math.PI / 16;   /* leve 5: a chuteira fica reta no pe e a perna (da canela para baixo) e que leva a torcao */ pelvis.add(grp); return { raiz: grp, joelho: joelho, pe: peG };
    }

    // As mãos entram no rig: o IK precisa da ponta da cadeia, e o teste
    // de defesa lê a posição REAL dela no mundo (ver js/gk_dive.js).
    // Conexão dos braços acompanha o topo do tórax (25% menor em largura: 0.8 * 0.75 = 0.60)
    const xOmbro = 0.8 * 0.75;
    const bracoEsq = criarBraco(xOmbro); rig.lArm = bracoEsq.raiz; rig.lElbow = bracoEsq.cotovelo; rig.lHand = bracoEsq.mao;
    const bracoDir = criarBraco(-xOmbro); rig.rArm = bracoDir.raiz; rig.rElbow = bracoDir.cotovelo; rig.rHand = bracoDir.mao;
    const pernaEsq = criarPerna(0.4); rig.lLeg = pernaEsq.raiz; rig.lKnee = pernaEsq.joelho; rig.lFoot = pernaEsq.pe;
    rig.lBota = pernaEsq.pe.userData.chuteira;
    const pernaDir = criarPerna(-0.4); rig.rLeg = pernaDir.raiz; rig.rKnee = pernaDir.joelho; rig.rFoot = pernaDir.pe;
    rig.rBota = pernaDir.pe.userData.chuteira;

    /*
    AS MAOS EM REPOUSO LIGEIRAMENTE PARA DENTRO, como as do guarda-redes (`segurar.maoFecho`).
    Pedido: *"a mao dos jogadores tem que ficar ligeiramente virada para dentro, como as do
    goleiro"*. O pulso nasce a 0 e nenhuma pose de campo escreve o canal (so as dos
    guarda-redes e do lateral), portanto o valor de partida e o que se ve.
    */
    {
        const MDr = (typeof MaoDetalhada !== 'undefined') ? MaoDetalhada : null;
        const f = (MDr && typeof MDr.repousoFecho === 'number') ? MDr.repousoFecho : 0;
        if (f && rig.lHand && rig.rHand) { rig.lHand.rotation.z = -f; rig.rHand.rotation.z = f; }
    }

    corpo.scale.set(ESCALA_CORPO, ESCALA_CORPO, ESCALA_CORPO); return { corpo, rig, backMat, shortFrente };
}


/*
A ESCALA DO CORPO — uma só, e é esta.

O rig é construído numa escala de trabalho (~5.5 unidades de altura) e reduzido
aqui para os 1.8 m de um jogador. O `crowd.js` tem de usar EXACTAMENTE a mesma
para o adepto ter o tamanho de uma pessoa ao lado dos jogadores — e teve-a
escrita à mão, com o valor antigo: quando esta mudou de `(1.8/5.5) * 0.9` para
`1.8/5.5`, os adeptos ficaram 10% mais pequenos que toda a gente e nada avisou.

Agora é uma constante partilhada (`pose.js` carrega antes do `crowd.js`, ver a
ordem no index.html) e mexer nela mexe nos dois.
*/
/*
A ESCALA DO CORPO SAI DA PROPORÇÃO, para a ALTURA NÃO MUDAR com ela.

Era `1.8 / 5.5` escrito à mão. Encolher a cabeça encurta o modelo em unidades
locais, e sem recompensar aqui o jogador ficava mais baixo — e com ele a testa,
que 25 sítios medem por `ALTURA_TESTA` (config/physics.js) em metros absolutos.

Com a compensação, o topo da cabeça e a testa ficam onde estavam e nenhuma
dessas constantes precisa de mudar. Ver ProporcaoCorpo, com a conta e a
verificação de que `cabecas: 5.04` reproduz o `1.8 / 5.5` de antes.
*/
const ESCALA_CORPO = (typeof ProporcaoCorpo !== 'undefined')
    ? (ProporcaoCorpo.alturaAlvo / ProporcaoCorpo.totalLocal)
    : (1.8 / 5.5);
if (typeof window !== 'undefined') window.ESCALA_CORPO = ESCALA_CORPO;

/*
PÉS, CABEÇA E MÃOS — canais OPCIONAIS, comuns a todos os clips.

Os pés estavam fixos em ±PI/16 e a cabeça nunca era tocada: nenhum dos cinco
clips tinha canais para eles. Agora tem, mas só se o keyframe os trouxer — um
keyframe sem eles comporta-se exactamente como antes, portanto acrescentar
isto não mexeu em nenhuma animação existente.

AS MÃOS entraram pelo mesmo caminho, e pela mesma razão: *"tem partes do corpo
que não têm rotação: ex: mão"*. O nó existe no rig desde sempre (o IK precisa
da ponta da cadeia) e nunca teve canais — no editor abria sem anéis nenhuns.

Canais: `peLx`, `peLy`, `peRx`, `peRy`, `cabecaX`, `cabecaY`,
        `maoLx`, `maoLy`, `maoLz`, `maoRx`, `maoRy`, `maoRz`.
*/
function aplicarPesECabeca(rig, K) {
    if (!rig || !K) return;
    const n = (v) => typeof v === 'number';

    if (rig.lFoot) {
        rig.lFoot.rotation.set(n(K.peLx) ? K.peLx : rig.lFoot.rotation.x,
            n(K.peLy) ? K.peLy : rig.lFoot.rotation.y, 0);
    }
    if (rig.rFoot) {
        rig.rFoot.rotation.set(n(K.peRx) ? K.peRx : rig.rFoot.rotation.x,
            n(K.peRy) ? K.peRy : rig.rFoot.rotation.y, 0);
    }
    // A cabeça pendura no pescoço; é ele que roda.
    if (rig.neck && (n(K.cabecaX) || n(K.cabecaY))) {
        rig.neck.rotation.set(n(K.cabecaX) ? K.cabecaX : 0,
            n(K.cabecaY) ? K.cabecaY : 0, 0);
    }

    /*
    As mãos, com a mesma regra dos pés: o eixo que o keyframe não traz fica
    como está. Aqui o repouso É zero nos três, portanto não há a armadilha do
    `peLy` (ver `mixPe` no amostrador do passe).
    */
    if (rig.lHand) {
        rig.lHand.rotation.set(n(K.maoLx) ? K.maoLx : rig.lHand.rotation.x,
            n(K.maoLy) ? K.maoLy : rig.lHand.rotation.y,
            n(K.maoLz) ? K.maoLz : rig.lHand.rotation.z);
    }
    if (rig.rHand) {
        rig.rHand.rotation.set(n(K.maoRx) ? K.maoRx : rig.rHand.rotation.x,
            n(K.maoRy) ? K.maoRy : rig.rHand.rotation.y,
            n(K.maoRz) ? K.maoRz : rig.rHand.rotation.z);
    }
}

/*
POSE DO ARREMESSO LATERAL — um keyframe do ThrowInClip escrito no rig.

`giroAlvo` é o ângulo com sinal entre a frente do corpo e a direcção do
lançamento, já limitado ao `giroMax` (ver prepararGiroLateral em player.js).
No editor, onde não há ninguém a quem atirar, vale 0 e o gesto sai de frente.

Só mexe no esqueleto. A altura do corpo, as mãos a fecharem-se na bola e a
bola a seguir as mãos são do jogo, e ficam no player.js: uma pose não tem
bola nenhuma para segurar.
*/
function aplicarPoseLateral(rig, K, giroAlvo) {
    if (!rig) return;
    const L = LateralPose;

    rig.pelvis.position.set(0, 2.6, 0);
    rig.pelvis.rotation.set(K.pelvisX, 0, 0);

    /*
    GIRO DA CINTURA para o lado do arremesso. Vai no `chest` e não na
    pélvis: rodar a bacia levava as pernas atrás dela e os pés ficavam
    torcidos. A cintura é o que roda num lateral — tronco, ombros e braços
    acompanham, os pés ficam plantados.

    O `K.giro` é a fracção do ângulo neste keyframe: negativa na armação, que
    é a cintura a carregar para o lado contrário, e positiva no chicote.
    */
    const giroY = (K.giro || 0) * (giroAlvo || 0);
    rig.chest.rotation.set(K.chest, giroY, 0);

    rig.lArm.rotation.set(K.bracoX, 0, K.bracoZ);
    rig.rArm.rotation.set(K.bracoX, 0, -K.bracoZ);
    rig.lElbow.rotation.set(K.cotovelo, 0, 0);
    rig.rElbow.rotation.set(K.cotovelo, 0, 0);

    const frenteR = (L.peFrente === 'r');
    const pernaF = frenteR ? rig.rLeg : rig.lLeg;
    const joelhoF = frenteR ? rig.rKnee : rig.lKnee;
    const pernaT = frenteR ? rig.lLeg : rig.rLeg;
    const joelhoT = frenteR ? rig.lKnee : rig.rKnee;

    pernaF.rotation.set(K.coxaFrente, 0, 0);
    joelhoF.rotation.set(K.joelhoFrente, 0, 0);
    pernaT.rotation.set(K.coxaTras, 0, 0);
    joelhoT.rotation.set(K.joelhoTras, 0, 0);

    rig.lFoot.rotation.set(0, Math.PI / 16, 0);
    rig.rFoot.rotation.set(0, -Math.PI / 16, 0);

    aplicarPesECabeca(rig, K);
}

/*
POSE DO REMATE — um keyframe do ShotClip escrito no rig.

A perna de apoio e a de remate saem de `ShotClip.pernaChute`, para o clip
servir um canhoto trocando uma letra.

Enquanto isto corre, o `animateBones` do player.js é saltado: o clip manda em
tudo o que toca, e o ciclo de passada reescrevia as pernas no mesmo frame.

Só mexe no esqueleto; a altura do corpo é do jogo e fica no player.js.
*/
/*
O PE BOM DO JOGADOR NO REMATE E NO PASSE: o clip e escrito para a perna `ShotClip.pernaChute`; um canhoto (`window.__peEsquerdo`, posto pelo Player.update para o jogador que esta a ser animado) usa a perna
OPOSTA — a mesma pose espelhada: bate com a esquerda, apoia na direita, e o corpo inclina para o lado certo.
*/
function pernaChutaNaDireita(clip) {
    return ((clip || ShotClip).pernaChute === 'r') !== (typeof window !== 'undefined' && window.__peEsquerdo === true);
}

function aplicarPoseRemate(rig, K) {
    if (!rig) return;

    const chuteR = pernaChutaNaDireita(ShotClip);
    const pernaC = chuteR ? rig.rLeg : rig.lLeg;
    const joelhoC = chuteR ? rig.rKnee : rig.lKnee;
    const pernaA = chuteR ? rig.lLeg : rig.rLeg;
    const joelhoA = chuteR ? rig.lKnee : rig.rKnee;

    // A bacia inclina e RODA: no remate em corrida a força vem da rotação,
    // não da inclinação (essa é do tiro de meta, com o corpo parado).
    rig.pelvis.position.set(0, 2.6, 0);
    rig.pelvis.rotation.set(0, chuteR ? K.pelvisY : -K.pelvisY, K.leanZ);

    /*
    O TRONCO INCLINA PARA O LADO — `chestZ`, opcional.

    O terceiro componente estava preso a zero, e por isso o tronco não rodava
    para os lados no editor por muito que se puxasse o anel: *"o tronco eu não
    consigo girar para os lados"*. Sem o canal, continua zero e nenhuma
    animação existente muda.

    Espelha com o lado que bate, como o `chestY`: os clips são escritos para a
    perna direita e o desenhador serve as duas.
    */
    const inclinar = K.chestZ || 0;
    rig.chest.rotation.set(K.chest, chuteR ? K.chestY : -K.chestY,
        chuteR ? inclinar : -inclinar);

    /*
    A ANCA DO LADO QUE BATE PODE ABRIR — `coxaChuteY`.

    Com ela a zero a perna balança no plano do corpo e o que chega à bola é a
    PONTA do pé: é o remate de bico, e era assim que o passe saía. Relato: *"o
    passe está sendo dado de bico e não com o lado do pé"*. Abrindo a anca, a
    perna roda para fora e quem fica virado para a bola é a face interna.

    O SINAL ESTEVE TROCADO, e o relato apanhou-o: *"na hora do passe os
    jogadores estão a dobrar o pé para dentro e não para fora; o ângulo do pé
    tem de ser a SAIR do corpo, na direcção contrária da perna oposta"*.

    A medição que o escolheu estava certa na conta e errada na PREMISSA: eu
    tinha chamado "face interna" ao lado -X do pé, e neste rig a perna direita
    vive em x NEGATIVO (`criarPerna(-0.4)`), portanto a face virada para o eixo
    do corpo — a que bate na bola num passe de trivela interior — é o +X. Com
    o sinal antigo, quem ficava virada para o alvo era a face de FORA e a ponta
    do pé rodava para dentro, contra a perna de apoio: medido com
    `tools/scratch/passe_pe_lado.js`, ponta a x=+0.98 no contacto.

    Invertido, a anca e o pé abrem para FORA: a ponta sai do corpo e quem
    chega à bola é a face interna, que é o gesto do pedido.
    */
    const abrirAnca = K.coxaChuteY || 0;
    pernaC.rotation.set(K.coxaChute, chuteR ? -abrirAnca : abrirAnca, 0);
    joelhoC.rotation.set(K.joelhoChute, 0, 0);
    pernaA.rotation.set(K.coxaApoio, 0, 0);
    joelhoA.rotation.set(K.joelhoApoio, 0, 0);

    rig.lArm.rotation.set(K.bracoLx, 0, K.bracoLz);
    rig.rArm.rotation.set(K.bracoRx, 0, K.bracoRz);
    rig.lElbow.rotation.x = K.cotoveloL;
    rig.rElbow.rotation.x = K.cotoveloR;

    /*
    E O PÉ ACOMPANHA A ANCA — `peChuteY`, somado à abertura de repouso (PI/16,
    que é só a postura de pé). É o tornozelo trancado para fora do passe pelo
    lado do pé; o remate não traz o canal e fica com a postura de sempre.
    */
    const abrirPe = K.peChuteY || 0;
    rig.lFoot.rotation.set(0, (Math.PI / 16) + (chuteR ? 0 : abrirPe), 0);
    rig.rFoot.rotation.set(0, -(Math.PI / 16) - (chuteR ? abrirPe : 0), 0);

    aplicarPesECabeca(rig, K);
}

/*
POSE DO LANÇAMENTO COM AS MÃOS DO GUARDA-REDES — GoalkeeperThrowClip.
*/
function aplicarPoseLancamentoGR(rig, K) {
    if (!rig) return;
    rig.chest.rotation.x = K.chest;
    rig.chest.rotation.z = 0;
    // A reposição por baixo dobra-se pela ANCA (ver GoalkeeperUnderarmThrowClip);
    // o lançamento por cima não traz `pelvis` e fica a direito como sempre.
    rig.pelvis.rotation.x = (typeof K.pelvis === 'number') ? K.pelvis : 0;
    rig.pelvis.rotation.z = 0;

    rig.lLeg.rotation.x = K.coxaL;
    rig.lKnee.rotation.x = K.joelhoL;
    rig.rLeg.rotation.x = K.coxaR;
    rig.rKnee.rotation.x = K.joelhoR;

    rig.lArm.rotation.x = K.bracoLx;
    rig.lArm.rotation.z = K.bracoLz;
    rig.rArm.rotation.x = K.bracoRx;
    rig.rArm.rotation.z = K.bracoRz;

    rig.lElbow.rotation.x = K.cotoveloL;
    rig.rElbow.rotation.x = K.cotoveloR;

    aplicarPesECabeca(rig, K);
}

/*
POSE DO DOMÍNIO DE BOLA ORIENTADO PELA DIREITA — BallControlRightClip.
Perna esquerda (apoio) ligeiramente atrás e fletida.
Perna direita (controlo) à frente, abrindo para amortecer e orientar o toque de saída.
*/
function aplicarPoseDominioDireito(rig, K) {
    if (!rig) return;
    rig.chest.rotation.x = K.chest || 0;
    rig.chest.rotation.y = K.chestY || 0;
    rig.chest.rotation.z = 0;

    rig.pelvis.rotation.x = 0;
    rig.pelvis.rotation.y = K.pelvisY || 0;
    rig.pelvis.rotation.z = K.leanZ || 0;

    rig.lLeg.rotation.x = K.coxaL || 0;
    rig.lLeg.rotation.y = 0;
    rig.lLeg.rotation.z = 0;
    rig.lKnee.rotation.x = K.joelhoL || 0;

    rig.rLeg.rotation.x = K.coxaR || 0;
    rig.rLeg.rotation.y = 0;
    rig.rLeg.rotation.z = K.coxaRz || 0;
    rig.rKnee.rotation.x = K.joelhoR || 0;

    rig.lArm.rotation.x = K.bracoLx || 0;
    rig.lArm.rotation.z = K.bracoLz || 0;
    rig.rArm.rotation.x = K.bracoRx || 0;
    rig.rArm.rotation.z = K.bracoRz || 0;

    rig.lElbow.rotation.x = K.cotoveloL || 0;
    rig.rElbow.rotation.x = K.cotoveloR || 0;

    aplicarPesECabeca(rig, K);
}

/*
POSE DO CHUTÃO DO GUARDA-REDES — GoalkeeperKickClip.

`norm` é o tempo normalizado 0..1 do clip, e serve só para os braços abrirem
progressivamente: é o único canal do gesto que não vem dos keyframes.
*/
function aplicarPoseChutaoGR(rig, K, norm) {
    if (!rig) return;
    const chuteR = (GoalkeeperKickClip.pernaChute === 'r');
    const pernaC = chuteR ? rig.rLeg : rig.lLeg;
    const joelhoC = chuteR ? rig.rKnee : rig.lKnee;
    const pernaA = chuteR ? rig.lLeg : rig.rLeg;
    const joelhoA = chuteR ? rig.lKnee : rig.rKnee;

    pernaC.rotation.set(K.coxaChute, 0, 0);
    joelhoC.rotation.set(K.joelhoChute, 0, 0);
    pernaA.rotation.set(K.coxaApoio, 0, 0);
    joelhoA.rotation.set(K.joelhoApoio, 0, 0);

    rig.chest.rotation.set(K.chest, 0, 0);
    rig.pelvis.rotation.set(0, 0, 0);

    rig.lArm.rotation.x = K.bracoX;
    rig.rArm.rotation.x = K.bracoX;
    rig.lElbow.rotation.x = K.cotovelo;
    rig.rElbow.rotation.x = K.cotovelo;

    const abreBraco = 0.05 + 0.45 * (norm || 0);
    rig.lArm.rotation.z = abreBraco;
    rig.rArm.rotation.z = -abreBraco;

    aplicarPesECabeca(rig, K);
}

/*
POSE DO TIRO DE META / BOLA PARADA DO CHÃO — GoalkeeperGroundKickClip.

PIVÔ NO PÉ DE APOIO: o pé de apoio está em x = ±0.4 no espaço local da bacia,
e a inclinação lateral (`leanZ`) roda o corpo inteiro em BLOCO à volta dele,
como uma unidade rígida — sem quebrar a cintura nem dobrar a coluna de lado.
É por isso que a bacia se desloca em vez de só rodar.

`opts.poseAnterior` e `opts.peso` são a MISTURA DE ENTRADA (corrida -> chute):
cada canal sai da pose com que a corrida acabou e vai até ao valor do clip.
Sem os passar — como o editor faz — a pose do clip é escrita directamente,
que é o mesmo que uma mistura já terminada.

`corpo` é o Group do jogador, para a altura; pode vir a nulo.
*/
function aplicarPoseChuteChaoGR(rig, K, corpo, opts) {
    if (!rig) return;
    const P0 = (opts && opts.poseAnterior) || null;
    const w = (opts && typeof opts.peso === 'number') ? opts.peso : 1;
    const bl = (de, para) => (P0 ? de + (para - de) * w : para);

    const chuteR = (GoalkeeperGroundKickClip.pernaChute === 'r');
    const pernaC = chuteR ? rig.rLeg : rig.lLeg;
    const joelhoC = chuteR ? rig.rKnee : rig.lKnee;
    const pernaA = chuteR ? rig.lLeg : rig.rLeg;
    const joelhoA = chuteR ? rig.lKnee : rig.rKnee;

    const pivotX = chuteR ? 0.4 : -0.4;
    const leanZ = K.leanZ;
    const cosL = Math.cos(leanZ);
    const sinL = Math.sin(leanZ);

    rig.pelvis.position.x = bl(P0 ? P0.pelvisPx : 0, pivotX * (1 - cosL) - 2.6 * sinL);
    rig.pelvis.position.y = bl(P0 ? P0.pelvisPy : 2.6, 2.6 * cosL - pivotX * sinL);
    rig.pelvis.position.z = 0;

    rig.pelvis.rotation.z = bl(P0 ? P0.pelvisRz : 0, leanZ);
    rig.pelvis.rotation.x = bl(P0 ? P0.pelvisRx : 0, K.pitchX || 0);
    rig.pelvis.rotation.y = 0;

    rig.chest.rotation.x = bl(P0 ? P0.chest : 0, K.chest);
    rig.chest.rotation.y = 0;
    rig.chest.rotation.z = 0;

    pernaA.rotation.x = bl(P0 ? P0.coxaA : 0, K.coxaApoio);
    pernaA.rotation.y = 0;
    pernaA.rotation.z = 0;
    joelhoA.rotation.x = bl(P0 ? P0.joelhoA : 0, K.joelhoApoio);
    joelhoA.rotation.y = 0;
    joelhoA.rotation.z = 0;

    pernaC.rotation.x = bl(P0 ? P0.coxaC : 0, K.coxaChute);
    pernaC.rotation.y = 0;
    pernaC.rotation.z = bl(P0 ? P0.coxaCz : 0, K.coxaChuteZ || 0);
    joelhoC.rotation.x = bl(P0 ? P0.joelhoC : 0, K.joelhoChute);
    joelhoC.rotation.y = 0;
    joelhoC.rotation.z = 0;

    rig.lArm.rotation.x = bl(P0 ? P0.bracoLx : 0, K.bracoLx);
    rig.lArm.rotation.z = bl(P0 ? P0.bracoLz : 0, K.bracoLz);
    rig.rArm.rotation.x = bl(P0 ? P0.bracoRx : 0, K.bracoRx);
    rig.rArm.rotation.z = bl(P0 ? P0.bracoRz : 0, K.bracoRz);

    rig.lElbow.rotation.x = bl(P0 ? P0.cotoveloL : 0, K.cotoveloL);
    rig.rElbow.rotation.x = bl(P0 ? P0.cotoveloR : 0, K.cotoveloR);

    aplicarPesECabeca(rig, K);

    if (corpo) {
        corpo.position.y = bl(P0 ? P0.corpoY : ALTURA_BASE_Y, ALTURA_BASE_Y + K.altura);
    }
}

/*
POSE DO CHUTE DE BOLA PARADA — PlayerKickClip e GoalKickClip.

As poses de chute de bola parada passam todas por aqui: o tiro de meta pelo
GoalKickClip, a falta e o penálti pelo PlayerKickClip. Não chama nem é chamada
por `aplicarPoseRemate` (o remate de jogo corrido) nem por
`aplicarPoseChuteChaoGR` (o clip antigo do guarda-redes).

ESCREVE O ESQUELETO INTEIRO, sempre, a partir do keyframe. Não há
`poseAnterior` nem `peso` como no `aplicarPoseChuteChaoGR`: a aproximação é
parte do clip, portanto não há segunda animação de onde misturar. Era essa
mistura que punha o ciclo de corrida a escrever as pernas por baixo do gesto,
com a passada a alternar de perna enquanto o chute decorria.

PERNA DE CHUTE FIXA. O `pernaChute` do clip é lido UMA vez por quem chama e
vale para os quatro keyframes. Não há ramo nenhum que troque de perna a meio.

PIVÔ NO PÉ DE APOIO: o pé de apoio está em x = ±0.4 no espaço local da bacia
(geometria do rig, ver buildBody em player.js), e o `leanZ` roda o corpo em
bloco à volta dele — a bacia desloca-se em vez de só rodar, que é o que se lê
nas imagens 1 e 3, com o corpo inclinado sobre a perna plantada.

`corpo` é o Group do jogador, para a altura; pode vir a nulo (o editor de
animação posiciona o corpo por fora).
*/
/*
O ESCRITOR PARTILHADO das poses de bola parada — PlayerKickClip (falta e
penálti) e GoalKickClip (tiro de meta). Recebe a perna de chute em vez de a ir
buscar a um clip, e é só isso que os separa aqui.

PARTILHAR O ESCRITOR NÃO É PARTILHAR O GESTO: os NÚMEROS vivem cada um no seu
clip e divergem à vontade no editor. O que se partilha é a mecânica do rig — o
pivô no pé de apoio, que canal vai a que osso — e essa tem mesmo de ser a
mesma nos dois, senão o mesmo keyframe desenhava dois bonecos diferentes.
*/
function escreverPoseBolaParada(rig, K, corpo, pernaChute) {
    if (!rig || !K) return;

    const chuteR = (pernaChute === 'r');
    const pernaC = chuteR ? rig.rLeg : rig.lLeg;
    const joelhoC = chuteR ? rig.rKnee : rig.lKnee;
    const pernaA = chuteR ? rig.lLeg : rig.rLeg;
    const joelhoA = chuteR ? rig.lKnee : rig.rKnee;

    const pivotX = chuteR ? 0.4 : -0.4;
    const leanZ = K.leanZ || 0;
    const cosL = Math.cos(leanZ);
    const sinL = Math.sin(leanZ);

    rig.pelvis.position.x = pivotX * (1 - cosL) - 2.6 * sinL;
    rig.pelvis.position.y = 2.6 * cosL - pivotX * sinL;
    rig.pelvis.position.z = 0;

    rig.pelvis.rotation.z = leanZ;
    rig.pelvis.rotation.x = K.pitchX || 0;
    /*
    `rolarY` — a TORÇÃO do corpo à volta do próprio eixo (cabeça-pés). Com a
    ordem XYZ do three, o Y aplica-se depois do `pitchX`: com o corpo deitado
    (pitchX pi/2), rolarY pi põe-no de costas e 2 pi de bruços outra vez. Só a
    queda o usa (QuedaClip, o rolamento); nos chutos não existe e fica 0.
    */
    rig.pelvis.rotation.y = K.rolarY || 0;

    rig.chest.rotation.x = K.chest || 0;
    rig.chest.rotation.y = 0;
    rig.chest.rotation.z = 0;

    pernaA.rotation.x = K.coxaApoio || 0;
    pernaA.rotation.y = 0;
    pernaA.rotation.z = 0;
    joelhoA.rotation.x = K.joelhoApoio || 0;
    joelhoA.rotation.y = 0;
    joelhoA.rotation.z = 0;

    pernaC.rotation.x = K.coxaChute || 0;
    pernaC.rotation.y = 0;
    pernaC.rotation.z = K.coxaChuteZ || 0;
    joelhoC.rotation.x = K.joelhoChute || 0;
    joelhoC.rotation.y = 0;
    joelhoC.rotation.z = 0;

    rig.lArm.rotation.x = K.bracoLx || 0;
    rig.lArm.rotation.z = K.bracoLz || 0;
    rig.rArm.rotation.x = K.bracoRx || 0;
    rig.rArm.rotation.z = K.bracoRz || 0;

    rig.lElbow.rotation.x = K.cotoveloL || 0;
    rig.rElbow.rotation.x = K.cotoveloR || 0;

    aplicarPesECabeca(rig, K);

    if (corpo) corpo.position.y = ALTURA_BASE_Y + (K.altura || 0);
}

/*
POSE DO CHUTE DE BOLA PARADA GENÉRICO — PlayerKickClip. Falta e penálti.
O tiro de meta tem a sua, logo abaixo.
*/
function aplicarPosePlayerKick(rig, K, corpo) {
    escreverPoseBolaParada(rig, K, corpo, PlayerKickClip.pernaChute);
}

/*
POSE DO TIRO DE META — GoalKickClip, os 4 keyframes GoalKick1 a 4.

Entrada própria, e não uma chamada ao `aplicarPosePlayerKick`: quem afina o
tiro de meta no editor mexe neste clip e em mais nenhum, e o dia em que o
gesto precisar de algo que a falta não tem (a bola levantada, por exemplo) é
aqui que se acrescenta.
*/
function aplicarPoseGoalKick(rig, K, corpo) {
    escreverPoseBolaParada(rig, K, corpo, GoalKickClip.pernaChute);
}

/*
=============================================================================
AMOSTRAGEM DOS CLIPS
=============================================================================
Cada uma lê um clip do config.js num tempo normalizado 0..1 e devolve um
keyframe interpolado — o que depois se dá às `aplicarPose*` acima.

Vieram do topo do js/player.js. Estão aqui porque amostrar e aplicar são as
duas metades do mesmo gesto, e o editor de animação precisa das duas sem
carregar o jogo inteiro.

A interpolação é LINEAR entre keyframes vizinhos, de propósito: os clips são
escritos à mão frame a frame, e uma curva suave por cima deles mudava poses
que já foram afinadas a olho.
=============================================================================
*/
/*
Amostra o clip do chutão do guarda-redes (GoalkeeperKickClip) num tempo
normalizado 0..1, interpolando linearmente entre os dois keyframes vizinhos.
Devolve um objecto com os mesmos campos de um keyframe.
*/
function amostrarClipChuteGR(norm) {
    const fr = GoalkeeperKickClip.frames;
    const n = fr.length;
    const pos = THREE.MathUtils.clamp(norm, 0, 1) * (n - 1);
    const i = Math.min(n - 2, Math.floor(pos));
    const u = pos - i;
    const a = fr[i], b = fr[i + 1];
    const mix = (k) => a[k] + (b[k] - a[k]) * u;
    return {
        chest: mix('chest'),
        coxaChute: mix('coxaChute'),
        joelhoChute: mix('joelhoChute'),
        coxaApoio: mix('coxaApoio'),
        joelhoApoio: mix('joelhoApoio'),
        bracoX: mix('bracoX'),
        cotovelo: mix('cotovelo'),
        altura: mix('altura')
    };
}

/*
Amostra o clip do chute de bola parada / tiro de meta (GoalkeeperGroundKickClip),
fiel às fases das Figuras Biomecânicas com pivô no pé de apoio.
*/
function amostrarClipChuteChaoGR(norm) {
    const fr = GoalkeeperGroundKickClip.frames;
    const n = fr.length;
    const pos = THREE.MathUtils.clamp(norm, 0, 1) * (n - 1);
    const i = Math.min(n - 2, Math.floor(pos));
    const u = pos - i;
    const a = fr[i], b = fr[i + 1];
    const mix = (k) => (a[k] !== undefined && b[k] !== undefined) ? a[k] + (b[k] - a[k]) * u : 0;
    return {
        leanZ: mix('leanZ'),
        pitchX: mix('pitchX'),
        chest: mix('chest'),
        coxaChute: mix('coxaChute'),
        joelhoChute: mix('joelhoChute'),
        coxaChuteZ: mix('coxaChuteZ'),
        coxaApoio: mix('coxaApoio'),
        joelhoApoio: mix('joelhoApoio'),
        bracoLx: mix('bracoLx'),
        bracoLz: mix('bracoLz'),
        bracoRx: mix('bracoRx'),
        bracoRz: mix('bracoRz'),
        cotoveloL: mix('cotoveloL'),
        cotoveloR: mix('cotoveloR'),
        altura: mix('altura')
    };
}

/*
Amostra um clip de bola parada — PlayerKickClip ou GoalKickClip — num tempo
normalizado 0..1. São 4 keyframes, portanto `pos = norm * 3` e a interpolação
linear percorre 0->1, 1->2 e 2->3 em terços iguais do gesto.

NÃO amostra o clip antigo do guarda-redes (GoalkeeperGroundKickClip), que tem
o seu: os canais não têm de continuar a ser os mesmos, e partilhar o amostrador
era garantir que qualquer canal novo aqui tinha de ser acrescentado lá também.
*/
function amostrarClipBolaParada(clip, norm) {
    const fr = clip.frames;
    const n = fr.length;
    const pos = THREE.MathUtils.clamp(norm, 0, 1) * (n - 1);
    const i = Math.min(n - 2, Math.floor(pos));
    const u = pos - i;
    const a = fr[i], b = fr[i + 1];
    const mix = (k) => {
        const va = (a[k] !== undefined) ? a[k] : 0;
        const vb = (b[k] !== undefined) ? b[k] : 0;
        return va + (vb - va) * u;
    };
    // Ver a nota dos canais opcionais, no fim desta função.
    const mixOpc = (k) => (a[k] === undefined && b[k] === undefined) ? undefined : mix(k);
    return {
        /*
        O AVANCO E A FRACCAO DO CAMINHO JA ANDADO, 0..1 — nao sao metros.

        E o que faz do gesto UMA animacao: o corpo avanca ao ritmo do passo que
        as pernas estao a dar, em vez de deslizar em linha recta por baixo
        delas. Sobe depressa nos frames 0-3 (o passo) e fica PARADO em 1.00 nos
        dois ultimos (o pe de apoio esta cravado, o corpo nao anda mais).

        Fraccao e nao metros para o mesmo clip servir corridas de comprimentos
        diferentes: a falta anda `arranqueDoGesto - paragemNoContacto`, o tiro
        de meta anda o seu proprio recuo. Quem chama multiplica.
        */
        avanco: mix('avanco'),
        leanZ: mix('leanZ'),
        pitchX: mix('pitchX'),
        chest: mix('chest'),
        coxaChute: mix('coxaChute'),
        joelhoChute: mix('joelhoChute'),
        coxaChuteZ: mix('coxaChuteZ'),
        coxaApoio: mix('coxaApoio'),
        joelhoApoio: mix('joelhoApoio'),
        bracoLx: mix('bracoLx'),
        bracoLz: mix('bracoLz'),
        bracoRx: mix('bracoRx'),
        bracoRz: mix('bracoRz'),
        cotoveloL: mix('cotoveloL'),
        cotoveloR: mix('cotoveloR'),
        peRx: mix('peRx'),
        peLx: mix('peLx'),
        cabecaX: mix('cabecaX'),
        altura: mix('altura'),
        /*
        OS CANAIS OPCIONAIS — mãos, giro dos pés e giro da cabeça.

        `mixOpc` devolve `undefined` quando NENHUM dos dois keyframes vizinhos
        traz o canal, e é essa a parte que interessa: o `aplicarPesECabeca`
        distingue `undefined` de zero e, no primeiro caso, deixa o osso como
        está. Devolver zero aqui era escrever zero por cima do REPOUSO, e o
        repouso do `peLy` não é zero — os pés nascem virados para fora
        (`peG.rotation.y = +-PI/16`, ver `criarPerna`). Um clip que não fale
        dos pés passaria a endireitá-los sem o pedir.

        Também é o que deixa o PlayerKickClip, que não traz nenhum destes
        canais, a comportar-se exactamente como antes.

        Existem porque o editor os escreve: rodar uma mão ou um pé no gizmo
        gravava o canal no keyframe e o amostrador deitava-o fora a caminho do
        rig — a rotação via-se no editor e desaparecia no jogo.
        */
        peLy: mixOpc('peLy'),
        peRy: mixOpc('peRy'),
        maoLx: mixOpc('maoLx'),
        maoLy: mixOpc('maoLy'),
        maoLz: mixOpc('maoLz'),
        maoRx: mixOpc('maoRx'),
        maoRy: mixOpc('maoRy'),
        maoRz: mixOpc('maoRz'),
        cabecaY: mixOpc('cabecaY')
    };
}

/*
Amostra o PlayerKickClip — o chute de bola parada da falta e do penálti.
*/

/*
=============================================================================
MISTURA DE POSE — a transição suave de uma pose para um clip, por GRUPO de ossos
=============================================================================
Quando um gesto (o chute de bola parada, p. ex.) arranca a meio de outra animação (a marcha), o clip escreve a pose dele de uma vez e o corpo SALTA: era
o "pulo" e a "meia trava" na entrada do chute do penalti — o pé de apoio chegava ao lado da bola na marcha e o frame 0 do clip punha-o outra vez atras.

`capturar` guarda a pose que o rig TEM nesse instante (rotações de todos os ossos e a altura do corpo). Depois do clip escrever o frame dele, `aplicar` puxa cada
osso de volta para a pose guardada com um peso que desce a zero: `1 - suave(t / duracao do GRUPO)`. Cada grupo tem a sua duração (`MisturaDePoseModel`): as
pernas mais devagar que o tronco e os bracos, para o pe de apoio nao saltar.

Genérico: serve a qualquer gesto que arranque a meio de outra pose (aplicar depois do desenhador do clip, todos os frames, com o tempo desde o arranque).
=============================================================================
*/
const MisturaDePoseModel = {
    // Segundos até o grupo estar 100% no clip.
    pernas: 0.08, tronco: 0.12, bracos: 0.12,
    grupos: {
        pernas: ['lLeg', 'rLeg', 'lKnee', 'rKnee', 'lFoot', 'rFoot'],
        tronco: ['pelvis', 'chest', 'neck'],
        bracos: ['lArm', 'rArm', 'lElbow', 'rElbow', 'lHand', 'rHand']
    }
};
const MisturaDePose = {
    capturar: function (rig, corpo) {
        const snap = { t: 0, ossos: {}, y: corpo ? corpo.position.y : 0 };
        for (const g in MisturaDePoseModel.grupos) {
            for (const nome of MisturaDePoseModel.grupos[g]) {
                const o = rig[nome];
                if (o) snap.ossos[nome] = { g: g, x: o.rotation.x, y: o.rotation.y, z: o.rotation.z };
            }
        }
        return snap;
    },
    // Chamar DEPOIS de o clip escrever o frame. `dt`: segundos desde a chamada anterior. Devolve false quando a mistura acabou (pode largar-se o `snap`).
    aplicar: function (rig, corpo, snap, dt) {
        if (!snap) return false;
        snap.t += dt;
        let ativo = false;
        for (const nome in snap.ossos) {
            const o = rig[nome]; if (!o) continue;
            const s = snap.ossos[nome];
            const dur = MisturaDePoseModel[s.g];
            const u = Math.min(1, snap.t / dur);
            if (u >= 1) continue;
            ativo = true;
            const w = 1 - u * u * (3 - 2 * u);        // peso da pose guardada: 1 -> 0
            o.rotation.x += (s.x - o.rotation.x) * w;
            o.rotation.y += (s.y - o.rotation.y) * w;
            o.rotation.z += (s.z - o.rotation.z) * w;
        }
        return ativo;
    }
};
if (typeof window !== 'undefined') { window.MisturaDePose = MisturaDePose; window.MisturaDePoseModel = MisturaDePoseModel; }

function amostrarClipPlayerKick(norm) {
    return amostrarClipBolaParada(PlayerKickClip, norm);
}

/*
Amostra o GoalKickClip — o TIRO DE META, 4 keyframes (GoalKick1 a 4).

Os dois clips têm hoje os mesmos canais e por isso o amostrador é um só. O que
não é partilhado são os NÚMEROS: cada clip tem a sua tabela de keyframes e
afina-se sozinho no editor de animação.
*/
function amostrarClipGoalKick(norm) {
    return amostrarClipBolaParada(GoalKickClip, norm);
}

/*
O LANCAMENTO (LancamentoClip): os mesmos canais e o mesmo amostrador do tiro de
meta. A pose aplica-se pelo `escreverPoseBolaParada` — ver
`aplicarFrameLancamento` em player.js.
*/
function amostrarClipLancamento(norm) {
    return amostrarClipBolaParada(LancamentoClip, norm);
}

/*
A QUEDA (QuedaClip) amostra-se em SEGUNDOS desde o toque, e não numa fracção:
os keyframes trazem o seu `t`. Linear entre vizinhos, como os outros. Passado
o fim, fica o último (de pé).
*/
function amostrarClipQueda(t, clip) {
    const fr = (clip || QuedaClip).frames;
    let i = 0;
    while (i < fr.length - 2 && t >= fr[i + 1].t) i++;
    const a = fr[i], b = fr[i + 1];
    const u = THREE.MathUtils.clamp((t - a.t) / Math.max(1e-6, b.t - a.t), 0, 1);
    const K = {};
    for (const k in a) {
        if (typeof a[k] === 'number') K[k] = a[k] + ((b[k] !== undefined ? b[k] : a[k]) - a[k]) * u;
    }
    return K;
}

/*
Amostra o clip do remate (ShotClip) num tempo normalizado 0..1.
*/
function amostrarClipRemate(norm) {
    const fr = ShotClip.frames;
    const n = fr.length;
    const pos = THREE.MathUtils.clamp(norm, 0, 1) * (n - 1);
    const i = Math.min(n - 2, Math.floor(pos));
    const u = pos - i;
    const a = fr[i], b = fr[i + 1];
    const mix = (k) => a[k] + (b[k] - a[k]) * u;
    /*
    CANAIS OPCIONAIS — zero quando o clip não os traz. São a abertura da anca e
    do pé do lado que bate: o remate bate com o peito do pé e deixa-os a zero,
    o passe abre-os para bater com o LADO do pé. Sem isto, `mix` de uma chave
    que não existe dá NaN e a perna desaparece do ecrã.
    */
    const mixOpt = (k) => {
        const va = (typeof a[k] === 'number') ? a[k] : 0;
        const vb = (typeof b[k] === 'number') ? b[k] : 0;
        return va + (vb - va) * u;
    };
    return {
        leanZ: mix('leanZ'), pelvisY: mix('pelvisY'),
        chest: mix('chest'), chestY: mix('chestY'),
        coxaChute: mix('coxaChute'), joelhoChute: mix('joelhoChute'),
        coxaApoio: mix('coxaApoio'), joelhoApoio: mix('joelhoApoio'),
        bracoLx: mix('bracoLx'), bracoLz: mix('bracoLz'),
        bracoRx: mix('bracoRx'), bracoRz: mix('bracoRz'),
        cotoveloL: mix('cotoveloL'), cotoveloR: mix('cotoveloR'),
        coxaChuteY: mixOpt('coxaChuteY'), peChuteY: mixOpt('peChuteY'),
        // O PE DO REMATE: `peRx` positivo = ponta do pe para BAIXO (~20 graus no contacto: bate com o peito do pe, e nao com o bico).
        // Sem o canal em nenhum dos dois keyframes fica `undefined` e o pe como estava.
        peRx: (typeof a.peRx === 'number' || typeof b.peRx === 'number')
            ? (mixOpt('peRx'))
            : undefined,
        /*
        Os canais que o editor ganhou depois — a inclinação lateral do tronco e
        as três rotações de cada mão. O repouso de todos eles é ZERO, portanto
        o `mixOpt` chega: um clip que não os traga desenha exactamente como
        antes.
        */
        chestZ: mixOpt('chestZ'),
        maoLx: mixOpt('maoLx'), maoLy: mixOpt('maoLy'), maoLz: mixOpt('maoLz'),
        maoRx: mixOpt('maoRx'), maoRy: mixOpt('maoRy'), maoRz: mixOpt('maoRz'),
        altura: mix('altura')
    };
}

/*
Amostra o clip do passe (PassClip) num tempo normalizado 0..1.

Os campos são os mesmos do ShotClip de propósito: o `aplicarPoseRemate` desenha
os dois, e é isso que faz do PassClip oito linhas de dados em vez de um
desenhador novo.

E OS PÉS PASSAM POR AQUI. O `aplicarPesECabeca` sabe desenhar `peLx`/`peLy`/
`peRx`/`peRy` desde que existam, e o editor (animEditor.js) já os deixava
editar — mas este amostrador não os devolvia, portanto os valores que se
punham nos keyframes do passe não chegavam ao jogo: eram escritos, guardados, e
morriam aqui. Agora saem, com a regra do `mixPe` abaixo.
*/
function amostrarClipPasse(norm) {
    const fr = PassClip.frames;
    const n = fr.length;
    const pos = THREE.MathUtils.clamp(norm, 0, 1) * (n - 1);
    const i = Math.min(n - 2, Math.floor(pos));
    const u = pos - i;
    const a = fr[i], b = fr[i + 1];
    const mix = (k) => a[k] + (b[k] - a[k]) * u;
    /*
    CANAIS OPCIONAIS — zero quando o clip não os traz. São a abertura da anca e
    do pé do lado que bate: o remate bate com o peito do pé e deixa-os a zero,
    o passe abre-os para bater com o LADO do pé. Sem isto, `mix` de uma chave
    que não existe dá NaN e a perna desaparece do ecrã.
    */
    const mixOpt = (k) => {
        const va = (typeof a[k] === 'number') ? a[k] : 0;
        const vb = (typeof b[k] === 'number') ? b[k] : 0;
        return va + (vb - va) * u;
    };

    /*
    OS PÉS TÊM OUTRO ZERO. Para a anca e o tornozelo do lado que bate, o valor
    "ausente" é zero e o `mixOpt` chega. Para os pés não: em repouso eles estão
    abertos em ±PI/16 (`criarPerna`, aqui neste ficheiro), e tratar a ausência
    como zero fechava-os de repente no primeiro e no último keyframe.

    Por isso o lado que falta vale o REPOUSO daquele pé, que é o mesmo que
    dizer "esse keyframe não mexe nos pés" — e é exactamente o que um keyframe
    sem o canal quer dizer.

    E se NENHUM dos dois keyframes o traz, devolve-se `undefined`: aí o
    `aplicarPesECabeca` deixa o pé como está, que é o contrato antigo e o que
    mantém os outros clips sem mudança nenhuma.
    */
    const REPOUSO_PE = { peLx: 0, peLy: Math.PI / 16, peRx: 0, peRy: -Math.PI / 16 };
    const mixPe = (k) => {
        const temA = (typeof a[k] === 'number'), temB = (typeof b[k] === 'number');
        if (!temA && !temB) return undefined;
        const va = temA ? a[k] : REPOUSO_PE[k];
        const vb = temB ? b[k] : REPOUSO_PE[k];
        return va + (vb - va) * u;
    };

    return {
        leanZ: mix('leanZ'), pelvisY: mix('pelvisY'),
        chest: mix('chest'), chestY: mix('chestY'),
        coxaChute: mix('coxaChute'), joelhoChute: mix('joelhoChute'),
        coxaApoio: mix('coxaApoio'), joelhoApoio: mix('joelhoApoio'),
        bracoLx: mix('bracoLx'), bracoLz: mix('bracoLz'),
        bracoRx: mix('bracoRx'), bracoRz: mix('bracoRz'),
        cotoveloL: mix('cotoveloL'), cotoveloR: mix('cotoveloR'),
        coxaChuteY: mixOpt('coxaChuteY'), peChuteY: mixOpt('peChuteY'),
        peLx: mixPe('peLx'), peLy: mixPe('peLy'),
        peRx: mixPe('peRx'), peRy: mixPe('peRy'),
        // Tronco de lado e mãos: repouso zero, portanto `mixOpt` chega.
        chestZ: mixOpt('chestZ'),
        maoLx: mixOpt('maoLx'), maoLy: mixOpt('maoLy'), maoLz: mixOpt('maoLz'),
        maoRx: mixOpt('maoRx'), maoRy: mixOpt('maoRy'), maoRz: mixOpt('maoRz'),
        altura: mix('altura')
    };
}

/*
=============================================================================
AS TRÊS DEFESAS — um amostrador só para os três clips
=============================================================================
`GkLowClip`, `GkJump3Clip` e `GkJumpClip` (config/animations.js) têm o mesmo
vocabulário de canais do `GoalkeeperThrowClip`, portanto partilham o
amostrador E o desenhador (`aplicarPoseLancamentoGR`). O que os distingue é o
número de keyframes — 3, 4 e 5 — e isso o amostrador já lê do próprio clip.

Quem escolhe qual deles corre é a ALTURA da bola (ver `clipDaDefesa` em
js/gk_dive.js).
=============================================================================
*/
function amostrarClipDefesaGK(clip, norm) {
    const fr = clip && clip.frames;
    if (!fr || fr.length < 2) return null;
    const n = fr.length;
    const pos = THREE.MathUtils.clamp(norm, 0, 1) * (n - 1);
    const i = Math.min(n - 2, Math.floor(pos));
    const u = pos - i;
    const a = fr[i], b = fr[i + 1];
    const mix = (k) => {
        const va = (typeof a[k] === 'number') ? a[k] : 0;
        const vb = (typeof b[k] === 'number') ? b[k] : 0;
        return va + (vb - va) * u;
    };
    return {
        chest: mix('chest'),
        coxaL: mix('coxaL'), joelhoL: mix('joelhoL'),
        coxaR: mix('coxaR'), joelhoR: mix('joelhoR'),
        bracoLx: mix('bracoLx'), bracoLz: mix('bracoLz'),
        bracoRx: mix('bracoRx'), bracoRz: mix('bracoRz'),
        cotoveloL: mix('cotoveloL'), cotoveloR: mix('cotoveloR'),
        altura: mix('altura')
    };
}

/*
Amostra o clip do arremesso lateral (ThrowInClip) num tempo normalizado 0..1.
*/
function amostrarClipLateral(norm) {
    const fr = ThrowInClip.frames;
    const n = fr.length;
    const pos = THREE.MathUtils.clamp(norm, 0, 1) * (n - 1);
    const i = Math.min(n - 2, Math.floor(pos));
    const u = pos - i;
    const a = fr[i], b = fr[i + 1];
    const mix = (k) => a[k] + (b[k] - a[k]) * u;
    return {
        chest: mix('chest'),
        pelvisX: mix('pelvisX'),
        bracoX: mix('bracoX'),
        bracoZ: mix('bracoZ'),
        cotovelo: mix('cotovelo'),
        // Fracção do giro da cintura neste ponto do gesto (ver
        // prepararGiroLateral): negativa na armação, positiva no chicote.
        giro: mix('giro'),
        coxaFrente: mix('coxaFrente'),
        joelhoFrente: mix('joelhoFrente'),
        coxaTras: mix('coxaTras'),
        joelhoTras: mix('joelhoTras'),
        altura: mix('altura')
    };
}

/*
`clip` escolhe o gesto: por cima (GoalkeeperThrowClip) ou por baixo, o
rolamento (GoalkeeperUnderarmThrowClip). Os dois têm os mesmos canais, por isso
a pose é a mesma — o que muda é o desenho. Omissão: o de cima, que era o único
que existia.
*/
function amostrarClipLancamentoGR(norm, clip) {
    const fr = (clip && clip.frames) ? clip.frames : GoalkeeperThrowClip.frames;
    const n = fr.length;
    const pos = THREE.MathUtils.clamp(norm, 0, 1) * (n - 1);
    const i = Math.min(n - 2, Math.floor(pos));
    const u = pos - i;
    const a = fr[i], b = fr[i + 1];
    const mix = (k) => a[k] + (b[k] - a[k]) * u;
    return {
        // A anca: só a reposição por baixo a traz (ver aplicarPoseLancamentoGR).
        pelvis: (a.pelvis || 0) + ((b.pelvis || 0) - (a.pelvis || 0)) * u,
        chest: mix('chest'),
        coxaL: mix('coxaL'),
        joelhoL: mix('joelhoL'),
        coxaR: mix('coxaR'),
        joelhoR: mix('joelhoR'),
        bracoLx: mix('bracoLx'),
        bracoLz: mix('bracoLz'),
        bracoRx: mix('bracoRx'),
        bracoRz: mix('bracoRz'),
        cotoveloL: mix('cotoveloL'),
        cotoveloR: mix('cotoveloR'),
        // Rolamento do punho (o eixo do antebraco): vira a palma. Opcional (0 se o clip nao o traz).
        maoRy: (a.maoRy || 0) + ((b.maoRy || 0) - (a.maoRy || 0)) * u,
        // Flexao e desvio do punho (opcionais): ver a nota da bola apoiada na palma, GoalkeeperUnderarmThrowClip.
        maoRx: (a.maoRx || 0) + ((b.maoRx || 0) - (a.maoRx || 0)) * u,
        maoRz: (a.maoRz || 0) + ((b.maoRz || 0) - (a.maoRz || 0)) * u,
        altura: mix('altura')
    };
}

/*
Amostra o clip do domínio orientado pela direita (BallControlRightClip) num tempo normalizado 0..1.
*/
function amostrarClipDominioDireito(norm) {
    const fr = BallControlRightClip.frames;
    const n = fr.length;
    const pos = THREE.MathUtils.clamp(norm, 0, 1) * (n - 1);
    const i = Math.min(n - 2, Math.floor(pos));
    const u = pos - i;
    const a = fr[i], b = fr[i + 1];
    const mix = (k) => (a[k] !== undefined && b[k] !== undefined) ? a[k] + (b[k] - a[k]) * u : 0;
    return {
        chest: mix('chest'),
        chestY: mix('chestY'),
        pelvisY: mix('pelvisY'),
        leanZ: mix('leanZ'),
        coxaL: mix('coxaL'),
        joelhoL: mix('joelhoL'),
        coxaR: mix('coxaR'),
        joelhoR: mix('joelhoR'),
        coxaRz: mix('coxaRz'),
        bracoLx: mix('bracoLx'),
        bracoLz: mix('bracoLz'),
        bracoRx: mix('bracoRx'),
        bracoRz: mix('bracoRz'),
        cotoveloL: mix('cotoveloL'),
        cotoveloR: mix('cotoveloR'),
        altura: mix('altura')
    };
}


/*
POSE DA PASSADA — escreve no rig o ciclo de andar/trotar/correr.

O ciclo em si vem do `getGaitPose(t, velocidade)` do js/utils.js, que já era
função pura e lê as amplitudes do `GaitModel` (config.js). Isto aqui é a outra
metade: pôr esses ângulos no esqueleto.

NÃO É UM CLIP. Não há keyframes para editar — há fórmulas com senos, e o que
se afina são as CONSTANTES do GaitModel: a amplitude da coxa, quanto o joelho
oscila, os metros por passada. É por isso que o editor tem para isto um painel
de constantes e não uma linha do tempo.

`opts`:
  `amp`            0..1, encolhe a passada em deslocação lateral
  `lateralidade`   0..1, quanto do movimento é de lado
  `ladoMov`        +1/-1, para que lado do corpo
  `paraTras`       true se anda de costas (o tronco não inclina como a correr)
  `cintura`        ângulo Y do tronco, a acompanhar para onde olha

Chamada sem `opts`, dá a passada frontal — que é o que o editor mostra.
*/
function aplicarPosePassada(rig, P, t, opts) {
    if (!rig || !P) return;
    const o = opts || {};
    const amp = (typeof o.amp === 'number') ? o.amp : 1;
    const lateralidade = o.lateralidade || 0;
    const ladoMov = o.ladoMov || 0;
    const movingBackwards = !!o.paraTras;
    const cintura = o.cintura || 0;

    /*
    SUAVIZAÇÃO: a passada é escrita com `set` directo, e é isso que se quer a
    correr — a pose é a verdade e não há nada para misturar. A velocidades
    baixas não: o `animateBones` troca de ramo aos 0.1 m/s, e um jogador que
    pára com a perna a meio da passada vê o ramo neutro a desfazê-la devagar
    (lerp de 0.25) e este a refazê-la de repente no frame em que o limiar é
    atravessado outra vez. Medido: saltos de 30 graus num frame com o jogador
    parado — a vibração no lugar.

    Com `suavizacao` < 1 a pose entra por lerp, e os dois ramos deixam de
    puxar a perna em sentidos contrários. Quem chama passa a velocidade
    normalizada; sem opção nenhuma, comporta-se como sempre.
    */
    const sv = (typeof o.suavizacao === 'number') ? Math.max(0, Math.min(1, o.suavizacao)) : 1;
    const por = (v, alvo) => (sv >= 1) ? alvo : lerpTo(v, alvo, 0.18 + 0.82 * sv);

    rig.lLeg.rotation.x = por(rig.lLeg.rotation.x, P.lHip * amp);
    rig.lKnee.rotation.x = por(rig.lKnee.rotation.x, P.lKnee * amp);
    rig.lFoot.rotation.x = por(rig.lFoot.rotation.x, P.lFoot * amp);
    rig.rLeg.rotation.x = por(rig.rLeg.rotation.x, P.rHip * amp);
    rig.rKnee.rotation.x = por(rig.rKnee.rotation.x, P.rKnee * amp);
    rig.rFoot.rotation.x = por(rig.rFoot.rotation.x, P.rFoot * amp);
    rig.lArm.rotation.x = por(rig.lArm.rotation.x, P.lArm * amp);
    rig.rArm.rotation.x = por(rig.rArm.rotation.x, P.rArm * amp);

    // O cotovelo abre a andar e fecha a correr — era fixo em -1.2, que
    // é postura de sprint aplicada também a quem está a passear.
    rig.lElbow.rotation.x = P.cotovelo; rig.rElbow.rotation.x = P.cotovelo;

    /*
    Abdução das ancas no passo lateral: as pernas abrem e fecham em
    oposição de fase, e o par inteiro pende para o lado do movimento.
    Dentro do limite anatómico da anca (JointLimits.hip.z, +45°/-30°) —
    `LateralGait.abertura` é 0.30 rad (~17°), com folga de sobra.
    */
    if (lateralidade > 0.001) {
        const A = LateralGait.abertura * lateralidade;
        const osc = Math.sin(t * Math.PI * 2) * A;
        rig.lLeg.rotation.z = lerpTo(rig.lLeg.rotation.z, ladoMov * A * 0.5 + osc, 0.35);
        rig.rLeg.rotation.z = lerpTo(rig.rLeg.rotation.z, ladoMov * A * 0.5 - osc, 0.35);
    } else {
        rig.lLeg.rotation.z = lerpTo(rig.lLeg.rotation.z, 0); rig.rLeg.rotation.z = lerpTo(rig.rLeg.rotation.z, 0);
    }
    rig.lArm.rotation.z = lerpTo(rig.lArm.rotation.z, Math.PI / 16); rig.rArm.rotation.z = lerpTo(rig.rArm.rotation.z, -Math.PI / 16);

    // Tronco: a prumo a andar, inclinado a correr. Era 0.3 rad sempre.
    // De lado o tronco também não vai inclinado como numa corrida.
    const inclinacao = (movingBackwards ? P.tronco * 0.4 : P.tronco) * amp;
    rig.chest.rotation.x = inclinacao + Math.sin(t * Math.PI * 2) * 0.04;
    // Mesma cintura a acompanhar a cabeça também a correr/andar — sem
    // isto ficava só parado a olhar de lado com o tronco reto.
    /*
    TORÇÃO DO TRONCO: o ombro do braço que vai à frente avança com ele. O
    braço esquerdo está em +X e a frente é +Z; rodar +Y leva o ombro +X para
    trás, por isso o sinal é negativo. Proporcional ao balanço dos braços
    (`P.torcao`, GaitModel), logo é nula parado e cresce com o andamento.
    */
    const balanco = ((P.lArm || 0) - (P.rArm || 0)) * 0.5;
    const torcao = -balanco * (P.torcao || 0) * amp * (movingBackwards ? 0.4 : 1);
    rig.chest.rotation.y = lerpTo(rig.chest.rotation.y, cintura + torcao);
}
