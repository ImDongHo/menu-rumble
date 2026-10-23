import {build} from 'esbuild';
import {readFile,writeFile,readdir,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,basename,dirname,sep} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
// Content-named entrypoints update the whole character module graph together.
const sources={name:'workspace-sources',setup(api){
  api.onResolve({filter:/.*/},args=>{
    if(args.path==='./vendor/three.module.js')return{path:args.path,external:true};
    const path=resolve(args.importer?dirname(args.importer):root,args.path.split('?')[0]);
    if(!path.startsWith(resolve(root,'dist')+sep))throw new Error('Browser import must stay inside dist/');
    return{path,namespace:'source'};
  });
  api.onLoad({filter:/.*/,namespace:'source'},async args=>({contents:await readFile(args.path,'utf8'),loader:'js'}));
}};
const result=await build({absWorkingDir:root,entryPoints:{app:'./dist/app.mjs','character-preview':'./dist/character-preview.mjs'},outdir:'dist',entryNames:'[name]-[hash]',outExtension:{'.js':'.mjs'},bundle:true,format:'esm',platform:'browser',target:'es2022',tsconfigRaw:{},plugins:[sources],minify:true,metafile:true,legalComments:'eof'});
const keep=new Set();
for(const [output,info]of Object.entries(result.metafile.outputs)){
  const name=basename(output);keep.add(name);
  const html=info.entryPoint?.endsWith('character-preview.mjs')?'character-preview.html':info.entryPoint?.endsWith('app.mjs')?'index.html':null;
  if(!html)continue;
  const stem=html==='index.html'?'app':'character-preview',path=resolve(root,'dist',html),source=await readFile(path,'utf8');
  const pattern=new RegExp(`src="\\./${stem}(?:-[A-Z0-9]{8})?\\.mjs(?:\\?[^\"]*)?"`);
  if(!pattern.test(source))throw new Error(`Missing ${stem} entrypoint in ${html}`);
  await writeFile(path,source.replace(pattern,`src="./${name}"`));
}
for(const name of await readdir(resolve(root,'dist')))if(/^(app|character-preview)-[A-Z0-9]{8}\.mjs$/.test(name)&&!keep.has(name))await unlink(resolve(root,'dist',name));
console.log('Browser bundles ready:',[...keep].join(', '));
