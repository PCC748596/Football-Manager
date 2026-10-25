/*
CLUBES DAS LIGAS EUROPEIAS (para a Champions League). Os NOMES sao os reais; cidade, estadio, cores e ano de fundacao sao melhor-esforco e devem ser revistos no editor.
A ORDEM de cada lista e a FORCA dos clubes (o primeiro e o mais forte): e dela que sai o OVR de cada plantel.

Cada pais: `id` numerico (o codigo do pais nos clubes e a nacionalidade dos jogadores), `sigla` (a chave dos nomes e da configuracao), `ligaId`/`ligaNome`, `completa`:
  true  = a 1.a divisao inteira (calendario, tabela e jogos na aba WORLD);
  false = so 5 clubes, numa liga OCULTA (sem jogos): servem para a Champions (um deles e sorteado).
A Inglaterra ja existia (clubes sem jogadores): `existente: true` e o campo `nomeNaBase` liga o clube ao registo que la esta; so se acrescentam os jogadores.

Campo de cada clube: [nome, sigla, cidade, estadio, cor1, cor2, padrao, ano]   padrao: s = liso, v = listras verticais, h = listras horizontais
Cores: R vermelho, W branco, K preto, B azul, LB azul-claro, N azul-marinho, Y amarelo, G verde, O laranja, M grena, V violeta, P rosa, GR cinza, SK azul-ceu
*/
const COR = { R: '#c8102e', W: '#ffffff', K: '#111111', B: '#1d4ed8', LB: '#6cb4ee', N: '#1e3a8a', Y: '#facc15', G: '#15803d', O: '#ea580c', M: '#7f1d1d', V: '#6d28d9', P: '#f472b6', GR: '#9ca3af', SK: '#87ceeb' };

const PAISES = [
  {
    sigla: 'ENG', id: '65', nome: 'England', existente: true, completa: true, ligaId: 'eng_prem',
    clubes: [
      ['Arsenal', 'ARS'], ['Man City', 'MCI'], ['Liverpool', 'LIV'], ['Chelsea', 'CHE'], ['Tottenham', 'TOT'], ['Man Utd', 'MUN'], ['Newcastle', 'NEW'], ['Aston Villa', 'AVL'],
      ['Brighton', 'BHA'], ['Crystal Palace', 'CRY'], ['Nottingham Forest', 'NFO'], ['West Ham', 'WHU'], ['Brentford', 'BRE'], ['Fulham', 'FUL'], ['Bournemouth', 'BOU'],
      ['Everton', 'EVE'], ['Wolves', 'WOL'], ['Southampton', 'SOU'], ['Leicester', 'LEI'], ['Ipswich', 'IPS']
    ]
  },
  {
    sigla: 'ESP', id: '66', nome: 'Spain', completa: true, ligaId: 'esp_laliga', ligaNome: 'La Liga', rebaixados: 3,
    clubes: [
      ['Real Madrid', 'RMA', 'Madrid', 'Santiago Bernabéu', 'W', 'N', 's', 1902],
      ['Barcelona', 'BAR', 'Barcelona', 'Estadi Olímpic Lluís Companys', 'M', 'B', 'v', 1899],
      ['Atlético de Madrid', 'ATM', 'Madrid', 'Metropolitano', 'R', 'W', 'v', 1903],
      ['Villarreal', 'VIL', 'Vila-real', 'Estadio de la Cerámica', 'Y', 'B', 's', 1923],
      ['Real Betis', 'BET', 'Sevilla', 'Benito Villamarín', 'G', 'W', 'v', 1907],
      ['Athletic Club', 'ATH', 'Bilbao', 'San Mamés', 'R', 'W', 'v', 1898],
      ['Real Sociedad', 'RSO', 'San Sebastián', 'Anoeta', 'B', 'W', 'v', 1909],
      ['Sevilla', 'SEV', 'Sevilla', 'Ramón Sánchez-Pizjuán', 'W', 'R', 's', 1890],
      ['Valencia', 'VAL', 'Valencia', 'Mestalla', 'W', 'K', 's', 1919],
      ['Girona', 'GIR', 'Girona', 'Montilivi', 'R', 'W', 'v', 1930],
      ['Celta Vigo', 'CEL', 'Vigo', 'Balaídos', 'LB', 'W', 's', 1923],
      ['Osasuna', 'OSA', 'Pamplona', 'El Sadar', 'R', 'N', 's', 1920],
      ['Getafe', 'GET', 'Getafe', 'Coliseum', 'B', 'W', 's', 1983],
      ['Rayo Vallecano', 'RAY', 'Madrid', 'Campo de Fútbol de Vallecas', 'W', 'R', 's', 1924],
      ['Mallorca', 'MLL', 'Palma', 'Son Moix', 'R', 'K', 's', 1916],
      ['Espanyol', 'ESP', 'Barcelona', 'RCDE Stadium', 'B', 'W', 'v', 1900],
      ['Alavés', 'ALA', 'Vitoria-Gasteiz', 'Mendizorroza', 'B', 'W', 'v', 1921],
      ['Elche', 'ELC', 'Elche', 'Martínez Valero', 'W', 'G', 's', 1923],
      ['Levante', 'LEV', 'Valência', 'Ciutat de València', 'R', 'B', 'v', 1909],
      ['Real Oviedo', 'OVI', 'Oviedo', 'Carlos Tartiere', 'B', 'W', 's', 1926]
    ]
  },
  {
    sigla: 'GER', id: '67', nome: 'Germany', completa: true, ligaId: 'ger_bundesliga', ligaNome: 'Bundesliga', rebaixados: 2,
    clubes: [
      ['Bayern München', 'BAY', 'Munique', 'Allianz Arena', 'R', 'W', 's', 1900],
      ['Bayer Leverkusen', 'B04', 'Leverkusen', 'BayArena', 'R', 'K', 's', 1904],
      ['Borussia Dortmund', 'BVB', 'Dortmund', 'Signal Iduna Park', 'Y', 'K', 's', 1909],
      ['RB Leipzig', 'RBL', 'Leipzig', 'Red Bull Arena', 'W', 'R', 's', 2009],
      ['Eintracht Frankfurt', 'SGE', 'Frankfurt', 'Deutsche Bank Park', 'K', 'R', 'h', 1899],
      ['Stuttgart', 'VFB', 'Stuttgart', 'MHPArena', 'W', 'R', 's', 1893],
      ['Freiburg', 'SCF', 'Freiburg', 'Europa-Park Stadion', 'R', 'W', 's', 1904],
      ['Borussia Mönchengladbach', 'BMG', 'Mönchengladbach', 'Borussia-Park', 'W', 'G', 's', 1900],
      ['Wolfsburg', 'WOB', 'Wolfsburg', 'Volkswagen Arena', 'G', 'W', 's', 1945],
      ['Hoffenheim', 'TSG', 'Sinsheim', 'PreZero Arena', 'B', 'W', 's', 1899],
      ['Werder Bremen', 'SVW', 'Bremen', 'Weserstadion', 'G', 'W', 's', 1899],
      ['Mainz 05', 'M05', 'Mainz', 'Mewa Arena', 'R', 'W', 's', 1905],
      ['Union Berlin', 'FCU', 'Berlim', 'An der Alten Försterei', 'R', 'W', 's', 1966],
      ['Augsburg', 'FCA', 'Augsburg', 'WWK Arena', 'R', 'G', 'v', 1907],
      ['St. Pauli', 'STP', 'Hamburgo', 'Millerntor', 'M', 'W', 's', 1910],
      ['Köln', 'KOE', 'Colônia', 'RheinEnergieStadion', 'W', 'R', 's', 1948],
      ['Hamburger SV', 'HSV', 'Hamburgo', 'Volksparkstadion', 'W', 'B', 's', 1887],
      ['Heidenheim', 'HDH', 'Heidenheim', 'Voith-Arena', 'R', 'B', 'v', 1846]
    ]
  },
  {
    sigla: 'ITA', id: '68', nome: 'Italy', completa: true, ligaId: 'ita_seriea', ligaNome: 'Serie A', rebaixados: 3,
    clubes: [
      ['Inter', 'INT', 'Milão', 'San Siro', 'B', 'K', 'v', 1908],
      ['Napoli', 'NAP', 'Nápoles', 'Diego Armando Maradona', 'SK', 'W', 's', 1926],
      ['Juventus', 'JUV', 'Turim', 'Allianz Stadium', 'W', 'K', 'v', 1897],
      ['Milan', 'MIL', 'Milão', 'San Siro', 'R', 'K', 'v', 1899],
      ['Atalanta', 'ATA', 'Bérgamo', 'Gewiss Stadium', 'B', 'K', 'v', 1907],
      ['Roma', 'ROM', 'Roma', 'Olimpico', 'M', 'Y', 's', 1927],
      ['Lazio', 'LAZ', 'Roma', 'Olimpico', 'SK', 'W', 's', 1900],
      ['Fiorentina', 'FIO', 'Florença', 'Artemio Franchi', 'V', 'W', 's', 1926],
      ['Bologna', 'BOL', 'Bolonha', "Renato Dall'Ara", 'R', 'N', 'v', 1909],
      ['Como', 'COM', 'Como', 'Giuseppe Sinigaglia', 'B', 'W', 's', 1907],
      ['Torino', 'TOR', 'Turim', 'Olimpico Grande Torino', 'M', 'W', 's', 1906],
      ['Udinese', 'UDI', 'Údine', 'Bluenergy Stadium', 'W', 'K', 'v', 1896],
      ['Genoa', 'GEN', 'Gênova', 'Luigi Ferraris', 'R', 'N', 'h', 1893],
      ['Cagliari', 'CAG', 'Cagliari', 'Unipol Domus', 'R', 'N', 'v', 1920],
      ['Parma', 'PAR', 'Parma', 'Ennio Tardini', 'W', 'Y', 's', 1913],
      ['Lecce', 'LEC', 'Lecce', 'Via del Mare', 'Y', 'R', 'v', 1908],
      ['Sassuolo', 'SAS', 'Sassuolo', 'Mapei Stadium', 'G', 'K', 'v', 1920],
      ['Hellas Verona', 'VER', 'Verona', 'Marcantonio Bentegodi', 'Y', 'B', 's', 1903],
      ['Pisa', 'PIS', 'Pisa', 'Arena Garibaldi', 'N', 'K', 'v', 1909],
      ['Cremonese', 'CRE', 'Cremona', 'Giovanni Zini', 'GR', 'R', 'v', 1903]
    ]
  },
  {
    sigla: 'FRA', id: '69', nome: 'France', completa: true, ligaId: 'fra_ligue1', ligaNome: 'Ligue 1', rebaixados: 2,
    clubes: [
      ['Paris Saint-Germain', 'PSG', 'Paris', 'Parc des Princes', 'N', 'R', 's', 1970],
      ['Marseille', 'OM', 'Marselha', 'Vélodrome', 'W', 'SK', 's', 1899],
      ['Monaco', 'ASM', 'Mônaco', 'Louis II', 'R', 'W', 'h', 1924],
      ['Lille', 'LIL', 'Lille', 'Pierre-Mauroy', 'R', 'N', 's', 1944],
      ['Lyon', 'OL', 'Lyon', 'Groupama Stadium', 'W', 'B', 's', 1950],
      ['Lens', 'RCL', 'Lens', 'Bollaert-Delelis', 'R', 'Y', 'v', 1906],
      ['Nice', 'NIC', 'Nice', 'Allianz Riviera', 'R', 'K', 'v', 1904],
      ['Rennes', 'REN', 'Rennes', 'Roazhon Park', 'R', 'K', 'v', 1901],
      ['Strasbourg', 'STR', 'Estrasburgo', 'La Meinau', 'B', 'W', 's', 1906],
      ['Brest', 'BRE', 'Brest', 'Francis-Le Blé', 'R', 'W', 's', 1950],
      ['Toulouse', 'TFC', 'Toulouse', 'Stadium de Toulouse', 'V', 'W', 's', 1937],
      ['Nantes', 'NAN', 'Nantes', 'La Beaujoire', 'Y', 'G', 's', 1943],
      ['Auxerre', 'AUX', 'Auxerre', "Stade de l'Abbé-Deschamps", 'W', 'B', 's', 1905],
      ['Angers', 'ANG', 'Angers', 'Raymond-Kopa', 'K', 'W', 'v', 1919],
      ['Le Havre', 'HAC', 'Le Havre', 'Océane', 'SK', 'N', 's', 1872],
      ['Lorient', 'LOR', 'Lorient', 'Moustoir', 'O', 'K', 's', 1926],
      ['Metz', 'MET', 'Metz', 'Saint-Symphorien', 'M', 'W', 's', 1932],
      ['Paris FC', 'PFC', 'Paris', 'Stade Charléty', 'N', 'LB', 's', 1969]
    ]
  },
  {
    sigla: 'NOR', id: '70', nome: 'Norway', completa: false, ligaId: 'nor_clubes', ligaNome: 'Eliteserien (clubes)',
    clubes: [
      ['Bodø/Glimt', 'BOD', 'Bodø', 'Aspmyra', 'Y', 'K', 's', 1916],
      ['Brann', 'BRA', 'Bergen', 'Brann Stadion', 'R', 'W', 's', 1908],
      ['Viking', 'VIK', 'Stavanger', 'SR-Bank Arena', 'B', 'W', 's', 1899],
      ['Molde', 'MOL', 'Molde', 'Aker Stadion', 'B', 'W', 's', 1911],
      ['Rosenborg', 'ROS', 'Trondheim', 'Lerkendal', 'W', 'K', 's', 1917]
    ]
  },
  {
    sigla: 'NED', id: '80', nome: 'Netherlands', completa: false, ligaId: 'ned_clubes', ligaNome: 'Eredivisie (clubes)',
    clubes: [
      ['PSV Eindhoven', 'PSV', 'Eindhoven', 'Philips Stadion', 'R', 'W', 'v', 1913],
      ['Feyenoord', 'FEY', 'Roterdã', 'De Kuip', 'R', 'W', 's', 1908],
      ['Ajax', 'AJA', 'Amsterdã', 'Johan Cruyff Arena', 'W', 'R', 'v', 1900],
      ['AZ Alkmaar', 'AZ', 'Alkmaar', 'AFAS Stadion', 'R', 'W', 's', 1967],
      ['FC Twente', 'TWE', 'Enschede', 'De Grolsch Veste', 'R', 'W', 's', 1965]
    ]
  },
  {
    sigla: 'POR', id: '81', nome: 'Portugal', completa: false, ligaId: 'por_clubes', ligaNome: 'Primeira Liga (clubes)',
    clubes: [
      ['Sporting CP', 'SCP', 'Lisboa', 'José Alvalade', 'G', 'W', 'h', 1906],
      ['Benfica', 'SLB', 'Lisboa', 'Estádio da Luz', 'R', 'W', 's', 1904],
      ['Porto', 'FCP', 'Porto', 'Dragão', 'B', 'W', 'v', 1893],
      ['Braga', 'SCB', 'Braga', 'Municipal de Braga', 'R', 'W', 's', 1921],
      ['Vitória SC', 'VSC', 'Guimarães', 'D. Afonso Henriques', 'W', 'K', 's', 1922]
    ]
  },
  {
    sigla: 'TUR', id: '82', nome: 'Turkey', completa: false, ligaId: 'tur_clubes', ligaNome: 'Süper Lig (clubes)',
    clubes: [
      ['Galatasaray', 'GAL', 'Istambul', 'RAMS Park', 'R', 'Y', 'v', 1905],
      ['Fenerbahçe', 'FEN', 'Istambul', 'Şükrü Saracoğlu', 'Y', 'N', 'v', 1907],
      ['Beşiktaş', 'BJK', 'Istambul', 'Tüpraş Stadyumu', 'K', 'W', 'v', 1903],
      ['Trabzonspor', 'TRA', 'Trabzon', 'Papara Park', 'M', 'LB', 'v', 1967],
      ['Başakşehir', 'IBFK', 'Istambul', 'Başakşehir Fatih Terim', 'O', 'N', 's', 1990]
    ]
  },
  {
    sigla: 'AUT', id: '83', nome: 'Austria', completa: false, ligaId: 'aut_clubes', ligaNome: 'Bundesliga Austríaca (clubes)',
    clubes: [
      ['Red Bull Salzburg', 'RBS', 'Salzburgo', 'Red Bull Arena', 'W', 'R', 's', 1933],
      ['Sturm Graz', 'STU', 'Graz', 'Merkur Arena', 'K', 'W', 'v', 1909],
      ['LASK', 'LASK', 'Linz', 'Raiffeisen Arena', 'W', 'K', 's', 1908],
      ['Rapid Wien', 'RAP', 'Viena', 'Allianz Stadion', 'G', 'W', 'v', 1899],
      ['Austria Wien', 'AUS', 'Viena', 'Generali Arena', 'V', 'W', 's', 1911]
    ]
  },
  {
    sigla: 'AZE', id: '84', nome: 'Azerbaijan', completa: false, ligaId: 'aze_clubes', ligaNome: 'Premyer Liqa (clubes)',
    clubes: [
      ['Qarabağ', 'QAR', 'Ağdam', 'Azersun Arena', 'K', 'W', 's', 1951],
      ['Sabah', 'SAB', 'Baku', 'Bakcell Arena', 'B', 'W', 's', 2018],
      ['Neftçi', 'NEF', 'Baku', 'Bakcell Arena', 'K', 'W', 'v', 1937],
      ['Zira', 'ZIR', 'Baku', 'Zira Olimpiya', 'R', 'K', 's', 2014],
      ['Sumqayıt', 'SUM', 'Sumqayıt', 'Kapital Bank Arena', 'R', 'W', 's', 2010]
    ]
  },
  {
    sigla: 'BEL', id: '85', nome: 'Belgium', completa: false, ligaId: 'bel_clubes', ligaNome: 'Pro League (clubes)',
    clubes: [
      ['Club Brugge', 'CLB', 'Bruges', 'Jan Breydel', 'B', 'K', 'v', 1891],
      ['Union Saint-Gilloise', 'USG', 'Bruxelas', 'Stade Joseph Marien', 'Y', 'B', 's', 1897],
      ['Anderlecht', 'AND', 'Bruxelas', 'Lotto Park', 'V', 'W', 's', 1908],
      ['Genk', 'GNK', 'Genk', 'Cegeka Arena', 'B', 'W', 's', 1988],
      ['Gent', 'GNT', 'Gante', 'Ghelamco Arena', 'B', 'W', 's', 1900]
    ]
  },
  {
    sigla: 'SVK', id: '86', nome: 'Slovakia', completa: false, ligaId: 'svk_clubes', ligaNome: 'Fortuna Liga (clubes)',
    clubes: [
      ['Slovan Bratislava', 'SLO', 'Bratislava', 'Tehelné pole', 'SK', 'W', 's', 1919],
      ['Spartak Trnava', 'TRN', 'Trnava', 'Anton Malatinský', 'R', 'K', 's', 1923],
      ['Žilina', 'ZIL', 'Žilina', 'Štadión pod Dubňom', 'G', 'R', 's', 1908],
      ['DAC Dunajská Streda', 'DAC', 'Dunajská Streda', 'MOL Aréna', 'Y', 'B', 's', 1904],
      ['Ružomberok', 'RUZ', 'Ružomberok', 'Štadión MFK', 'W', 'R', 's', 1906]
    ]
  },
  {
    sigla: 'GRE', id: '87', nome: 'Greece', completa: false, ligaId: 'gre_clubes', ligaNome: 'Super League (clubes)',
    clubes: [
      ['Olympiacos', 'OLY', 'Pireu', 'Karaiskakis', 'R', 'W', 'v', 1925],
      ['Panathinaikos', 'PAO', 'Atenas', 'Olympic Stadium', 'G', 'W', 's', 1908],
      ['AEK Athens', 'AEK', 'Atenas', 'OPAP Arena', 'Y', 'K', 's', 1924],
      ['PAOK', 'PAOK', 'Salônica', 'Toumba', 'K', 'W', 'v', 1926],
      ['Aris', 'ARI', 'Salônica', 'Kleanthis Vikelidis', 'Y', 'K', 's', 1914]
    ]
  },
  {
    sigla: 'CZE', id: '88', nome: 'Czechia', completa: false, ligaId: 'cze_clubes', ligaNome: 'Fortuna Liga Tcheca (clubes)',
    clubes: [
      ['Slavia Praha', 'SLA', 'Praga', 'Fortuna Arena', 'W', 'R', 's', 1892],
      ['Sparta Praha', 'SPA', 'Praga', 'Letná', 'M', 'N', 's', 1893],
      ['Viktoria Plzeň', 'PLZ', 'Plzeň', 'Doosan Arena', 'R', 'B', 'v', 1911],
      ['Baník Ostrava', 'BAN', 'Ostrava', 'Městský stadion', 'B', 'W', 's', 1922],
      ['Mladá Boleslav', 'MBO', 'Mladá Boleslav', 'Lokotrans Aréna', 'B', 'Y', 's', 1902]
    ]
  },
  {
    sigla: 'UKR', id: '89', nome: 'Ukraine', completa: false, ligaId: 'ukr_clubes', ligaNome: 'Premier Liha (clubes)',
    clubes: [
      ['Shakhtar Donetsk', 'SHA', 'Donetsk', 'Donbas Arena', 'O', 'K', 'v', 1936],
      ['Dynamo Kyiv', 'DYN', 'Kiev', 'Olimpiyskiy', 'W', 'B', 's', 1927],
      ['Zorya Luhansk', 'ZOR', 'Luhansk', 'Slavutych Arena', 'K', 'W', 's', 1923],
      ['Dnipro-1', 'DNI', 'Dnipro', 'Dnipro-Arena', 'R', 'W', 's', 2017],
      ['Kryvbas', 'KRY', 'Kryvyi Rih', 'Kryvbas Arena', 'R', 'W', 's', 1959]
    ]
  }
];

module.exports = { PAISES, COR };
