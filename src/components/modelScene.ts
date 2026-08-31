import { Box3, Group, Mesh, Vector3 } from 'three';

export function prepareModel(root: Group) {
  // Respect the supplied scene, including flames, smoke and projectiles.
  root.updateMatrixWorld(true);
  const bounds = new Box3();
  root.traverseVisible((object) => {
    if ((object as Mesh).isMesh) bounds.union(new Box3().setFromObject(object));
  });
  if (bounds.isEmpty()) throw new Error('The model has no visible geometry');
  const diameter = bounds.getSize(new Vector3()).length();
  root.position.sub(bounds.getCenter(new Vector3()));
  const pivot = new Group();
  pivot.add(root);
  pivot.scale.setScalar(2.8 / diameter);
  return pivot;
}
