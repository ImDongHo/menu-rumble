import {estimateBattles} from './odds.mjs';
self.onmessage=({data})=>{
  try {
    const {entries,mapId,rounds,seed,key,mode}=data;
    for(const result of estimateBattles(entries,mapId,rounds,seed,mode))self.postMessage({key,...result});
  }catch(error){self.postMessage({key:data?.key,error:String(error.message||error)})}
};
