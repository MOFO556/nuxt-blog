import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { PropTemplate } from '~/types/runner';

export function bakeProp(root: THREE.Object3D): THREE.Group {
  root.updateMatrixWorld(true);
  const baked = new THREE.Group();
  const vertex = new THREE.Vector3();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh))
      return;
    const geometry = child.geometry.clone();
    const position = geometry.getAttribute('position');
    if (!(position instanceof THREE.BufferAttribute))
      return;
    if (child instanceof THREE.SkinnedMesh)
      child.skeleton.update();
    for (let index = 0; index < position.count; index += 1) {
      if (child instanceof THREE.SkinnedMesh)
        child.getVertexPosition(index, vertex);
      else
        vertex.fromBufferAttribute(position, index);
      vertex.applyMatrix4(child.matrixWorld);
      position.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    baked.add(new THREE.Mesh(geometry, child.material));
  });
  return baked;
}

export function loadProp(url: string, pointLeft = false): Promise<PropTemplate | null> {
  return fetch(url)
    .then(async (response) => {
      if (!response.ok)
        return null;
      const buffer = await response.arrayBuffer();
      return new Promise<PropTemplate | null>((resolve) => {
        new GLTFLoader().parse(buffer, '', (gltf) => {
          const baked = bakeProp(gltf.scene);
          const pivot = new THREE.Group();
          if (pointLeft) {
            for (const child of baked.children) {
              if (child instanceof THREE.Mesh) {
                const list = Array.isArray(child.material) ? child.material : [child.material];
                for (const material of list)
                  material.side = THREE.DoubleSide;
              }
            }
            baked.rotation.z = Math.PI / 2;
            const face = new THREE.Group();
            face.rotation.x = -Math.PI / 2;
            face.add(baked);
            pivot.add(face);
          }
          else {
            pivot.add(baked);
          }
          pivot.updateMatrixWorld(true);
          resolve({ group: pivot, box: new THREE.Box3().setFromObject(pivot) });
        }, () => resolve(null));
      });
    })
    .catch(() => null);
}

export function placeProp(
  group: THREE.Group,
  box: THREE.Box3,
  left: number,
  bottom: number,
  hitW: number,
  hitH: number,
  viewW: number,
  viewH: number,
  length = 0,
  width = 0,
) {
  const sizeX = Math.max(box.max.x - box.min.x, 0.001);
  const sizeY = Math.max(box.max.y - box.min.y, 0.001);
  const sizeZ = Math.max(box.max.z - box.min.z, 0.001);
  const uniform = length > 0 ? length / Math.max(sizeX, sizeY) : 0;
  const scaleX = width > 0 ? width / sizeX : uniform > 0 ? uniform : hitW / sizeX;
  const scaleY = uniform > 0 ? uniform : hitH / sizeY;
  const scaleZ = uniform > 0 ? uniform : Math.min(scaleX, scaleY);
  group.scale.set(scaleX, scaleY, scaleZ);
  const centerX = (box.min.x + box.max.x) / 2;
  const centerY = (box.min.y + box.max.y) / 2;
  const centerZ = (box.min.z + box.max.z) / 2;
  const hitCenterX = left + hitW / 2;
  const hitCenterY = bottom - hitH / 2;
  group.position.set(
    hitCenterX - viewW / 2 - centerX * scaleX,
    viewH / 2 - hitCenterY - centerY * scaleY,
    -centerZ * scaleZ - 6,
  );
}