import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// @ts-ignore
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader';
import { Play } from 'lucide-react';
import { generateStadium } from './StadiumGenerator';
import { getKitDetails, getGKKitDetails, isColorLight } from '../types';

const ACTIONS = [
  { id: 'idle', label: 'Parado (Idle)' },
  { id: 'walk', label: 'Andar' },
  { id: 'jog', label: 'Trote' },
  { id: 'run', label: 'Correr' },
  { id: 'corte_parado', label: 'Corte Parado' },
  { id: 'tackle', label: 'Carrinho' },
  { id: 'header', label: 'Cabeçada Pulando' },
  { id: 'header_standing', label: 'Cabeçada' },
  { id: 'kick', label: 'Chute' },
  { id: 'short_pass_normal', label: 'Passe Curto Normal' },
  { id: 'short_pass_trivela', label: 'Passe Curto Trivela' },
  { id: 'chest_trap', label: 'Matada no Peito' },
  { id: 'gk_dive', label: 'Goleiro - Pulando' },
  { id: 'gk_knees', label: 'Goleiro - Joelhos' },
  { id: 'fall', label: 'Queda' },
  { id: 'get_up', label: 'Levantar' },
  { id: 'throw_in', label: 'Cobrança de Lateral' },
  { id: 'sit', label: 'Sentado (Sit)' }
];

interface Match3DProps {
  mode?: '2d' | '3d';
  visualStateRef?: React.MutableRefObject<any>;
  homeTeam?: any;
  awayTeam?: any;
  players?: any[];
  kitHomeIdx?: number;
  kitAwayIdx?: number;
}

export default function App({ mode = '3d', visualStateRef, homeTeam, awayTeam, players, kitHomeIdx = 0, kitAwayIdx = 1 }: Match3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  const [cameraMode, setCameraMode] = useState<'tv' | 'free' | 'topDown'>('topDown');
  const [zoomFactor, setZoomFactor] = useState(1.0);

  const cameraModeRef = useRef(cameraMode);
  const zoomFactorRef = useRef(zoomFactor);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    zoomFactorRef.current = zoomFactor;
  }, [zoomFactor]);

  const actionRef = useRef('idle');
  const actionStartRef = useRef(performance.now());
  const [activeAction, setActiveAction] = useState('idle');

  // Track previous 2D coordinates to compute speeds
  const prevPlayerPositions = useRef<Map<string, { x: number, y: number }>>(new Map());

  useEffect(() => {
    setCameraMode(mode === '2d' ? 'topDown' : 'tv');
  }, [mode]);

  const setAction = useCallback((actionId: string) => {
    actionRef.current = actionId;
    actionStartRef.current = performance.now();
    setActiveAction(actionId);
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    if (mountRef.current.children.length > 0) {
      mountRef.current.innerHTML = '';
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#87CEEB');

    const width = mountRef.current.clientWidth || window.innerWidth;
    const height = mountRef.current.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 15, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.875, 0);
    controls.maxDistance = 150;
    controls.enableDamping = true;
    controls.enablePan = true; // Allow panning in free mode

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // ==========================================
    // ESTÁDIO
    // ==========================================
    generateStadium(scene, homeTeam);

    // ==========================================
    // CAMPO DE FUTEBOL (com margem de 5m)
    // ==========================================
    function createPitchTexture() {
      const canvas = document.createElement('canvas');
      const scale = 20;
      canvas.width = 116 * scale;  // 106 + 2 * 5
      canvas.height = 78 * scale;  // 68 + 2 * 5
      const ctx = canvas.getContext('2d')!;

      const margin = 5 * scale; // 5 meters margin
      const fW = 106 * scale;
      const fH = 68 * scale;
      const midX = canvas.width / 2;
      const midY = canvas.height / 2;

      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw stripes only inside the play field
      ctx.save();
      ctx.beginPath();
      ctx.rect(margin, margin, fW, fH);
      ctx.clip();

      ctx.fillStyle = '#45a049';
      const stripeW = 5.3 * scale;

      for (let i = 0; i < 11; i++) {
        if (i % 2 === 0) {
          ctx.fillRect(midX + i * stripeW, margin, stripeW, fH);
          ctx.fillRect(midX - (i + 1) * stripeW, margin, stripeW, fH);
        }
      }
      ctx.restore();

      ctx.strokeStyle = '#FFFFFF';
      ctx.fillStyle = '#FFFFFF';
      ctx.lineWidth = 0.15 * scale;

      ctx.beginPath(); ctx.rect(margin, margin, fW, fH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(midX, margin); ctx.lineTo(midX, margin + fH); ctx.stroke();
      ctx.beginPath(); ctx.arc(midX, midY, 9.15 * scale, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(midX, midY, 0.4 * scale, 0, Math.PI * 2); ctx.fill();

      function drawArea(isLeft: boolean) {
        const penW = 16.5 * scale;
        const penH = 40.32 * scale;
        const goalW = 5.5 * scale;
        const goalH = 18.32 * scale;
        const sign = isLeft ? 1 : -1;
        const startX = isLeft ? margin : margin + fW;

        ctx.beginPath(); ctx.rect(isLeft ? startX : startX - penW, midY - penH / 2, penW, penH); ctx.stroke();
        ctx.beginPath(); ctx.rect(isLeft ? startX : startX - goalW, midY - goalH / 2, goalW, goalH); ctx.stroke();

        const penPointX = startX + (sign * 11 * scale);
        ctx.beginPath(); ctx.arc(penPointX, midY, 0.25 * scale, 0, Math.PI * 2); ctx.fill();

        ctx.save();
        ctx.beginPath(); ctx.rect(isLeft ? startX + penW : 0, 0, isLeft ? canvas.width : startX - penW, canvas.height); ctx.clip();
        ctx.beginPath(); ctx.arc(penPointX, midY, 9.15 * scale, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      drawArea(true); drawArea(false);

      const cR = 1 * scale;
      ctx.beginPath(); ctx.arc(margin, margin, cR, 0, Math.PI / 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(margin, margin + fH, cR, -Math.PI / 2, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(margin + fW, margin, cR, Math.PI / 2, Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(margin + fW, margin + fH, cR, Math.PI, Math.PI * 1.5); ctx.stroke();

      return new THREE.CanvasTexture(canvas);
    }

    const groundGeo = new THREE.PlaneGeometry(116, 78);
    const pitchTexture = createPitchTexture();
    pitchTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const groundMat = new THREE.MeshLambertMaterial({ map: pitchTexture });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 0);
    ground.receiveShadow = true;
    scene.add(ground);

    // Large base below the pitch to ground the stadium
    const baseGeo = new THREE.PlaneGeometry(500, 500);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x475569 }); // Slate grey ground base
    const groundBase = new THREE.Mesh(baseGeo, baseMat);
    groundBase.rotation.x = -Math.PI / 2;
    groundBase.position.set(0, -0.05, 0);
    groundBase.receiveShadow = true;
    scene.add(groundBase);

    function createGoal(xPosition: number, isRotated: boolean) {
      const goalGroup = new THREE.Group();
      const postMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const radius = 0.06;
      const pL = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 2.44), postMat);
      pL.position.set(0, 2.44 / 2, 7.32 / 2); goalGroup.add(pL);
      const pR = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 2.44), postMat);
      pR.position.set(0, 2.44 / 2, -7.32 / 2); goalGroup.add(pR);
      const pT = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 7.32), postMat);
      pT.rotation.x = Math.PI / 2; pT.position.set(0, 2.44, 0); goalGroup.add(pT);

      const sMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });

      // Left side support (Z = 3.66)
      const sHL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6), sMat);
      sHL.rotation.z = Math.PI / 2;
      sHL.position.set(-0.3, 2.44, 3.66);
      goalGroup.add(sHL);

      const sDL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.81), sMat);
      sDL.rotation.z = -0.52;
      sDL.position.set(-1.3, 1.22, 3.66);
      goalGroup.add(sDL);

      // Right side support (Z = -3.66)
      const sHR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6), sMat);
      sHR.rotation.z = Math.PI / 2;
      sHR.position.set(-0.3, 2.44, -3.66);
      goalGroup.add(sHR);

      const sDR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.81), sMat);
      sDR.rotation.z = -0.52;
      sDR.position.set(-1.3, 1.22, -3.66);
      goalGroup.add(sDR);

      // Net Geometry creation (Top flat section + sloped back section + two side panels)
      const netVertices = new Float32Array([
        // Top Section: B_R, B_L, C_L, C_R
        0, 2.44, -3.66, 0, 2.44, 3.66, -0.6, 2.44, 3.66,
        0, 2.44, -3.66, -0.6, 2.44, 3.66, -0.6, 2.44, -3.66,

        // Back Sloped Section: C_R, C_L, D_L, D_R
        -0.6, 2.44, -3.66, -0.6, 2.44, 3.66, -2.0, 0, 3.66,
        -0.6, 2.44, -3.66, -2.0, 0, 3.66, -2.0, 0, -3.66,

        // Left Side: A_L, B_L, C_L, D_L (Z = 3.66)
        0, 0, 3.66, 0, 2.44, 3.66, -0.6, 2.44, 3.66,
        0, 0, 3.66, -0.6, 2.44, 3.66, -2.0, 0, 3.66,

        // Right Side: A_R, B_R, C_R, D_R (Z = -3.66)
        0, 0, -3.66, 0, 2.44, -3.66, -0.6, 2.44, -3.66,
        0, 0, -3.66, -0.6, 2.44, -3.66, -2.0, 0, -3.66
      ]);

      const netGeo = new THREE.BufferGeometry();
      netGeo.setAttribute('position', new THREE.BufferAttribute(netVertices, 3));
      netGeo.computeVertexNormals();

      const netMat = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      });
      const netMesh = new THREE.Mesh(netGeo, netMat);
      goalGroup.add(netMesh);

      goalGroup.position.set(xPosition, 0, 0);
      if (isRotated) goalGroup.rotation.y = Math.PI;
      scene.add(goalGroup);
    }
    createGoal(-53, false);
    createGoal(53, true);

    // ==========================================
    // CREATOR OF VOXEL CHARACTERS
    // ==========================================
    const SKIN_TONES = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
    const BOOT_COLORS = ['#111111', '#ffffff', '#ff007f', '#39ff14', '#ccff00', '#00ffff'];

    const defaultColors = {
      skin: new THREE.MeshLambertMaterial({ color: SKIN_TONES[0] }),
      hair: new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
      shirt: new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }),
      black: new THREE.MeshLambertMaterial({ color: 0x111111 }),
      gold: new THREE.MeshLambertMaterial({ color: 0xcfa144 }),
      blue: new THREE.MeshLambertMaterial({ color: 0x1c3f60 }),
      shoe: new THREE.MeshLambertMaterial({ color: BOOT_COLORS[0] })
    };

    function createCharacterModel(colors: any, shirtNumber: string) {
      const characterGroup = new THREE.Group();

      // 1. VOXEL CHARACTER GROUP
      const voxelGroup = new THREE.Group();
      characterGroup.add(voxelGroup);

      const pivotArmR = { x: 1.25, y: 4.35, z: 0 };
      const pivotArmL = { x: -1.25, y: 4.35, z: 0 };
      const pivotElbowR = { x: 3.35, y: 4.35, z: 0 };
      const pivotElbowL = { x: -3.35, y: 4.35, z: 0 };
      const pivotWristR = { x: 5.05, y: 4.35, z: 0 };
      const pivotWristL = { x: -5.05, y: 4.35, z: 0 };

      const pivotLegR = { x: 0.6, y: 0.95, z: 0 };
      const pivotLegL = { x: -0.6, y: 0.95, z: 0 };
      const pivotKneeR = { x: 0.6, y: -1.0, z: 0 };
      const pivotKneeL = { x: -0.6, y: -1.0, z: 0 };
      const pivotAnkleR = { x: 0.6, y: -2.95, z: 0 };
      const pivotAnkleL = { x: -0.6, y: -2.95, z: 0 };

      const pivotWaist = { x: 0, y: 2.7, z: 0 };
      const torsoGrp = new THREE.Group(); torsoGrp.position.set(pivotWaist.x, pivotWaist.y, pivotWaist.z); voxelGroup.add(torsoGrp);

      const shoulderGrpR = new THREE.Group(); shoulderGrpR.position.set(pivotArmR.x - pivotWaist.x, pivotArmR.y - pivotWaist.y, pivotArmR.z - pivotWaist.z); torsoGrp.add(shoulderGrpR);
      const shoulderGrpL = new THREE.Group(); shoulderGrpL.position.set(pivotArmL.x - pivotWaist.x, pivotArmL.y - pivotWaist.y, pivotArmL.z - pivotWaist.z); torsoGrp.add(shoulderGrpL);

      const upperArmR = new THREE.Group(); upperArmR.rotation.z = -Math.PI / 2 + 0.15; shoulderGrpR.add(upperArmR);
      const upperArmL = new THREE.Group(); upperArmL.rotation.z = Math.PI / 2 - 0.15; shoulderGrpL.add(upperArmL);

      const elbowGrpR = new THREE.Group(); elbowGrpR.position.set(pivotElbowR.x - pivotArmR.x, pivotElbowR.y - pivotArmR.y, pivotElbowR.z - pivotArmR.z); upperArmR.add(elbowGrpR);
      const elbowGrpL = new THREE.Group(); elbowGrpL.position.set(pivotElbowL.x - pivotArmL.x, pivotElbowL.y - pivotArmL.y, pivotElbowL.z - pivotArmL.z); upperArmL.add(elbowGrpL);

      const lowerArmR = new THREE.Group();
      lowerArmR.rotation.x = Math.PI / 2;
      elbowGrpR.add(lowerArmR);

      const lowerArmL = new THREE.Group();
      lowerArmL.rotation.x = Math.PI / 2;
      elbowGrpL.add(lowerArmL);

      const wristGrpR = new THREE.Group(); wristGrpR.position.set(pivotWristR.x - pivotElbowR.x, pivotWristR.y - pivotElbowR.y, pivotWristR.z - pivotElbowR.z); lowerArmR.add(wristGrpR);
      const wristGrpL = new THREE.Group(); wristGrpL.position.set(pivotWristL.x - pivotElbowL.x, pivotWristL.y - pivotElbowL.y, pivotWristL.z - pivotElbowL.z); lowerArmL.add(wristGrpL);

      wristGrpR.rotation.y = -0.3;
      wristGrpL.rotation.y = 0.3;

      const hipGrpR = new THREE.Group(); hipGrpR.position.set(pivotLegR.x, pivotLegR.y, pivotLegR.z); voxelGroup.add(hipGrpR);
      const hipGrpL = new THREE.Group(); hipGrpL.position.set(pivotLegL.x, pivotLegL.y, pivotLegL.z); voxelGroup.add(hipGrpL);

      const upperLegR = new THREE.Group(); hipGrpR.add(upperLegR);
      const upperLegL = new THREE.Group(); hipGrpL.add(upperLegL);

      const kneeGrpR = new THREE.Group(); kneeGrpR.position.set(pivotKneeR.x - pivotLegR.x, pivotKneeR.y - pivotLegR.y, pivotKneeR.z - pivotLegR.z); upperLegR.add(kneeGrpR);
      const kneeGrpL = new THREE.Group(); kneeGrpL.position.set(pivotKneeL.x - pivotLegL.x, pivotKneeL.y - pivotLegL.y, pivotKneeL.z - pivotLegL.z); upperLegL.add(kneeGrpL);

      const lowerLegR = new THREE.Group(); kneeGrpR.add(lowerLegR);
      const lowerLegL = new THREE.Group(); kneeGrpL.add(lowerLegL);

      const ankleGrpR = new THREE.Group(); ankleGrpR.position.set(pivotAnkleR.x - pivotKneeR.x, pivotAnkleR.y - pivotKneeR.y, pivotAnkleR.z - pivotKneeR.z); lowerLegR.add(ankleGrpR);
      const ankleGrpL = new THREE.Group(); ankleGrpL.position.set(pivotAnkleL.x - pivotKneeL.x, pivotAnkleL.y - pivotKneeL.y, pivotAnkleL.z - pivotKneeL.z); lowerLegL.add(ankleGrpL);

      const footR = new THREE.Group(); ankleGrpR.add(footR);
      const footL = new THREE.Group(); ankleGrpL.add(footL);

      function createBlock(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Group = voxelGroup, pivot = { x: 0, y: 0, z: 0 }) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        mesh.position.set(x - pivot.x, y - pivot.y, z - pivot.z);
        mesh.castShadow = true;
        parent.add(mesh); return mesh;
      }

      function createHandBase(w: number, hInner: number, hOuter: number, d: number, material: THREE.Material, x: number, y: number, z: number, isLeft: boolean, parent: THREE.Group = voxelGroup, pivot = { x: 0, y: 0, z: 0 }) {
        const geometry = new THREE.BoxGeometry(w, 1, d);
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          let px = positions.getX(i);
          let py = positions.getY(i);
          positions.setY(i, py * (isLeft ? (px > 0 ? hInner : hOuter) : (px < 0 ? hInner : hOuter)));
        }
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x - pivot.x, y - pivot.y, z - pivot.z);
        mesh.castShadow = true;
        parent.add(mesh); return mesh;
      }

      function createShoe(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Group = voxelGroup, pivot = { x: 0, y: 0, z: 0 }) {
        const geometry = new THREE.BoxGeometry(w, h, d);
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          if (positions.getY(i) > 0 && positions.getZ(i) > 0) positions.setY(i, positions.getY(i) - (h * 0.4));
        }
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x - pivot.x, y - pivot.y, z - pivot.z);
        mesh.castShadow = true;
        parent.add(mesh); return mesh;
      }

      // CABEÇA E TRONCO
      const faceBlack = new THREE.MeshLambertMaterial({ color: 0x000000 });

      const pivotNeck = { x: 0, y: 4.7, z: 0 };
      const neckGrp = new THREE.Group();
      neckGrp.position.set(pivotNeck.x - pivotWaist.x, pivotNeck.y - pivotWaist.y, pivotNeck.z - pivotWaist.z);
      torsoGrp.add(neckGrp);

      createBlock(1.59, 1.59, 1.59, colors.skin, 0, 5.58, 0, neckGrp, pivotNeck);
      createBlock(1.66, 0.43, 1.66, colors.hair, 0, 6.45, 0, neckGrp, pivotNeck);
      const eyeR = createBlock(0.14, 0.36, 0.07, faceBlack, -0.36, 5.72, 0.80, neckGrp, pivotNeck);
      const eyeL = createBlock(0.14, 0.36, 0.07, faceBlack, 0.36, 5.72, 0.80, neckGrp, pivotNeck);
      createBlock(0.32, 0.11, 0.07, faceBlack, -0.36, 6.01, 0.81, neckGrp, pivotNeck);
      createBlock(0.32, 0.11, 0.07, faceBlack, 0.36, 6.01, 0.81, neckGrp, pivotNeck);
      createBlock(0.14, 0.36, 0.29, colors.skin, -0.87, 5.58, 0, neckGrp, pivotNeck);
      createBlock(0.14, 0.36, 0.29, colors.skin, 0.87, 5.58, 0, neckGrp, pivotNeck);
      createBlock(0.43, 0.11, 0.07, faceBlack, 0, 5.22, 0.80, neckGrp, pivotNeck);
      createBlock(0.11, 0.18, 0.07, faceBlack, -0.22, 5.29, 0.80, neckGrp, pivotNeck);
      createBlock(0.11, 0.18, 0.07, faceBlack, 0.22, 5.29, 0.80, neckGrp, pivotNeck);
      // Nose
      createBlock(0.16, 0.22, 0.12, faceBlack, 0, 5.48, 0.84, neckGrp, pivotNeck);

      createBlock(0.8, 0.5, 0.8, colors.skin, 0, 4.7, 0, torsoGrp, pivotWaist);
      createBlock(2.5, 3.5, 1.5, colors.shirt, 0, 2.7, 0, torsoGrp, pivotWaist);

      const circleGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 32);
      circleGeo.rotateX(Math.PI / 2);
      const circleMesh = new THREE.Mesh(circleGeo, colors.black);
      circleMesh.position.set(0.8 - pivotWaist.x, 3.8 - pivotWaist.y, 0.76 - pivotWaist.z);
      torsoGrp.add(circleMesh);

      const createShirtNumber = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const numColorStr = colors.numberColor || 'black';
          ctx.fillStyle = numColorStr;
          ctx.strokeStyle = isColorLight(numColorStr) ? 'black' : 'white';
          ctx.lineWidth = 16;
          ctx.lineJoin = 'round';
          ctx.font = 'bold 175px "Elephant", "Georgia", serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeText(shirtNumber, 128, 140);
          ctx.fillText(shirtNumber, 128, 140);
        }
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5 });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), mat);
        mesh.position.set(0 - pivotWaist.x, 3.0 - pivotWaist.y, -0.76 - pivotWaist.z);
        mesh.rotation.y = Math.PI;
        torsoGrp.add(mesh);
      };
      createShirtNumber();

      createBlock(1.0, 0.1, 1.0, colors.black, 0, 4.46, 0.26, torsoGrp, pivotWaist);

      const hw = 0.6, hInner = 0.68, hOuter = 0.7, armDepth = 0.35, handDepth = 0.25;
      const fingLenOuter = 0.4435, fingLenMid = 0.5125, fingW = 0.2, thumbLen = 0.55, thumbW = 0.2;
      const spreadAngle = Math.atan2((hOuter - hInner) / 2, hw);

      // BRAÇO DIREITO
      createBlock(2.1, 0.65, 0.65, colors.shirt, 2.30, 4.35, 0, upperArmR, pivotArmR);
      createBlock(1.9, 0.05, 0.15, colors.black, 2.20, 4.68, -0.2, upperArmR, pivotArmR);
      createBlock(1.9, 0.05, 0.15, colors.black, 2.20, 4.68, 0, upperArmR, pivotArmR);
      createBlock(1.9, 0.05, 0.15, colors.black, 2.20, 4.68, 0.2, upperArmR, pivotArmR);

      createBlock(1.7, 0.35, armDepth, colors.skin, 4.20, 4.35, 0, lowerArmR, pivotElbowR);
      createHandBase(hw, hInner, hOuter, handDepth, colors.skin, 5.35, 4.35, 0, false, wristGrpR, pivotWristR);
      createBlock(thumbLen, thumbW, handDepth, colors.skin, 5.25, 4.73, 0, wristGrpR, pivotWristR).rotation.z = 65 * Math.PI / 180;
      createBlock(fingLenOuter, fingW, handDepth, colors.skin, 5.65 + (fingLenOuter / 2 * Math.cos(spreadAngle)), 4.6 + (fingLenOuter / 2 * Math.sin(spreadAngle)), 0, wristGrpR, pivotWristR).rotation.z = spreadAngle;
      createBlock(fingLenMid, fingW, handDepth, colors.skin, 5.65 + (fingLenMid / 2), 4.35, 0, wristGrpR, pivotWristR);
      createBlock(fingLenOuter, fingW, handDepth, colors.skin, 5.65 + (fingLenOuter / 2 * Math.cos(spreadAngle)), 4.10 - (fingLenOuter / 2 * Math.sin(spreadAngle)), 0, wristGrpR, pivotWristR).rotation.z = -spreadAngle;

      // BRAÇO ESQUERDO
      createBlock(2.1, 0.65, 0.65, colors.shirt, -2.30, 4.35, 0, upperArmL, pivotArmL);
      createBlock(1.9, 0.05, 0.15, colors.black, -2.20, 4.68, -0.2, upperArmL, pivotArmL);
      createBlock(1.9, 0.05, 0.15, colors.black, -2.20, 4.68, 0, upperArmL, pivotArmL);
      createBlock(1.9, 0.05, 0.15, colors.black, -2.20, 4.68, 0.2, upperArmL, pivotArmL);

      createBlock(1.7, 0.35, armDepth, colors.skin, -4.20, 4.35, 0, lowerArmL, pivotElbowL);
      createHandBase(hw, hInner, hOuter, handDepth, colors.skin, -5.35, 4.35, 0, true, wristGrpL, pivotWristL);
      createBlock(thumbLen, thumbW, handDepth, colors.skin, -5.25, 4.73, 0, wristGrpL, pivotWristL).rotation.z = -65 * Math.PI / 180;
      createBlock(fingLenOuter, fingW, handDepth, colors.skin, -5.65 - (fingLenOuter / 2 * Math.cos(spreadAngle)), 4.6 + (fingLenOuter / 2 * Math.sin(spreadAngle)), 0, wristGrpL, pivotWristL).rotation.z = -spreadAngle;
      createBlock(fingLenMid, fingW, handDepth, colors.skin, -5.65 - (fingLenMid / 2), 4.35, 0, wristGrpL, pivotWristL);
      createBlock(fingLenOuter, fingW, handDepth, colors.skin, -5.65 - (fingLenOuter / 2 * Math.cos(spreadAngle)), 4.10 - (fingLenOuter / 2 * Math.sin(spreadAngle)), 0, wristGrpL, pivotWristL).rotation.z = spreadAngle;

      // PERNAS
      createBlock(1.0, 1.45, 1.0, colors.shirt, 0.6, 0.225, 0, upperLegR, pivotLegR);
      createBlock(0.05, 1.45, 0.15, colors.black, 1.1, 0.225, -0.2, upperLegR, pivotLegR);
      createBlock(0.05, 1.45, 0.15, colors.black, 1.1, 0.225, 0, upperLegR, pivotLegR);
      createBlock(0.05, 1.45, 0.15, colors.black, 1.1, 0.225, 0.2, upperLegR, pivotLegR);
      createBlock(0.8, 0.5, 0.8, colors.skin, 0.6, -0.75, 0, upperLegR, pivotLegR);

      createBlock(0.7, 0.7, 0.7, colors.skin, 0.6, -1.35, 0, lowerLegR, pivotKneeR);
      createBlock(0.8, 1.25, 0.8, colors.shirt, 0.6, -2.325, 0, lowerLegR, pivotKneeR);
      createBlock(0.82, 0.1, 0.82, colors.black, 0.6, -1.8, 0, lowerLegR, pivotKneeR);
      createBlock(0.82, 0.1, 0.82, colors.black, 0.6, -2.1, 0, lowerLegR, pivotKneeR);

      createShoe(0.9, 0.5, 1.8, colors.shoe, 0.6, -3.2, 0.35, footR, pivotAnkleR);
      createShoe(0.92, 0.15, 1.82, colors.blue, 0.6, -3.525, 0.35, footR, pivotAnkleR);

      createBlock(1.0, 1.45, 1.0, colors.shirt, -0.6, 0.225, 0, upperLegL, pivotLegL);
      createBlock(0.05, 1.45, 0.15, colors.black, -1.1, 0.225, -0.2, upperLegL, pivotLegL);
      createBlock(0.05, 1.45, 0.15, colors.black, -1.1, 0.225, 0, upperLegL, pivotLegL);
      createBlock(0.05, 1.45, 0.15, colors.black, -1.1, 0.225, 0.2, upperLegL, pivotLegL);
      createBlock(0.8, 0.5, 0.8, colors.skin, -0.6, -0.75, 0, upperLegL, pivotLegL);

      createBlock(0.7, 0.7, 0.7, colors.skin, -0.6, -1.35, 0, lowerLegL, pivotKneeL);
      createBlock(0.8, 1.25, 0.8, colors.shirt, -0.6, -2.325, 0, lowerLegL, pivotKneeL);
      createBlock(0.82, 0.1, 0.82, colors.black, -0.6, -1.8, 0, lowerLegL, pivotKneeL);
      createBlock(0.82, 0.1, 0.82, colors.black, -0.6, -2.1, 0, lowerLegL, pivotKneeL);

      createShoe(0.9, 0.5, 1.8, colors.shoe, -0.6, -3.2, 0.35, footL, pivotAnkleL);
      createShoe(0.92, 0.15, 1.82, colors.blue, -0.6, -3.525, 0.35, footL, pivotAnkleL);

      const createShortsNumber = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const numColorStr = colors.numberColor || 'black';
          ctx.fillStyle = numColorStr;
          ctx.strokeStyle = isColorLight(numColorStr) ? 'black' : 'white';
          ctx.lineWidth = 14;
          ctx.lineJoin = 'round';
          ctx.font = 'bold 95px "Elephant", "Georgia", serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeText(shirtNumber, 64, 64);
          ctx.fillText(shirtNumber, 64, 64);
        }
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5 });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), mat);
        mesh.position.set(0.6 - pivotLegR.x, 0.3 - pivotLegR.y, 0.51 - pivotLegR.z);
        upperLegR.add(mesh);
      };
      createShortsNumber();

      const scaleFactor = 1.75 / 10.265;
      voxelGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);

      // 2. TACTICAL BUTTON FOOTBALL DISC (BOTAO)
      const buttonGroup = new THREE.Group();
      characterGroup.add(buttonGroup);

      // Main disc (slightly wider to be clearly visible)
      const discGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.25, 32);
      const discMesh = new THREE.Mesh(discGeo, colors.shirt);
      discMesh.castShadow = true;
      buttonGroup.add(discMesh);

      // Rim
      const rimGeo = new THREE.CylinderGeometry(1.22, 1.22, 0.06, 32);
      const rimMesh = new THREE.Mesh(rimGeo, colors.black);
      rimMesh.position.y = 0.02;
      buttonGroup.add(rimMesh);

      // Top number disc
      const btnCanvas = document.createElement('canvas');
      btnCanvas.width = 128;
      btnCanvas.height = 128;
      const btnCtx = btnCanvas.getContext('2d');
      if (btnCtx) {
        btnCtx.fillStyle = colors.shirt.color.getStyle();
        btnCtx.fillRect(0, 0, 128, 128);

        // Inner circle border
        btnCtx.strokeStyle = colors.black.color.getStyle();
        btnCtx.lineWidth = 10;
        btnCtx.beginPath();
        btnCtx.arc(64, 64, 52, 0, Math.PI * 2);
        btnCtx.stroke();

        // Shirt number
        btnCtx.fillStyle = colors.numberColor || colors.black.color.getStyle();
        btnCtx.font = 'bold 58px Arial, sans-serif';
        btnCtx.textAlign = 'center';
        btnCtx.textBaseline = 'middle';
        btnCtx.fillText(shirtNumber, 64, 64);
      }
      const btnTex = new THREE.CanvasTexture(btnCanvas);
      const btnMat = new THREE.MeshBasicMaterial({ map: btnTex });
      const numDiscGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.02, 32);
      const numDiscMesh = new THREE.Mesh(numDiscGeo, btnMat);
      numDiscMesh.position.y = 0.13;
      numDiscMesh.rotation.y = Math.PI / 2; // 90 degrees counter-clockwise
      buttonGroup.add(numDiscMesh);

      return {
        group: characterGroup,
        voxelGroup,
        buttonGroup,
        eyeR,
        eyeL,
        joints: {
          torsoGrp,
          neckGrp,
          shoulderGrpR,
          shoulderGrpL,
          elbowGrpR,
          elbowGrpL,
          wristGrpR,
          wristGrpL,
          hipGrpR,
          hipGrpL,
          kneeGrpR,
          kneeGrpL,
          ankleGrpR,
          ankleGrpL,
          footR,
          footL
        },
        scaleFactor,
        basePlayerY: 3.6 * scaleFactor
      };
    }

    const getPlayerMaterials = (team: any, kitIdx: number, isGK: boolean, opponentTeam?: any) => {
      if (!team) return { ...defaultColors, numberColor: 'black' };

      const kit = isGK
        ? getGKKitDetails(team, kitIdx as 0 | 1 | 2, 0, opponentTeam)
        : getKitDetails(team, kitIdx as 0 | 1 | 2);

      const shirtColor = kit.c1;
      const detailColor = kit.c2 || kit.nc || (isColorLight(shirtColor) ? '#000000' : '#ffffff');
      const numberColor = kit.nc || (isColorLight(shirtColor) ? '#000000' : '#ffffff');

      const skinColor = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
      const bootColor = BOOT_COLORS[Math.floor(Math.random() * BOOT_COLORS.length)];

      return {
        skin: new THREE.MeshLambertMaterial({ color: skinColor }),
        hair: new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
        shirt: new THREE.MeshLambertMaterial({ color: shirtColor }),
        black: new THREE.MeshLambertMaterial({ color: detailColor }),
        gold: new THREE.MeshLambertMaterial({ color: 0xcfa144 }),
        blue: new THREE.MeshLambertMaterial({ color: detailColor }),
        shoe: new THREE.MeshLambertMaterial({ color: bootColor }),
        numberColor: numberColor
      };
    };

    function animateJointsForPlayer(model: any, action: string, elapsed: number) {
      const torsoGrp = model.joints.torsoGrp;
      const shoulderGrpR = model.joints.shoulderGrpR;
      const shoulderGrpL = model.joints.shoulderGrpL;
      const elbowGrpR = model.joints.elbowGrpR;
      const elbowGrpL = model.joints.elbowGrpL;
      const wristGrpR = model.joints.wristGrpR;
      const wristGrpL = model.joints.wristGrpL;
      const hipGrpR = model.joints.hipGrpR;
      const hipGrpL = model.joints.hipGrpL;
      const kneeGrpR = model.joints.kneeGrpR;
      const kneeGrpL = model.joints.kneeGrpL;
      const ankleGrpR = model.joints.ankleGrpR;
      const ankleGrpL = model.joints.ankleGrpL;

      const scaleFactor = model.scaleFactor;
      const basePlayerY = model.basePlayerY;

      const lerpRot = (grp: THREE.Group, x: number, y: number, z: number, amt = 0.2) => {
        grp.rotation.x += (x - grp.rotation.x) * amt;
        grp.rotation.y += (y - grp.rotation.y) * amt;
        grp.rotation.z += (z - grp.rotation.z) * amt;
      };

      if (action === 'idle') {
        const breath = Math.sin(elapsed * 0.003) * 0.02;
        lerpRot(torsoGrp, breath, 0, 0);
        if (model.joints.neckGrp) {
          lerpRot(model.joints.neckGrp, 0, 0, 0, 0.1);
        }
        lerpRot(shoulderGrpR, 0, 0, 0.1);
        lerpRot(shoulderGrpL, 0, 0, -0.1);
        lerpRot(elbowGrpR, 0, -0.3, 0);
        lerpRot(elbowGrpL, 0, 0.3, 0);
        lerpRot(hipGrpR, 0, 0, 0);
        lerpRot(hipGrpL, 0, 0, 0);
        lerpRot(kneeGrpR, 0, 0, 0);
        lerpRot(kneeGrpL, 0, 0, 0);
        lerpRot(ankleGrpR, 0, 0, 0);
        lerpRot(ankleGrpL, 0, 0, 0);
      } else if (action === 'walk' || action === 'jog' || action === 'run') {
        const speedFactor = action === 'run' ? 0.02 : (action === 'jog' ? 0.015 : 0.01);
        const phase = model.walkPhase !== undefined ? model.walkPhase : (elapsed * speedFactor);

        let liftY = 0.04;

        if (action === 'run') {
          liftY = 0.08;
          elbowGrpR.rotation.y = -1.2 + Math.sin(phase) * 0.2;
          elbowGrpL.rotation.y = 1.2 + Math.sin(phase) * 0.2;
          shoulderGrpR.rotation.x = Math.sin(phase) * 0.8;
          shoulderGrpL.rotation.x = -Math.sin(phase) * 0.8;
          lerpRot(torsoGrp, 0.1, -Math.sin(phase) * 0.2, 0);
          hipGrpR.rotation.x = -Math.sin(phase) * 0.8;
          hipGrpL.rotation.x = Math.sin(phase) * 0.8;
          kneeGrpR.rotation.x = Math.max(0, Math.cos(phase)) * 1.2;
          kneeGrpL.rotation.x = Math.max(0, -Math.cos(phase)) * 1.2;
        } else if (action === 'jog') {
          liftY = 0.06;
          elbowGrpR.rotation.y = -0.8 + Math.sin(phase) * 0.2;
          elbowGrpL.rotation.y = 0.8 + Math.sin(phase) * 0.2;
          shoulderGrpR.rotation.x = Math.sin(phase) * 0.6;
          shoulderGrpL.rotation.x = -Math.sin(phase) * 0.6;
          lerpRot(torsoGrp, 0.05, -Math.sin(phase) * 0.1, 0);
          hipGrpR.rotation.x = -Math.sin(phase) * 0.6;
          hipGrpL.rotation.x = Math.sin(phase) * 0.6;
          kneeGrpR.rotation.x = Math.max(0, Math.cos(phase)) * 1.0;
          kneeGrpL.rotation.x = Math.max(0, -Math.cos(phase)) * 1.0;
        } else { // walk
          elbowGrpR.rotation.y = -0.2 - Math.max(0, Math.sin(phase)) * 0.4;
          elbowGrpL.rotation.y = 0.2 + Math.max(0, -Math.sin(phase)) * 0.4;
          shoulderGrpR.rotation.x = Math.sin(phase) * 0.4;
          shoulderGrpL.rotation.x = -Math.sin(phase) * 0.4;
          lerpRot(torsoGrp, 0, 0, 0);
          hipGrpR.rotation.x = -Math.sin(phase) * 0.4;
          hipGrpL.rotation.x = Math.sin(phase) * 0.4;
          kneeGrpR.rotation.x = Math.max(0, Math.cos(phase)) * 0.6;
          kneeGrpL.rotation.x = Math.max(0, -Math.cos(phase)) * 0.6;
        }

        model.group.position.y = basePlayerY + Math.abs(Math.sin(phase)) * liftY;
      } else if (action === 'kick' || action === 'short_pass_normal') {
        const t = (elapsed % 800) / 800;
        if (t < 0.3) {
          hipGrpR.rotation.x = (t / 0.3) * 0.6;
          kneeGrpR.rotation.x = (t / 0.3) * 0.8;
        } else if (t < 0.6) {
          const kickT = (t - 0.3) / 0.3;
          hipGrpR.rotation.x = 0.6 - kickT * 1.6;
          kneeGrpR.rotation.x = 0.8 - kickT * 0.8;
        } else {
          const recT = (t - 0.6) / 0.4;
          hipGrpR.rotation.x = -1.0 + recT * 1.0;
          kneeGrpR.rotation.x = 0;
        }
      } else if (action === 'gk_dive') {
        lerpRot(torsoGrp, 0, 0, -Math.PI / 3);
        lerpRot(shoulderGrpR, 0, 0, 1.5);
        lerpRot(shoulderGrpL, 0, 0, -1.5);
        lerpRot(hipGrpR, 0, 0, 0.4);
        lerpRot(hipGrpL, 0, 0, -0.4);
      } else if (action === 'sit') {
        lerpRot(torsoGrp, 0.05, 0, 0);
        lerpRot(shoulderGrpR, -0.2, 0, 0.1);
        lerpRot(shoulderGrpL, -0.2, 0, -0.1);
        lerpRot(elbowGrpR, 0, -0.5, 0);
        lerpRot(elbowGrpL, 0, 0.5, 0);

        // Hips rotated forward to sit
        lerpRot(hipGrpR, -Math.PI / 2, 0, 0);
        lerpRot(hipGrpL, -Math.PI / 2, 0, 0);

        // Knees bent down
        lerpRot(kneeGrpR, Math.PI / 2, 0, 0);
        lerpRot(kneeGrpL, Math.PI / 2, 0, 0);

        lerpRot(ankleGrpR, 0, 0, 0);
        lerpRot(ankleGrpL, 0, 0, 0);

        model.group.position.y = basePlayerY - 0.55 * scaleFactor;
      }
    }

    // ==========================================
    // INITIALIZE MATCH OR PLAYGROUND MODELS
    // ==========================================
    const playerModels = new Map<string, any>();
    let singlePlayerModel: any = null;

    if (visualStateRef && visualStateRef.current) {
      // 1. Game Mode: Create 22 player models
      for (let i = 0; i < 11; i++) {
        const isGK = i === 0;
        const homeColorMat = getPlayerMaterials(homeTeam, kitHomeIdx, isGK, awayTeam);
        const p = players?.find(x => x.id === homeTeam?.lineup[i]);
        const shirtNum = p?.shirtNumber?.toString() || `${i + 1}`;
        const model = createCharacterModel(homeColorMat, shirtNum);
        scene.add(model.group);
        playerModels.set(`home-${i}`, model);
      }

      for (let i = 0; i < 11; i++) {
        const isGK = i === 0;
        const awayColorMat = getPlayerMaterials(awayTeam, kitAwayIdx, isGK, homeTeam);
        const p = players?.find(x => x.id === awayTeam?.lineup[i]);
        const shirtNum = p?.shirtNumber?.toString() || `${i + 1}`;
        const model = createCharacterModel(awayColorMat, shirtNum);
        scene.add(model.group);
        playerModels.set(`away-${i}`, model);
      }
    } else {
      // 2. Standalone Mode: Create single player model
      const randSkin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
      const randBoot = BOOT_COLORS[Math.floor(Math.random() * BOOT_COLORS.length)];
      const playgroundColors = {
        ...defaultColors,
        skin: new THREE.MeshLambertMaterial({ color: randSkin }),
        shoe: new THREE.MeshLambertMaterial({ color: randBoot })
      };
      singlePlayerModel = createCharacterModel(playgroundColors, '10');
      scene.add(singlePlayerModel.group);
    }

    // ==========================================
    // BOLA (BALL)
    // ==========================================
    const ballGroup = new THREE.Group();
    scene.add(ballGroup);

    const lastBallPos = new THREE.Vector3(0, 0.112, 0.8);

    const loadBall = async () => {
      try {
        const res = await fetch('Ball.dae');
        if (!res.ok) throw new Error('Not found');
        const text = await res.text();
        if (text.trim().toLowerCase().startsWith('<!doctype html')) {
          throw new Error('Retrieved HTML instead of DAE');
        }

        const loader = new ColladaLoader();
        const collada = loader.parse(text, '/');
        const dae = collada.scene;

        // Remove any lights or cameras imported from the DAE file
        const toRemove: THREE.Object3D[] = [];
        dae.traverse((child: any) => {
          if (child.isLight || child.isCamera) {
            toRemove.push(child);
          }
        });
        toRemove.forEach(obj => {
          if (obj.parent) {
            obj.parent.remove(obj);
          }
        });

        const box = new THREE.Box3().setFromObject(dae);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetDiameter = 0.22; // 22cm
        if (maxDim > 0) {
          const scale = targetDiameter / maxDim;
          dae.scale.set(scale, scale, scale);
        }

        box.setFromObject(dae);
        const center = box.getCenter(new THREE.Vector3());
        dae.position.sub(center);

        while (ballGroup.children.length > 0) {
          ballGroup.remove(ballGroup.children[0]);
        }
        ballGroup.add(dae);
      } catch (err) {
        console.log('Ball.dae failed to load, creating fallback ball', err);

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#eeeeee';
          ctx.fillRect(0, 0, 512, 256);
          ctx.fillStyle = '#111111';
          const r = 20;
          for (let yy = -1; yy < 7; yy++) {
            for (let xx = -1; xx < 12; xx++) {
              const px = xx * 50 + (yy % 2 === 0 ? 0 : 25);
              const py = yy * 43;
              if ((xx * 2 + yy) % 3 === 0) {
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                  ctx.lineTo(px + r * Math.cos(i * 2 * Math.PI / 5 - Math.PI / 2), py + r * Math.sin(i * 2 * Math.PI / 5 - Math.PI / 2));
                }
                ctx.fill();
              }
            }
          }
        }
        const tex = new THREE.CanvasTexture(canvas);

        const ballGeo = new THREE.SphereGeometry(0.11, 32, 16);
        const ballMat = new THREE.MeshLambertMaterial({ map: tex });
        const fbBall = new THREE.Mesh(ballGeo, ballMat);

        while (ballGroup.children.length > 0) {
          ballGroup.remove(ballGroup.children[0]);
        }
        ballGroup.add(fbBall);
      }
    };
    loadBall();

    ballGroup.position.set(0, 0.112, 0.8);

    // ==========================================
    // ANIMACOES AND UPDATE LOOP
    // ==========================================
    let walkPhase = 0;
    let animationFrameId: number;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    function setAllLoopsToZero(model: any, amt: number) {
      if (!model) return;
      const grpR = model.joints.shoulderGrpR;
      const grpL = model.joints.shoulderGrpL;
      const elbR = model.joints.elbowGrpR;
      const elbL = model.joints.elbowGrpL;
      const wrR = model.joints.wristGrpR;
      const wrL = model.joints.wristGrpL;
      const hipR = model.joints.hipGrpR;
      const hipL = model.joints.hipGrpL;
      const kneeR = model.joints.kneeGrpR;
      const kneeL = model.joints.kneeGrpL;
      const ankleR = model.joints.ankleGrpR;
      const ankleL = model.joints.ankleGrpL;
      const torso = model.joints.torsoGrp;

      const lerpRot = (grp: THREE.Group, x: number, y: number, z: number) => {
        grp.rotation.x += (x - grp.rotation.x) * amt;
        grp.rotation.y += (y - grp.rotation.y) * amt;
        grp.rotation.z += (z - grp.rotation.z) * amt;
      };
      lerpRot(torso, 0, 0, 0);
      lerpRot(grpR, 0, 0, 0);
      lerpRot(grpL, 0, 0, 0);
      grpR.position.z += (0 - grpR.position.z) * amt;
      grpL.position.z += (0 - grpL.position.z) * amt;
      lerpRot(elbR, 0, 0, 0);
      lerpRot(elbL, 0, 0, 0);
      lerpRot(wrR, 0, -0.3, 0);
      lerpRot(wrL, 0, 0.3, 0);
      lerpRot(hipR, 0, 0, 0);
      lerpRot(hipL, 0, 0, 0);
      lerpRot(kneeR, 0, 0, 0);
      lerpRot(kneeL, 0, 0, 0);
      lerpRot(ankleR, 0, 0, 0);
      lerpRot(ankleL, 0, 0, 0);
    }

    let lastBlinkTime = performance.now();
    let nextBlinkInterval = 1500 + Math.random() * 2500;
    const blinkDuration = 120;

    const currentCameraLookAt = new THREE.Vector3(0, 0, 0);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTotal = performance.now();

      // Blinking eyes logic
      const now = performance.now();
      if (now - lastBlinkTime > nextBlinkInterval) {
        lastBlinkTime = now;
        nextBlinkInterval = 1500 + Math.random() * 2500;
      }
      const timeSinceBlink = now - lastBlinkTime;
      const scaleY = timeSinceBlink < blinkDuration ? (1.0 - Math.sin((timeSinceBlink / blinkDuration) * Math.PI) * 0.9) : 1.0;

      // ==========================================
      // GAME MODE UPDATE LOOP
      // ==========================================
      if (visualStateRef && visualStateRef.current) {
        const v = visualStateRef.current;

        const bx3d = (v.ballGrid.x - 13) * 4.0769;
        const bz3d = (9 - v.ballGrid.y) * 3.7778;

        // 1. Update 22 Players positions and face angles
        playerModels.forEach((model, key) => {
          model.eyeR.scale.y = scaleY;
          model.eyeL.scale.y = scaleY;

          const pos2d = v.playerPositions[key];
          if (pos2d) {
            // Target Coordinate transformations
            const targetX3d = (pos2d.x - 13) * 4.0769;
            const targetZ3d = (9 - pos2d.y) * 3.7778;

            const dxToTarget = targetX3d - model.group.position.x;
            const dzToTarget = targetZ3d - model.group.position.z;

            // Smoothly move the body position (lerp)
            const moveStepX = dxToTarget * 0.15;
            const moveStepZ = dzToTarget * 0.15;

            // If teleported too far, snap to position
            if (Math.abs(dxToTarget) > 10 || Math.abs(dzToTarget) > 10) {
              model.group.position.set(targetX3d, model.basePlayerY, targetZ3d);
            } else {
              model.group.position.x += moveStepX;
              model.group.position.z += moveStepZ;
            }

            // Actual distance moved in 3D space this frame
            const actualMoveDist3D = Math.sqrt(moveStepX * moveStepX + moveStepZ * moveStepZ);

            // For logic like GK dives, use distance to ball
            const dxBall = bx3d - model.group.position.x;
            const dzBall = bz3d - model.group.position.z;

            let currentAction = 'idle';
            const isCarrier = key === `${v.possession}-${v.carrierIdx}`;

            if (isCarrier && v.actionLabel === 'CHUTE!') {
              currentAction = 'kick';
            } else if (isCarrier && v.actionLabel === 'PASSE!') {
              currentAction = 'short_pass_normal';
            } else if (key.endsWith('-0') && (v.visualState === 'GOAL' || (isCarrier && Math.sqrt(dxBall * dxBall + dzBall * dzBall) < 3.0))) {
              currentAction = 'gk_dive';
            } else if (actualMoveDist3D > 0.08) {
              currentAction = 'run';
            } else if (actualMoveDist3D > 0.035) {
              currentAction = 'jog';
            } else if (actualMoveDist3D > 0.005) {
              currentAction = 'walk';
            }

            // Synchronize leg movement speed using actual 3D displacement
            if (model.walkPhase === undefined) {
              model.walkPhase = 0;
            }
            if (currentAction === 'walk') {
              model.walkPhase += actualMoveDist3D * 3.92;
            } else if (currentAction === 'jog') {
              model.walkPhase += actualMoveDist3D * 2.85;
            } else if (currentAction === 'run') {
              model.walkPhase += actualMoveDist3D * 2.24;
            }

            // Adjust visualization models between voxel and buttons disc based on cameraMode
            if (model.logicalRotationY === undefined) {
              model.logicalRotationY = 0;
            }

            // Rotate body in forward direction of movement
            if (currentAction === 'run' || currentAction === 'jog' || currentAction === 'walk') {
              if (actualMoveDist3D > 0.01) {
                const targetRotY = Math.atan2(moveStepX, moveStepZ);
                let diff = targetRotY - model.logicalRotationY;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                model.logicalRotationY += diff * 0.15;
              }
            } else if (currentAction === 'idle' || currentAction === 'short_pass_normal' || currentAction === 'kick') {
              // Face towards the ball (which during a pass/shot is flying towards the target)
              const targetRotY = Math.atan2(dxBall, dzBall);
              let diff = targetRotY - model.logicalRotationY;
              while (diff < -Math.PI) diff += Math.PI * 2;
              while (diff > Math.PI) diff -= Math.PI * 2;
              
              // Turn faster if actively passing/shooting to avoid backward passes
              const turnSpeed = (currentAction === 'short_pass_normal' || currentAction === 'kick') ? 0.8 : 0.1;
              model.logicalRotationY += diff * turnSpeed;
            }

            if (cameraModeRef.current === 'topDown') {
              model.voxelGroup.visible = false;
              model.buttonGroup.visible = true;
              model.group.position.y = 0.1;
              model.group.rotation.set(0, 0, 0); // Always face forward (readable text)
            } else {
              model.voxelGroup.visible = true;
              model.buttonGroup.visible = false;
              model.group.position.y = model.basePlayerY;
              model.group.rotation.y = model.logicalRotationY;

              // Rotate neck to look at the ball, clamped to 45 degrees left/right
              if (model.joints.neckGrp) {
                const ballAngle = Math.atan2(dxBall, dzBall);
                const bodyAngle = model.group.rotation.y;
                let diffRot = ballAngle - bodyAngle;
                while (diffRot < -Math.PI) diffRot += Math.PI * 2;
                while (diffRot > Math.PI) diffRot -= Math.PI * 2;

                const maxNeckTurn = Math.PI / 4; // 45 degrees
                const clampedDiff = Math.max(-maxNeckTurn, Math.min(maxNeckTurn, diffRot));

                model.joints.neckGrp.rotation.y += (clampedDiff - model.joints.neckGrp.rotation.y) * 0.15;
              }
            }

            // USER REQUEST: Disable all animations, keep only head tracking
            setAllLoopsToZero(model, 1.0);
          }
        });

        // 2. Interpolate Ball position in 3D
        let targetBallX = (v.ballGrid.x - 13) * 4.0769;
        let targetBallZ = (9 - v.ballGrid.y) * 3.7778;

        let heightArc = 0.112;
        const anim = v.ballAnimation;
        if (anim.duration > 0) {
          const elapsedBall = Date.now() - anim.startTime;
          const t = Math.min(1, elapsedBall / anim.duration);

          const curX = anim.startX + (anim.targetX - anim.startX) * t;
          const curY = anim.startY + (anim.targetY - anim.startY) * t;

          targetBallX = (curX - 13) * 4.0769;
          targetBallZ = (9 - curY) * 3.7778;

          if (v.actionLabel === 'CHUTE!' || v.actionLabel === 'PASSE!') {
            heightArc += Math.sin(t * Math.PI) * 2.2;
          }
        }

        let isCarried = false;
        let carrierAngle = 0;

        if (v.carrierIdx !== null && v.possession && v.actionLabel !== 'CHUTE!' && v.actionLabel !== 'PASSE!') {
          // Do not apply carrier offset during KICKOFF_SET so the ball stays exactly at center
          if (v.visualState !== 'KICKOFF_SET' && v.visualState !== 'PRE_MATCH') {
            const carrierKey = `${v.possession}-${v.carrierIdx}`;
            const carrierModel = playerModels.get(carrierKey);
            if (carrierModel) {
              isCarried = true;
              carrierAngle = carrierModel.logicalRotationY || 0;
            }
          }
        }

        if (isCarried) {
          const offset = cameraModeRef.current === 'topDown' ? 1.4 : 0.6;
          targetBallX += Math.sin(carrierAngle) * offset;
          targetBallZ += Math.cos(carrierAngle) * offset;
        }

        const dxBallTarget = targetBallX - ballGroup.position.x;
        const dzBallTarget = targetBallZ - ballGroup.position.z;

        if (Math.abs(dxBallTarget) > 15 || Math.abs(dzBallTarget) > 15) {
          ballGroup.position.set(targetBallX, heightArc, targetBallZ);
        } else {
          ballGroup.position.x += dxBallTarget * 0.2;
          ballGroup.position.z += dzBallTarget * 0.2;
          ballGroup.position.y += (heightArc - ballGroup.position.y) * 0.3;
        }

        const bFinalX = ballGroup.position.x;
        const bFinalZ = ballGroup.position.z;

        // Rotation is handled at the end of the frame

        // 3. Update Camera Mode
        if (cameraModeRef.current === 'tv') {
          controls.enabled = false;
          const targetCamX = bFinalX;
          const targetCamY = 12 * zoomFactorRef.current;
          const targetCamZ = 38 * zoomFactorRef.current;

          camera.position.x += (targetCamX - camera.position.x) * 0.05;
          camera.position.y += (targetCamY - camera.position.y) * 0.05;
          camera.position.z += (targetCamZ - camera.position.z) * 0.05;

          camera.up.set(0, 1, 0);

          const targetLookAt = new THREE.Vector3(bFinalX, heightArc, bFinalZ);
          currentCameraLookAt.lerp(targetLookAt, 0.05);
          camera.lookAt(currentCameraLookAt);
        } else if (cameraModeRef.current === 'topDown') {
          controls.enabled = false;
          camera.position.set(0, 95 * zoomFactorRef.current, 0);
          camera.up.set(0, 0, -1); // Negative Z is UP on screen (keeps home team on left, away on right)
          camera.lookAt(0, 0, 0);
        } else if (cameraModeRef.current === 'free') {
          controls.enabled = true;
          controls.update();
        }
      } else {
        // ==========================================
        // STANDALONE / PLAYGROUND UPDATE LOOP
        // ==========================================
        controls.enabled = true;

        if (singlePlayerModel) {
          singlePlayerModel.eyeR.scale.y = scaleY;
          singlePlayerModel.eyeL.scale.y = scaleY;
        }

        const action = actionRef.current;
        const elapsed = performance.now() - actionStartRef.current;

        const durations: Record<string, number> = {
          kick: 800, short_pass_normal: 800, short_pass_trivela: 800, tackle: 2000, header: 1000, header_standing: 1000, chest_trap: 3500,
          gk_dive: 1500, gk_knees: 1200, fall: 1500, get_up: 2000,
          throw_in: 4500
        };

        const duration = durations[action] || 1000;
        let p = elapsed / duration;

        const isOneShot = action !== 'idle' && action !== 'walk' && action !== 'run' && action !== 'jog' && action !== 'corte_parado' && action !== 'sit';

        if (isOneShot && p >= 1.0) {
          if (['fall', 'gk_knees', 'gk_dive'].includes(action)) {
            p = 1.0;
          } else {
            setActiveAction((prev) => {
              if (prev !== 'idle') {
                actionRef.current = 'idle';
                return 'idle';
              }
              return prev;
            });
            p = 1.0;
          }
        }

        if (!isOneShot) {
          ballGroup.position.x += (0 - ballGroup.position.x) * 0.12;
          ballGroup.position.y += (0.112 - ballGroup.position.y) * 0.12;
          ballGroup.position.z += (0.8 - ballGroup.position.z) * 0.12;
        }

        const basePlayerY = singlePlayerModel?.basePlayerY || 0.5;
        const torsoGrp = singlePlayerModel?.joints.torsoGrp;
        const shoulderGrpR = singlePlayerModel?.joints.shoulderGrpR;
        const shoulderGrpL = singlePlayerModel?.joints.shoulderGrpL;
        const elbowGrpR = singlePlayerModel?.joints.elbowGrpR;
        const elbowGrpL = singlePlayerModel?.joints.elbowGrpL;
        const wristGrpR = singlePlayerModel?.joints.wristGrpR;
        const wristGrpL = singlePlayerModel?.joints.wristGrpL;
        const hipGrpR = singlePlayerModel?.joints.hipGrpR;
        const hipGrpL = singlePlayerModel?.joints.hipGrpL;
        const kneeGrpR = singlePlayerModel?.joints.kneeGrpR;
        const kneeGrpL = singlePlayerModel?.joints.kneeGrpL;
        const ankleGrpR = singlePlayerModel?.joints.ankleGrpR;
        const ankleGrpL = singlePlayerModel?.joints.ankleGrpL;
        const characterGroup = singlePlayerModel?.group;

        if (characterGroup) {
          if (action === 'idle') {
            setAllLoopsToZero(singlePlayerModel, 0.1);
            characterGroup.position.x += (0 - characterGroup.position.x) * 0.1;
            characterGroup.position.y += (basePlayerY - characterGroup.position.y) * 0.1;
            characterGroup.position.z += (0 - characterGroup.position.z) * 0.1;
            characterGroup.rotation.x += (0 - characterGroup.rotation.x) * 0.1;
            characterGroup.rotation.z += (0 - characterGroup.rotation.z) * 0.1;

            let targetRotY = Math.PI / 2;
            let diff = targetRotY - characterGroup.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            characterGroup.rotation.y += diff * 0.1;
          }
          else if (action === 'walk' || action === 'jog' || action === 'run') {
            let phaseInc = 0.12;
            let swing = 0.58;
            let liftY = 0.04;
            let tiltX = 0;
            let rotY_torso = 0.12;
            let rotZ_torso = 0.04;

            if (action === 'run') {
              phaseInc = 0.2;
              swing = 0.9;
              liftY = 0.08;
              tiltX = 0.1;
              rotY_torso = 0.24;
              rotZ_torso = 0.08;
            } else if (action === 'jog') {
              phaseInc = 0.16;
              swing = 0.74;
              liftY = 0.06;
              tiltX = 0.05;
              rotY_torso = 0.18;
              rotZ_torso = 0.06;
            }

            walkPhase += phaseInc;
            shoulderGrpR.rotation.x = Math.sin(walkPhase) * swing;
            shoulderGrpL.rotation.x = -Math.sin(walkPhase) * swing;
            shoulderGrpR.position.z = Math.sin(walkPhase) * 0.3 * (1.75 / 10.265);
            shoulderGrpL.position.z = -Math.sin(walkPhase) * 0.3 * (1.75 / 10.265);
            elbowGrpR.rotation.y = -Math.max(0, -Math.sin(walkPhase)) * 1.0;
            elbowGrpL.rotation.y = Math.max(0, Math.sin(walkPhase)) * 1.0;
            hipGrpR.rotation.x = -Math.sin(walkPhase) * swing;
            hipGrpL.rotation.x = Math.sin(walkPhase) * swing;
            kneeGrpR.rotation.x = Math.max(0, Math.cos(walkPhase)) * 1.2;
            kneeGrpL.rotation.x = Math.max(0, -Math.cos(walkPhase)) * 1.2;
            ankleGrpR.rotation.x = -Math.sin(walkPhase) * 0.25 - Math.max(0, Math.cos(walkPhase)) * 0.2;
            ankleGrpL.rotation.x = Math.sin(walkPhase) * 0.25 - Math.max(0, -Math.cos(walkPhase)) * 0.2;
            characterGroup.position.y = basePlayerY + Math.abs(Math.sin(walkPhase)) * liftY;
            characterGroup.rotation.x = tiltX;

            torsoGrp.rotation.y = -Math.sin(walkPhase) * rotY_torso;
            torsoGrp.rotation.z = Math.cos(walkPhase) * rotZ_torso;
          }
          else if (action === 'corte_parado') {
            const rate = 0.15;
            setAllLoopsToZero(singlePlayerModel, rate);

            characterGroup.position.x += (0 - characterGroup.position.x) * rate;
            characterGroup.position.y += ((basePlayerY - 0.08 * (1.75 / 10.265)) - characterGroup.position.y) * rate;
            characterGroup.position.z += (0 - characterGroup.position.z) * rate;
            characterGroup.rotation.x += (0 - characterGroup.rotation.x) * rate;
            characterGroup.rotation.y += (Math.PI / 2 - characterGroup.rotation.y) * rate;
            characterGroup.rotation.z += (0 - characterGroup.rotation.z) * rate;

            torsoGrp.rotation.x += (0 - torsoGrp.rotation.x) * rate;
            torsoGrp.rotation.y += (0 - torsoGrp.rotation.y) * rate;
            torsoGrp.rotation.z += (0 - torsoGrp.rotation.z) * rate;

            hipGrpR.rotation.z += (0.45 - hipGrpR.rotation.z) * rate;
            hipGrpL.rotation.z += (-0.45 - hipGrpL.rotation.z) * rate;
            hipGrpR.rotation.x += (0 - hipGrpR.rotation.x) * rate;
            hipGrpL.rotation.x += (0 - hipGrpL.rotation.x) * rate;

            kneeGrpR.rotation.x += (0 - kneeGrpR.rotation.x) * rate;
            kneeGrpL.rotation.x += (0 - kneeGrpL.rotation.x) * rate;

            ankleGrpR.rotation.x += (0 - ankleGrpR.rotation.x) * rate;
            ankleGrpL.rotation.x += (0 - ankleGrpL.rotation.x) * rate;
            ankleGrpR.rotation.z += (-0.45 - ankleGrpR.rotation.z) * rate;
            ankleGrpL.rotation.z += (0.45 - ankleGrpL.rotation.z) * rate;
          }
          else if (action === 'kick') {
            if (p < 0.2) {
              let t = p / 0.2;
              characterGroup.position.x = lerp(0, 1.0 * (1.75 / 10.265), t);
              hipGrpL.rotation.x = lerp(0, -0.8, t);
              kneeGrpL.rotation.x = lerp(0, 0.2, t);
              hipGrpR.rotation.x = lerp(0, 0.5, t);
              kneeGrpR.rotation.x = lerp(0, 0.5, t);
              shoulderGrpR.rotation.x = lerp(0, -0.8, t);
              shoulderGrpL.rotation.x = lerp(0, 0.8, t);
              elbowGrpR.rotation.y = lerp(0, -0.5, t);
              elbowGrpL.rotation.y = lerp(0, 0.5, t);
            } else if (p < 0.4) {
              let t = (p - 0.2) / 0.2;
              characterGroup.position.x = lerp(1.0 * (1.75 / 10.265), 2.0 * (1.75 / 10.265), t);
              hipGrpL.rotation.x = lerp(-0.8, -0.2, t);
              kneeGrpL.rotation.x = lerp(0.2, 0.1, t);
              hipGrpR.rotation.x = lerp(0.5, 1.2, t);
              kneeGrpR.rotation.x = lerp(0.5, 1.5, t);
              shoulderGrpR.rotation.x = lerp(-0.8, -1.2, t);
              shoulderGrpL.rotation.x = lerp(0.8, 1.2, t);
              elbowGrpR.rotation.y = lerp(-0.5, -0.8, t);
              elbowGrpL.rotation.y = lerp(0.5, 0.8, t);
            } else if (p < 0.6) {
              let t = (p - 0.4) / 0.2;
              characterGroup.position.x = lerp(2.0 * (1.75 / 10.265), 2.3 * (1.75 / 10.265), t);
              hipGrpL.rotation.x = lerp(-0.2, 0.1, t);
              hipGrpR.rotation.x = lerp(1.2, -1.5, t);
              kneeGrpR.rotation.x = lerp(1.5, 0.1, t);
              shoulderGrpR.rotation.x = lerp(-1.2, 1.0, t);
              shoulderGrpL.rotation.x = lerp(1.2, -1.0, t);
              elbowGrpR.rotation.y = lerp(-0.8, -0.2, t);
              elbowGrpL.rotation.y = lerp(0.8, 0.2, t);
            } else {
              let t = (p - 0.6) / 0.4;
              characterGroup.position.x = lerp(2.3 * (1.75 / 10.265), 0, t);
              hipGrpL.rotation.x = lerp(0.1, 0, t);
              hipGrpR.rotation.x = lerp(-1.5, 0, t);
              kneeGrpR.rotation.x = lerp(0.1, 0, t);
              kneeGrpL.rotation.x = lerp(0.1, 0, t);
              shoulderGrpR.rotation.x = lerp(1.0, 0, t);
              shoulderGrpL.rotation.x = lerp(-1.0, 0, t);
              elbowGrpR.rotation.y = lerp(-0.2, 0, t);
              elbowGrpL.rotation.y = lerp(0.2, 0, t);
            }
          }
          else if (action === 'short_pass_normal') {
            if (p < 0.2) {
              let t = p / 0.2;
              characterGroup.position.z = lerp(0, 0.2 * (1.75 / 10.265), t);
              hipGrpL.rotation.x = lerp(0, -0.3, t);
              kneeGrpL.rotation.x = lerp(0, 0.1, t);
              hipGrpR.rotation.x = lerp(0, 0.3, t);
              kneeGrpR.rotation.x = lerp(0, 0.4, t);
              hipGrpR.rotation.y = lerp(0, 0.5, t);
              shoulderGrpR.rotation.x = lerp(0, -0.4, t);
              shoulderGrpL.rotation.x = lerp(0, 0.4, t);
              elbowGrpR.rotation.y = lerp(0, -0.3, t);
              elbowGrpL.rotation.y = lerp(0, 0.3, t);
              ballGroup.position.set(0, 0.11, 0.8);
            } else if (p < 0.4) {
              let t = (p - 0.2) / 0.2;
              characterGroup.position.z = lerp(0.2 * (1.75 / 10.265), 0.4 * (1.75 / 10.265), t);
              hipGrpL.rotation.x = lerp(-0.3, -0.1, t);
              kneeGrpL.rotation.x = lerp(0.1, 0.05, t);
              hipGrpR.rotation.x = lerp(0.3, 0.5, t);
              kneeGrpR.rotation.x = lerp(0.4, 0.6, t);
              hipGrpR.rotation.y = lerp(0.5, 0.8, t);
              shoulderGrpR.rotation.x = lerp(-0.4, -0.6, t);
              shoulderGrpL.rotation.x = lerp(0.4, 0.6, t);
              elbowGrpR.rotation.y = lerp(-0.3, -0.4, t);
              elbowGrpL.rotation.y = lerp(0.3, 0.4, t);
              ballGroup.position.set(0, 0.11, 0.8);
            } else if (p < 0.6) {
              let t = (p - 0.4) / 0.2;
              characterGroup.position.z = lerp(0.4 * (1.75 / 10.265), 0.5 * (1.75 / 10.265), t);
              hipGrpL.rotation.x = lerp(-0.1, 0.1, t);
              hipGrpR.rotation.x = lerp(0.5, -0.8, t);
              kneeGrpR.rotation.x = lerp(0.6, 0.1, t);
              hipGrpR.rotation.y = 0.8;
              shoulderGrpR.rotation.x = lerp(-0.6, 0.5, t);
              shoulderGrpL.rotation.x = lerp(0.6, -0.5, t);
              ballGroup.position.set(0, 0.11, lerp(0.8, 3.5, t));
            } else {
              let t = (p - 0.6) / 0.4;
              characterGroup.position.z = lerp(0.5 * (1.75 / 10.265), 0, t);
              hipGrpL.rotation.x = lerp(0.1, 0, t);
              hipGrpR.rotation.x = lerp(-0.8, 0, t);
              kneeGrpR.rotation.x = lerp(0.1, 0, t);
              kneeGrpL.rotation.x = lerp(0.05, 0, t);
              hipGrpR.rotation.y = lerp(0.8, 0, t);
              shoulderGrpR.rotation.x = lerp(0.5, 0, t);
              shoulderGrpL.rotation.x = lerp(-0.5, 0, t);
              elbowGrpR.rotation.y = lerp(-0.4, 0, t);
              elbowGrpL.rotation.y = lerp(0.4, 0, t);
              ballGroup.position.set(0, 0.11, lerp(3.5, 4.5, t));
            }
          }
          else if (action === 'short_pass_trivela') {
            if (p < 0.2) {
              let t = p / 0.2;
              characterGroup.position.z = lerp(0, 0.2 * (1.75 / 10.265), t);
              hipGrpL.rotation.x = lerp(0, -0.3, t);
              kneeGrpL.rotation.x = lerp(0, 0.1, t);
              hipGrpR.rotation.x = lerp(0, 0.3, t);
              kneeGrpR.rotation.x = lerp(0, 0.4, t);
              hipGrpR.rotation.y = lerp(0, -0.5, t);
              shoulderGrpR.rotation.x = lerp(0, -0.4, t);
              shoulderGrpL.rotation.x = lerp(0, 0.4, t);
              elbowGrpR.rotation.y = lerp(0, -0.3, t);
              elbowGrpL.rotation.y = lerp(0, 0.3, t);
              ballGroup.position.set(0, 0.11, 0.8);
            } else if (p < 0.4) {
              let t = (p - 0.2) / 0.2;
              characterGroup.position.z = lerp(0.2 * (1.75 / 10.265), 0.4 * (1.75 / 10.265), t);
              hipGrpL.rotation.x = lerp(-0.3, -0.1, t);
              kneeGrpL.rotation.x = lerp(0.1, 0.05, t);
              hipGrpR.rotation.x = lerp(0.3, 0.5, t);
              kneeGrpR.rotation.x = lerp(0.4, 0.6, t);
              hipGrpR.rotation.y = lerp(-0.5, -0.8, t);
              shoulderGrpR.rotation.x = lerp(-0.4, -0.6, t);
              shoulderGrpL.rotation.x = lerp(0.4, 0.6, t);
              elbowGrpR.rotation.y = lerp(-0.3, -0.4, t);
              elbowGrpL.rotation.y = lerp(0.3, 0.4, t);
              ballGroup.position.set(0, 0.11, 0.8);
            } else if (p < 0.6) {
              let t = (p - 0.4) / 0.2;
              characterGroup.position.z = lerp(0.4 * (1.75 / 10.265), 0.5 * (1.75 / 10.265), t);
              hipGrpL.rotation.x = lerp(-0.1, 0.1, t);
              hipGrpR.rotation.x = lerp(0.5, -0.8, t);
              kneeGrpR.rotation.x = lerp(0.6, 0.1, t);
              hipGrpR.rotation.y = -0.8;
              shoulderGrpR.rotation.x = lerp(-0.6, 0.5, t);
              shoulderGrpL.rotation.x = lerp(0.6, -0.5, t);
              let trivelaCurveX = Math.sin(t * Math.PI) * 0.45;
              ballGroup.position.set(trivelaCurveX, 0.11, lerp(0.8, 3.5, t));
            } else {
              let t = (p - 0.6) / 0.4;
              characterGroup.position.z = lerp(0.5 * (1.75 / 10.265), 0, t);
              hipGrpL.rotation.x = lerp(0.1, 0, t);
              hipGrpR.rotation.x = lerp(-0.8, 0, t);
              kneeGrpR.rotation.x = lerp(0.1, 0, t);
              kneeGrpL.rotation.x = lerp(0.05, 0, t);
              hipGrpR.rotation.y = lerp(-0.8, 0, t);
              shoulderGrpR.rotation.x = lerp(0.5, 0, t);
              shoulderGrpL.rotation.x = lerp(-0.5, 0, t);
              elbowGrpR.rotation.y = lerp(-0.4, 0, t);
              elbowGrpL.rotation.y = lerp(0.4, 0, t);
              ballGroup.position.set(0.45 + lerp(0, 0.35, t), 0.11, lerp(3.5, 4.5, t));
            }
          }
          else if (action === 'header') {
            if (p < 0.2) {
              let t = p / 0.2;
              characterGroup.position.y = lerp(basePlayerY, basePlayerY - 0.15, t);
              characterGroup.rotation.x = lerp(0, 0.12, t);
              shoulderGrpR.rotation.x = lerp(0, 0.5, t);
              shoulderGrpL.rotation.x = lerp(0, 0.5, t);
              hipGrpR.rotation.x = lerp(0, -0.6, t);
              hipGrpL.rotation.x = lerp(0, -0.6, t);
              kneeGrpR.rotation.x = lerp(0, 1.2, t);
              kneeGrpL.rotation.x = lerp(0, 1.2, t);
            } else if (p < 0.5) {
              let t = (p - 0.2) / 0.3;
              characterGroup.position.y = lerp(basePlayerY - 0.15, basePlayerY + 0.5, Math.sin(t * Math.PI / 2));
              characterGroup.rotation.x = lerp(0.12, -0.25, t);
              shoulderGrpR.rotation.x = lerp(0.5, -1.0, t);
              shoulderGrpL.rotation.x = lerp(0.5, -1.0, t);
              elbowGrpR.rotation.y = lerp(0, -1.5, t);
              elbowGrpL.rotation.y = lerp(0, 1.5, t);
              hipGrpR.rotation.x = lerp(-0.6, 0.2, t);
              hipGrpL.rotation.x = lerp(-0.6, 0.5, t);
              kneeGrpR.rotation.x = lerp(1.2, 0.2, t);
              kneeGrpL.rotation.x = lerp(1.2, 1.0, t);
            } else if (p < 0.7) {
              let t = (p - 0.5) / 0.2;
              characterGroup.position.y = lerp(basePlayerY + 0.5, basePlayerY + 0.45, t);
              characterGroup.rotation.x = lerp(-0.25, 0.32, t);
              shoulderGrpR.rotation.x = lerp(-1.0, 0.5, t);
              shoulderGrpL.rotation.x = lerp(-1.0, 0.5, t);
              elbowGrpR.rotation.y = lerp(-1.5, -0.5, t);
              elbowGrpL.rotation.y = lerp(1.5, 0.5, t);
            } else {
              let t = (p - 0.7) / 0.3;
              characterGroup.position.y = lerp(basePlayerY + 0.45, basePlayerY, t);
              characterGroup.rotation.x = lerp(0.32, 0, t);
              setAllLoopsToZero(singlePlayerModel, 0.2);
            }
          }
          else if (action === 'header_standing') {
            if (p < 0.3) {
              let t = p / 0.3;
              characterGroup.position.y = lerp(basePlayerY, basePlayerY - 0.4 * (1.75 / 10.265), t);
              torsoGrp.rotation.x = lerp(0, -0.4, t);
              shoulderGrpR.rotation.x = lerp(0, -0.2, t);
              shoulderGrpL.rotation.x = lerp(0, -0.2, t);
              hipGrpR.rotation.x = lerp(0, -0.6, t);
              kneeGrpR.rotation.x = lerp(0, 0.3, t);
              hipGrpL.rotation.x = lerp(0, 0.6, t);
              kneeGrpL.rotation.x = lerp(0, 0.3, t);
              elbowGrpR.rotation.y = lerp(0, -1.2, t);
              elbowGrpL.rotation.y = lerp(0, 1.2, t);
            } else if (p < 0.6) {
              let t = (p - 0.3) / 0.3;
              characterGroup.position.y = basePlayerY - 0.4 * (1.75 / 10.265);
              torsoGrp.rotation.x = lerp(-0.4, 0.5, t);
              shoulderGrpR.rotation.x = lerp(-0.2, 0.2, t);
              shoulderGrpL.rotation.x = lerp(-0.2, 0.2, t);
              hipGrpR.rotation.x = -0.6;
              kneeGrpR.rotation.x = 0.3;
              hipGrpL.rotation.x = 0.6;
              kneeGrpL.rotation.x = 0.3;
              elbowGrpR.rotation.y = lerp(-1.2, -0.5, t);
              elbowGrpL.rotation.y = lerp(1.2, 0.5, t);
            } else {
              let t = (p - 0.6) / 0.4;
              characterGroup.position.y = lerp(basePlayerY - 0.4 * (1.75 / 10.265), basePlayerY, t);
              torsoGrp.rotation.x = lerp(0.5, 0, t);
              setAllLoopsToZero(singlePlayerModel, 0.2);
            }
          }
          else if (action === 'chest_trap') {
            if (p < 0.1) {
              let t = p / 0.1;
              torsoGrp.rotation.x = lerp(0, -0.3, t);
              hipGrpR.rotation.z = lerp(0, 0.15, t);
              hipGrpL.rotation.z = lerp(0, -0.15, t);
              shoulderGrpR.rotation.x = lerp(0, -0.2, t);
              shoulderGrpL.rotation.x = lerp(0, -0.2, t);
              shoulderGrpR.rotation.z = lerp(0, 0.4, t);
              shoulderGrpL.rotation.z = lerp(0, -0.4, t);
              elbowGrpR.rotation.y = lerp(0, -1.0, t);
              elbowGrpL.rotation.y = lerp(0, 1.0, t);
              ballGroup.position.set(lerp(4, 0.4, t), lerp(4, basePlayerY + 0.3 * (1.75 / 10.265), t), 0);
            } else if (p < 0.9) {
              let t = (p - 0.1) / 0.8;
              torsoGrp.rotation.x = -0.3;
              hipGrpR.rotation.z = 0.15;
              hipGrpL.rotation.z = -0.15;
              shoulderGrpR.rotation.x = -0.2;
              shoulderGrpL.rotation.x = -0.2;
              shoulderGrpR.rotation.z = 0.4;
              shoulderGrpL.rotation.z = -0.4;
              elbowGrpR.rotation.y = -1.0;
              elbowGrpL.rotation.y = 1.0;

              if (p < 0.2) {
                let bt = (p - 0.1) / 0.1;
                ballGroup.position.set(lerp(0.4, 0.6, bt), lerp(basePlayerY + 0.3 * (1.75 / 10.265), 0.11, Math.pow(bt, 2)), 0);
              } else {
                ballGroup.position.set(0.6, 0.11, 0);
              }
            } else {
              let t = (p - 0.9) / 0.1;
              torsoGrp.rotation.x = lerp(-0.3, 0, t);
              hipGrpR.rotation.z = lerp(0.15, 0, t);
              hipGrpL.rotation.z = lerp(-0.15, 0, t);
              shoulderGrpR.rotation.x = lerp(-0.2, 0, t);
              shoulderGrpL.rotation.x = lerp(-0.2, 0, t);
              shoulderGrpR.rotation.z = lerp(0.4, 0, t);
              shoulderGrpL.rotation.z = lerp(-0.4, 0, t);
              elbowGrpR.rotation.y = lerp(-1.0, 0, t);
              elbowGrpL.rotation.y = lerp(1.0, 0, t);
              ballGroup.position.set(0.6, 0.11, 0);
            }
          }
          else if (action === 'throw_in') {
            if (p < 0.1) {
              let t = p / 0.1;
              torsoGrp.rotation.x = 0;
              shoulderGrpR.rotation.x = lerp(0, -0.78, t);
              shoulderGrpL.rotation.x = lerp(0, -0.78, t);
              shoulderGrpR.rotation.z = lerp(0, -0.15, t);
              shoulderGrpL.rotation.z = lerp(0, 0.15, t);
              elbowGrpR.rotation.y = lerp(0, -1.2, t);
              elbowGrpL.rotation.y = lerp(0, 1.2, t);
              ballGroup.position.set(0, basePlayerY - 0.2, 0.4);
            } else if (p < 0.2) {
              let t = (p - 0.1) / 0.1;
              torsoGrp.rotation.x = lerp(0, -0.3, t);
              shoulderGrpR.rotation.x = lerp(-0.78, -2.5, t);
              shoulderGrpL.rotation.x = lerp(-0.78, -2.5, t);
              shoulderGrpR.rotation.z = -0.15;
              shoulderGrpL.rotation.z = 0.15;
              elbowGrpR.rotation.y = lerp(-1.2, -2.0, t);
              elbowGrpL.rotation.y = lerp(1.2, 2.0, t);
              ballGroup.position.set(0, lerp(basePlayerY - 0.2, basePlayerY + 0.5 * (1.75 / 10.265), t), lerp(0.4, -0.3, t));
            } else if (p < 0.8) {
              torsoGrp.rotation.x = -0.3;
              shoulderGrpR.rotation.x = -2.5;
              shoulderGrpL.rotation.x = -2.5;
              shoulderGrpR.rotation.z = -0.15;
              shoulderGrpL.rotation.z = 0.15;
              elbowGrpR.rotation.y = -2.0;
              elbowGrpL.rotation.y = 2.0;
              ballGroup.position.set(0, basePlayerY + 0.5 * (1.75 / 10.265), -0.3);
            } else if (p < 0.85) {
              let t = (p - 0.8) / 0.05;
              torsoGrp.rotation.x = lerp(-0.3, 0.3, t);
              shoulderGrpR.rotation.x = lerp(-2.5, 0, t);
              shoulderGrpL.rotation.x = lerp(-2.5, 0, t);
              shoulderGrpR.rotation.z = lerp(-0.15, -0.05, t);
              shoulderGrpL.rotation.z = lerp(0.15, 0.05, t);
              elbowGrpR.rotation.y = lerp(-2.0, -0.2, t);
              elbowGrpL.rotation.y = lerp(2.0, 0.2, t);
              ballGroup.position.set(0, lerp(basePlayerY + 0.5 * (1.75 / 10.265), basePlayerY + 0.3 * (1.75 / 10.265), t), lerp(-0.3, 2.0, t));
            } else {
              let t = (p - 0.85) / 0.15;
              torsoGrp.rotation.x = lerp(0.3, 0, t);
              shoulderGrpR.rotation.x = 0;
              shoulderGrpL.rotation.x = 0;
              shoulderGrpR.rotation.z = lerp(-0.05, 0, t);
              shoulderGrpL.rotation.z = lerp(0.05, 0, t);
              elbowGrpR.rotation.y = lerp(-0.2, 0, t);
              elbowGrpL.rotation.y = lerp(0.2, 0, t);
              setAllLoopsToZero(singlePlayerModel, 0.1);
              ballGroup.position.set(0, lerp(basePlayerY + 0.3 * (1.75 / 10.265), 0.11, Math.pow(t, 2)), lerp(2.0, 3.0, t));
            }
          }
          else if (action === 'tackle') {
            if (p < 0.15) {
              let t = p / 0.15;
              torsoGrp.rotation.x = lerp(0, 0.35, t);
              characterGroup.position.y = lerp(basePlayerY, basePlayerY * 0.75, t);
              characterGroup.position.z = lerp(0, 0.3 * (1.75 / 10.265), t);
              hipGrpL.rotation.x = lerp(0, -0.5, t);
              kneeGrpL.rotation.x = lerp(0, 0.3, t);
              hipGrpR.rotation.x = lerp(0, 0.5, t);
              kneeGrpR.rotation.x = lerp(0, 0.6, t);
              shoulderGrpR.rotation.x = lerp(0, -0.4, t);
              shoulderGrpL.rotation.x = lerp(0, 0.4, t);
              ballGroup.position.set(0, 0.11, 0.8);
            } else if (p < 0.35) {
              let t = (p - 0.15) / 0.20;
              characterGroup.position.y = lerp(basePlayerY * 0.75, 0.2, t);
              characterGroup.position.z = lerp(0.3 * (1.75 / 10.265), 1.3 * (1.75 / 10.265), t);
              characterGroup.rotation.x = lerp(0, Math.PI / 2 - 0.2, t);
              characterGroup.rotation.z = lerp(0, -0.4, t);
              torsoGrp.rotation.x = lerp(0.35, 0, t);
              hipGrpR.rotation.x = lerp(0.5, -0.6, t);
              kneeGrpR.rotation.x = lerp(0.6, 0, t);
              hipGrpL.rotation.x = lerp(-0.5, -0.2, t);
              kneeGrpL.rotation.x = lerp(0.3, 1.5, t);
              shoulderGrpR.rotation.x = lerp(-0.4, -1.2, t);
              shoulderGrpL.rotation.x = lerp(0.4, -1.2, t);
              ballGroup.position.set(0, 0.11, 0.8);
            } else if (p < 0.65) {
              let t = (p - 0.35) / 0.30;
              characterGroup.position.y = 0.2;
              characterGroup.position.z = lerp(1.3 * (1.75 / 10.265), 3.2 * (1.75 / 10.265), t);
              characterGroup.rotation.x = Math.PI / 2 - 0.2;
              characterGroup.rotation.z = -0.4;
              hipGrpR.rotation.x = -0.6;
              kneeGrpR.rotation.x = 0;
              hipGrpL.rotation.x = -0.2;
              kneeGrpL.rotation.x = 1.5;
              shoulderGrpR.rotation.x = -1.2;
              shoulderGrpL.rotation.x = -1.2;
              ballGroup.position.set(0, 0.11, lerp(0.8, 4.0, t));
            } else {
              let t = (p - 0.65) / 0.35;
              characterGroup.position.y = lerp(0.2, basePlayerY, t);
              characterGroup.position.z = lerp(3.2 * (1.75 / 10.265), 4.0 * (1.75 / 10.265), t);
              characterGroup.rotation.x = lerp(Math.PI / 2 - 0.2, 0, t);
              characterGroup.rotation.z = lerp(-0.4, 0, t);
              hipGrpR.rotation.x = lerp(-0.6, 0, t);
              kneeGrpR.rotation.x = 0;
              hipGrpL.rotation.x = lerp(-0.2, 0, t);
              kneeGrpL.rotation.x = lerp(1.5, 0, t);
              shoulderGrpR.rotation.x = lerp(-1.2, 0, t);
              shoulderGrpL.rotation.x = lerp(-1.2, 0, t);
              ballGroup.position.set(0, 0.11, lerp(4.0, 5.5, t));
            }
          }
          else if (action === 'sit') {
            const rate = 0.15;
            hipGrpR.rotation.x += (-Math.PI / 2 - hipGrpR.rotation.x) * rate;
            hipGrpL.rotation.x += (-Math.PI / 2 - hipGrpL.rotation.x) * rate;
            kneeGrpR.rotation.x += (Math.PI / 2 - kneeGrpR.rotation.x) * rate;
            kneeGrpL.rotation.x += (Math.PI / 2 - kneeGrpL.rotation.x) * rate;
            torsoGrp.rotation.x += (0.05 - torsoGrp.rotation.x) * rate;
            shoulderGrpR.rotation.x += (-0.2 - shoulderGrpR.rotation.x) * rate;
            shoulderGrpL.rotation.x += (-0.2 - shoulderGrpL.rotation.x) * rate;
            shoulderGrpR.rotation.z += (0.1 - shoulderGrpR.rotation.z) * rate;
            shoulderGrpL.rotation.z += (-0.1 - shoulderGrpL.rotation.z) * rate;
            elbowGrpR.rotation.y += (-0.5 - elbowGrpR.rotation.y) * rate;
            elbowGrpL.rotation.y += (0.5 - elbowGrpL.rotation.y) * rate;
            hipGrpR.rotation.y += (0 - hipGrpR.rotation.y) * rate;
            hipGrpL.rotation.y += (0 - hipGrpL.rotation.y) * rate;
            hipGrpR.rotation.z += (0 - hipGrpR.rotation.z) * rate;
            hipGrpL.rotation.z += (0 - hipGrpL.rotation.z) * rate;
            ankleGrpR.rotation.x += (0 - ankleGrpR.rotation.x) * rate;
            ankleGrpL.rotation.x += (0 - ankleGrpL.rotation.x) * rate;

            const targetX = 58.7;
            const targetY = 0.85 + basePlayerY - 0.55 * (1.75 / 10.265);
            const targetZ = 0;

            characterGroup.position.x += (targetX - characterGroup.position.x) * rate;
            characterGroup.position.y += (targetY - characterGroup.position.y) * rate;
            characterGroup.position.z += (targetZ - characterGroup.position.z) * rate;
            characterGroup.rotation.x += (0 - characterGroup.rotation.x) * rate;
            characterGroup.rotation.z += (0 - characterGroup.rotation.z) * rate;

            let targetRotY = -Math.PI / 2;
            let diff = targetRotY - characterGroup.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            characterGroup.rotation.y += diff * rate;
          }
        }

        if (singlePlayerModel && singlePlayerModel.group) {
          controls.target.copy(singlePlayerModel.group.position);
          controls.target.y += 0.875;
        }
        controls.update();
      }

      // Rotate ball based on its actual movement in the frame
      // Scale the ball based on camera mode (tactical camera increases size by 100%)
      let ballScale = 1.4;
      if (cameraModeRef.current === 'topDown') {
        ballGroup.scale.set(4.0, 4.0, 4.0);
        ballScale = 4.0;
      } else {
        ballGroup.scale.set(1.4, 1.4, 1.4);
      }

      // Rotate ball based on its actual movement in the frame (physics-based direction)
      const ballRadius = 0.1114 * ballScale; // 70cm circ = 11.14cm radius
      const ballDisp = new THREE.Vector3().copy(ballGroup.position).sub(lastBallPos);
      const ballDistMoved = ballDisp.length();
      if (ballDistMoved > 0.001) {
        const axis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), ballDisp.normalize()).normalize();
        if (axis.lengthSq() > 0.1) {
          ballGroup.rotateOnWorldAxis(axis, ballDistMoved / ballRadius);
        } else {
          ballGroup.rotation.x += ballDistMoved / ballRadius;
        }
      }
      lastBallPos.copy(ballGroup.position);

      renderer.render(scene, camera);
    };

    animate();

    // Wheel listener for zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoomFactor(prev => Math.max(0.1, Math.min(4.0, prev + e.deltaY * 0.0015)));
    };

    const mountEl = mountRef.current;
    if (mountEl) {
      mountEl.addEventListener('wheel', handleWheel, { passive: false });
    }

    // Keyboard controls for switching cameras
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '4') {
        setCameraMode('tv');
      } else if (e.key === '5') {
        setCameraMode('free');
      } else if (e.key === '6') {
        setCameraMode('topDown');
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (mountEl) {
        mountEl.removeEventListener('wheel', handleWheel);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualStateRef, homeTeam?.id, awayTeam?.id, players?.length]);

  return (
    <div className="w-full h-full relative bg-slate-900 overflow-hidden font-sans">
      <div ref={mountRef} className="absolute inset-0 cursor-crosshair outline-none" />

      {/* UI Overlay - Only show in standalone mode */}
      {!visualStateRef && (
        <div className="absolute top-0 left-0 h-full w-[340px] bg-slate-900/80 backdrop-blur-md border-r border-slate-700/50 p-6 flex flex-col z-10 shadow-2xl overflow-y-auto">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent mb-1">
            Soccer3D Core
          </h1>
          <p className="text-sm text-slate-400 mb-8 font-medium">
            Motion Control System
          </p>

          <div className="flex flex-col gap-2">
            {ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => setAction(action.id)}
                className={`
                  group flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300
                  ${activeAction === action.id
                    ? 'bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.5)] translate-x-2'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white hover:translate-x-1'
                  }
                `}
              >
                <span>{action.label}</span>
                <Play
                  size={16}
                  className={`transition-transform duration-300 ${activeAction === action.id ? 'opacity-100 scale-110 text-white' : 'opacity-40 group-hover:opacity-100'}`}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
