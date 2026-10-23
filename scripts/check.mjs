import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
for(const folder of ['dist','scripts'])for(const name of readdirSync(new URL('../'+folder+'/',import.meta.url))){
  if(!name.endsWith('.mjs'))continue;
  const result=spawnSync(process.execPath,['--check',fileURLToPath(new URL('../'+folder+'/'+name,import.meta.url))],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}
console.log('Application and script syntax checks passed.');
