// Meshes share geometry and materials; release each GPU resource exactly once.
export function disposeScene(scene){
  const resources=new Set();
  scene.traverse(object=>{
    if(object.isInstancedMesh)resources.add(object);
    if(object.geometry)resources.add(object.geometry);
    const materials=Array.isArray(object.material)?object.material:[object.material];
    for(const material of materials)if(material){
      for(const value of Object.values(material))if(value?.isTexture)resources.add(value);
      resources.add(material);
    }
  });
  for(const resource of resources)resource.dispose();
  scene.clear();
}
