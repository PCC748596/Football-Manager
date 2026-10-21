/*
TUFOS DE RELVA 3D perto da bola (ver RelvaTufos, config/physics.js). Uma unica InstancedBufferGeometry com um tufo de 3 laminas (3 triangulos) por celula de uma grelha centrada na bola; a
posicao de cada tufo sai de um hash da celula DO MUNDO no vertex shader, portanto nao ha nada a actualizar na CPU e os tufos nao "nadam" quando a bola anda (o foco salta de celula em celula).
A cor sai da mesma textura das faixas do corte (a do relvado), escurecida na base e clara na ponta, e os tufos esbatem-se com a distancia a bola. Um draw call.
*/
function criarTufosDaRelva(grupo, relvaTex, largura, comprimento) {
    const C = (typeof RelvaTufos !== 'undefined') ? RelvaTufos : null;
    if (!C || !C.activo || typeof THREE === 'undefined' || !THREE.InstancedBufferGeometry) return null;
    const n = Math.round(C.raio / C.celula), lado = 2 * n + 1;

    // Um tufo: 3 laminas (triangulos) viradas em angulos diferentes, cada uma com a base no chao (y=0) e a ponta a 1 (a altura real vem do shader).
    const pos = [], alt = [];
    for (let b = 0; b < 3; b++) {
        const a = b * Math.PI * 2 / 3, cx = Math.cos(a), sz = Math.sin(a);
        const lx = -sz * C.largura * 0.5, lz = cx * C.largura * 0.5;      // meia-largura da base, perpendicular a direccao da lamina
        const ox = cx * C.inclinacao, oz = sz * C.inclinacao;             // a ponta inclina-se para fora
        pos.push(-lx, 0, -lz, lx, 0, lz, ox, 1, oz);
        alt.push(0, 0, 1);
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aAlt', new THREE.Float32BufferAttribute(alt, 1));
    const cel = new Float32Array(lado * lado * 2);
    let k = 0;
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) { cel[k++] = i; cel[k++] = j; }
    g.setAttribute('aCel', new THREE.InstancedBufferAttribute(cel, 2));
    g.instanceCount = lado * lado;

    const mat = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: {
            uFoco: { value: new THREE.Vector2(0, 0) },
            uTex: { value: relvaTex },
            uTam: { value: new THREE.Vector2(largura, comprimento) },
            uCfg: { value: new THREE.Vector4(C.celula, C.altura, C.raio, C.variacaoAltura) },
            uTempo: { value: 0 }, uVento: { value: C.vento }
        },
        vertexShader: `
            attribute vec2 aCel; attribute float aAlt;
            uniform vec2 uFoco, uTam; uniform vec4 uCfg; uniform float uTempo, uVento;
            uniform sampler2D uTex;
            varying vec3 vCor; varying float vFade;
            float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
            void main() {
                float c = uCfg.x;
                vec2 base = floor(uFoco / c) + aCel;
                vec2 jit = vec2(h21(base), h21(base + 17.3)) - 0.5;
                vec2 xz = (base + 0.5 + jit * 0.9) * c;
                float rnd = h21(base + 41.7);
                float altura = uCfg.y * (1.0 - uCfg.w + uCfg.w * 2.0 * rnd);
                float d = length(xz - uFoco);
                vFade = 1.0 - smoothstep(uCfg.z * 0.55, uCfg.z, d);
                vFade *= step(abs(xz.x), uTam.x * 0.5 - 1.0) * step(abs(xz.y), uTam.y * 0.5 - 1.0);
                float rot = rnd * 6.2831;
                float cr = cos(rot), sr = sin(rot);
                vec3 p = position;
                vec2 horiz = vec2(p.x * cr - p.z * sr, p.x * sr + p.z * cr);
                float vento = sin(uTempo * 1.7 + xz.x * 0.31 + xz.y * 0.23) * uVento * aAlt;
                vec3 w = vec3(xz.x + horiz.x + vento, p.y * altura * vFade, xz.y + horiz.y);
                vec2 uv = vec2((xz.x + uTam.x * 0.5) / uTam.x, 1.0 - (xz.y + uTam.y * 0.5) / uTam.y);
                vec3 t = texture2D(uTex, uv).rgb;
                vCor = t * mix(0.62, 1.18, aAlt) * (0.9 + 0.2 * h21(base + 7.1));
                gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
            }`,
        fragmentShader: `
            varying vec3 vCor; varying float vFade;
            void main() { if (vFade <= 0.001) discard; gl_FragColor = vec4(vCor, 1.0); }`
    });
    const m = new THREE.Mesh(g, mat);
    m.frustumCulled = false;
    m.onBeforeRender = function () {
        const b = (typeof Match !== 'undefined' && Match.ball) ? Match.ball.position : null;
        if (b) mat.uniforms.uFoco.value.set(b.x, b.z);
        mat.uniforms.uTempo.value = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000;
    };
    m.visible = !(typeof Qualidade !== 'undefined' && Qualidade.cfg().relvaTufos === false);
    grupo.add(m);
    window.relvaTufos = m;
    return m;
}
if (typeof window !== 'undefined') window.criarTufosDaRelva = criarTufosDaRelva;
