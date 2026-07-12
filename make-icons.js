// Generates icon PNGs from a pixel-art hero. No external deps (uses zlib).
const zlib = require('zlib');
const fs = require('fs');

// ---- minimal PNG encoder (RGBA, 8-bit) ----
function crc32(buf){
  let c, table = crc32.t || (crc32.t = (()=>{const t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})());
  let crc=0xFFFFFFFF; for(let i=0;i<buf.length;i++) crc=table[(crc^buf[i])&0xFF]^(crc>>>8);
  return (crc^0xFFFFFFFF)>>>0;
}
function chunk(type, data){
  const len=Buffer.alloc(4); len.writeUInt32BE(data.length,0);
  const t=Buffer.from(type,'ascii');
  const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t,data])),0);
  return Buffer.concat([len,t,data,crc]);
}
function encodePNG(w,h,rgba){
  const sig=Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  const stride=w*4; const raw=Buffer.alloc((stride+1)*h);
  for(let y=0;y<h;y++){ raw[y*(stride+1)]=0; rgba.copy(raw,y*(stride+1)+1,y*stride,(y+1)*stride); }
  const idat=zlib.deflateSync(raw,{level:9});
  return Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT',idat), chunk('IEND',Buffer.alloc(0))]);
}

// ---- pixel hero (12 wide x 13 tall grid), same spirit as in-app SVG ----
function hex(c){c=c.replace('#','');return [parseInt(c.slice(0,2),16),parseInt(c.slice(2,4),16),parseInt(c.slice(4,6),16)];}
function buildGrid(){
  const W=12,H=13;
  const g=Array.from({length:H},()=>Array(W).fill(null));
  const P=(x,y,c)=>{ if(y>=0&&y<H&&x>=0&&x<W) g[y][x]=c; };
  const skin='#f6c89a', outline='#0c0820', hair='#3a2d1a';
  const robe='#8b6bff', robe2='#5b3fd6', gem='#ffd257';
  // crown (master vibe for the icon)
  P(4,0,'#ffd257');P(6,0,'#ffd257');P(8,0,'#ffd257');P(5,0,'#ffb23e');P(7,0,'#ffb23e');
  for(let x=4;x<=8;x++)P(x,1,hair);
  P(4,2,hair);P(8,2,hair); for(let x=5;x<=7;x++)P(x,2,skin);
  for(let x=4;x<=8;x++)P(x,3,skin); P(5,3,outline);P(7,3,outline);
  for(let x=4;x<=8;x++)P(x,4,skin); P(6,4,'#dd9988');
  for(let x=3;x<=9;x++)P(x,5,robe); P(6,5,gem);
  for(let x=3;x<=9;x++)P(x,6,robe); P(3,6,skin);P(9,6,skin);
  for(let x=4;x<=8;x++)P(x,7,robe2);
  for(let x=4;x<=8;x++)P(x,8,robe2); P(6,8,robe);
  for(let x=4;x<=8;x++)P(x,9,robe2);
  for(let x=4;x<=8;x++)P(x,10,robe2);
  P(5,11,'#2a2350');P(7,11,'#2a2350');
  P(5,12,'#1a1540');P(7,12,'#1a1540');
  return {g,W,H};
}

function render(size){
  const {g,W,H}=buildGrid();
  const rgba=Buffer.alloc(size*size*4);
  // background: rounded-ish radial gradient panel
  const bgA=hex('#241a4d'), bgB=hex('#140e26');
  const cx=size/2, cy=size*0.42, maxR=size*0.75;
  const put=(x,y,r,gg,b,a)=>{const i=(y*size+x)*4; rgba[i]=r;rgba[i+1]=gg;rgba[i+2]=b;rgba[i+3]=a;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const d=Math.min(1,Math.hypot(x-cx,y-cy)/maxR);
    put(x,y, Math.round(bgA[0]+(bgB[0]-bgA[0])*d), Math.round(bgA[1]+(bgB[1]-bgA[1])*d), Math.round(bgA[2]+(bgB[2]-bgA[2])*d), 255);
  }
  // draw hero centered
  const scale=Math.floor(size/ (W+3));
  const ox=Math.floor((size - W*scale)/2);
  const oy=Math.floor((size - H*scale)/2);
  for(let gy=0;gy<H;gy++)for(let gx=0;gx<W;gx++){
    const c=g[gy][gx]; if(!c)continue; const [r,gg,b]=hex(c);
    for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++){
      const px=ox+gx*scale+xx, py=oy+gy*scale+yy;
      if(px>=0&&px<size&&py>=0&&py<size) put(px,py,r,gg,b,255);
    }
  }
  return encodePNG(size,size,rgba);
}

for(const [name,size] of [['icon-512.png',512],['icon-192.png',192],['apple-touch-icon.png',180]]){
  fs.writeFileSync(__dirname+'/'+name, render(size));
  console.log('wrote', name, size+'x'+size);
}
