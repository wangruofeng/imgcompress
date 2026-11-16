export const MAX_PARALLELISM=32;
export const parallelismChoices=[1,2,4,6,8,12,16,24,32] as const;
export type Parallelism='auto'|typeof parallelismChoices[number];
export function parseParallelism(value:unknown):Parallelism {
  return value==='auto'||parallelismChoices.some(n=>n===value)?value as Parallelism:'auto';
}
/** Reserve a quarter of logical cores for the UI/system; never start more lanes than jobs. */
export function resolveParallelism(value:unknown,cores:number,pendingCount?:number):number {
  const choice=parseParallelism(value);
  const available=Number.isFinite(cores)&&cores>=1?Math.floor(cores):1;
  const recommended=Math.max(1,available-Math.ceil(available/4));
  const requested=choice==='auto'?Math.min(MAX_PARALLELISM,recommended):choice;
  const jobs=pendingCount===undefined?requested:Number.isFinite(pendingCount)?Math.max(1,Math.floor(pendingCount)):1;
  return Math.min(requested,jobs);
}
