
const counts = {
    NEUTRAL: Math.round(90 * 0.28), 
    COUNTER: Math.round(90 * 0.04), 
    FINALIZACAO: Math.round(90 * 0.26), 
    FOUL: Math.round(90 * 0.17), 
    CORNER: Math.round(90 * 0.08), 
    OFFSIDE: Math.round(90 * 0.04), 
    YELLOW_DIRECT: Math.round(90 * 0.02), 
    RED_DIRECT: Math.round(90 * 0.01), 
    INJURY: Math.round(90 * 0.01), 
    SUB: Math.round(90 * 0.04), 
    LATERAL: Math.round(90 * 0.04), 
};

let deck = [];
Object.entries(counts).forEach(([type, qty]) => {
    for (let i = 0; i < qty; i++) { deck.push(type); }
});
while (deck.length < 90) deck.push('NEUTRAL');

for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
}

console.log("=== LINHA DO TEMPO COMPLETA (1' - 90') ===");
console.log("Min | Evento          | Resultado Detalhado");
console.log("----|-----------------|---------------------");

let nGoals = 0, nSaves = 0, nMissed = 0, nCorners = 0;
let cGoals = 0, cSaves = 0, cMissed = 0;
let pCount = 0, pGoals = 0, pMissed = 0;
let yellowFoul = 0, redFoul = 0;

for (let min = 1; min <= 90; min++) {
    const outcome = deck[min-1];
    let detail = "-";

    if (outcome === 'FINALIZACAO') {
        const roll = Math.random() * 100;
        if (roll < 10) { nGoals++; detail = "⚽ GOL!"; }
        else if (roll < 40) { nSaves++; detail = "👐 DEFESA"; }
        else if (roll < 50) { nCorners++; detail = "🚩 ESCANTEIO"; }
        else { nMissed++; detail = "💨 FORA"; }
    } else if (outcome === 'COUNTER') {
        const roll = Math.random() * 100;
        if (roll < 15) { cGoals++; detail = "⚡ ⚽ GOL CONTRA-ATAQUE!"; }
        else if (roll < 45) { cSaves++; detail = "⚡ 👐 DEFESA"; }
        else { cMissed++; detail = "⚡ 💨 FORA"; }
    } else if (outcome === 'FOUL') {
        const roll = Math.random() * 100;
        if (roll < 5) { 
            pCount++;
            if (Math.random() < 0.75) { pGoals++; detail = "⭕ ⚽ GOL DE PÊNALTI!"; }
            else { pMissed++; detail = "⭕ 🧤 PÊNALTI PERDIDO!"; }
        }
        else if (roll < 6) { redFoul++; detail = "🟥 CARTÃO VERMELHO!"; }
        else if (roll < 15) { yellowFoul++; detail = "🟨 CARTÃO AMARELO"; }
        else { detail = "⚖️ FALTA"; }
    } else if (outcome === 'CORNER') {
        detail = "🚩 ESCANTEIO DIRETO";
    } else if (outcome === 'OFFSIDE') {
        detail = "🚫 IMPEDIMENTO";
    } else if (outcome === 'INJURY') {
        detail = "🚑 LESÃO";
    } else if (outcome === 'SUB') {
        detail = "↔️ SUBSTITUIÇÃO";
    } else if (outcome === 'LATERAL') {
        detail = "🔄 LATERAL";
    } else if (outcome === 'YELLOW_DIRECT') {
        detail = "🟨 CARTÃO AMARELO";
    } else if (outcome === 'RED_DIRECT') {
        detail = "🟥 CARTÃO VERMELHO";
    }

    const minStr = min.toString().padStart(2, '0') + "'";
    const eventStr = outcome.padEnd(15);
    console.log(`${minStr} | ${eventStr} | ${detail}`);
}

console.log("==========================================");
console.log(`PLACAR FINAL: ${nGoals + cGoals + pGoals} GOLS`);
console.log(`ESCANTEIOS:   ${counts.CORNER + nCorners}`);
console.log("==========================================");
