
const fs = require('fs');
const file = 'textSim/realDatabase.ts';
let content = fs.readFileSync(file, 'utf-8');

const spfcRegexID = /\{\s*"teamID": 450009[\s\S]*?\}/;
const match = content.match(spfcRegexID);
if (match) {
  let spfc = JSON.parse(match[0]);
  spfc.homeKit = { pattern: 'spfcStripes', color1: '#ffffff', color2: '#ff0000', color3: '#000000' };
  spfc.awayKit = { pattern: 'stripes', color1: '#ff0000', color2: '#000000', color3: '#ffffff' };
  spfc.thirdKit = { pattern: 'solid', color1: '#000000', color2: '#ff0000', color3: '#000000' };
  spfc.gkKit = { pattern: 'solid', color1: '#0000ff', color2: '#ffffff', color3: '#0000ff' };
  
  spfc.shirtPattern = 'spfcStripes';
  spfc.color1 = '#ffffff';
  spfc.color2 = '#ff0000';
  spfc.color3 = '#000000';

  content = content.replace(match[0], JSON.stringify(spfc, null, 4));
  fs.writeFileSync(file, content, 'utf-8');
  console.log('SPFC updated!');
} else {
  console.log('SPFC not found by regex');
}

