export const MAX_PARALLELISM=32;
export const parallelismChoices=[1,2,4,6,8,12,16,24,32] as const;
export type Parallelism='auto'|typeof parallelismChoices[number];
export function parseParallelism(value:unknown):Parallelism {
  return value==='auto'||parallelismChoices.some(n=>n===value)?value as Parallelism:'auto';
}
export function resolveParallelism(value:unknown,cores:number):number {
  const choice=parseParallelism(value);
  if(choice!=='auto')return choice;
  if(!Number.isFinite(cores)||cores<1)return 2;
  return cores>=6?4:Math.max(1,Math.min(2,Math.floor(cores)-1));
}
