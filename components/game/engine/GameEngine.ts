import * as THREE from 'three';
import { GAME, type ActionState, type GamePhase, type ObstacleKind } from './config';
import { animateObstacle, createBird, createCactus, type ActiveObstacle } from './obstacles';

export interface GameSnapshot { phase: GamePhase; score: number; highScore: number; speed: number; action: ActionState; }

export class GameEngine {
  private host: HTMLElement;
  private onSnapshot: (snapshot: GameSnapshot) => void;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(68, 1, 0.1, 180);
  private timer = new THREE.Timer();
  private frame = 0;
  private phase: GamePhase = 'ready';
  private action: ActionState = 'run';
  private actionTime = 0;
  private distance = 0;
  private speed: number = GAME.baseSpeed;
  private highScore = 0;
  private obstacles: ActiveObstacle[] = [];
  private trackMarkers: THREE.Object3D[] = [];
  private nextSpawnIn = 34;
  private lastSnapshot = 0;
  private crashedAt = 0;

  constructor(host: HTMLElement, onSnapshot: (snapshot: GameSnapshot) => void) {
    this.host = host; this.onSnapshot = onSnapshot;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(this.renderer.domElement);
    this.setupScene(); this.resize(); window.addEventListener('resize', this.resize);
    this.highScore = Number(localStorage.getItem('no-signal-high') || 0); this.emit(true);
    this.timer.connect(document); this.timer.update(); this.frame = requestAnimationFrame(this.loop);
  }

  private setupScene() {
    this.scene.background = new THREE.Color(0x17191c); this.scene.fog = new THREE.FogExp2(0x17191c, 0.022);
    this.camera.position.set(0, GAME.eyeHeight, 2.5); this.camera.lookAt(0, 1.25, -26);
    const hemi = new THREE.HemisphereLight(0xece9df, 0x30333a, 2.5);
    const key = new THREE.DirectionalLight(0xffffff, 3.6); key.position.set(-4, 8, 4); key.castShadow = true;
    this.scene.add(hemi, key);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(13, 190), new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.z = -78; floor.receiveShadow = true; this.scene.add(floor);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x686965, transparent: true, opacity: 0.68 });
    for (let row = 0; row < 28; row += 1) {
      const z = -row * 6;
      for (const x of [-5.8, 5.8]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 1.2), lineMaterial); post.position.set(x, 0.025, z); this.scene.add(post); this.trackMarkers.push(post); }
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 1.7), lineMaterial); dash.position.set(0, 0.015, z); this.scene.add(dash); this.trackMarkers.push(dash);
    }
    const horizon = new THREE.Mesh(new THREE.RingGeometry(16, 16.04, 64, 1, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x575954, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
    horizon.position.set(0, -1.8, -85); this.scene.add(horizon);
    const dustMaterial = new THREE.PointsMaterial({ color: 0xbfc0ba, size: 0.055, transparent: true, opacity: 0.38 });
    const dustPositions = new Float32Array(270);
    for (let i = 0; i < dustPositions.length; i += 3) { dustPositions[i] = (Math.random() - 0.5) * 42; dustPositions[i + 1] = Math.random() * 10; dustPositions[i + 2] = -Math.random() * 150; }
    const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3)); this.scene.add(new THREE.Points(dustGeometry, dustMaterial));
  }

  start = () => { if (this.phase === 'running') return; this.clearObstacles(); this.phase = 'running'; this.action = 'run'; this.actionTime = 0; this.distance = 0; this.speed = GAME.baseSpeed; this.nextSpawnIn = 36; this.timer.reset(); this.emit(true); };
  primaryAction = () => { if (this.phase === 'running') this.jump(); else this.start(); };
  jump = () => { if (this.phase !== 'running' || this.action !== 'run') return; this.action = 'jump'; this.actionTime = 0; this.emit(true); };
  duck = () => { if (this.phase !== 'running' || this.action === 'jump') return; this.action = 'duck'; this.actionTime = 0; this.emit(true); };

  private updatePlayer(delta: number) {
    this.actionTime += delta; let eyeY: number = GAME.eyeHeight;
    if (this.action === 'jump') { const progress = Math.min(this.actionTime / GAME.jumpDuration, 1); eyeY += Math.sin(progress * Math.PI) * GAME.jumpHeight; if (progress >= 1) { this.action = 'run'; this.actionTime = 0; } }
    else if (this.action === 'duck') { eyeY = GAME.duckEyeHeight; if (this.actionTime >= GAME.duckDuration) { this.action = 'run'; this.actionTime = 0; } }
    const bob = this.action === 'run' ? Math.sin(this.distance * 0.72) * 0.025 : 0;
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, eyeY + bob, Math.min(delta * 22, 1)); this.camera.rotation.z = Math.sin(this.distance * 0.38) * 0.0025;
  }

  private moveTrack(delta: number) { for (const marker of this.trackMarkers) { marker.position.z += this.speed * delta; if (marker.position.z > 8) marker.position.z -= 168; } }

  private updateObstacles(delta: number, elapsed: number) {
    this.nextSpawnIn -= this.speed * delta; if (this.nextSpawnIn <= 0) this.spawnObstacle();
    for (let i = this.obstacles.length - 1; i >= 0; i -= 1) {
      const obstacle = this.obstacles[i]; obstacle.group.position.z += this.speed * delta; animateObstacle(obstacle, elapsed);
      if (!obstacle.passed && obstacle.group.position.z > 1.1) obstacle.passed = true;
      if (this.collides(obstacle)) { this.crash(); return; }
      if (obstacle.group.position.z > 12) { this.scene.remove(obstacle.group); this.disposeGroup(obstacle.group); this.obstacles.splice(i, 1); }
    }
  }

  private spawnObstacle() {
    let obstacle: ActiveObstacle;
    if (this.distance >= GAME.pterodactylUnlock && Math.random() < 0.42) { const kinds: Exclude<ObstacleKind, 'cactus'>[] = ['bird-low', 'bird-mid', 'bird-high']; obstacle = createBird(kinds[Math.floor(Math.random() * kinds.length)]); }
    else { const maxCluster = this.distance >= GAME.clusterUnlock ? 3 : 1; obstacle = createCactus(1 + Math.floor(Math.random() * maxCluster)); }
    obstacle.group.traverse((child) => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; } });
    this.scene.add(obstacle.group); this.obstacles.push(obstacle);
    this.nextSpawnIn = GAME.initialGap + this.speed * (1.65 + Math.random() * 0.82);
  }

  private collides(obstacle: ActiveObstacle) {
    if (Math.abs(obstacle.group.position.z - 1.9) > obstacle.halfDepth + GAME.playerDepth / 2) return false;
    let playerBottom = 0; let playerHeight: number = GAME.playerHeight;
    if (this.action === 'jump') { const p = Math.min(this.actionTime / GAME.jumpDuration, 1); playerBottom = Math.sin(p * Math.PI) * GAME.jumpHeight; }
    else if (this.action === 'duck') playerHeight = GAME.duckHeight;
    const obstacleCenter = obstacle.kind === 'cactus' ? obstacle.centerY : obstacle.group.position.y;
    const obstacleBottom = obstacleCenter - obstacle.halfHeight; const obstacleTop = obstacleCenter + obstacle.halfHeight;
    return playerBottom + playerHeight > obstacleBottom && playerBottom < obstacleTop;
  }

  private crash() { this.phase = 'over'; this.crashedAt = performance.now(); this.highScore = Math.max(this.highScore, Math.floor(this.distance)); localStorage.setItem('no-signal-high', String(this.highScore)); if ('vibrate' in navigator) navigator.vibrate?.(70); this.emit(true); }
  private emit(force = false) { const now = performance.now(); if (!force && now - this.lastSnapshot < 80) return; this.lastSnapshot = now; this.onSnapshot({ phase: this.phase, score: Math.floor(this.distance), highScore: this.highScore, speed: this.speed, action: this.action }); }

  private loop = () => {
    this.timer.update(); const delta = Math.min(this.timer.getDelta(), 0.035); const elapsed = this.timer.getElapsed();
    if (this.phase === 'running') { this.distance += this.speed * delta; this.speed = Math.min(GAME.maxSpeed, GAME.baseSpeed + this.distance * GAME.speedGain); this.updatePlayer(delta); this.moveTrack(delta); this.updateObstacles(delta, elapsed); this.emit(); }
    else { const drift = this.phase === 'ready' ? 2.2 : Math.max(0, 2.2 - (performance.now() - this.crashedAt) / 350); this.moveTrack(delta * drift * 0.08); this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, GAME.eyeHeight, Math.min(delta * 5, 1)); }
    this.renderer.render(this.scene, this.camera); this.frame = requestAnimationFrame(this.loop);
  };

  private resize = () => { const width = this.host.clientWidth; const height = this.host.clientHeight; this.camera.aspect = width / Math.max(height, 1); this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height, false); };
  private disposeGroup(group: THREE.Group) { group.traverse((child) => { if (child instanceof THREE.Mesh) child.geometry.dispose(); }); }
  private clearObstacles() { for (const obstacle of this.obstacles) { this.scene.remove(obstacle.group); this.disposeGroup(obstacle.group); } this.obstacles = []; }
  destroy() { cancelAnimationFrame(this.frame); window.removeEventListener('resize', this.resize); this.clearObstacles(); this.timer.dispose(); this.renderer.dispose(); this.renderer.domElement.remove(); }
}
