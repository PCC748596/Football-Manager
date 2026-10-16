
const fs = require('fs');
const file = 'textSim/realDatabase.ts';
let content = fs.readFileSync(file, 'utf-8');

const regex = /\{\s*"teamID": 450028[\s\S]*?\}/;
const match = content.match(regex);
if (match) {
  let cric = JSON.parse(match[0]);
  cric.homeKit = { pattern: 'criciumaStripes', color1: '#facc15', color2: '#000000', color3: '#ffffff' };
  cric.awayKit = { pattern: 'solid', color1: '#000000', color2: '#facc15', color3: '#000000' };
  cric.thirdKit = { pattern: 'solid', color1: '#ffffff', color2: '#000000', color3: '#ffffff' };
  cric.gkKit = { pattern: 'solid', color1: '#add8e6', color2: '#000000', color3: '#add8e6' };
  
  cric.shirtPattern = 'criciumaStripes';
  cric.color1 = '#facc15';
  cric.color2 = '#000000';
  cric.color3 = '#ffffff';

  content = content.replace(match[0], JSON.stringify(cric, null, 4));
  fs.writeFileSync(file, content, 'utf-8');
  console.log('Criciuma updated!');
} else {
  console.log('Criciuma not found by regex');
}

