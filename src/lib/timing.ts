export function formatDuration(milliseconds:number):string {
  const ms=Number.isFinite(milliseconds)?Math.max(0,milliseconds):0;
  if(ms<1000)return `${Math.round(ms)} ms`;
  if(ms<60000)return `${(ms/1000).toFixed(2)} 秒`;
  const tenths=Math.round(ms/100);
  return `${Math.floor(tenths/600)} 分 ${((tenths%600)/10).toFixed(1)} 秒`;
}
/** Tracks wall time across runs, excluding pauses and export. */
export function createProcessingTimer(now:()=>number=()=>performance.now()){
  let accumulated=0,startedAt:number|undefined;
  return {
    start(){if(startedAt===undefined)startedAt=now()},
    stop(){if(startedAt!==undefined){accumulated+=Math.max(0,now()-startedAt);startedAt=undefined}},
    reset(){accumulated=0;startedAt=undefined},
    elapsed(){return accumulated+(startedAt===undefined?0:Math.max(0,now()-startedAt))},
  };
}
