import * as THREE from 'three';

interface SpectatorData {
  pos: THREE.Vector3;
  rotY: number;
  shirtColor: string;
  hairColor: number;
}

interface SeatData {
  pos: THREE.Vector3;
  rotY: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

export function generateStadium(scene: THREE.Scene, homeTeam: any) {
  // Determine stadium type based on name or property
  let stadiumType = 'generic';
  const name = (homeTeam?.teamStadiumName || "").toLowerCase();

  if (homeTeam?.stadiumType) {
    stadiumType = homeTeam.stadiumType;
  } else if (name.includes('maracanã') || name.includes('mineirão') || name.includes('castelão') || name.includes('beira-rio') || name.includes('serra dourada')) {
    stadiumType = 'olympic';
  } else if (name.includes('allianz') || name.includes('corinthians') || name.includes('mrv') || name.includes('grêmio') || name.includes('morumbi') || name.includes('arena')) {
    stadiumType = 'modern';
  } else if (name.includes('são januário') || name.includes('vila belmiro') || name.includes('couto pereira')) {
    stadiumType = 'classic';
  }

  const stadiumGroup = new THREE.Group();
  stadiumGroup.name = "stadium";

  // Base materials
  const concreteMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d }); // Grey concrete
  const seatColor = homeTeam?.primaryColor ? new THREE.Color(homeTeam.primaryColor) : new THREE.Color('#3b82f6');
  const seatMat = new THREE.MeshLambertMaterial({ color: seatColor });

  // Field play area is 106x68. With 5m margins, it is 116x78.
  // Center is 0,0,0, so margins boundaries are X: [-58, 58] and Z: [-39, 39]
  const boundaryX = 58;
  const boundaryZ = 39;

  const spectatorList: SpectatorData[] = [];
  const seatList: SeatData[] = [];

  if (stadiumType === 'classic') {
    generateClassicStadium(stadiumGroup, concreteMat, seatMat, boundaryX, boundaryZ, homeTeam, spectatorList, seatList);
  } else if (stadiumType === 'olympic') {
    generateOlympicStadium(stadiumGroup, concreteMat, seatMat, homeTeam, spectatorList, seatList);
  } else if (stadiumType === 'modern') {
    generateModernStadium(stadiumGroup, concreteMat, seatMat, homeTeam, spectatorList, seatList);
  } else {
    generateGenericStadium(stadiumGroup, concreteMat, seatMat, boundaryX, boundaryZ, homeTeam, spectatorList, seatList);
  }

  // Build instanced seats and spectators
  buildInstancedSeats(stadiumGroup, seatMat, seatList);
  buildInstancedSpectators(stadiumGroup, spectatorList, homeTeam);

  // Scoreboard/Welcome Sign was removed

  scene.add(stadiumGroup);
}

// ==========================================
// 1. GENERIC STADIUM (10 continuous tiers)
// ==========================================
function generateGenericStadium(
  group: THREE.Group,
  concreteMat: THREE.Material,
  seatMat: THREE.Material,
  boundaryX: number,
  boundaryZ: number,
  homeTeam: any,
  spectatorList: SpectatorData[],
  seatList: SeatData[]
) {
  const stepDepth = 1.4;
  const stepHeight = 0.7;
  const numTiers = 10;
  const r = 7.0; // corner gap

  const baseA = boundaryX + 2;
  const baseB = boundaryZ + 2;

  function generateStraightStandSection(
    xStart: number,
    zStart: number,
    xEnd: number,
    zEnd: number,
    yPos: number,
    standHeight: number,
    rotY: number
  ) {
    const xDiff = xEnd - xStart;
    const zDiff = zEnd - zStart;
    const len = Math.sqrt(xDiff * xDiff + zDiff * zDiff);

    const step = 1.4;
    const numSteps = Math.max(1, Math.round(len / step));

    for (let i = 0; i < numSteps; i++) {
      const t = (i + 0.5) / numSteps;
      const x = xStart + xDiff * t;
      const z = zStart + zDiff * t;
      const actualStep = len / numSteps;

      const segGeo = new THREE.BoxGeometry(actualStep, standHeight, stepDepth);
      const standMesh = new THREE.Mesh(segGeo, concreteMat);
      standMesh.position.set(x, yPos, z);
      standMesh.rotation.set(0, rotY, 0);
      standMesh.receiveShadow = true;
      standMesh.castShadow = true;
      group.add(standMesh);

      // Seats on top
      const seatX = x + 0.15 * Math.sin(rotY);
      const seatZ = z + 0.15 * Math.cos(rotY);
      const seatY = yPos + standHeight / 2 + 0.1;

      seatList.push({
        pos: new THREE.Vector3(seatX, seatY, seatZ),
        rotY: rotY,
        scaleX: actualStep - 0.25,
        scaleY: 0.2,
        scaleZ: stepDepth * 0.7
      });

      // Spawn Spectator
      if (Math.random() < 0.35) {
        const color = getSpectatorColor(homeTeam);
        const hairColor = [0x1a1a1a, 0x5c4033, 0x8b5a2b, 0xd2b48c][Math.floor(Math.random() * 4)];
        spectatorList.push({
          pos: new THREE.Vector3(seatX, seatY + 0.05, seatZ),
          rotY: rotY,
          shirtColor: color,
          hairColor: hairColor
        });
      }
    }
  }

  const limitX = baseA - r;
  const limitZ = baseB - r;

  for (let t = 0; t < numTiers; t++) {
    const a = baseA + t * stepDepth;
    const b = baseB + t * stepDepth;
    const yPos = t * stepHeight + stepHeight / 2;
    const standHeight = stepHeight;

    // 1. Bottom stand (parallel to X, runs along z = -b)
    generateStraightStandSection(limitX, -b, -limitX, -b, yPos, standHeight, 0);

    // 2. Left stand (parallel to Z, runs along x = -a)
    generateStraightStandSection(-a, -limitZ, -a, limitZ, yPos, standHeight, Math.PI / 2);

    // 3. Top stand (parallel to X, runs along z = b)
    generateStraightStandSection(-limitX, b, limitX, b, yPos, standHeight, Math.PI);

    // 4. Right stand (parallel to Z, runs along x = a)
    generateStraightStandSection(a, limitZ, a, -limitZ, yPos, standHeight, -Math.PI / 2);
  }
}

// ==========================================
// 2. CLASSIC STADIUM (Corner gaps, main stand roof, tier differences)
// ==========================================
function generateClassicStadium(
  group: THREE.Group,
  concreteMat: THREE.Material,
  seatMat: THREE.Material,
  boundaryX: number,
  boundaryZ: number,
  homeTeam: any,
  spectatorList: SpectatorData[],
  seatList: SeatData[]
) {
  const stepDepth = 1.4;
  const stepHeight = 0.7;

  // Gaps at corners of length 6 meters
  const cornerGap = 6.0;

  // East/West Stands: 12 tiers (tall sides)
  const tiersSides = 12;
  const sideLengthZ = (boundaryZ * 2) - cornerGap * 2;

  for (let t = 0; t < tiersSides; t++) {
    const currentDistX = boundaryX + t * stepDepth;
    const yPos = t * stepHeight + stepHeight / 2;
    const standHeight = stepHeight;

    // East Stand
    const eGeo = new THREE.BoxGeometry(stepDepth, standHeight, sideLengthZ);
    const eMesh = new THREE.Mesh(eGeo, concreteMat);
    eMesh.position.set(currentDistX + stepDepth / 2, yPos, 0);
    eMesh.receiveShadow = true;
    eMesh.castShadow = true;
    group.add(eMesh);

    seatList.push({
      pos: new THREE.Vector3(currentDistX + stepDepth / 2 + 0.1, yPos + standHeight / 2 + 0.1, 0),
      rotY: -Math.PI / 2,
      scaleX: sideLengthZ - 0.4,
      scaleY: 0.2,
      scaleZ: stepDepth * 0.7
    });

    spawnSpectatorsOnLinearStand(spectatorList, homeTeam, 'east', currentDistX, -sideLengthZ / 2, sideLengthZ / 2, yPos, standHeight, stepDepth);

    // West Stand
    const wMesh = new THREE.Mesh(eGeo, concreteMat);
    wMesh.position.set(-(currentDistX + stepDepth / 2), yPos, 0);
    wMesh.receiveShadow = true;
    wMesh.castShadow = true;
    group.add(wMesh);

    seatList.push({
      pos: new THREE.Vector3(-(currentDistX + stepDepth / 2 + 0.1), yPos + standHeight / 2 + 0.1, 0),
      rotY: Math.PI / 2,
      scaleX: sideLengthZ - 0.4,
      scaleY: 0.2,
      scaleZ: stepDepth * 0.7
    });

    spawnSpectatorsOnLinearStand(spectatorList, homeTeam, 'west', currentDistX, -sideLengthZ / 2, sideLengthZ / 2, yPos, standHeight, stepDepth);
  }

  // North/South Stands: 8 tiers (shorter ends)
  const tiersEnds = 8;
  const endLengthX = (boundaryX * 2) - cornerGap * 2;

  for (let t = 0; t < tiersEnds; t++) {
    const currentDistZ = boundaryZ + t * stepDepth;
    const yPos = t * stepHeight + stepHeight / 2;
    const standHeight = stepHeight;

    // North Stand
    const nGeo = new THREE.BoxGeometry(endLengthX, standHeight, stepDepth);
    const nMesh = new THREE.Mesh(nGeo, concreteMat);
    nMesh.position.set(0, yPos, currentDistZ + stepDepth / 2);
    nMesh.receiveShadow = true;
    nMesh.castShadow = true;
    group.add(nMesh);

    seatList.push({
      pos: new THREE.Vector3(0, yPos + standHeight / 2 + 0.1, currentDistZ + stepDepth / 2 - 0.1),
      rotY: Math.PI,
      scaleX: endLengthX - 0.4,
      scaleY: 0.2,
      scaleZ: stepDepth * 0.7
    });

    spawnSpectatorsOnLinearStand(spectatorList, homeTeam, 'north', currentDistZ, -endLengthX / 2, endLengthX / 2, yPos, standHeight, stepDepth);

    // South Stand (Main Stand)
    const sMesh = new THREE.Mesh(nGeo, concreteMat);
    sMesh.position.set(0, yPos, -(currentDistZ + stepDepth / 2));
    sMesh.receiveShadow = true;
    sMesh.castShadow = true;
    group.add(sMesh);

    seatList.push({
      pos: new THREE.Vector3(0, yPos + standHeight / 2 + 0.1, -(currentDistZ + stepDepth / 2 - 0.1)),
      rotY: 0,
      scaleX: endLengthX - 0.4,
      scaleY: 0.2,
      scaleZ: stepDepth * 0.7
    });

    spawnSpectatorsOnLinearStand(spectatorList, homeTeam, 'south', currentDistZ, -endLengthX / 2, endLengthX / 2, yPos, standHeight, stepDepth);
  }

  // Add a Classic Roof over the South Stand (Main Stand)
  const maxZ = boundaryZ + tiersEnds * stepDepth;
  const roofHeightY = tiersEnds * stepHeight + 4.5;
  const roofWidth = endLengthX + 4;
  const roofDepth = tiersEnds * stepDepth + 5;
  const roofGeo = new THREE.BoxGeometry(roofWidth, 0.2, roofDepth);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x475569 }); // dark slate grey roof
  const roofMesh = new THREE.Mesh(roofGeo, roofMat);

  // Angle it slightly down towards the pitch
  roofMesh.rotation.x = 0.08;
  roofMesh.position.set(0, roofHeightY, -(maxZ - roofDepth / 2 + 2));
  roofMesh.castShadow = true;
  group.add(roofMesh);

  // Pillars for the roof
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
  const pillarGeo = new THREE.CylinderGeometry(0.15, 0.15, roofHeightY);

  // Support pillars at the back corners of the South Stand
  const pL = new THREE.Mesh(pillarGeo, pillarMat);
  pL.position.set(-roofWidth / 2 + 1, roofHeightY / 2, -(maxZ + 0.5));
  group.add(pL);

  const pR = new THREE.Mesh(pillarGeo, pillarMat);
  pR.position.set(roofWidth / 2 - 1, roofHeightY / 2, -(maxZ + 0.5));
  group.add(pR);
}

// ==========================================
// 3. OLYMPIC STADIUM (Oval stands & running track)
// ==========================================
function generateOlympicStadium(
  group: THREE.Group,
  concreteMat: THREE.Material,
  seatMat: THREE.Material,
  homeTeam: any,
  spectatorList: SpectatorData[],
  seatList: SeatData[]
) {
  // Running track plane
  const trackGeo = new THREE.PlaneGeometry(145, 105);
  const trackMat = new THREE.MeshLambertMaterial({ color: 0xab533d }); // Brick red running track color
  const trackMesh = new THREE.Mesh(trackGeo, trackMat);
  trackMesh.rotation.x = -Math.PI / 2;
  trackMesh.position.set(0, 0.005, 0); // Just above 0, below pitch (0.01) and players
  trackMesh.receiveShadow = true;
  group.add(trackMesh);

  // Oval track lines (concentric white rings drawn on track)
  const laneMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let l = 0; l < 4; l++) {
    const ringRadius = 55 + l * 2;
    const ringGeo = new THREE.TorusGeometry(ringRadius, 0.03, 8, 64);
    const ringMesh = new THREE.Mesh(ringGeo, laneMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.scale.set(1.15, 0.78, 1); // Scale it to make it an ellipse
    ringMesh.position.set(0, 0.01, 0);
    group.add(ringMesh);
  }

  // Oval Stands setup
  const baseA = 66;
  const baseB = 46;
  const stepDepth = 1.4;
  const stepHeight = 0.7;
  const numTiers = 10;
  const numSegments = 72;

  for (let t = 0; t < numTiers; t++) {
    const a = baseA + t * stepDepth;
    const b = baseB + t * stepDepth;
    const yPos = t * stepHeight + stepHeight / 2;
    const standHeight = stepHeight;

    const perimeter = 2 * Math.PI * Math.sqrt((a * a + b * b) / 2);
    const segWidth = (perimeter / numSegments) + 0.15;

    const segGeo = new THREE.BoxGeometry(segWidth, standHeight, stepDepth);

    for (let s = 0; s < numSegments; s++) {
      const theta = (s / numSegments) * Math.PI * 2;
      const x = a * Math.cos(theta);
      const z = b * Math.sin(theta);

      const standMesh = new THREE.Mesh(segGeo, concreteMat);
      standMesh.position.set(x, yPos, z);
      standMesh.lookAt(0, yPos, 0);
      standMesh.receiveShadow = true;
      standMesh.castShadow = true;
      group.add(standMesh);

      // Seats on top
      const seatX = (a - 0.1) * Math.cos(theta);
      const seatZ = (b - 0.1) * Math.sin(theta);
      const seatY = yPos + standHeight / 2 + 0.1;

      seatList.push({
        pos: new THREE.Vector3(seatX, seatY, seatZ),
        rotY: Math.atan2(seatX, seatZ) + Math.PI,
        scaleX: segWidth - 0.2,
        scaleY: 0.2,
        scaleZ: stepDepth * 0.7
      });

      // Spawn Spectator
      if (Math.random() < 0.35) {
        const color = getSpectatorColor(homeTeam);
        const hairColor = [0x1a1a1a, 0x5c4033, 0x8b5a2b, 0xd2b48c][Math.floor(Math.random() * 4)];
        spectatorList.push({
          pos: new THREE.Vector3(seatX, seatY + 0.05, seatZ),
          rotY: Math.atan2(seatX, seatZ) + Math.PI,
          shirtColor: color,
          hairColor: hairColor
        });
      }
    }
  }
}

// ==========================================
// 4. MODERN ARENA (Continuous super-ellipse, ring roof, neon glow)
// ==========================================
function generateModernStadium(
  group: THREE.Group,
  concreteMat: THREE.Material,
  seatMat: THREE.Material,
  homeTeam: any,
  spectatorList: SpectatorData[],
  seatList: SeatData[]
) {
  const baseA = 59;
  const baseB = 40;
  const n = 4.0;
  const numTiers = 12;
  const stepDepth = 1.4;
  const stepHeight = 0.7;
  const numSegments = 72;

  for (let t = 0; t < numTiers; t++) {
    const a = baseA + t * stepDepth;
    const b = baseB + t * stepDepth;
    const yPos = t * stepHeight + stepHeight / 2;
    const standHeight = stepHeight;

    for (let s = 0; s < numSegments; s++) {
      const theta = (s / numSegments) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      const r = 1.0 / Math.pow(Math.pow(Math.abs(cos / a), n) + Math.pow(Math.abs(sin / b), n), 1 / n);
      const x = r * cos;
      const z = r * sin;

      const segWidth = ((2 * Math.PI * r) / numSegments) + 0.2;

      const segGeo = new THREE.BoxGeometry(segWidth, standHeight, stepDepth);
      const standMesh = new THREE.Mesh(segGeo, concreteMat);
      standMesh.position.set(x, yPos, z);
      standMesh.lookAt(0, yPos, 0);
      standMesh.receiveShadow = true;
      standMesh.castShadow = true;
      group.add(standMesh);

      // Seats on top
      const rSeat = r - 0.1;
      const seatX = rSeat * cos;
      const seatZ = rSeat * sin;
      const seatY = yPos + standHeight / 2 + 0.1;

      seatList.push({
        pos: new THREE.Vector3(seatX, seatY, seatZ),
        rotY: Math.atan2(seatX, seatZ) + Math.PI,
        scaleX: segWidth - 0.25,
        scaleY: 0.2,
        scaleZ: stepDepth * 0.7
      });

      // Spawn Spectator
      if (Math.random() < 0.35) {
        const color = getSpectatorColor(homeTeam);
        const hairColor = [0x1a1a1a, 0x5c4033, 0x8b5a2b, 0xd2b48c][Math.floor(Math.random() * 4)];
        spectatorList.push({
          pos: new THREE.Vector3(seatX, seatY + 0.05, seatZ),
          rotY: Math.atan2(seatX, seatZ) + Math.PI,
          shirtColor: color,
          hairColor: hairColor
        });
      }
    }
  }

  // Modern overhead ring roof
  const roofHeightY = numTiers * stepHeight + 5.0;
  const roofA = baseA + numTiers * stepDepth + 2.0;
  const roofB = baseB + numTiers * stepDepth + 2.0;

  const roofMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.4,
    roughness: 0.1,
    transmission: 0.6,
    thickness: 0.5
  });

  const neonMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

  for (let s = 0; s < numSegments; s++) {
    const theta = (s / numSegments) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    const rOuter = 1.0 / Math.pow(Math.pow(Math.abs(cos / roofA), n) + Math.pow(Math.abs(sin / roofB), n), 1 / n);

    const roofPanelDepth = 12;
    const rCenter = rOuter - roofPanelDepth / 2;
    const x = rCenter * cos;
    const z = rCenter * sin;

    const panelWidth = ((2 * Math.PI * rCenter) / numSegments) + 0.2;

    const panelGeo = new THREE.BoxGeometry(panelWidth, 0.15, roofPanelDepth);
    const panelMesh = new THREE.Mesh(panelGeo, s % 4 === 0 ? glassMat : roofMat);
    panelMesh.position.set(x, roofHeightY, z);
    panelMesh.lookAt(0, roofHeightY, 0);
    panelMesh.castShadow = true;
    group.add(panelMesh);

    const rInner = rOuter - roofPanelDepth;
    const neonGeo = new THREE.BoxGeometry(panelWidth * 0.98, 0.1, 0.1);
    const neonMesh = new THREE.Mesh(neonGeo, neonMat);
    neonMesh.position.set(rInner * cos, roofHeightY - 0.1, rInner * sin);
    neonMesh.lookAt(0, roofHeightY - 0.1, 0);
    group.add(neonMesh);

    if (s % 6 === 0) {
      const pillarHeight = roofHeightY;
      const pillarGeo = new THREE.CylinderGeometry(0.2, 0.35, pillarHeight);
      const pillarMesh = new THREE.Mesh(pillarGeo, concreteMat);
      pillarMesh.position.set((rOuter + 0.5) * cos, pillarHeight / 2, (rOuter + 0.5) * sin);
      pillarMesh.lookAt((rOuter + 4) * cos, pillarHeight / 2, (rOuter + 4) * sin);
      pillarMesh.rotateX(Math.PI / 2);
      pillarMesh.castShadow = true;
      group.add(pillarMesh);
    }
  }
}

// ==========================================
// CORE SCOREBOARD / WELCOME SIGN
// ==========================================
function createScoreboard(
  group: THREE.Group,
  homeTeam: any,
  boundaryX: number,
  boundaryZ: number,
  stadiumType: string
) {
  const stadiumName = homeTeam?.teamStadiumName || "Estádio Municipal";

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 504, 120);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("BEM-VINDO AO", 256, 45);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stadiumName.toUpperCase(), 256, 95);
  }

  const signTex = new THREE.CanvasTexture(canvas);
  const signMat = new THREE.MeshBasicMaterial({ map: signTex });
  const signGeo = new THREE.BoxGeometry(24, 6, 0.5);
  const signMesh = new THREE.Mesh(signGeo, signMat);

  let finalDistZ = boundaryZ + 10 * 1.4 + 2;
  let finalHeightY = 10 * 0.7 + 5;

  if (stadiumType === 'olympic') {
    finalDistZ = 46 + 10 * 1.4 + 2;
    finalHeightY = 10 * 0.7 + 5;
  } else if (stadiumType === 'modern') {
    finalDistZ = 40 + 12 * 1.4 + 2;
    finalHeightY = 12 * 0.7 + 6;
  } else if (stadiumType === 'classic') {
    finalDistZ = boundaryZ + 8 * 1.4 + 2;
    finalHeightY = 8 * 0.7 + 5;
  }

  signMesh.position.set(0, finalHeightY, finalDistZ);
  group.add(signMesh);

  const pillarMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, finalHeightY), pillarMat);
  pL.position.set(-8, finalHeightY / 2, finalDistZ);
  group.add(pL);

  const pR = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, finalHeightY), pillarMat);
  pR.position.set(8, finalHeightY / 2, finalDistZ);
  group.add(pR);
}

// ==========================================
// SPECTATOR CROWD CREATION HELPERS
// ==========================================
function getSpectatorColor(homeTeam: any) {
  const primaryColor = homeTeam?.primaryColor || '#3b82f6';
  const secondaryColor = homeTeam?.secondaryColor || '#ffffff';
  const rand = Math.random();
  if (rand < 0.5) return primaryColor;
  if (rand < 0.75) return secondaryColor;
  return ['#ffffff', '#94a3b8', '#334155', '#475569'][Math.floor(Math.random() * 4)];
}

function spawnSpectatorsOnLinearStand(
  spectatorList: SpectatorData[],
  homeTeam: any,
  type: 'east' | 'west' | 'north' | 'south',
  currentDist: number,
  lengthStart: number,
  lengthEnd: number,
  yPos: number,
  standHeight: number,
  stepDepth: number
) {
  const step = 1.2;
  const fillProbability = 0.35;
  const seatY = yPos + standHeight / 2 + 0.05;

  for (let pos = lengthStart + 1.0; pos <= lengthEnd - 1.0; pos += step) {
    if (Math.random() > fillProbability) continue;

    const shirtColor = getSpectatorColor(homeTeam);
    const hairColor = [0x1a1a1a, 0x5c4033, 0x8b5a2b, 0xd2b48c][Math.floor(Math.random() * 4)];

    let x = 0, z = 0, rotY = 0;

    if (type === 'east') {
      x = currentDist + stepDepth / 2 + 0.05;
      z = pos;
      rotY = -Math.PI / 2;
    } else if (type === 'west') {
      x = -(currentDist + stepDepth / 2 + 0.05);
      z = pos;
      rotY = Math.PI / 2;
    } else if (type === 'north') {
      x = pos;
      z = currentDist + stepDepth / 2 - 0.05;
      rotY = Math.PI;
    } else if (type === 'south') {
      x = pos;
      z = -(currentDist + stepDepth / 2 - 0.05);
      rotY = 0;
    }

    spectatorList.push({
      pos: new THREE.Vector3(x, seatY, z),
      rotY: rotY,
      shirtColor: shirtColor,
      hairColor: hairColor
    });
  }
}

// ==========================================
// INSTANCED RENDERING BUILDERS
// ==========================================
function buildInstancedSeats(
  group: THREE.Group,
  seatMat: THREE.Material,
  seatList: SeatData[]
) {
  const count = seatList.length;
  if (count === 0) return;

  const baseGeo = new THREE.BoxGeometry(1, 1, 1);
  const instancedMesh = new THREE.InstancedMesh(baseGeo, seatMat, count);
  instancedMesh.receiveShadow = true;
  instancedMesh.castShadow = true;

  const dummy = new THREE.Object3D();
  seatList.forEach((seat, i) => {
    dummy.position.copy(seat.pos);
    dummy.rotation.set(0, seat.rotY, 0);
    dummy.scale.set(seat.scaleX, seat.scaleY, seat.scaleZ);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  });

  group.add(instancedMesh);
}

function buildInstancedSpectators(
  group: THREE.Group,
  spectatorList: SpectatorData[],
  homeTeam: any
) {
  const count = spectatorList.length;
  if (count === 0) return;

  // Geometries
  const torsoGeo = new THREE.BoxGeometry(0.35, 0.4, 0.2);
  const headGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const hairGeo = new THREE.BoxGeometry(0.22, 0.08, 0.22);
  const thighGeo = new THREE.BoxGeometry(0.1, 0.1, 0.25);
  const calfGeo = new THREE.BoxGeometry(0.09, 0.25, 0.09);

  // Materials
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xffdbac });
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x2b4c7e }); // jeans

  // Instanced Meshes
  const torsoMesh = new THREE.InstancedMesh(torsoGeo, new THREE.MeshLambertMaterial(), count);
  const headMesh = new THREE.InstancedMesh(headGeo, skinMat, count);
  const hairMesh = new THREE.InstancedMesh(hairGeo, new THREE.MeshLambertMaterial(), count);
  const thighMeshL = new THREE.InstancedMesh(thighGeo, pantsMat, count);
  const thighMeshR = new THREE.InstancedMesh(thighGeo, pantsMat, count);
  const calfMeshL = new THREE.InstancedMesh(calfGeo, skinMat, count);
  const calfMeshR = new THREE.InstancedMesh(calfGeo, skinMat, count);

  // Enable shadows
  torsoMesh.castShadow = true;
  headMesh.castShadow = true;
  thighMeshL.castShadow = true;
  thighMeshR.castShadow = true;

  const dummy = new THREE.Object3D();

  spectatorList.forEach((spec, i) => {
    // 1. Torso
    dummy.position.set(spec.pos.x, spec.pos.y + 0.2, spec.pos.z);
    dummy.rotation.set(0, spec.rotY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    torsoMesh.setMatrixAt(i, dummy.matrix);
    torsoMesh.setColorAt(i, new THREE.Color(spec.shirtColor));

    // 2. Head
    dummy.position.set(spec.pos.x, spec.pos.y + 0.5, spec.pos.z);
    dummy.rotation.set(0, spec.rotY, 0);
    dummy.updateMatrix();
    headMesh.setMatrixAt(i, dummy.matrix);

    // 3. Hair
    const localHairOffset = new THREE.Vector3(0, 0.6, 0.01).applyAxisAngle(new THREE.Vector3(0, 1, 0), spec.rotY);
    dummy.position.set(spec.pos.x + localHairOffset.x, spec.pos.y + localHairOffset.y, spec.pos.z + localHairOffset.z);
    dummy.rotation.set(0, spec.rotY, 0);
    dummy.updateMatrix();
    hairMesh.setMatrixAt(i, dummy.matrix);
    hairMesh.setColorAt(i, new THREE.Color(spec.hairColor));

    // 4. Thighs
    const localThighLOffset = new THREE.Vector3(-0.08, 0.05, 0.1).applyAxisAngle(new THREE.Vector3(0, 1, 0), spec.rotY);
    dummy.position.set(spec.pos.x + localThighLOffset.x, spec.pos.y + localThighLOffset.y, spec.pos.z + localThighLOffset.z);
    dummy.rotation.set(0, spec.rotY, 0);
    dummy.updateMatrix();
    thighMeshL.setMatrixAt(i, dummy.matrix);

    const localThighROffset = new THREE.Vector3(0.08, 0.05, 0.1).applyAxisAngle(new THREE.Vector3(0, 1, 0), spec.rotY);
    dummy.position.set(spec.pos.x + localThighROffset.x, spec.pos.y + localThighROffset.y, spec.pos.z + localThighROffset.z);
    dummy.rotation.set(0, spec.rotY, 0);
    dummy.updateMatrix();
    thighMeshR.setMatrixAt(i, dummy.matrix);

    // 5. Calves
    const localCalfLOffset = new THREE.Vector3(-0.08, -0.075, 0.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), spec.rotY);
    dummy.position.set(spec.pos.x + localCalfLOffset.x, spec.pos.y + localCalfLOffset.y, spec.pos.z + localCalfLOffset.z);
    dummy.rotation.set(0, spec.rotY, 0);
    dummy.updateMatrix();
    calfMeshL.setMatrixAt(i, dummy.matrix);

    const localCalfROffset = new THREE.Vector3(0.08, -0.075, 0.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), spec.rotY);
    dummy.position.set(spec.pos.x + localCalfROffset.x, spec.pos.y + localCalfROffset.y, spec.pos.z + localCalfROffset.z);
    dummy.rotation.set(0, spec.rotY, 0);
    dummy.updateMatrix();
    calfMeshR.setMatrixAt(i, dummy.matrix);
  });

  group.add(torsoMesh);
  group.add(headMesh);
  group.add(hairMesh);
  group.add(thighMeshL);
  group.add(thighMeshR);
  group.add(calfMeshL);
  group.add(calfMeshR);
}
