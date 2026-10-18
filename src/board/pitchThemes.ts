import { PitchTemplate } from './types';
import { makeP, E, LERP } from './utils';

export const TEMPLATE_CONFIG: Record<PitchTemplate, any> = {
  [PitchTemplate.THEME_CLASSIC]: { label:'Classic Grass', base:'#3f9e53', lineColor:'#ffffff', lineAlpha:1, customDraw: (ctx, w, h, fill) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#3f9e53');
      for(let i=0; i<10; i+=2) {
          const u0 = i/10, u1 = (i+1)/10;
          fill([[u0, -0.2], [u1, -0.2], [u1, 1.2], [u0, 1.2]], 'rgba(0,0,0,0.07)');
      }
  }},
  [PitchTemplate.THEME_CHECKER]: { label:'Emerald Checker', base:'#2f8f45', lineColor:'#ffffff', lineAlpha:1, customDraw: (ctx, w, h, fill) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#2f8f45');
      for(let x=0; x<5; x++) for(let y=0; y<4; y++) {
          if((x+y)%2===0) {
              const u0 = x/5, u1 = (x+1)/5, v0 = y/4, v1 = (y+1)/4;
              fill([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], 'rgba(0,0,0,0.09)');
          }
      }
  }},
  [PitchTemplate.THEME_FRESH]: { label:'Fresh Cut', base:'#57b25e', lineColor:'#ffffff', lineAlpha:1, customDraw: (ctx, w, h, fill) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#57b25e');
      for(let i=0; i<8; i+=2) {
          const v0 = i/8, v1 = (i+1)/8;
          fill([[-0.2, v0], [1.2, v0], [1.2, v1], [-0.2, v1]], 'rgba(255,255,255,0.08)');
      }
  }},
  [PitchTemplate.THEME_DIAGONAL]: { label:'Diagonal Turf', base:'#2e7d3a', lineColor:'#ffffff', lineAlpha:1, customDraw: (ctx, w, h, fill) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#2e7d3a');
      for(let i=-20; i<20; i+=2) {
          const c0 = i/14, c1 = (i+1)/14;
          fill([[-1, -1+c0], [2, 2+c0], [2, 2+c1], [-1, -1+c1]], 'rgba(0,0,0,0.09)');
      }
  }},
  [PitchTemplate.THEME_WORN]: { label:'Worn Grass', base:'#4a8f3f', lineColor:'#ffffff', lineAlpha:1, customDraw: (ctx, w, h, fill, P) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#4a8f3f');
      for(let i=0; i<10; i+=2) {
          const u0 = i/10, u1 = (i+1)/10;
          fill([[u0, -0.2], [u1, -0.2], [u1, 1.2], [u0, 1.2]], 'rgba(0,0,0,0.05)');
      }
      const g1 = ctx.createRadialGradient(P(0.2,0.3).x, P(0.2,0.3).y, 0, P(0.2,0.3).x, P(0.2,0.3).y, w*0.6);
      g1.addColorStop(0, 'rgba(0,0,0,0.11)'); g1.addColorStop(1, 'transparent');
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], g1);
      const g2 = ctx.createRadialGradient(P(0.75,0.65).x, P(0.75,0.65).y, 0, P(0.75,0.65).x, P(0.75,0.65).y, w*0.6);
      g2.addColorStop(0, 'rgba(0,0,0,0.13)'); g2.addColorStop(1, 'transparent');
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], g2);
      const g3 = ctx.createRadialGradient(P(0.55,0.18).x, P(0.55,0.18).y, 0, P(0.55,0.18).x, P(0.55,0.18).y, w*0.6);
      g3.addColorStop(0, 'rgba(255,255,255,0.07)'); g3.addColorStop(1, 'transparent');
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], g3);
  }},
  [PitchTemplate.THEME_RINGS]: { label:'Mow Rings', base:'#3a9a4e', lineColor:'#ffffff', lineAlpha:1, customDraw: (ctx, w, h, fill) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#3a9a4e');
      const step = 0.055;
      for(let r=step/2; r<1.5; r+=step*2) {
          const innerR = r, outerR = r + step;
          let ring = [];
          for(let t=0; t<=32; t++){ const a=t/32*Math.PI*2; ring.push([0.5+outerR*Math.cos(a), 0.5+outerR*(w/h)*Math.sin(a)]); }
          for(let t=32; t>=0; t--){ const a=t/32*Math.PI*2; ring.push([0.5+innerR*Math.cos(a), 0.5+innerR*(w/h)*Math.sin(a)]); }
          fill(ring, 'rgba(0,0,0,0.08)');
      }
  }},
  [PitchTemplate.THEME_DIAMOND]: { label:'Mow Diamond', base:'#379349', lineColor:'#ffffff', lineAlpha:1, customDraw: (ctx, w, h, fill) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#379349');
      for(let i=-30; i<30; i+=2) {
          const c0 = i/16, c1 = (i+1)/16;
          fill([[-1, -1+c0], [2, 2+c0], [2, 2+c1], [-1, -1+c1]], 'rgba(0,0,0,0.07)');
      }
      for(let i=-30; i<30; i+=2) {
          const c0 = i/16, c1 = (i+1)/16;
          fill([[-1, 1-c0], [2, -2-c0], [2, -2-c1], [-1, 1-c1]], 'rgba(255,255,255,0.05)');
      }
  }},
  [PitchTemplate.THEME_CONTOUR]: { label:'Contour Arcs', base:'#2f8f45', lineColor:'#ffffff', lineAlpha:1, customDraw: (ctx, w, h, fill) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#2f8f45');
      const step = 0.07;
      for(let r=step/2; r<2.5; r+=step*2) {
          const innerR = r, outerR = r + step;
          let ring1 = [];
          for(let t=0; t<=32; t++){ const a=t/32*Math.PI*2; ring1.push([0.5+outerR*Math.cos(a), -0.3+outerR*(w/h)*Math.sin(a)]); }
          for(let t=32; t>=0; t--){ const a=t/32*Math.PI*2; ring1.push([0.5+innerR*Math.cos(a), -0.3+innerR*(w/h)*Math.sin(a)]); }
          fill(ring1, 'rgba(255,255,255,0.06)');
          let ring2 = [];
          for(let t=0; t<=32; t++){ const a=t/32*Math.PI*2; ring2.push([0.5+outerR*Math.cos(a), 1.3+outerR*(w/h)*Math.sin(a)]); }
          for(let t=32; t>=0; t--){ const a=t/32*Math.PI*2; ring2.push([0.5+innerR*Math.cos(a), 1.3+innerR*(w/h)*Math.sin(a)]); }
          fill(ring2, 'rgba(0,0,0,0.08)');
      }
  }},
  [PitchTemplate.THEME_HEX]: { label:'Hex Tech', base:'#1f6b33', lineColor:'#eaffea', lineAlpha:1, customDraw: (ctx, w, h, fill, P, strokeUV) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#1f6b33');
      const step = 26/h;
      for(let v=-1; v<2; v+=step) { strokeUV([[-1, v], [2, v]], 1, 'rgba(255,255,255,0.07)'); }
      const aspect = w/h;
      for(let i=-50; i<50; i++) {
          const c = i * step;
          const m1 = Math.tan(Math.PI/3) / aspect;
          strokeUV([[ (-1 - c)/m1, -1 ], [ (2 - c)/m1, 2 ]], 1, 'rgba(255,255,255,0.07)');
          const m2 = Math.tan(-Math.PI/3) / aspect;
          strokeUV([[ (-1 - c)/m2, -1 ], [ (2 - c)/m2, 2 ]], 1, 'rgba(255,255,255,0.07)');
      }
  }},
  [PitchTemplate.THEME_NIGHT]: { label:'Night Match', base:'#0f1b2e', lineColor:'#63e0ff', lineAlpha:1, glow:{color:'rgba(99,224,255,0.55)', blur:8}, customDraw: (ctx, w, h, fill) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#0f1b2e');
      for(let i=0; i<10; i+=2) {
          const u0 = i/10, u1 = (i+1)/10;
          fill([[u0, -0.2], [u1, -0.2], [u1, 1.2], [u0, 1.2]], 'rgba(99,224,255,0.05)');
      }
  }},
  [PitchTemplate.THEME_VAPOR]: { label:'Neon Vapor', base:'#171030', lineColor:'#ff5ecf', lineAlpha:1, glow:{color:'rgba(255,94,207,0.6)', blur:9}, customDraw: (ctx, w, h, fill) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#171030');
      for(let i=0; i<10; i+=2) {
          const u0 = i/10, u1 = (i+1)/10;
          fill([[u0, -0.2], [u1, -0.2], [u1, 1.2], [u0, 1.2]], 'rgba(255,94,207,0.07)');
      }
  }},
  [PitchTemplate.THEME_HOLO]: { label:'Holo Scan', base:'#062b2b', lineColor:'#7fffe0', lineAlpha:1, glow:{color:'rgba(127,255,224,0.5)', blur:8}, customDraw: (ctx, w, h, fill, P) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#062b2b');
      const step = 7/h;
      for(let v=0; v<1; v+=step) { 
          fill([[-0.2, v], [1.2, v], [1.2, v+2/h], [-0.2, v+2/h]], 'rgba(127,255,224,0.07)'); 
      }
      const g = ctx.createRadialGradient(P(0.5,0).x, P(0.5,0).y, 0, P(0.5,0).x, P(0.5,0).y, w*0.7);
      g.addColorStop(0, 'rgba(127,255,224,0.12)'); g.addColorStop(1, 'transparent');
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], g);
  }},
  [PitchTemplate.THEME_CHALK]: { label:'Chalk Board', base:'#25382f', lineColor:'#efe8d4', lineAlpha:0.93, lineWidthMul: 0.9, customDraw: (ctx, w, h, fill) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#25382f');
  }},
  [PitchTemplate.THEME_BLUEPRINT]: { label:'Blueprint', base:'#0d47a1', lineColor:'#eaf3ff', lineAlpha:1, customDraw: (ctx, w, h, fill) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#0d47a1');
      const uStep = 1 / (100/7.5);
      const vStep = 1 / (100/12.5);
      for(let u=-0.2; u<1.2; u+=uStep) fill([[u, -0.2], [u+1/w, -0.2], [u+1/w, 1.2], [u, 1.2]], 'rgba(255,255,255,0.22)');
      for(let v=-0.2; v<1.2; v+=vStep) fill([[-0.2, v], [1.2, v], [1.2, v+1/h], [-0.2, v+1/h]], 'rgba(255,255,255,0.22)');
  }},
  [PitchTemplate.THEME_SASH]: { label:'Club Sash', base:'#f2f3f5', lineColor:'#2b3440', lineAlpha:1, customDraw: (ctx, w, h, fill) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#f2f3f5');
      fill([[-1, 0.4], [2, -1], [2, -0.6], [-1, 0.8]], 'rgba(210,30,40,0.85)');
  }},
  [PitchTemplate.THEME_MINIMAL]: { label:'Minimal Light', base:'#eef1f3', lineColor:'#2b3440', lineAlpha:1, customDraw: (ctx, w, h, fill) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#eef1f3');
  }},
  [PitchTemplate.THEME_WINTER]: { label:'Winter Snow', base:'#e6edf4', lineColor:'#5b7a99', lineAlpha:1, customDraw: (ctx, w, h, fill) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#e6edf4');
      for(let i=0; i<10; i+=2) {
          const u0 = i/10, u1 = (i+1)/10;
          fill([[u0, -0.2], [u1, -0.2], [u1, 1.2], [u0, 1.2]], 'rgba(91,122,153,0.10)');
      }
  }},
  [PitchTemplate.THEME_RETRO]: { label:'Retro Clay', base:'#b9502f', lineColor:'#fdf3e0', lineAlpha:1, customDraw: (ctx, w, h, fill) => {
      fill([[-0.2, -0.2], [1.2, -0.2], [1.2, 1.2], [-0.2, 1.2]], '#b9502f');
      for(let i=0; i<10; i+=2) {
          const u0 = i/10, u1 = (i+1)/10;
          fill([[u0, -0.2], [u1, -0.2], [u1, 1.2], [u0, 1.2]], 'rgba(0,0,0,0.07)');
      }
  }}
};
