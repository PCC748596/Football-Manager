/*
O TEMPO DE UM JOGO: sorteado de forma determinista pelo id do jogo, a estacao (pelo mes e hemisferio do pais do mandante). E a UNICA fonte: o Dashboard mostra-o em `Next match` e
a tela do 3D usa a mesma conta (`condicaoDoClima`) para pintar o mesmo tempo no estadio.
*/
export const getWeatherForMatch = (dateStr: string, matchId: string, country: string) => {
  // Deterministic random based on match ID string sum
  const seed = matchId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const pseudoRandom = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  const month = new Date(dateStr + 'T12:00:00').getMonth(); // 0-11
  
  // Brazil (South Hemisphere) seasons
  // Summer: Dec, Jan, Feb (11, 0, 1)
  // Autumn: Mar, Apr, May (2, 3, 4)
  // Winter: Jun, Jul, Aug (5, 6, 7)
  // Spring: Sep, Oct, Nov (8, 9, 10)
  
  const isSouth = country === 'brazil' || country === '45';   // 45 = o id do Brasil na base atual
  let season = 'summer';
  
  if (isSouth) {
    if (month >= 2 && month <= 4) season = 'autumn';
    else if (month >= 5 && month <= 7) season = 'winter';
    else if (month >= 8 && month <= 10) season = 'spring';
  } else {
    // North Hemisphere (England)
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'autumn';
    else season = 'winter';
  }

  // Icons: ☁️ ⛅ ⛈️ 🌤️ 🌥️ 🌦️ 🌧️ 🌨️ 🌩️ ☀️ 🍃
  let icon = '☀️';
  let temp = 25;

  const rand = pseudoRandom(1);

  if (season === 'summer') {
    // Hot, Sun, Storms
    temp = Math.floor(25 + pseudoRandom(2) * 12); // 25-37
    if (rand < 0.5) icon = '☀️';
    else if (rand < 0.8) icon = '🌤️';
    else icon = '⛈️';
  } else if (season === 'autumn') {
    // Mild, Windy, Clouds
    temp = Math.floor(18 + pseudoRandom(2) * 10); // 18-28
    if (rand < 0.4) icon = '⛅';
    else if (rand < 0.7) icon = '🍃';
    else icon = '🌥️';
  } else if (season === 'winter') {
    // Cold, Rain, Overcast
    temp = Math.floor(10 + pseudoRandom(2) * 12); // 10-22 (Brazil logic mostly)
    if (!isSouth) temp -= 10; // Colder in England
    
    if (rand < 0.4) icon = '☁️';
    else if (rand < 0.7) icon = '🌧️';
    else if (rand < 0.9) icon = '🌦️';
    else icon = '🌨️'; // Rare snow
  } else { // Spring
    // Warm, Pleasant
    temp = Math.floor(20 + pseudoRandom(2) * 8); // 20-28
    if (rand < 0.5) icon = '🌤️';
    else if (rand < 0.8) icon = '🍃';
    else icon = '☀️';
  }

  const desc: Record<string, string> = { '☀️': 'Sunny', '🌤️': 'Mostly sunny', '⛈️': 'Storms', '⛅': 'Partly cloudy', '🍃': 'Windy', '🌥️': 'Cloudy', '☁️': 'Overcast', '🌧️': 'Rain', '🌦️': 'Showers', '🌨️': 'Snow' };
  return { icon, temp, desc: desc[icon] || '' };
};

/** A condicao do 3D (Weather.condicao: limpo | nublado | encoberto | chuva | neve) para o icone do tempo do manager. */
export const condicaoDoClima = (icon: string): 'limpo' | 'nublado' | 'encoberto' | 'chuva' | 'neve' => {
  if (icon === '🌧️' || icon === '🌦️' || icon === '⛈️') return 'chuva';
  if (icon === '🌨️') return 'neve';
  if (icon === '☁️' || icon === '🌥️') return 'encoberto';
  if (icon === '⛅' || icon === '🍃') return 'nublado';
  return 'limpo';
};

/**
 * A HORA DO JOGO: os jogos de meio de semana (segunda a sexta) sao a noite; os de fim de semana (sabado e domingo) sao de manha, a tarde ou a noite, sorteados de forma determinista pelo
 * id do jogo. `periodo` e o do 3D (Weather.periodo): manha e tarde sao 'dia'; noite e 'noite'.
 */
export const horaDoJogo = (dateStr: string, matchId: string): { faixa: 'manha' | 'tarde' | 'noite'; periodo: 'dia' | 'noite'; rotulo: string } => {
  const dow = new Date(dateStr + 'T12:00:00').getDay();   // 0 domingo ... 6 sabado
  const fimDeSemana = dow === 0 || dow === 6;
  if (!fimDeSemana) return { faixa: 'noite', periodo: 'noite', rotulo: 'Night' };
  const seed = matchId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const x = Math.sin(seed * 7 + 3) * 10000, r = x - Math.floor(x);
  if (r < 1 / 3) return { faixa: 'manha', periodo: 'dia', rotulo: 'Morning' };
  if (r < 2 / 3) return { faixa: 'tarde', periodo: 'dia', rotulo: 'Afternoon' };
  return { faixa: 'noite', periodo: 'noite', rotulo: 'Night' };
};
