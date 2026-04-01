import * as THREE from 'three';
import { PLAYER_HEIGHT, WALL_HEIGHT } from '../core/constants.js';
import type { PlayerSnapshot } from '../../shared/protocol.js';

interface RemotePlayer {
  mesh: THREE.Mesh;
  label: THREE.Sprite;
  lastSnapshot: PlayerSnapshot;
  prevSnapshot: PlayerSnapshot | null;
  interpTime: number;
}

const INTERP_DURATION = 0.05; // 50ms = 20Hz tick

export class RemotePlayerRenderer {
  private scene: THREE.Scene;
  private players = new Map<string, RemotePlayer>();
  private myId = '';

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setMyId(id: string): void {
    this.myId = id;
  }

  update(snapshots: PlayerSnapshot[], dt: number): void {
    const activeIds = new Set<string>();

    for (const snap of snapshots) {
      if (snap.id === this.myId) continue;
      activeIds.add(snap.id);

      let rp = this.players.get(snap.id);
      if (!rp) {
        rp = this.createPlayer(snap);
        this.players.set(snap.id, rp);
      }

      // Update interpolation
      rp.prevSnapshot = { ...rp.lastSnapshot };
      rp.lastSnapshot = snap;
      rp.interpTime = 0;

      rp.mesh.visible = snap.alive;
      rp.label.visible = snap.alive;
    }

    // Remove players no longer in snapshot
    for (const [id, rp] of this.players) {
      if (!activeIds.has(id)) {
        this.scene.remove(rp.mesh);
        this.scene.remove(rp.label);
        rp.mesh.geometry.dispose();
        (rp.mesh.material as THREE.Material).dispose();
        rp.label.material.dispose();
        this.players.delete(id);
      }
    }

    // Interpolate positions
    for (const rp of this.players.values()) {
      rp.interpTime += dt;
      const t = Math.min(rp.interpTime / INTERP_DURATION, 1);

      if (rp.prevSnapshot) {
        rp.mesh.position.x = rp.prevSnapshot.x + (rp.lastSnapshot.x - rp.prevSnapshot.x) * t;
        rp.mesh.position.z = rp.prevSnapshot.z + (rp.lastSnapshot.z - rp.prevSnapshot.z) * t;
      } else {
        rp.mesh.position.x = rp.lastSnapshot.x;
        rp.mesh.position.z = rp.lastSnapshot.z;
      }
      rp.mesh.position.y = PLAYER_HEIGHT;

      // Label follows mesh
      rp.label.position.copy(rp.mesh.position);
      rp.label.position.y = WALL_HEIGHT + 0.1;
    }
  }

  private createPlayer(snap: PlayerSnapshot): RemotePlayer {
    // Simple colored plane sprite for other players
    const geo = new THREE.PlaneGeometry(0.8, 1.0);
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;

    // Draw a simple player silhouette
    ctx.fillStyle = '#3366CC';
    ctx.fillRect(8, 0, 16, 12); // head
    ctx.fillRect(4, 12, 24, 20); // body
    ctx.fillRect(4, 32, 10, 8); // left leg
    ctx.fillRect(18, 32, 10, 8); // right leg

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(snap.x, PLAYER_HEIGHT, snap.z);
    this.scene.add(mesh);

    // Name label
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 128;
    labelCanvas.height = 32;
    const lctx = labelCanvas.getContext('2d')!;
    lctx.fillStyle = '#ffffff';
    lctx.font = 'bold 20px monospace';
    lctx.textAlign = 'center';
    lctx.fillText(snap.name, 64, 22);

    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true });
    const label = new THREE.Sprite(labelMat);
    label.scale.set(1, 0.25, 1);
    label.position.set(snap.x, WALL_HEIGHT + 0.1, snap.z);
    this.scene.add(label);

    return {
      mesh,
      label,
      lastSnapshot: snap,
      prevSnapshot: null,
      interpTime: 0,
    };
  }

  clear(): void {
    for (const rp of this.players.values()) {
      this.scene.remove(rp.mesh);
      this.scene.remove(rp.label);
      rp.mesh.geometry.dispose();
      (rp.mesh.material as THREE.Material).dispose();
      rp.label.material.dispose();
    }
    this.players.clear();
  }

  destroy(): void {
    this.clear();
  }
}
