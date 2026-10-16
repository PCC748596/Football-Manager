
const fs = require('fs');

let dbContent = fs.readFileSync('./textSim/realDatabase.ts', 'utf-8');
const regex = /export const REAL_TEAMS_JSON = (\[[\s\S]*?\]);/;
const match = dbContent.match(regex);

if (!match) {
    console.log('Failed to match REAL_TEAMS_JSON');
    process.exit(1);
}

// eval the array directly
const teams = eval(match[1]);

function getKitDetails(team, kitIdx) {
    let c1 = '#ffffff'; let c2; let c3; let sc = 'transparent'; let nc = 'black'; let clc = 'transparent'; let noc = 'transparent';
    let diagonal = false; let horizontal = false; let multipleDiagonals = false; let dualDiagonal = false;
    let centerVerticalStripes = false; let gradient = false; let spfcStripes = false; let criciumaStripes = false;

    const isFlamengoRJ = team.teamName === 'Flamengo-RJ';
    const isPalmeirasSP = team.teamName === 'Palmeiras-SP';
    const isCorinthiansSP = team.teamName === 'Corinthians-SP';
    const isSantosSP = team.teamName === 'Santos-SP';
    const isBotafogoRJ = team.teamName === 'Botafogo-RJ';
    const isVascoRJ = team.teamName === 'Vasco-RJ';
    const isFluminense = team.teamName === 'Fluminense-RJ';
    const isGremio = team.teamName === 'Grêmio-RS';
    const isInternacionalRS = team.teamName === 'Internacional-RS';
    const isSaoPauloSP = team.teamName === 'São Paulo-SP';
    const isCruzeiroMG = team.teamName === 'Cruzeiro-MG';
    const isAtleticoMG = team.teamName === 'Atlético-MG';
    const isCriciumaSC = team.teamName === 'Criciúma-SC';
    const isVitoriaBA = team.teamName === 'Vitória-BA';
    const isBahiaBA = team.teamName === 'Bahia-BA';
    const isAtleticoPR = team.teamName === 'Atlético-PR';
    const isAtleticoGO = team.teamName === 'Atlético-GO';
    const isBragantinoSP = team.teamName === 'Bragantino-SP';
    const isCuiabaMT = team.teamName === 'Cuiabá-MT';
    const isFortalezaCE = team.teamName === 'Fortaleza-CE';
    const isJuventudeRS = team.teamName === 'Juventude-RS';

    const gremioBlue = '#5c9bd5';
    const darkerGreen = '#054425';

    if (team.country === 'Brazil') {
        if (isCorinthiansSP) {
            if (kitIdx === 0) {
                c1 = 'white'; c2 = undefined; c3 = undefined;
            } else if (kitIdx === 1) {
                c1 = 'black'; c2 = 'white'; c3 = undefined; clc = 'white'; nc = 'white';
            } else if (kitIdx === 2) {
                c1 = 'white'; c2 = undefined; c3 = undefined;
            }
        } else if (isPalmeirasSP) {
            if (kitIdx === 0) {
                c1 = darkerGreen; c2 = undefined; c3 = undefined; clc = 'white'; sc = 'white'; nc = 'white';
            } else if (kitIdx === 1) {
                c1 = 'white'; c2 = undefined; c3 = undefined; clc = darkerGreen; sc = darkerGreen; nc = darkerGreen;
            } else if (kitIdx === 2) {
                c1 = '#a3e635'; c2 = undefined; c3 = undefined; clc = darkerGreen; sc = darkerGreen; nc = darkerGreen;
            }
        } else if (isSantosSP) {
            if (kitIdx === 0) {
                c1 = 'white'; c2 = undefined; c3 = undefined; nc = 'black'; clc = 'black'; noc = undefined;
            } else if (kitIdx === 1) {
                c1 = 'white'; c2 = 'black'; c3 = undefined; nc = 'white'; clc = 'black'; noc = 'black';
            } else if (kitIdx === 2) {
                c1 = 'black'; c2 = undefined; c3 = undefined; clc = 'white'; nc = 'white'; noc = undefined;
            }
        } else if (isBotafogoRJ) {
            if (kitIdx === 0) {
                c1 = 'black'; c2 = 'white'; c3 = undefined; nc = 'white'; clc = 'white'; noc = 'black';
            } else if (kitIdx === 1) {
                c1 = 'black'; c2 = undefined; c3 = undefined; clc = 'white'; nc = 'white'; noc = undefined;
            } else if (kitIdx === 2) {
                c1 = 'white'; c2 = undefined; c3 = undefined; clc = 'black'; nc = 'black'; noc = undefined;
            }
        } else if (isVascoRJ) {
            if (kitIdx === 0) {
                c1 = 'black'; c2 = 'white'; c3 = undefined; diagonal = true; nc = 'white'; clc = 'white'; noc = 'transparent';
            } else if (kitIdx === 1) {
                c1 = 'white'; c2 = 'black'; c3 = undefined; diagonal = true; nc = 'red'; clc = 'black'; noc = 'white';
            } else if (kitIdx === 2) {
                c1 = 'black'; c2 = undefined; c3 = undefined; clc = 'white'; nc = '#d4af37'; noc = 'black';
            }
        } else if (isInternacionalRS) {
            if (kitIdx === 0) {
                c1 = '#ef4444'; c2 = undefined; c3 = undefined; clc = 'white'; sc = 'white'; nc = 'white'; noc = 'transparent';
            } else if (kitIdx === 1) {
                c1 = 'white'; c2 = undefined; c3 = undefined; clc = '#ef4444'; sc = '#ef4444'; nc = '#ef4444'; noc = 'transparent';
            } else if (kitIdx === 2) {
                c1 = '#ef4444'; c2 = undefined; c3 = undefined; clc = 'white'; nc = '#1d4ed8'; noc = 'white';
            }
        } else if (isAtleticoPR) {
            if (kitIdx === 0) {
                c1 = 'black'; c2 = '#ef4444'; c3 = undefined; multipleDiagonals = true; sc = 'black'; nc = 'white'; noc = 'transparent';
            } else if (kitIdx === 1) {
                c1 = 'white'; c2 = undefined; c3 = undefined; clc = 'black'; nc = '#ef4444'; noc = 'white';
            } else if (kitIdx === 2) {
                c1 = 'black'; c2 = '#ef4444'; c3 = undefined; nc = 'white'; clc = 'white';
            }
        } else if (isVitoriaBA) {
            if (kitIdx === 0) {
                c1 = 'black'; c2 = '#ef4444'; c3 = undefined; nc = 'white';
            } else if (kitIdx === 1) {
                c1 = 'white'; c2 = undefined; c3 = undefined; clc = 'black'; nc = 'black';
            } else if (kitIdx === 2) {
                c1 = 'black'; c2 = '#ef4444'; c3 = undefined; horizontal = true; sc = 'black'; nc = 'white';
            }
        } else if (isAtleticoGO) {
            if (kitIdx === 0) {
                c1 = 'black'; c2 = '#ef4444'; c3 = undefined; nc = 'white'; clc = 'white';
            } else if (kitIdx === 1) {
                c1 = 'white'; c2 = 'black'; c3 = '#ef4444'; diagonal = true; dualDiagonal = true; nc = 'white';
            } else if (kitIdx === 2) {
                c1 = 'black'; c2 = '#ef4444'; c3 = undefined; diagonal = true; nc = 'white'; noc = 'transparent';
            }
        } else if (isBahiaBA) {
            if (kitIdx === 1) {
                c1 = 'white'; c2 = '#ef4444'; c3 = '#1d4ed8'; centerVerticalStripes = true; clc = '#1d4ed8'; nc = 'white'; noc = 'transparent';
            } else if (kitIdx === 2) {
                c1 = '#bae6fd'; c2 = undefined; c3 = undefined; clc = '#1d4ed8'; nc = '#ef4444'; noc = 'white';
            }
        } else if (isCruzeiroMG) {
            if (kitIdx === 0) {
                c1 = '#1d4ed8'; c2 = undefined; c3 = undefined; clc = 'white'; nc = 'white'; noc = undefined;
            } else if (kitIdx === 1) {
                c1 = 'white'; c2 = undefined; c3 = undefined; clc = '#1d4ed8'; nc = '#1d4ed8'; noc = undefined;
            } else if (kitIdx === 2) {
                c1 = '#15803d'; c2 = undefined; c3 = undefined; clc = 'white'; nc = 'white'; noc = undefined;
            }
        } else if (isBragantinoSP) {
            if (kitIdx === 0) {
                c1 = 'black'; c2 = '#ef4444'; c3 = undefined; gradient = true; clc = '#ef4444'; nc = 'white'; noc = undefined;
            } else if (kitIdx === 1) {
                c1 = 'white'; c2 = undefined; c3 = undefined; clc = '#ef4444'; nc = '#ef4444'; noc = undefined;
            } else if (kitIdx === 2) {
                c1 = '#1d4ed8'; c2 = undefined; c3 = undefined; clc = '#ef4444'; nc = '#ef4444'; noc = 'white';
            }
        } else if (isSaoPauloSP) {
            if (kitIdx === 1) {
                c1 = 'white'; c2 = '#ef4444'; c3 = 'black'; spfcStripes = true; nc = 'black'; noc = 'white'; clc = 'white';
            } else if (kitIdx === 2) {
                c1 = 'black'; c2 = '#ef4444'; c3 = 'white'; spfcStripes = true; nc = 'white'; noc = 'black'; clc = 'black';
            }
        } else if (isAtleticoMG) {
            if (kitIdx === 0) {
                c1 = 'white'; c2 = 'black'; c3 = undefined; sc = 'black'; clc = 'white'; nc = 'white'; noc = 'black';
            } else if (kitIdx === 1) {
                c1 = 'black'; c2 = undefined; c3 = undefined; clc = '#d4af37'; nc = '#d4af37'; noc = undefined;
            } else if (kitIdx === 2) {
                c1 = 'white'; c2 = undefined; c3 = undefined; clc = 'black'; nc = 'black'; noc = undefined;
            }
        } else if (isFlamengoRJ) {
            if (kitIdx === 0) {
                c1 = 'black'; c2 = '#ef4444'; c3 = undefined; sc = 'black'; horizontal = true; clc = 'black'; nc = 'white'; noc = undefined;
            } else if (kitIdx === 1) {
                c1 = 'white'; c2 = undefined; c3 = undefined; sc = '#ef4444'; clc = 'white'; nc = 'black'; noc = undefined;
            } else if (kitIdx === 2) {
                c1 = 'black'; c2 = undefined; c3 = undefined; clc = '#ef4444'; nc = 'white'; noc = undefined;
            }
        } else if (isCriciumaSC) {
            if (kitIdx === 0) {
                c1 = '#facc15'; c2 = 'black'; c3 = 'white'; criciumaStripes = true; sc = '#facc15'; clc = 'black'; nc = 'white'; noc = 'black';
            } else if (kitIdx === 1) {
                c1 = 'black'; c2 = undefined; c3 = undefined; clc = '#facc15'; nc = '#facc15'; noc = undefined;
            } else if (kitIdx === 2) {
                c1 = 'white'; c2 = undefined; c3 = undefined; clc = 'black'; nc = 'black'; noc = undefined;
            }
        } else if (isFluminense || isGremio) {
            if (kitIdx === 0) {
                c1 = isFluminense ? '#831d1c' : gremioBlue;
                c2 = 'white';
                c3 = isFluminense ? darkerGreen : 'black';
                nc = 'white';
                clc = 'white';
            } else if (isFluminense && kitIdx === 1) {
                c1 = 'white'; c2 = undefined; c3 = undefined; nc = '#831d1c'; clc = darkerGreen;
            } else if (isFluminense && kitIdx === 2) {
                c1 = '#831d1c'; c2 = undefined; c3 = undefined; nc = '#D4AF37'; clc = '#D4AF37';
            } else if (isGremio && kitIdx === 1) {
                c1 = gremioBlue; c2 = undefined; c3 = undefined; nc = 'black'; noc = 'white'; clc = 'black';
            } else if (isGremio && kitIdx === 2) {
                c1 = '#4b0082'; c2 = undefined; c3 = undefined; nc = '#D4AF37'; clc = 'black';
            }
        }
    }

    if (!c1) {
        c1 = team.color1 || '#ffffff';
        if (team.shirtPattern) {
            c2 = team.color2;
            c3 = team.color3;
            if (team.shirtPattern === 'stripes') { c2 = c2 || 'black'; }
            if (team.shirtPattern === 'horizontal') { horizontal = true; c2 = c2 || 'black'; }
            if (team.shirtPattern === 'diagonal') { diagonal = true; c2 = c2 || 'black'; }
        } else if (kitIdx === 1) {
            c1 = 'white';
            clc = team.color1 || 'black';
        } else if (kitIdx === 2) {
            c1 = 'black';
            clc = team.color1 || 'white';
        }
    }

    return { c1, c2, c3, sc, nc, clc, noc, diagonal, horizontal, multipleDiagonals, dualDiagonal, centerVerticalStripes, gradient, spfcStripes, criciumaStripes };
}

function getGKKitDetails(team, fieldKitIdx, gkKitIdx) {
    if (team.name === 'Vasco-RJ') {
        return { c1: '#ff8c00', c2: undefined, c3: undefined, nc: 'black', noc: 'white', clc: 'black', diagonal: false };
    }
    if (team.name === 'Flamengo-RJ') {
        return { c1: '#fcd34d', c2: undefined, c3: undefined, nc: 'black', noc: 'transparent', clc: 'black' };
    }
    return { c1: '#22c55e', c2: undefined, c3: undefined, nc: 'white', noc: 'transparent', clc: 'white' };
}

const updatedTeams = teams.map(team => {
    const getPattern = (details) => {
        if (details.spfcStripes) return 'spfcStripes';
        if (details.criciumaStripes) return 'criciumaStripes';
        if (details.gradient) return 'gradient';
        if (details.centerVerticalStripes) return 'centerVerticalStripes';
        if (details.dualDiagonal) return 'dualDiagonal';
        if (details.multipleDiagonals) return 'multipleDiagonals';
        if (details.diagonal) return 'diagonal';
        if (details.horizontal) return 'horizontal';
        if (details.c2 && !details.spfcStripes && !details.criciumaStripes && !details.gradient && !details.centerVerticalStripes && !details.dualDiagonal && !details.multipleDiagonals && !details.diagonal && !details.horizontal) {
            return 'stripes';
        }
        return 'solid';
    };

    const mapDetailsToKit = (details) => ({
        pattern: getPattern(details),
        color1: details.c1 || '#ffffff',
        color2: details.c2 || '',
        color3: details.c3 || ''
    });

    const homeDetails = getKitDetails(team, 0);
    const awayDetails = getKitDetails(team, 1);
    const thirdDetails = getKitDetails(team, 2);
    const gkDetails = getGKKitDetails(team, 0, 0);

    return {
        ...team,
        homeKit: team.homeKit || mapDetailsToKit(homeDetails),
        awayKit: team.awayKit || mapDetailsToKit(awayDetails),
        thirdKit: team.thirdKit || mapDetailsToKit(thirdDetails),
        gkKit: team.gkKit || mapDetailsToKit(gkDetails)
    };
});

dbContent = dbContent.replace(match[0], 'export const REAL_TEAMS_JSON = ' + JSON.stringify(updatedTeams, null, 4) + ';');
fs.writeFileSync('./textSim/realDatabase.ts', dbContent, 'utf-8');
console.log('Successfully updated database with kits!');

