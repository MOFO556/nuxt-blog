import * as THREE from 'three';
import { MascotBone, MascotTheme } from '~/types/mascot.enum';
import { skinColor, themeColor } from '~/utils/mascot/model';

export function buildMascotPlaceholder(value: MascotTheme, gradient: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshToonMaterial({
    color: themeColor(value),
    gradientMap: gradient,
  });
  const headMat = new THREE.MeshToonMaterial({
    color: skinColor(value),
    gradientMap: gradient,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(22, 48, 4, 8), bodyMat);
  body.position.y = 46;
  const head = new THREE.Mesh(new THREE.SphereGeometry(18, 16, 12), headMat);
  head.position.y = 110;
  const hand = new THREE.Object3D();
  hand.name = MascotBone.rightHand;
  hand.position.set(32, 70, 8);
  group.add(body, head, hand);
  return group;
}