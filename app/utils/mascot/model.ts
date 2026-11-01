import { GLTFLoader, type GLTF, type GLTFLoaderPlugin, type GLTFParser } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { MascotFit } from '~/types/mascot';
import { MascotTheme } from '~/types/mascot.enum';
import { mascotPalette, sceneColor } from '~/utils/dictionary/color';

export function themeColor(value: MascotTheme): number {
  return mascotPalette[value].outfit;
}

export function skinColor(value: MascotTheme): number {
  return mascotPalette[value].skin;
}

export function createToonGradient(): THREE.DataTexture {
  const gradientData = new Uint8Array([
    48, 48, 48, 255,
    150, 150, 150, 255,
    255, 255, 255, 255,
  ]);
  const gradient = new THREE.DataTexture(gradientData, 3, 1);
  gradient.magFilter = THREE.NearestFilter;
  gradient.minFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}

export function createMascotLoader(): GLTFLoader {
  const loader = new GLTFLoader();
  loader.register(diffuseMapPlugin);
  return loader;
}

export function inPlaceClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  const kept = new Map<string, THREE.KeyframeTrack>();
  for (const track of clip.tracks) {
    if (track.name.endsWith('.position') && /Hips|Root|Armature/i.test(track.name))
      continue;
    const previous = kept.get(track.name);
    if (!previous || track.values.length >= previous.values.length)
      kept.set(track.name, track);
  }
  return new THREE.AnimationClip(clip.name, clip.duration, [...kept.values()]);
}

export function prepareMascot(
  gltf: GLTF,
  theme: MascotTheme,
  gradient: THREE.Texture,
): { group: THREE.Group, clips: THREE.AnimationClip[], fit: MascotFit } {
  const group = gltf.scene;
  dropStaticCopies(group);
  const solidHair = new WeakSet<THREE.Material>();
  const atlasHair = new WeakSet<THREE.Material>();
  markHair(gltf, solidHair, atlasHair);
  paintToon(group, theme, gradient, solidHair, atlasHair);
  const clips = gltf.animations.map(clip => inPlaceClip(clip));
  return { group, clips, fit: fitMascot(group, clips) };
}

export function fitMascot(
  rootObject: THREE.Object3D,
  clips: readonly THREE.AnimationClip[] = [],
): MascotFit {
  const standing = clips.filter(clip => clip.name === 'Idle' || clip.name === 'Notice');
  let box = posedBounds(rootObject);
  if (standing.length > 0) {
    const mixer = new THREE.AnimationMixer(rootObject);
    for (const clip of standing) {
      const action = mixer.clipAction(clip);
      action.play();
      const steps = 8;
      for (let step = 0; step <= steps; step += 1) {
        action.time = clip.duration * (step / steps);
        mixer.update(0);
        box.union(posedBounds(rootObject));
      }
      action.stop();
    }
    mixer.stopAllAction();
  }
  if (box.isEmpty())
    box.setFromObject(rootObject);
  const size = new THREE.Vector3();
  box.getSize(size);
  return { unit: size.y || 1, foot: box.min.y };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function materialColor(
  material: THREE.Material | THREE.Material[],
  fallback: number,
): THREE.Color {
  const first = Array.isArray(material) ? material[0] : material;
  if (first && 'color' in first && first.color instanceof THREE.Color)
    return first.color.clone();
  return new THREE.Color(fallback);
}

function materialMap(material: THREE.Material | THREE.Material[]): THREE.Texture | null {
  const first = Array.isArray(material) ? material[0] : material;
  if (first && 'map' in first && first.map instanceof THREE.Texture)
    return first.map;
  return null;
}

function hairColor(value: MascotTheme): THREE.Color {
  return new THREE.Color(mascotPalette[value].hair);
}

function diffuseTexture(json: unknown, materialIndex: number): { index: number } | null {
  if (!isRecord(json) || !Array.isArray(json.materials))
    return null;
  const material = json.materials[materialIndex];
  if (!isRecord(material) || !isRecord(material.extensions))
    return null;
  const spec = material.extensions.KHR_materials_pbrSpecularGlossiness;
  if (!isRecord(spec) || !isRecord(spec.diffuseTexture))
    return null;
  return typeof spec.diffuseTexture.index === 'number'
    ? { index: spec.diffuseTexture.index }
    : null;
}

function diffuseMapPlugin(parser: GLTFParser): GLTFLoaderPlugin {
  return {
    name: 'KHR_materials_pbrSpecularGlossiness',
    extendMaterialParams(materialIndex, materialParams) {
      const diffuse = diffuseTexture(parser.json, materialIndex);
      if (!diffuse || !materialParams)
        return null;
      return parser.assignTexture(materialParams, 'map', diffuse, THREE.SRGBColorSpace)
        .then(() => undefined);
    },
  };
}

function isFlatHairPixel(red: number, green: number, blue: number): boolean {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (red + green + blue) / 3;
  return max - min <= 28 && lightness >= 150;
}

function recolorHairFill(texture: THREE.Texture, color: THREE.Color): THREE.Texture {
  const image: unknown = texture.image;
  if (!isRecord(image) || typeof image.width !== 'number' || typeof image.height !== 'number')
    return texture;
  if (!(image instanceof HTMLImageElement) && !(image instanceof ImageBitmap) && !(image instanceof HTMLCanvasElement))
    return texture;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context)
    return texture;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const red = Math.round(color.r * 255);
  const green = Math.round(color.g * 255);
  const blue = Math.round(color.b * 255);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const pr = pixels.data[index] ?? 0;
    const pg = pixels.data[index + 1] ?? 0;
    const pb = pixels.data[index + 2] ?? 0;
    if (!isFlatHairPixel(pr, pg, pb))
      continue;
    pixels.data[index] = red;
    pixels.data[index + 1] = green;
    pixels.data[index + 2] = blue;
  }
  context.putImageData(pixels, 0, 0);
  const next = new THREE.CanvasTexture(canvas);
  next.colorSpace = THREE.SRGBColorSpace;
  next.flipY = false;
  next.needsUpdate = true;
  return next;
}

function dropStaticCopies(rootObject: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  rootObject.traverse((child) => {
    if (child instanceof THREE.Mesh)
      meshes.push(child);
  });
  const hasSkinned = meshes.some(mesh => mesh instanceof THREE.SkinnedMesh);
  if (!hasSkinned)
    return;
  for (const mesh of meshes) {
    if (!(mesh instanceof THREE.SkinnedMesh))
      mesh.visible = false;
  }
}

function markHair(
  gltf: GLTF,
  solidHair: WeakSet<THREE.Material>,
  atlasHair: WeakSet<THREE.Material>,
) {
  const solid = new Set<number>();
  const atlas = new Set<number>();
  const json: unknown = gltf.parser.json;
  if (!isRecord(json))
    return;
  const materials = Array.isArray(json.materials) ? json.materials : [];
  const meshes = Array.isArray(json.meshes) ? json.meshes : [];
  for (const mesh of meshes) {
    if (!isRecord(mesh) || typeof mesh.name !== 'string' || !mesh.name.includes('Accessory'))
      continue;
    if (!Array.isArray(mesh.primitives))
      continue;
    for (const prim of mesh.primitives) {
      if (!isRecord(prim) || typeof prim.material !== 'number')
        continue;
      const mat = materials[prim.material];
      const matName = isRecord(mat) && typeof mat.name === 'string' ? mat.name : '';
      if (matName.includes('Accessory'))
        solid.add(prim.material);
      else if (!matName.includes('Head'))
        atlas.add(prim.material);
    }
  }
  for (const [object, ref] of gltf.parser.associations) {
    if (!(object instanceof THREE.Material) || typeof ref.materials !== 'number')
      continue;
    if (solid.has(ref.materials))
      solidHair.add(object);
    if (atlas.has(ref.materials))
      atlasHair.add(object);
  }
}

function paintToon(
  rootObject: THREE.Object3D,
  value: MascotTheme,
  gradient: THREE.Texture,
  solidHair: WeakSet<THREE.Material>,
  atlasHair: WeakSet<THREE.Material>,
) {
  const fill = hairColor(value);
  rootObject.traverse((child) => {
    if (!(child instanceof THREE.Mesh))
      return;
    const previous = child.material;
    const source = Array.isArray(previous) ? previous[0] : previous;
    const solid = Boolean(source && solidHair.has(source));
    const atlas = Boolean(source && atlasHair.has(source));
    const sourceMap = materialMap(previous);
    const map = solid
      ? null
      : atlas && sourceMap
        ? recolorHairFill(sourceMap, fill)
        : sourceMap;
    const color = solid || (atlas && !sourceMap)
      ? fill
      : map
        ? new THREE.Color(sceneColor.white)
        : materialColor(previous, themeColor(value));
    child.material = new THREE.MeshToonMaterial({
      color,
      map,
      gradientMap: gradient,
    });
    const list = Array.isArray(previous) ? previous : [previous];
    for (const mat of list)
      mat.dispose();
  });
}

function posedBounds(rootObject: THREE.Object3D): THREE.Box3 {
  rootObject.updateMatrixWorld(true);
  const box = new THREE.Box3();
  rootObject.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.visible)
      return;
    if (child instanceof THREE.SkinnedMesh)
      child.skeleton.update();
    box.union(new THREE.Box3().setFromObject(child, true));
  });
  return box;
}