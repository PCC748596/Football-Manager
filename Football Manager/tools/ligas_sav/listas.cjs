/*
NOMES GENERICOS DE CLUBES por lingua, para tools/gerar_ligas_sav.cjs: um prefixo e uma palavra ("Atlético Cóndor", "Hayate United", "Al-Waha Club").
Palavras comuns (natureza, animais, virtudes): nenhuma e o nome de um clube real. O gerador recusa ainda qualquer palavra que apareca nos nomes reais dos ficheiros.
`antes`: os prefixos que vao a frente da palavra (null = todos a frente); os outros vao depois. `est`: o nome do estadio a partir da palavra.
*/
const LISTAS = {
  es: {
    pref: ['Atlético', 'Deportivo', 'Real', 'Club Deportivo', 'Sporting', 'Unión', 'Racing', 'Club Atlético', 'Independiente', 'Nacional', 'Juventud'],
    pal: ['Aurora', 'Horizonte', 'Cometa', 'Mirador', 'Cascada', 'Jacaranda', 'Quetzal', 'Cóndor', 'Valle Verde', 'Sierra Azul', 'Laguna Dorada', 'Altiplano', 'Cerrito', 'Ceibo', 'Algarrobo',
      'Puma', 'Jaguar', 'Colibrí', 'Cordillera', 'Frontera', 'Bahía Clara', 'Monte Alto', 'Río Manso', 'Campo Bello', 'Costa Blanca', 'Amanecer', 'Tormenta', 'Relámpago', 'Estrella Polar', 'Halcón', 'Pioneros',
      'Guerreros', 'Esperanza', 'Tradición', 'Imperial', 'Montañés', 'Costeño', 'Norteño', 'Sureño', 'Pacífico', 'Nopal', 'Maguey', 'Ahuehuete', 'Xólotl', 'Coyote', 'Tecolote', 'Cenote', 'Volcán',
      'Obsidiana', 'Jade', 'Mezquite', 'Sol de Oro', 'Cañada', 'Altamira', 'Ocelote', 'Huracán', 'Peñasco', 'Malinche Verde'],
    antes: null,
    est: p => 'Estadio ' + p
  },
  en: {
    pref: ['United', 'City', 'Athletic', 'Rovers', 'Town', 'Wanderers', 'Rangers', 'County', 'Olympic', 'Royal', 'Union', 'SC', 'FC'],
    pal: ['Ashford', 'Brookfield', 'Cresthill', 'Dunmore', 'Eastvale', 'Fairhaven', 'Glenwood', 'Highmoor', 'Ironbridge', 'Kingsmere', 'Lakeside', 'Millbrook', 'Northgate', 'Oakridge', 'Pinecroft',
      'Riverbend', 'Stonebridge', 'Thornbury', 'Westfield', 'Yarrow', 'Beacon Hill', 'Copperfield', 'Dalewood', 'Elmstead', 'Foxbury', 'Greystone', 'Ivybridge', 'Juniper', 'Kestrel', 'Larkspur',
      'Meadowbank', 'Orchard Park', 'Pennington', 'Ravenscar', 'Silverdale', 'Valemoor', 'Redwood', 'Prairie', 'Bayou', 'Mesa Verde', 'Granite Peak', 'Lone Pine', 'Cedar Falls', 'Blue Ridge',
      'Thunder Bay', 'Sierra Vista', 'Coral Coast', 'Iron Valley', 'Maple Grove', 'Bison', 'Golden Plains', 'Harbor Point', 'Cypress', 'Timberline', 'Desert Sky', 'Riverside Park'],
    antes: new Set(['FC', 'SC', 'Royal', 'Olympic', 'Athletic']),
    est: p => p + ' Park'
  },
  // ingles com palavras de Africa (savana, rios, animais): Africa do Sul, Tanzania, Gana
  en_af: {
    pref: ['United', 'City', 'Stars', 'Rovers', 'Warriors', 'Athletic', 'Wanderers', 'FC', 'SC', 'Royal'],
    pal: ['Baobab', 'Savanna', 'Kilima', 'Marula', 'Acacia', 'Springbok', 'Kudu', 'Impala', 'Eland', 'Thunderbird', 'Sunbird', 'Hornbill', 'Fish Eagle', 'Copperbelt', 'Goldfields', 'Riverlea',
      'Highveld', 'Lowveld', 'Bushveld', 'Karoo Sun', 'Monsoon', 'Coral Reef', 'Spice Coast', 'Rift Valley', 'Lake Shore', 'Red Earth', 'Rainmaker', 'Ironwood', 'Mahogany', 'Ebony', 'Sandstone',
      'Granite', 'Falcon Ridge', 'Lion Rock', 'Elephant Hill', 'Rhino', 'Cheetah', 'Leopard Hill', 'Crocodile', 'Hippo', 'Buffalo', 'Zebra', 'Antelope', 'Thunder', 'Lightning', 'Sunrise', 'Moonlight',
      'Starlight', 'Northern Cape', 'Coastline', 'Bay Breeze', 'Palm Grove', 'Cocoa Hill', 'Golden Coast', 'Harmattan', 'Volta Sun', 'Sahel Star'],
    antes: new Set(['FC', 'SC', 'Royal', 'Athletic']),
    est: p => p + ' Stadium'
  },
  ja: {
    pref: ['FC', 'SC', 'United', 'Athletic', 'Sports Club', 'City'],
    pal: ['Hayate', 'Akatsuki', 'Aozora', 'Harukaze', 'Yukikaze', 'Shiokaze', 'Inazuma', 'Homura', 'Tsurugi', 'Hibari', 'Uguisu', 'Tsubame', 'Kamome', 'Shirasagi', 'Kujaku', 'Hotaru', 'Kohaku',
      'Ruri', 'Seiran', 'Tomoe', 'Momiji', 'Minato', 'Shinonome', 'Sazanami', 'Tsukikage', 'Yamabiko', 'Kitsune', 'Tanuki', 'Hanabi', 'Midori', 'Akane', 'Kagami', 'Asagiri', 'Yuzuki', 'Kazahana',
      'Hoshizora', 'Murasaki', 'Shiranami', 'Kurenai', 'Kumotori', 'Hanazono', 'Mizuho', 'Takane', 'Fuyuzora', 'Natsukaze', 'Senbazuru', 'Matsukaze', 'Wakaba', 'Ginga', 'Amagumo', 'Iwanami',
      'Kawasemi', 'Mejiro', 'Hayabusa', 'Torii', 'Shigure', 'Kogane', 'Sakimori', 'Yatagarasu', 'Tenryu'],
    antes: new Set(['FC', 'SC']),
    est: p => p + ' Stadium'
  },
  // arabe transliterado: Egito, Golfo; "Al-Waha Club", "Nadi Al-Qamar"
  ar: {
    pref: ['Club', 'SC', 'FC', 'Nadi', 'Sporting'],
    pal: ['Al-Waha', 'Al-Qamar', 'Al-Sahra', 'Al-Rimal', 'Al-Bahr', 'Al-Nujoom', 'Al-Saqr', 'Al-Ghazal', 'Al-Fajr', 'Al-Sharq', 'Al-Gharb', 'Al-Janoub', 'Al-Shamaal', 'Al-Nakhla', 'Al-Lulu',
      'Al-Marjan', 'Al-Yaqoot', 'Al-Zumurrud', 'Al-Hilal Al-Akhdar', 'Al-Badr', 'Al-Shams', 'Al-Ra\'d', 'Al-Barq', 'Al-Naseem', 'Al-Sahab', 'Al-Jabal', 'Al-Wadi', 'Al-Nahr', 'Al-Saheel', 'Al-Mina',
      'Al-Qalaa', 'Al-Minara', 'Al-Faris', 'Al-Asad', 'Al-Nimr', 'Al-Fahd', 'Al-Uqab', 'Al-Hudhud', 'Al-Yamama', 'Al-Hamama', 'Al-Kharrouba', 'Al-Zaytoun', 'Al-Rumman', 'Al-Tamr', 'Al-Anbar',
      'Al-Bustan', 'Al-Rawda', 'Al-Diyaa', 'Al-Amal', 'Al-Wafa', 'Al-Iqdam', 'Al-Sumoud', 'Al-Majd Al-Jadid', 'Al-Nour', 'Al-Ufuq', 'Al-Safwa', 'Al-Rawabi', 'Al-Kawthar', 'Al-Dana', 'Al-Shahin'],
    antes: new Set(['Nadi']),
    est: p => p + ' Stadium'
  },
  // frances: Magrebe, Costa do Marfim, Mali, RD Congo; "AS Baobab", "Étoile du Sahel Vert"
  fr: {
    pref: ['AS', 'US', 'Stade', 'Racing', 'Olympique', 'Union Sportive', 'Jeunesse Sportive', 'Étoile', 'Avenir', 'Espoir', 'Renaissance Sportive'],
    pal: ['Baobab', 'Fromager', 'Karité', 'Acacia', 'Palmeraie', 'Oasis', 'Dunes', 'Atlas Vert', 'Croissant', 'Soleil Levant', 'Lune d\'Or', 'Grand Fleuve', 'Lagune', 'Savane', 'Falaise',
      'Rivage', 'Horizon', 'Aurore', 'Tonnerre', 'Éclair', 'Tempête', 'Harmattan', 'Sirocco', 'Mistral du Sud', 'Gazelle', 'Fennec', 'Faucon', 'Aigle Royal', 'Panthère', 'Guépard', 'Éléphant',
      'Lion d\'Or', 'Crocodile', 'Hippocampe', 'Colibri', 'Ibis', 'Flamant', 'Cèdre', 'Olivier', 'Grenadier', 'Jasmin', 'Rose des Sables', 'Ambre', 'Corail', 'Émeraude', 'Saphir', 'Rubis', 'Topaze',
      'Ivoire Blanc', 'Ébène', 'Acajou', 'Cacao', 'Kola', 'Mangue', 'Arc-en-Ciel', 'Pionniers', 'Bâtisseurs', 'Espérance Nouvelle'],
    antes: null,
    est: p => 'Stade ' + p
  },
  // portugues (Angola)
  pt: {
    pref: ['Atlético', 'Sport Clube', 'Desportivo', 'Clube Desportivo', 'Grupo Desportivo', 'Recreativo', 'União', 'Académica', 'Progresso', 'Estrela'],
    pal: ['Imbondeiro', 'Palanca', 'Kwanza Azul', 'Mussulo', 'Muxima', 'Kianda', 'Savana', 'Planalto', 'Cascata', 'Marimba', 'Kissama', 'Calandula', 'Embondeiro Verde', 'Pôr do Sol', 'Aurora',
      'Horizonte', 'Cometa', 'Trovão', 'Relâmpago', 'Tempestade', 'Falcão', 'Gavião', 'Leopardo', 'Pacaça', 'Gunga', 'Seixo', 'Coqueiral', 'Palmeiral', 'Areal', 'Restinga', 'Baía Azul', 'Morro Alto',
      'Vale Verde', 'Rio Manso', 'Pedra Negra', 'Terra Vermelha', 'Mangueira', 'Cajueiro', 'Diamante', 'Rubi', 'Esmeralda', 'Ébano', 'Marfim', 'Pioneiros', 'Guerreiros', 'Esperança', 'Tradição'],
    antes: null,
    est: p => 'Estádio ' + p
  },
  // coreano romanizado: "Haneul FC", "FC Barami"
  ko: {
    pref: ['FC', 'United', 'Citizen', 'Athletic', 'SC'],
    pal: ['Haneul', 'Barami', 'Byeolbit', 'Haetsal', 'Dalbit', 'Noeul', 'Saebyeok', 'Mirinae', 'Eunha', 'Bomnal', 'Gaeul', 'Gyeoul', 'Yeoreum', 'Nuri', 'Hanbit', 'Sarang', 'Purun', 'Hayan',
      'Ggotbit', 'Doraji', 'Mugunghwa', 'Sonamu', 'Daenamu', 'Hwarang', 'Cheonma', 'Horangi', 'Durumi', 'Gamaegi', 'Kkachi', 'Jebi', 'Bada', 'Pado', 'Seom', 'Bawi', 'Sanmaru', 'Gangmul', 'Hanaro',
      'Maru', 'Areum', 'Bitna', 'Dasom', 'Garam', 'Sora', 'Haram', 'Nara', 'Taeyang', 'Gureum', 'Bulkkot', 'Cheondung', 'Beonnae'],
    antes: new Set(['FC']),
    est: p => p + ' Stadium'
  },
  // persa romanizado (Irao): "Shahab FC", "Arash Club"
  fa: {
    pref: ['FC', 'Club', 'SC', 'Sport Club', 'United'],
    pal: ['Shahab', 'Arash', 'Simorgh', 'Homa', 'Sepidar', 'Kooh', 'Alborz Sabz', 'Dariya', 'Setareh', 'Mehr', 'Mahtab', 'Khorshid', 'Bahar', 'Payiz', 'Golestan', 'Anar', 'Sarv', 'Chenar', 'Nilufar',
      'Yas', 'Laleh', 'Shaqayeq', 'Babr', 'Palang', 'Oghab', 'Shahin', 'Toufan', 'Tondar', 'Barq', 'Kavir', 'Darya Kenar', 'Rud', 'Cheshmeh', 'Firuzeh', 'Yaqut', 'Almas', 'Morvarid', 'Zarrin',
      'Sahand', 'Dena', 'Kavus', 'Rostam', 'Atash', 'Nasim', 'Azar', 'Sepehr', 'Kahkeshan', 'Ofogh', 'Parsa Nou', 'Bamdad'],
    antes: new Set(['FC']),
    est: p => p + ' Stadium'
  }
};

module.exports = { LISTAS };
