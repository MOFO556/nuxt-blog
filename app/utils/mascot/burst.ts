import * as THREE from 'three';

const PARTICLE_COUNT = 48;

export type JutsuBurst = {
  points: THREE.Points,
  setColor: (color: number) => void,
  update: (arriveT: number, arriving: boolean, anchor: THREE.Vector3 | null) => void,
  dispose: () => void,
};

export function createJutsuBurst(color: number): JutsuBurst {
  const dirs = new Float32Array(PARTICLE_COUNT * 3);
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    dirs[index * 3] = Math.sin(phi) * Math.cos(theta);
    dirs[index * 3 + 1] = Math.sin(phi) * Math.sin(theta);
    dirs[index * 3 + 2] = Math.cos(phi);
  }
  const positionAttr = new THREE.BufferAttribute(positions, 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', positionAttr);
  const material = new THREE.PointsMaterial({
    color,
    size: 22,
    sizeAttenuation: false,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  return {
    points,
    setColor(next) {
      material.color.setHex(next);
    },
    update(arriveT, arriving, anchor) {
      const burstT = arriving ? arriveT : 0;
      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        const radius = burstT * 170;
        positions[index * 3] = (dirs[index * 3] ?? 0) * radius;
        positions[index * 3 + 1] = (dirs[index * 3 + 1] ?? 0) * radius;
        positions[index * 3 + 2] = (dirs[index * 3 + 2] ?? 0) * radius;
      }
      positionAttr.needsUpdate = true;
      material.opacity = arriving ? 1 - burstT * 0.65 : 0;
      points.visible = arriving;
      if (anchor)
        points.position.copy(anchor);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}