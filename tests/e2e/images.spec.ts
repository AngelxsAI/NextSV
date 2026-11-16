import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
import {realpathSync,readFileSync} from 'node:fs';
import type * as Renderer from '../../src/lib/render-image';
const requireWrangler=createRequire(realpathSync('node_modules/wrangler/package.json'));
const bundler=requireWrangler('esbuild') as {buildSync:(options:Record<string,unknown>)=>{outputFiles:{text:string}[]}};
let script='';
test.beforeAll(()=>{script=bundler.buildSync({entryPoints:['src/lib/render-image.ts'],bundle:true,write:false,format:'iife',globalName:'NextSVRenderer',platform:'browser'}).outputFiles[0].text;});
test('genera archivos reales en cuatro tamaños y descarga PNG',async({page})=>{
 await page.goto('about:blank');await page.addScriptTag({content:script});
 const result=await page.evaluate(async()=>{
 const renderer=(window as unknown as {NextSVRenderer:typeof Renderer}).NextSVRenderer;
 const photo=document.createElement('canvas');photo.width=120;photo.height=120;const ctx=photo.getContext('2d')!;ctx.fillStyle='#146c52';ctx.fillRect(0,0,120,120);
 const product={name:'Producto exclusivo de prueba automatizada',price:20,stock:3,sku:'TEST',product_field_values:[]} as unknown as Parameters<typeof renderer.renderImage>[1];
 const canvas=document.createElement('canvas');document.body.append(canvas);
 const output=[];for(const format of Object.keys(renderer.sizes) as (keyof typeof renderer.sizes)[]){await renderer.renderImage(canvas,product,{...renderer.defaultDesign,format},[],photo.toDataURL(),'https://example.com/p/test');const blob=await renderer.canvasBlob(canvas,'image/png');output.push({format,w:canvas.width,h:canvas.height,type:blob.type,bytes:blob.size});}
 for(const mime of ['image/jpeg','image/webp']){const blob=await renderer.canvasBlob(canvas,mime);output.push({format:mime,w:canvas.width,h:canvas.height,type:blob.type,bytes:blob.size});}
 return output;
 });
 expect(result.map(r=>[r.w,r.h]).slice(0,4)).toEqual([[1080,1080],[1080,1350],[1080,1920],[1200,630]]);
 expect(result.every(r=>r.bytes>1000)).toBe(true);expect(result.slice(0,4).every(r=>r.type==='image/png')).toBe(true);
 const downloaded=page.waitForEvent('download');await page.evaluate(async()=>{const r=(window as unknown as {NextSVRenderer:typeof Renderer}).NextSVRenderer;r.downloadBlob(await r.canvasBlob(document.querySelector('canvas')!,'image/png'),'test-real.png');});const file=await downloaded;const bytes=readFileSync((await file.path())!);expect([...bytes.slice(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
});
test('rechaza contenido imposible de acomodar en lugar de cortarlo',async({page})=>{
 await page.goto('about:blank');await page.addScriptTag({content:script});const message=await page.evaluate(async()=>{const r=(window as unknown as {NextSVRenderer:typeof Renderer}).NextSVRenderer;const canvas=document.createElement('canvas');const photo=document.createElement('canvas');photo.width=20;photo.height=20;const p={name:'Texto extremadamente largo '.repeat(200),price:1,stock:1,sku:'TEST',product_field_values:[]} as unknown as Parameters<typeof r.renderImage>[1];try{await r.renderImage(canvas,p,{...r.defaultDesign,format:'landscape'},[],photo.toDataURL(),'https://example.com');return '';}catch(e){return (e as Error).message;}});expect(message).toContain('no cabe');
});
