
export async function optimizeSVG(source:string):Promise<string> {
  if(/<!DOCTYPE|<!ENTITY/i.test(source))throw new Error('SVG 不支持 DTD 或外部实体');
  const doc=new DOMParser().parseFromString(source,'image/svg+xml');
  if(doc.querySelector('parsererror') || doc.documentElement.localName!=='svg')throw new Error('SVG 文档损坏');
  for(const node of doc.querySelectorAll('*')){
    if(['script','foreignobject','iframe','object','embed','animate','set','animatemotion','animatetransform'].includes(node.localName.toLowerCase()))throw new Error('仅支持不含脚本、嵌入页面或动画的独立 SVG');
    for(const attr of node.attributes){
      const name=attr.localName.toLowerCase(),value=attr.value.trim();
      if(name.startsWith('on'))throw new Error('SVG 不支持脚本事件');
      if(name==='href' && value && !value.startsWith('#') && !/^data:image\/(?:png|jpeg|webp|gif|avif);base64,/i.test(value))throw new Error('SVG 不能引用外部文件，请先嵌入资源');
      validateCSS(value);
    }
    if(node.localName==='style')validateCSS(node.textContent??'');
  }
  // Conservative plugins avoid geometry precision changes and ID/viewBox removal.
  const {optimize}=await import('svgo/browser');
  return optimize(source,{multipass:true,plugins:['removeComments','removeMetadata','removeEditorsNSData','cleanupAttrs','removeEmptyAttrs','removeEmptyContainers','sortAttrs']}).data;
}

function validateCSS(value:string){
  if(/@import|\\/i.test(value))throw new Error('SVG 样式含不支持的资源引用');
  for(const match of value.matchAll(/url\s*\(([^)]*)\)/gi)){
    if(!/^\s*['"]?#[\w:.-]+['"]?\s*$/.test(match[1]))throw new Error('SVG 不支持外部样式资源');
  }
}
