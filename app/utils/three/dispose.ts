import * as THREE from 'three';

export function disposeObject3D(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh))
      return;
    child.geometry.dispose();
    const list = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of list)
      mat.dispose();
  });
}