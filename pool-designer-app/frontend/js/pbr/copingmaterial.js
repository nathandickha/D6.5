// js/pbr/copingmaterial.js
import { createStoneMaterial } from "../materials/StoneMaterialFactory.js";

let cachedMaterial = null;

export async function loadCopingMaterial(scene) {
  if (cachedMaterial) return cachedMaterial;

  cachedMaterial = createStoneMaterial({
    repeat: 2,
    anisotropy: 12,
    includeDisplacement: true,
    displacementScale: 0.005,
    color: 0xc6bfb4,
    roughness: 0.6,
    metalness: 0.0,
    envMapIntensity: 1.2,
    debugLabel: "Coping"
  });

  cachedMaterial.userData.isCoping = true;
  return cachedMaterial;
}
