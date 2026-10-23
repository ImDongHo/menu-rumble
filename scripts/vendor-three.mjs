import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {transform} from 'esbuild';
const base=new URL('../',import.meta.url),out=new URL('dist/vendor/',base);
const manifest=JSON.parse(await readFile(new URL('node_modules/three/package.json',base),'utf8'));
if(manifest.version!=='0.186.1')throw new Error('Expected the locked three.js version 0.186.1');
await mkdir(out,{recursive:true});
for(const file of ['three.core.js','three.module.js']){
  const source=await readFile(new URL('node_modules/three/build/'+file,base),'utf8');
  const result=await transform(source,{minify:true,format:'esm',target:'es2020',legalComments:'inline'});
  await writeFile(new URL(file,out),'/* three.js 0.186.1 | MIT License | see three.LICENSE.txt */\n'+result.code);
}
await copyFile(new URL('node_modules/three/LICENSE',base),new URL('three.LICENSE.txt',out));
console.log('Vendored three.js '+manifest.version+' with MIT license.');
