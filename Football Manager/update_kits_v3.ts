import fs from 'fs';
import { REAL_TEAMS_JSON } from './textSim/realDatabase';
import { getKitDetails, getGKKitDetails } from './types';

const updatedTeams = REAL_TEAMS_JSON.map(team => {
    const getPattern = (details: any) => {
        if (details.spfcStripes) return 'spfcStripes';
        if (details.criciumaStripes) return 'criciumaStripes';
        if (details.gradient) return 'gradient';
        if (details.centerVerticalStripes) return 'centerVerticalStripes';
        if (details.dualDiagonal) return 'dualDiagonal';
        if (details.multipleDiagonals) return 'multipleDiagonals';
        if (details.diagonal) return 'diagonal';
        if (details.horizontal) return 'horizontal';
        if (details.c3) return 'triStripes';
        if (details.c2) return 'stripes';
        return 'solid';
    };

    const mapDetailsToKit = (details: any) => ({
        pattern: getPattern(details),
        color1: details.c1 || '#ffffff',
        color2: details.c2 || '',
        color3: details.c3 || '',
        numberColor: details.nc || '',
        numberOutlineColor: details.noc || '',
        collarColor: details.clc || '',
        sleeveColor: details.sc || ''
    });

    // Compat layer for getKitDetails which uses team.name instead of team.teamName
    const compatTeam = { 
        ...team, 
        name: team.teamName,
        primaryColor: team.color, 
        secondaryColor: team.color2, 
        tertiaryColor: team.color3 
    };

    const homeDetails = getKitDetails(compatTeam as any, 0);
    const awayDetails = getKitDetails(compatTeam as any, 1);
    const thirdDetails = getKitDetails(compatTeam as any, 2);
    const gkDetails = getGKKitDetails(compatTeam as any, 0, 0);

    return {
        ...team,
        homeKit: mapDetailsToKit(homeDetails),
        awayKit: mapDetailsToKit(awayDetails),
        thirdKit: mapDetailsToKit(thirdDetails),
        gkKit: mapDetailsToKit(gkDetails)
    };
});

let dbContent = fs.readFileSync('./textSim/realDatabase.ts', 'utf-8');
const regex = /export const REAL_TEAMS_JSON = \[[\s\S]*?\];/;
const match = dbContent.match(regex);

if (match) {
    dbContent = dbContent.replace(match[0], 'export const REAL_TEAMS_JSON = ' + JSON.stringify(updatedTeams, null, 4) + ';');
    fs.writeFileSync('./textSim/realDatabase.ts', dbContent, 'utf-8');
    console.log('Successfully updated database with kits using getKitDetails!');
} else {
    console.log('Failed to match REAL_TEAMS_JSON');
}
