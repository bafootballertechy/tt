import { Project, Slide, CoinSettings, PitchTemplate, TeamSide, Point, ToolType, Drawing, PlayerRole, PitchView, CompiledAnimation } from './types';
import { compileAnimation } from './utils';
import { AnimationController, RenderState, getBezierPoint, getPlayerMotionPath } from './animationController';
import { PITCH_WIDTH, PITCH_HEIGHT } from './constants';
import { generateArrowPath, generateCurveArrowPath, generateLinePath, makeP, E, LERP } from './utils';
import { createPalette, drawNewCoin, drawNewPuck, drawNewShirt, drawNewMini, drawNewDome, drawNewMeeple, drawNewBadge, drawNewHolo, drawNewTactic, drawNewBall, buildTokenOutlinePath } from './tokenRenderers';
import { TEMPLATE_CONFIG } from './pitchThemes';

const lerp = (start: number, end: number, t: number) => {
  return start + (end - start) * t;
};


const imageCache: Record<string, HTMLImageElement> = {};
const getCachedImage = (src: string | undefined): HTMLImageElement | null => {
  if (!src || typeof window === 'undefined') return null;
  if (imageCache[src]) return imageCache[src];
  const img = new Image();
  img.src = src;
  imageCache[src] = img;
  return img;
};

// Bezier interpolation (N-degree)


// Interpolate positions between previous and current slide





export const drawStaticBackgroundToCanvas = (
  ctx: CanvasRenderingContext2D,
  project: Project,
  bgImg: HTMLImageElement | null,
  pitchTemplate: PitchTemplate,
  width: number,
  height: number,
  scale: number
) => {
  ctx.save();
  ctx.scale(scale, scale);

  const P_WIDTH = project.pitchWidth || PITCH_WIDTH;
  const P_HEIGHT = project.pitchHeight || PITCH_HEIGHT;
  const P = makeP(P_WIDTH, P_HEIGHT, project.pitchView);

  let W = P_WIDTH;
  let H = P_HEIGHT;

  // Always fill background with black for letterboxing/corners effect
  ctx.fillStyle = '#080b12';
  ctx.fillRect(0, 0, W, H);

  if (bgImg) {
    if (project.pitchView === PitchView.PERSPECTIVE) {
      // Draw background image mapped to the 3D perspective trapezoid
      const slices = Math.floor(P_HEIGHT);
      for (let i = 0; i < slices; i++) {
        const v1 = i / slices;
        const v2 = (i + 1) / slices;
        
        const sy = v1 * bgImg.naturalHeight;
        const sh = (1 / slices) * bgImg.naturalHeight;

        const p1_left = P(0, v1);
        const p1_right = P(1, v1);
        const p2_left = P(0, v2);

        const dy = p1_left.y;
        // prevent subpixel gaps by adding a tiny overlap to height
        const dh = p2_left.y - p1_left.y + 0.5;
        const dx = p1_left.x;
        const dw = p1_right.x - p1_left.x;

        ctx.drawImage(bgImg, 0, sy, bgImg.naturalWidth, sh, dx, dy, dw, dh);
      }
    } else if (project.pitchView === PitchView.VERTICAL) {
        const PW = 90;
        const drawH = H;
        const drawW = H * (PW / 105);
        const xOff = (W - drawW) / 2;
        ctx.fillStyle = '#080b12';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(bgImg, 0, 0, bgImg.naturalWidth, bgImg.naturalHeight, xOff, 0, drawW, drawH);
    } else if (project.pitchView === PitchView.HALF) {
        const drawH = H;
        const drawW = H * (68 / 52.5);
        const xOff = (W - drawW) / 2;
        ctx.fillStyle = '#080b12';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(bgImg, 0, 0, bgImg.naturalWidth, bgImg.naturalHeight, xOff, 0, drawW, drawH);
    } else {
        ctx.drawImage(bgImg, 0, 0, P_WIDTH, P_HEIGHT);
    }
  } else {
    // Fill background with black for letterboxing effect
    ctx.fillStyle = '#080b12';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    // Clip for HALF and VERTICAL views so pitch doesn't bleed out of its centered area
    if (project.pitchView === PitchView.VERTICAL) {
        const PW = 90;
        const drawH = H;
        const drawW = H * (PW / 105);
        const xOff = (W - drawW) / 2;
        ctx.beginPath();
        ctx.rect(xOff, 0, drawW, drawH);
        ctx.clip();
    } else if (project.pitchView === PitchView.HALF) {
        const drawH = H;
        const drawW = H * (68 / 52.5);
        const xOff = (W - drawW) / 2;
        ctx.beginPath();
        ctx.rect(xOff, 0, drawW, drawH);
        ctx.clip();
    }
    
    // Poly helper
    const poly = (pts: number[][]) => {
      ctx.beginPath();
      pts.forEach((p, i) => {
        const q = p.length === 3 ? E(P, p[0], p[1], p[2]) : P(p[0], p[1]);
        i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
      });
      ctx.closePath();
    };
    const fill = (pts: number[][], col: string) => { poly(pts); ctx.fillStyle = col; ctx.fill(); };

    // strokeUV helper
    const strokeUV = (pts: number[][], w: number, col: string) => {
      const sp = pts.map(p => P(p[0], p[1]));
      const n = sp.length;
      const off: number[][] = [];
      for(let i=0; i<n; i++){
        const a = sp[Math.max(0, i-1)];
        const b = sp[Math.min(n-1, i+1)];
        let dx = b.x - a.x, dy = b.y - a.y;
        const l = Math.hypot(dx, dy) || 1;
        const ww = w * 0.5 * sp[i].s;
        off.push([-dy/l*ww, dx/l*ww]);
      }
      ctx.beginPath();
      for(let i=0; i<n; i++) { const p = sp[i]; i ? ctx.lineTo(p.x+off[i][0], p.y+off[i][1]) : ctx.moveTo(p.x+off[i][0], p.y+off[i][1]); }
      for(let i=n-1; i>=0; i--) { const p = sp[i]; ctx.lineTo(p.x-off[i][0], p.y-off[i][1]); }
      ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    };

    const lineE = (a: number[], b: number[], col: string, w: number) => {
      const p = E(P, a[0], a[1], a[2] || 0), q = E(P, b[0], b[1], b[2] || 0);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      ctx.strokeStyle = col; ctx.lineWidth = w * ((p.s + q.s) / 2); ctx.stroke();
    };

    const dot = (u: number, v: number, r: number, col: string) => {
      const p = P(u, v);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r*p.s, r*p.s*0.9, 0, 0, 7);
      ctx.fillStyle = col; ctx.fill();
    };

    const rPoly = (pts: any[], r: number) => {
      const m = (a: any, b: any) => ({x:(a.x+b.x)/2, y:(a.y+b.y)/2});
      ctx.beginPath(); ctx.moveTo(m(pts[0],pts[1]).x, m(pts[0],pts[1]).y);
      for(let i=1; i<=4; i++){ const p=pts[i%4], q=pts[(i+1)%4]; ctx.arcTo(p.x, p.y, q.x, q.y, r); }
      ctx.closePath();
    };

    const M=105, D=68;
    const U = (x: number) => x/M;
    const V = (y: number) => y/D;
    
    const theme = TEMPLATE_CONFIG[pitchTemplate] || TEMPLATE_CONFIG[PitchTemplate.THEME_CLASSIC];
    const WHITE = theme.lineColor || '#f2f5ef';
    const lw = Math.max(1.6, P_HEIGHT*0.0042) * (theme.lineWidthMul || 1);

    // backdrop
    let g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#2a2019'); g.addColorStop(.5,'#150e09'); g.addColorStop(1,'#040202');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // tray
    const TO = [P(-0.25,-0.25),P(1.25,-0.25),P(1.25,1.25),P(-0.25,1.25)];
    ctx.save(); ctx.shadowColor='rgba(0,0,0,.85)'; ctx.shadowBlur=45;
    rPoly(TO, W*0.045); ctx.fillStyle='#0a0a0b'; ctx.fill(); ctx.restore();
    g = ctx.createLinearGradient(0, TO[0].y, 0, TO[3].y);
    g.addColorStop(0,'#5b5b62'); g.addColorStop(.22,'#26262b');
    g.addColorStop(.8,'#101014'); g.addColorStop(1,'#000');
    rPoly(TO, W*0.045); ctx.fillStyle=g; ctx.fill();
    g = ctx.createLinearGradient(0, TO[0].y, 0, H*0.45);
    g.addColorStop(0,'rgba(255,255,255,.55)'); g.addColorStop(1,'rgba(255,255,255,0)');
    rPoly(TO, W*0.045); ctx.strokeStyle=g; ctx.lineWidth=2.5; ctx.stroke();

    // pit (grass area)
    const RP = [P(-0.1,-0.2),P(1.1,-0.2),P(1.1,1.2),P(-0.1,1.2)];
    rPoly(RP, W*0.02); ctx.fillStyle='#08080a'; ctx.fill();
    rPoly(RP, W*0.02); ctx.save(); ctx.clip();
    
    if (theme.customDraw) {
      theme.customDraw(ctx, W, H, fill, P, strokeUV);
    } else {
      if (theme.gradTop) {
        const pitchG = ctx.createLinearGradient(0, RP[0].y, 0, RP[3].y);
        pitchG.addColorStop(0, theme.gradTop);
        pitchG.addColorStop(1, theme.gradBottom);
        ctx.fillStyle = pitchG;
      } else {
        ctx.fillStyle = theme.base || '#3f8a3a';
      }
      ctx.fillRect(0,0,W,H);
      
      if (theme.stripeColor) {
        ctx.globalAlpha = theme.stripeAlpha || 1;
        for(let i=-1; i<=12; i++){
          const u0 = Math.max(i/12,-0.1), u1 = Math.min((i+1)/12,1.1);
          if(u1 <= u0) continue;
          if (i&1) {
            fill([[u0,-0.2],[u1,-0.2],[u1,1.2],[u0,1.2]], theme.stripeColor);
          }
        }
        ctx.globalAlpha = 1;
      } else if (!theme.gradTop && !theme.base) {
        // Fallback grass pattern
        ctx.fillStyle='#3f8a3a'; ctx.fillRect(0,0,W,H);
        for(let i=-1; i<=12; i++){
          const u0 = Math.max(i/12,-0.1), u1 = Math.min((i+1)/12,1.1);
          if(u1 <= u0) continue;
          fill([[u0,-0.2],[u1,-0.2],[u1,1.2],[u0,1.2]], (i&1)?'#418c3b':'#4c9a43');
        }
      }
    }
    
    // lights
    g = ctx.createRadialGradient(W/2, H*0.42, 10, W/2, H*0.42, W*0.55);
    g.addColorStop(0,'rgba(255,255,225,.14)'); g.addColorStop(1,'rgba(255,255,225,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    g = ctx.createLinearGradient(0,RP[0].y,0,RP[0].y+H*0.2);
    g.addColorStop(0,'rgba(0,0,0,.4)'); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    g = ctx.createLinearGradient(0,RP[3].y-H*0.12,0,RP[3].y);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.28)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    ctx.restore();
    rPoly(RP, W*0.02); ctx.strokeStyle='rgba(0,0,0,.55)'; ctx.lineWidth=H*0.018; ctx.stroke();

    // markings
    if (project.pitchView !== PitchView.TRAINING) {
      ctx.globalAlpha = theme.lineAlpha || 1;
      strokeUV([[0,0],[1,0],[1,1],[0,1],[0,0]], lw, WHITE);
      strokeUV([[.5,0],[.5,1]], lw, WHITE);
      let cc=[]; for(let t=0; t<=64; t++){ const a=t/64*2*Math.PI; cc.push([.5+(9.15/M)*Math.cos(a), .5+(9.15/D)*Math.sin(a)]); }
      strokeUV(cc, lw, WHITE);
      dot(.5, .5, lw*0.9, WHITE);

      for(const side of [0,1]){
        const mu = (u: number) => side ? 1-u : u;
        strokeUV([[mu(U(0)),V(13.84)],[mu(U(16.5)),V(13.84)],[mu(U(16.5)),V(54.16)],[mu(U(0)),V(54.16)]], lw, WHITE);
        strokeUV([[mu(U(0)),V(24.84)],[mu(U(5.5)),V(24.84)],[mu(U(5.5)),V(43.16)],[mu(U(0)),V(43.16)]], lw, WHITE);
        dot(U(side?94:11), .5, lw*0.9, WHITE);
        let arc=[]; for(let t=0; t<=24; t++){ const a = (-0.925+1.85*t/24); arc.push([U((side?94:11)+(side?-1:1)*9.15*Math.cos(a)), V(34+9.15*Math.sin(a))]); }
        strokeUV(arc, lw, WHITE);
      }
      
      const corner = (cu: number, cv: number, a0: number) => {
        let a=[]; for(let t=0; t<=8; t++){ const an = a0+t/8*Math.PI/2; a.push([cu+(cu?-1:1)*Math.cos(an)/M, cv+(cv?-1:1)*Math.sin(an)/D]); }
        strokeUV(a, lw*0.9, WHITE);
      };
      corner(0,0,0); corner(1,0,Math.PI/2+Math.PI); corner(0,1,0); corner(1,1,0);

      // 3D elements
      if (project.pitchView === PitchView.PERSPECTIVE) {
        // goals
        for(const side of [0,1]){
          const mu = (u: number) => side ? 1-u : u, gv1=V(30.34), gv2=V(37.66);
          const uf = mu(0), ub = mu(-0.05), h = H*0.085, hb = h*0.72;
          const net = 'rgba(240,240,240,.5)';
          for(let j=0; j<=6; j++){ const v = LERP(gv1, gv2, j/6); lineE([ub,v,0],[ub,v,hb],net,1); }
          for(let j=1; j<=3; j++) lineE([ub,gv1,hb*j/3],[ub,gv2,hb*j/3],net,1);
          for(let j=0; j<=4; j++){ const u = LERP(uf,ub,j/4), hh = LERP(h,hb,j/4); lineE([u,gv1,hh],[u,gv1,0],net,1); lineE([u,gv2,hh],[u,gv2,0],net,1); }
          lineE([uf,gv1,h],[ub,gv1,hb],net,1.4); lineE([uf,gv2,h],[ub,gv2,hb],net,1.4);
          lineE([ub,gv1,hb],[ub,gv2,hb],'rgba(255,255,255,.8)',2);
          lineE([uf,gv1,0],[uf,gv1,h],WHITE,3); lineE([uf,gv2,0],[uf,gv2,h],WHITE,3);
          lineE([uf,gv1,h],[uf,gv2,h],WHITE,3);
        }

        // flags
        for(const [cu,cv] of [[0,0],[1,0],[0,1],[1,1]]){
          const t = E(P, cu, cv, H*0.05), dir = cu<0.5 ? -1 : 1, L = W*0.016;
          lineE([cu,cv,0],[cu,cv,H*0.05],'#e8e8e8',2);
          ctx.beginPath(); ctx.moveTo(t.x, t.y);
          ctx.lineTo(t.x+dir*L, t.y+L*0.18); ctx.lineTo(t.x, t.y+L*0.6);
          ctx.closePath(); ctx.fillStyle='#d42a2a'; ctx.fill();
        }

        // bench seats
        const seat = (ua: number, ubv: number, v0: number, v1: number, top: string, face: string) => {
          const hh = H*0.012;
          fill([[ua,v0,hh],[ubv,v0,hh],[ubv,v1,hh],[ua,v1,hh]], top);
          const inner = ua < 0 ? ubv : ua;
          fill([[inner,v0,0],[inner,v1,0],[inner,v1,hh],[inner,v0,hh]], face);
        };
        for(const side of [0,1]) for(let grp=0; grp<2; grp++) for(let i=0; i<5; i++){
          const v0 = (grp ? 0.53 : 0.17) + i*0.062, v1 = v0+0.052;
          const [top,face] = grp ? ['#e05252','#7a1d1d'] : ['#4a7de0','#1d3a7a'];
          side ? seat(1.125,1.175,v0,v1,top,face) : seat(-0.175,-0.125,v0,v1,top,face);
        }

        // floodlight panels
        for(const side of [0,1]){
          const u = side ? 1.15 : -0.15, c = P(u,0.10), a = P(u,0.02), b = P(u,0.18);
          const ang = Math.atan2(b.y-a.y, b.x-a.x), len = H*0.16, wid = W*0.024;
          ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(ang);
          ctx.fillStyle='#17171b'; ctx.strokeStyle='#3a3a40'; ctx.lineWidth=1.5;
          ctx.beginPath(); if(ctx.roundRect) { ctx.roundRect(-len/2,-wid/2,len,wid,4); } else { ctx.rect(-len/2,-wid/2,len,wid); }
          ctx.fill(); ctx.stroke();
          // We must disable the time-based pulsing here so it caches cleanly
          // Using a fixed glow value of 1.0 for the static render
          const glow = 1.0; 
          for(let i=-1; i<=1; i++) for(const j of [-1,1]){
            ctx.save(); ctx.shadowColor=`rgba(255,255,255,${glow})`; ctx.shadowBlur=10+8*glow;
            ctx.beginPath(); ctx.arc(i*len*0.3, j*wid*0.22, W*0.0042, 0, 7);
            ctx.fillStyle='#fff'; ctx.fill(); ctx.restore();
          }
          ctx.restore();
        }
      }
    }

    // vignette
    g = ctx.createRadialGradient(W/2, H/2, W*0.3, W/2, H/2, W*0.75);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.55)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    
    // Restore clipping path
    ctx.restore();
  }

  ctx.restore();
};

export const drawBoardToCanvas = (
  ctx: CanvasRenderingContext2D,
  project: Project,
  currentSlide: Slide,
  previousSlide: Slide | null,
  progress: number, // 0 to 1 for transition
  coinSettings: CoinSettings,
  bgImg: HTMLImageElement | null,
  pitchTemplate: PitchTemplate,
  width: number,
  height: number,
  scale: number,
  editingTextId?: string | null,
  dropTargetPlayerId?: string | null,
  isEditor: boolean = false,
  selectedPlayerIds: string[] = [],
  editorPreviousSlide: Slide | null = null,
  selectedDrawingId?: string | null,
  staticBgCanvas?: HTMLCanvasElement | null
) => {
  console.log("drawBoardToCanvas called", { P_WIDTH: project.pitchWidth, P_HEIGHT: project.pitchHeight, scale });
  ctx.save();
  ctx.scale(scale, scale);

  const getCam = (s: Slide | null) => ({
    zoom: s?.camera?.zoom ?? 1,
    panX: s?.camera?.panX ?? 0,
    panY: s?.camera?.panY ?? 0,
    rotateX: s?.camera?.rotateX ?? 0,
    rotateZ: s?.camera?.rotateZ ?? 0
  });

  const compiledAnim: CompiledAnimation = compileAnimation(currentSlide);
  const timeMs = progress * compiledAnim.durationMs;
  const camProgress = compiledAnim.camDurationMs > 0 ? Math.min(1, timeMs / compiledAnim.camDurationMs) : 1;

  const currCam = getCam(currentSlide);
  let zoom = currCam.zoom;
  let panX = currCam.panX;
  let panY = currCam.panY;
  let rotZ = currCam.rotateZ;

  if (previousSlide && camProgress < 1) {
    const prevCam = getCam(previousSlide);
    // Smooth ease in out
    const ease = camProgress < 0.5 ? 2 * camProgress * camProgress : 1 - Math.pow(-2 * camProgress + 2, 2) / 2;
    zoom = lerp(prevCam.zoom, currCam.zoom, ease);
    panX = lerp(prevCam.panX, currCam.panX, ease);
    panY = lerp(prevCam.panY, currCam.panY, ease);
    rotZ = lerp(prevCam.rotateZ, currCam.rotateZ, ease);
  }

  const P_WIDTH = project.pitchWidth || PITCH_WIDTH;
  const P_HEIGHT = project.pitchHeight || PITCH_HEIGHT;
  
  if (!isEditor) {
    const cx = P_WIDTH / 2;
    const cy = P_HEIGHT / 2;

    ctx.translate(cx - panX, cy - panY);
    ctx.scale(zoom, zoom);
    if (rotZ) {
      ctx.rotate(rotZ * Math.PI / 180);
    }
    ctx.translate(-cx, -cy);
  }

  const P = makeP(P_WIDTH, P_HEIGHT, project.pitchView);

    // 1. Draw Background
  if (staticBgCanvas) {
      // Draw pre-rendered static background
      ctx.save();
      // Reset transform so we can draw the pre-scaled static canvas exactly at 0,0 with export dimensions
      // But wait! The staticBgCanvas is pre-scaled by `scale`. 
      // Since ctx currently has `scale` applied at the top of drawBoardToCanvas, 
      // drawing at P_WIDTH, P_HEIGHT with scale=1 is achieved by simply drawing width=P_WIDTH, height=P_HEIGHT
      ctx.drawImage(staticBgCanvas, 0, 0, P_WIDTH, P_HEIGHT);
      ctx.restore();
  } else if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, P_WIDTH, P_HEIGHT);
  } else {
    let W = P_WIDTH;
    let H = P_HEIGHT;
    
    // Fill background with black for letterboxing effect
    ctx.fillStyle = '#080b12';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    // Clip for HALF and VERTICAL views so pitch doesn't bleed out of its centered area
    if (project.pitchView === PitchView.VERTICAL) {
        const PW = 90;
        const drawH = H;
        const drawW = H * (PW / 105);
        const xOff = (W - drawW) / 2;
        ctx.beginPath();
        ctx.rect(xOff, 0, drawW, drawH);
        ctx.clip();
    } else if (project.pitchView === PitchView.HALF) {
        const drawH = H;
        const drawW = H * (68 / 52.5);
        const xOff = (W - drawW) / 2;
        ctx.beginPath();
        ctx.rect(xOff, 0, drawW, drawH);
        ctx.clip();
    }
    
    // Poly helper
    const poly = (pts: number[][]) => {
      ctx.beginPath();
      pts.forEach((p, i) => {
        const q = p.length === 3 ? E(P, p[0], p[1], p[2]) : P(p[0], p[1]);
        i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
      });
      ctx.closePath();
    };
    const fill = (pts: number[][], col: string) => { poly(pts); ctx.fillStyle = col; ctx.fill(); };

    // strokeUV helper
    const strokeUV = (pts: number[][], w: number, col: string) => {
      const sp = pts.map(p => P(p[0], p[1]));
      const n = sp.length;
      const off: number[][] = [];
      for(let i=0; i<n; i++){
        const a = sp[Math.max(0, i-1)];
        const b = sp[Math.min(n-1, i+1)];
        let dx = b.x - a.x, dy = b.y - a.y;
        const l = Math.hypot(dx, dy) || 1;
        const ww = w * 0.5 * sp[i].s;
        off.push([-dy/l*ww, dx/l*ww]);
      }
      ctx.beginPath();
      for(let i=0; i<n; i++) { const p = sp[i]; i ? ctx.lineTo(p.x+off[i][0], p.y+off[i][1]) : ctx.moveTo(p.x+off[i][0], p.y+off[i][1]); }
      for(let i=n-1; i>=0; i--) { const p = sp[i]; ctx.lineTo(p.x-off[i][0], p.y-off[i][1]); }
      ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    };

    const lineE = (a: number[], b: number[], col: string, w: number) => {
      const p = E(P, a[0], a[1], a[2] || 0), q = E(P, b[0], b[1], b[2] || 0);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      ctx.strokeStyle = col; ctx.lineWidth = w * ((p.s + q.s) / 2); ctx.stroke();
    };

    const dot = (u: number, v: number, r: number, col: string) => {
      const p = P(u, v);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r*p.s, r*p.s*0.9, 0, 0, 7);
      ctx.fillStyle = col; ctx.fill();
    };

    const rPoly = (pts: any[], r: number) => {
      const m = (a: any, b: any) => ({x:(a.x+b.x)/2, y:(a.y+b.y)/2});
      ctx.beginPath(); ctx.moveTo(m(pts[0],pts[1]).x, m(pts[0],pts[1]).y);
      for(let i=1; i<=4; i++){ const p=pts[i%4], q=pts[(i+1)%4]; ctx.arcTo(p.x, p.y, q.x, q.y, r); }
      ctx.closePath();
    };

    const M=105, D=68;
    const U = (x: number) => x/M;
    const V = (y: number) => y/D;
    
    const theme = TEMPLATE_CONFIG[pitchTemplate] || TEMPLATE_CONFIG[PitchTemplate.THEME_CLASSIC];
    const WHITE = theme.lineColor || '#f2f5ef';
    const lw = Math.max(1.6, P_HEIGHT*0.0042) * (theme.lineWidthMul || 1);

    // backdrop
    let g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#2a2019'); g.addColorStop(.5,'#150e09'); g.addColorStop(1,'#040202');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // tray
    const TO = [P(-0.25,-0.25),P(1.25,-0.25),P(1.25,1.25),P(-0.25,1.25)];
    ctx.save(); ctx.shadowColor='rgba(0,0,0,.85)'; ctx.shadowBlur=45;
    rPoly(TO, W*0.045); ctx.fillStyle='#0a0a0b'; ctx.fill(); ctx.restore();
    g = ctx.createLinearGradient(0, TO[0].y, 0, TO[3].y);
    g.addColorStop(0,'#5b5b62'); g.addColorStop(.22,'#26262b');
    g.addColorStop(.8,'#101014'); g.addColorStop(1,'#000');
    rPoly(TO, W*0.045); ctx.fillStyle=g; ctx.fill();
    g = ctx.createLinearGradient(0, TO[0].y, 0, H*0.45);
    g.addColorStop(0,'rgba(255,255,255,.55)'); g.addColorStop(1,'rgba(255,255,255,0)');
    rPoly(TO, W*0.045); ctx.strokeStyle=g; ctx.lineWidth=2.5; ctx.stroke();

    // pit (grass area)
    const RP = [P(-0.1,-0.2),P(1.1,-0.2),P(1.1,1.2),P(-0.1,1.2)];
    rPoly(RP, W*0.02); ctx.fillStyle='#08080a'; ctx.fill();
    rPoly(RP, W*0.02); ctx.save(); ctx.clip();
    
    if (theme.customDraw) {
      theme.customDraw(ctx, W, H, fill, P, strokeUV);
    } else {
      if (theme.gradTop) {
        const pitchG = ctx.createLinearGradient(0, RP[0].y, 0, RP[3].y);
        pitchG.addColorStop(0, theme.gradTop);
        pitchG.addColorStop(1, theme.gradBottom);
        ctx.fillStyle = pitchG;
      } else {
        ctx.fillStyle = theme.base || '#3f8a3a';
      }
      ctx.fillRect(0,0,W,H);
      
      if (theme.stripeColor) {
        ctx.globalAlpha = theme.stripeAlpha || 1;
        for(let i=-1; i<=12; i++){
          const u0 = Math.max(i/12,-0.1), u1 = Math.min((i+1)/12,1.1);
          if(u1 <= u0) continue;
          if (i&1) {
            fill([[u0,-0.2],[u1,-0.2],[u1,1.2],[u0,1.2]], theme.stripeColor);
          }
        }
        ctx.globalAlpha = 1;
      } else if (!theme.gradTop && !theme.base) {
        // Fallback grass pattern
        ctx.fillStyle='#3f8a3a'; ctx.fillRect(0,0,W,H);
        for(let i=-1; i<=12; i++){
          const u0 = Math.max(i/12,-0.1), u1 = Math.min((i+1)/12,1.1);
          if(u1 <= u0) continue;
          fill([[u0,-0.2],[u1,-0.2],[u1,1.2],[u0,1.2]], (i&1)?'#418c3b':'#4c9a43');
        }
      }
    }
    
    // lights
    g = ctx.createRadialGradient(W/2, H*0.42, 10, W/2, H*0.42, W*0.55);
    g.addColorStop(0,'rgba(255,255,225,.14)'); g.addColorStop(1,'rgba(255,255,225,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    g = ctx.createLinearGradient(0,RP[0].y,0,RP[0].y+H*0.2);
    g.addColorStop(0,'rgba(0,0,0,.4)'); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    g = ctx.createLinearGradient(0,RP[3].y-H*0.12,0,RP[3].y);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.28)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    ctx.restore();
    rPoly(RP, W*0.02); ctx.strokeStyle='rgba(0,0,0,.55)'; ctx.lineWidth=H*0.018; ctx.stroke();

    // markings
    if (project.pitchView !== PitchView.TRAINING) {
      ctx.globalAlpha = theme.lineAlpha || 1;
      strokeUV([[0,0],[1,0],[1,1],[0,1],[0,0]], lw, WHITE);
      strokeUV([[.5,0],[.5,1]], lw, WHITE);
      let cc=[]; for(let t=0; t<=64; t++){ const a=t/64*2*Math.PI; cc.push([.5+(9.15/M)*Math.cos(a), .5+(9.15/D)*Math.sin(a)]); }
      strokeUV(cc, lw, WHITE);
      dot(.5, .5, lw*0.9, WHITE);

      for(const side of [0,1]){
        const mu = (u: number) => side ? 1-u : u;
        strokeUV([[mu(U(0)),V(13.84)],[mu(U(16.5)),V(13.84)],[mu(U(16.5)),V(54.16)],[mu(U(0)),V(54.16)]], lw, WHITE);
        strokeUV([[mu(U(0)),V(24.84)],[mu(U(5.5)),V(24.84)],[mu(U(5.5)),V(43.16)],[mu(U(0)),V(43.16)]], lw, WHITE);
        dot(U(side?94:11), .5, lw*0.9, WHITE);
        let arc=[]; for(let t=0; t<=24; t++){ const a = (-0.925+1.85*t/24); arc.push([U((side?94:11)+(side?-1:1)*9.15*Math.cos(a)), V(34+9.15*Math.sin(a))]); }
        strokeUV(arc, lw, WHITE);
      }
      
      const corner = (cu: number, cv: number, a0: number) => {
        let a=[]; for(let t=0; t<=8; t++){ const an = a0+t/8*Math.PI/2; a.push([cu+(cu?-1:1)*Math.cos(an)/M, cv+(cv?-1:1)*Math.sin(an)/D]); }
        strokeUV(a, lw*0.9, WHITE);
      };
      corner(0,0,0); corner(1,0,Math.PI/2+Math.PI); corner(0,1,0); corner(1,1,0);

      // 3D elements
      if (project.pitchView === PitchView.PERSPECTIVE) {
        // goals
        for(const side of [0,1]){
          const mu = (u: number) => side ? 1-u : u, gv1=V(30.34), gv2=V(37.66);
          const uf = mu(0), ub = mu(-0.05), h = H*0.085, hb = h*0.72;
          const net = 'rgba(240,240,240,.5)';
          for(let j=0; j<=6; j++){ const v = LERP(gv1, gv2, j/6); lineE([ub,v,0],[ub,v,hb],net,1); }
          for(let j=1; j<=3; j++) lineE([ub,gv1,hb*j/3],[ub,gv2,hb*j/3],net,1);
          for(let j=0; j<=4; j++){ const u = LERP(uf,ub,j/4), hh = LERP(h,hb,j/4); lineE([u,gv1,hh],[u,gv1,0],net,1); lineE([u,gv2,hh],[u,gv2,0],net,1); }
          lineE([uf,gv1,h],[ub,gv1,hb],net,1.4); lineE([uf,gv2,h],[ub,gv2,hb],net,1.4);
          lineE([ub,gv1,hb],[ub,gv2,hb],'rgba(255,255,255,.8)',2);
          lineE([uf,gv1,0],[uf,gv1,h],WHITE,3); lineE([uf,gv2,0],[uf,gv2,h],WHITE,3);
          lineE([uf,gv1,h],[uf,gv2,h],WHITE,3);
        }

        // flags
        for(const [cu,cv] of [[0,0],[1,0],[0,1],[1,1]]){
          const t = E(P, cu, cv, H*0.05), dir = cu<0.5 ? -1 : 1, L = W*0.016;
          lineE([cu,cv,0],[cu,cv,H*0.05],'#e8e8e8',2);
          ctx.beginPath(); ctx.moveTo(t.x, t.y);
          ctx.lineTo(t.x+dir*L, t.y+L*0.18); ctx.lineTo(t.x, t.y+L*0.6);
          ctx.closePath(); ctx.fillStyle='#d42a2a'; ctx.fill();
        }

        // bench seats
        const seat = (ua: number, ubv: number, v0: number, v1: number, top: string, face: string) => {
          const hh = H*0.012;
          fill([[ua,v0,hh],[ubv,v0,hh],[ubv,v1,hh],[ua,v1,hh]], top);
          const inner = ua < 0 ? ubv : ua;
          fill([[inner,v0,0],[inner,v1,0],[inner,v1,hh],[inner,v0,hh]], face);
        };
        for(const side of [0,1]) for(let grp=0; grp<2; grp++) for(let i=0; i<5; i++){
          const v0 = (grp ? 0.53 : 0.17) + i*0.062, v1 = v0+0.052;
          const [top,face] = grp ? ['#e05252','#7a1d1d'] : ['#4a7de0','#1d3a7a'];
          side ? seat(1.125,1.175,v0,v1,top,face) : seat(-0.175,-0.125,v0,v1,top,face);
        }

        // floodlight panels
        for(const side of [0,1]){
          const u = side ? 1.15 : -0.15, c = P(u,0.10), a = P(u,0.02), b = P(u,0.18);
          const ang = Math.atan2(b.y-a.y, b.x-a.x), len = H*0.16, wid = W*0.024;
          ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(ang);
          ctx.fillStyle='#17171b'; ctx.strokeStyle='#3a3a40'; ctx.lineWidth=1.5;
          ctx.beginPath(); if(ctx.roundRect) { ctx.roundRect(-len/2,-wid/2,len,wid,4); } else { ctx.rect(-len/2,-wid/2,len,wid); }
          ctx.fill(); ctx.stroke();
          const glow = 0.7 + 0.3 * Math.sin(performance.now() / 600);
          for(let i=-1; i<=1; i++) for(const j of [-1,1]){
            ctx.save(); ctx.shadowColor=`rgba(255,255,255,${glow})`; ctx.shadowBlur=10+8*glow;
            ctx.beginPath(); ctx.arc(i*len*0.3, j*wid*0.22, W*0.0042, 0, 7);
            ctx.fillStyle='#fff'; ctx.fill(); ctx.restore();
          }
          ctx.restore();
        }
      }
    }

    // vignette
    g = ctx.createRadialGradient(W/2, H/2, W*0.3, W/2, H/2, W*0.75);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.55)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    
    // Restore clipping path
    ctx.restore();
  }
  const effectivePrevSlide = editorPreviousSlide || previousSlide;

  // 2. Draw Trails
  if (coinSettings.trails.enabled && effectivePrevSlide) {
    const allPlayers = [
      ...project.teams[TeamSide.HOME].players, 
      ...project.teams[TeamSide.AWAY].players,
      ...(project.teams[TeamSide.NEUTRAL] ? project.teams[TeamSide.NEUTRAL].players : [])
    ];
    
    if (coinSettings.trails.style === 'dashed') ctx.setLineDash([12, 8]);
    else if (coinSettings.trails.style === 'dotted') ctx.setLineDash([4, 8]);
    else ctx.setLineDash([]);
    ctx.lineCap = 'round';

    for (const player of allPlayers) {
      const currentPos = currentSlide.positions[player.id];
      const prevPos = effectivePrevSlide.positions[player.id];
      if (currentPos && prevPos && (currentPos.x !== prevPos.x || currentPos.y !== prevPos.y)) {
        const cps = getPlayerMotionPath(prevPos, currentPos);
        const bezierPoints = [prevPos, ...cps, currentPos];
        
        let coinColor = player.color;
        if (!coinColor) {
           const side = project.teams[TeamSide.HOME].players.includes(player) ? TeamSide.HOME :
                     project.teams[TeamSide.AWAY].players.includes(player) ? TeamSide.AWAY : TeamSide.NEUTRAL;
           const t = project.teams[side];
           coinColor = currentSlide.teamSettings?.[side]?.color || t?.settings?.color || t?.color || '#ffffff';
        }

        const tThick = coinSettings.trails.thickness || 5;

        const drawCurve = (yOffset = 0) => {
           ctx.beginPath();
           const p0 = P(prevPos.x / P_WIDTH, prevPos.y / P_HEIGHT);
           ctx.moveTo(p0.x, p0.y + yOffset);
           const steps = 30;
           for (let i = 1; i <= steps; i++) {
               const pt = getBezierPoint(bezierPoints, i / steps);
               const pPt = P(pt.x / P_WIDTH, pt.y / P_HEIGHT);
               ctx.lineTo(pPt.x, pPt.y + yOffset);
           }
        };
        
        // Glow effect
        drawCurve(0);
        ctx.strokeStyle = coinColor;
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = tThick * 2.4;
        // Basic blur for canvas 
        ctx.shadowColor = coinColor;
        ctx.shadowBlur = 4;
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;

        // Shadow/Depth effect
        drawCurve(2);
        ctx.strokeStyle = '#000000';
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = tThick * 1.2;
        ctx.stroke();

        // Main line
        drawCurve(0);
        ctx.strokeStyle = coinColor;
        ctx.globalAlpha = coinSettings.trails.opacity;
        ctx.lineWidth = tThick;
        ctx.stroke();

        // Inner highlight (glassy effect)
        drawCurve(0);
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = Math.max(1, tThick * 0.3);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }

  // 2.5 Draw Motion Paths (Editor only)
  if (isEditor && effectivePrevSlide) {
    const allPlayers = [
      ...project.teams[TeamSide.HOME].players, 
      ...project.teams[TeamSide.AWAY].players,
      ...(project.teams[TeamSide.NEUTRAL] ? project.teams[TeamSide.NEUTRAL].players : [])
    ];

    for (const player of allPlayers) {
      const currentPos = currentSlide.positions[player.id];
      const prevPos = effectivePrevSlide.positions[player.id];
      
      if (currentPos && prevPos && (currentPos.x !== prevPos.x || currentPos.y !== prevPos.y)) {
        const cps = getPlayerMotionPath(prevPos, currentPos);
        const bezierPoints = [prevPos, ...cps, currentPos];
        const isSelected = selectedPlayerIds.includes(player.id);
        
        let coinColor = player.color;
        if (!coinColor) {
           const side = project.teams[TeamSide.HOME].players.includes(player) ? TeamSide.HOME :
                     project.teams[TeamSide.AWAY].players.includes(player) ? TeamSide.AWAY : TeamSide.NEUTRAL;
           const t = project.teams[side];
           coinColor = currentSlide.teamSettings?.[side]?.color || t?.settings?.color || t?.color || '#ffffff';
        }

        // Always draw the curve UI for selected players so they can edit it
        if (isSelected) {
          ctx.beginPath();
          const p0 = P(prevPos.x / P_WIDTH, prevPos.y / P_HEIGHT);
          ctx.moveTo(p0.x, p0.y);
          const steps = 30;
          for (let i = 1; i <= steps; i++) {
              const pt = getBezierPoint(bezierPoints, i / steps);
              const pPt = P(pt.x / P_WIDTH, pt.y / P_HEIGHT);
              ctx.lineTo(pPt.x, pPt.y);
          }
          ctx.strokeStyle = coinColor;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.8;
          ctx.stroke();
        }
        
        // Draw control points if player is selected
        if (isSelected) {
          ctx.globalAlpha = 1;
          
          // Helper lines
          if (cps.length > 0) {
            ctx.beginPath();
            const p0 = P(prevPos.x / P_WIDTH, prevPos.y / P_HEIGHT);
            ctx.moveTo(p0.x, p0.y);
            
            const cp0 = P(cps[0].x / P_WIDTH, cps[0].y / P_HEIGHT);
            ctx.lineTo(cp0.x, cp0.y);
            
            for (let i = 0; i < cps.length - 1; i++) {
               const cpNext = P(cps[i + 1].x / P_WIDTH, cps[i + 1].y / P_HEIGHT);
               ctx.lineTo(cpNext.x, cpNext.y);
            }
            
            const p1 = P(currentPos.x / P_WIDTH, currentPos.y / P_HEIGHT);
            ctx.lineTo(p1.x, p1.y);
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          
          // The control points
          for (let i = 0; i < cps.length; i++) {
            ctx.beginPath();
            const cpP = P(cps[i].x / P_WIDTH, cps[i].y / P_HEIGHT);
            ctx.arc(cpP.x, cpP.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ef4444';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }
    }
  }

  // 3. Draw Drawings
  // Fade out old drawings, fade in new drawings
  const controller = new AnimationController(currentSlide, previousSlide, compiledAnim);
  const renderState = controller.getRenderState(timeMs);
  const fadeAlpha = renderState.globalAlpha;
  const hasAnimSteps = compiledAnim.hasAnimSteps;

  const renderSingleDrawing = (d: Drawing, animProgress: number, currentFadeAlpha: number, fadeAlpha: number) => {
    let points = d.points.map(p => {
        const isEquipment = [ToolType.BALL, ToolType.CONE, ToolType.DISC, ToolType.GOAL, ToolType.GOAL_MINI, ToolType.GOAL_SIDE, ToolType.MANNEQUIN, ToolType.LADDER, ToolType.HURDLE, ToolType.POLE].includes(d.type);
        if (p.attachedToPlayerId && d.props?.attachToPlayer !== false && !isEquipment) {
            const playerState = renderState.players.find(x => x.id === p.attachedToPlayerId);
            if (playerState) {
                return { ...p, x: playerState.x, y: playerState.y };
            }
        }
        return p;
    });
    points = points.map(p => P(p.x / P_WIDTH, p.y / P_HEIGHT));

    const isPointItem = [ToolType.BALL, ToolType.CONE, ToolType.DISC, ToolType.GOAL, ToolType.GOAL_MINI, ToolType.GOAL_SIDE, ToolType.MANNEQUIN, ToolType.LADDER, ToolType.HURDLE, ToolType.POLE].includes(d.type);

    if (points.length < 2 && d.type !== ToolType.CONNECTOR && d.type !== ToolType.TEXT && !isPointItem) return;
    ctx.globalAlpha = currentFadeAlpha;
    ctx.strokeStyle = d.color;
    ctx.lineWidth = d.props?.strokeWidth || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (d.type === ToolType.PEN) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      
      const N = points.length;
      const visiblePts = Math.max(1, Math.floor(N * animProgress));
      
      for (let i = 1; i < visiblePts; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      if (d.props?.strokeStyle === 'dashed') {
        ctx.setLineDash([8, 8]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (d.type === ToolType.CONNECTOR) {
      const p1 = renderState.players.find(x => x.id === d.props?.startPlayerId);
      const p2 = renderState.players.find(x => x.id === d.props?.endPlayerId);
      if (p1 && p2) {
        const p1Proj = P(p1.x / P_WIDTH, p1.y / P_HEIGHT);
        const p2Proj = P(p2.x / P_WIDTH, p2.y / P_HEIGHT);
        ctx.beginPath();
        if (animProgress < 1) {
            const dx = (p2Proj.x - p1Proj.x) * animProgress;
            const dy = (p2Proj.y - p1Proj.y) * animProgress;
            ctx.moveTo(p1Proj.x, p1Proj.y);
            ctx.lineTo(p1Proj.x + dx, p1Proj.y + dy);
        } else {
            ctx.moveTo(p1Proj.x, p1Proj.y);
            ctx.lineTo(p2Proj.x, p2Proj.y);
        }
        if (d.props?.strokeStyle === 'solid') {
          ctx.setLineDash([]);
        } else {
          ctx.setLineDash([6, 6]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (d.type === ToolType.ARROW || d.type === ToolType.CURVE_ARROW) {
      if (points.length >= 2) {
        const start = points[0];
        const end = points[points.length - 1];
        let ctrl = null;
        
        if (d.type === ToolType.CURVE_ARROW) {
            ctrl = points.length === 3 ? points[1] : null;
            if (!ctrl) {
                const mx = (start.x + end.x) / 2;
                const my = (start.y + end.y) / 2;
                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const len = Math.hypot(dx, dy);
                const off = len * 0.3;
                ctrl = len > 5 ? { x: mx + (dy / len) * off, y: my - (dx / len) * off } : { x: mx, y: my };
            }
        }

        ctx.save();
        
        const arrowTheme = TEMPLATE_CONFIG[pitchTemplate] || TEMPLATE_CONFIG[PitchTemplate.THEME_CLASSIC];
        ctx.shadowColor = (arrowTheme.label === 'Minimal Light' || arrowTheme.label === 'White') ? 'rgba(15,23,42,0.18)' : 'rgba(0,0,0,0.32)';
        ctx.shadowBlur = 7;
        ctx.shadowOffsetY = 2.5;
        
        const arrowWidth = d.props?.strokeWidth || 3;
        ctx.lineWidth = arrowWidth;
        ctx.strokeStyle = d.color;
        ctx.fillStyle = d.color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        let sampled = [start];
        if (d.type === ToolType.CURVE_ARROW && ctrl) {
            const N = 44;
            for(let i=1; i<=N; i++) {
                const t = i/N;
                const u = 1-t;
                sampled.push({
                    x: u*u*start.x + 2*u*t*ctrl.x + t*t*end.x,
                    y: u*u*start.y + 2*u*t*ctrl.y + t*t*end.y
                });
            }
        } else {
            sampled.push(end);
        }

        const cum = [0];
        for (let i = 1; i < sampled.length; i++) {
            cum.push(cum[i-1] + Math.hypot(sampled[i].x - sampled[i-1].x, sampled[i].y - sampled[i-1].y));
        }
        const total = cum[cum.length - 1];
        const animatedTotal = total * animProgress;
        
        if (animatedTotal >= 3) {
            const headLen = Math.max(arrowWidth * 3.1 + 7, 12);
            const stop = Math.max(animatedTotal * 0.3, animatedTotal - headLen * 0.82);

            ctx.beginPath();
            ctx.moveTo(sampled[0].x, sampled[0].y);

            if (d.props?.strokeStyle === 'dribbling') {
                const steps = 20;
                for (let i = 1; i <= steps * animProgress; i++) {
                    const t = i / steps;
                    let pt, pt_prev;
                    if (d.type === ToolType.CURVE_ARROW && ctrl) {
                        pt = {
                            x: (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * ctrl.x + t * t * end.x,
                            y: (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * ctrl.y + t * t * end.y
                        };
                        const tp = Math.max(0, t - 1/steps);
                        pt_prev = {
                            x: (1 - tp) * (1 - tp) * start.x + 2 * (1 - tp) * tp * ctrl.x + tp * tp * end.x,
                            y: (1 - tp) * (1 - tp) * start.y + 2 * (1 - tp) * tp * ctrl.y + tp * tp * end.y
                        };
                    } else {
                        pt = { x: start.x + t * (end.x - start.x), y: start.y + t * (end.y - start.y) };
                        const tp = Math.max(0, t - 1/steps);
                        pt_prev = { x: start.x + tp * (end.x - start.x), y: start.y + tp * (end.y - start.y) };
                    }
                    
                    const ptAngle = Math.atan2(pt.y - pt_prev.y, pt.x - pt_prev.x);
                    const perpX = -Math.sin(ptAngle);
                    const perpY = Math.cos(ptAngle);
                    
                    if (i % 2 === 1) {
                        ctx.quadraticCurveTo(pt_prev.x + perpX * 8, pt_prev.y + perpY * 8, pt.x, pt.y);
                    } else {
                        ctx.quadraticCurveTo(pt_prev.x - perpX * 8, pt_prev.y - perpY * 8, pt.x, pt.y);
                    }
                }
            } else {
                if (d.props?.strokeStyle === 'dashed') {
                    ctx.setLineDash([Math.max(6, arrowWidth * 2.4), Math.max(5, arrowWidth * 2)]);
                }
                for (let i = 1; i < sampled.length; i++) {
                    if (cum[i] >= stop) {
                        const t = (stop - cum[i-1]) / ((cum[i] - cum[i-1]) || 1);
                        ctx.lineTo(sampled[i-1].x + (sampled[i].x - sampled[i-1].x) * t, sampled[i-1].y + (sampled[i].y - sampled[i-1].y) * t);
                        break;
                    }
                    ctx.lineTo(sampled[i].x, sampled[i].y);
                }
            }
            ctx.stroke();
            ctx.setLineDash([]);

            let currentTip = sampled[0];
            let currentPrev = sampled[0];
            for (let i = 1; i < sampled.length; i++) {
                if (cum[i] >= animatedTotal) {
                    const t = (animatedTotal - cum[i-1]) / ((cum[i] - cum[i-1]) || 1);
                    currentTip = {
                        x: sampled[i-1].x + (sampled[i].x - sampled[i-1].x) * t,
                        y: sampled[i-1].y + (sampled[i].y - sampled[i-1].y) * t
                    };
                    currentPrev = sampled[i-1];
                    if (t < 0.01 && i > 1) currentPrev = sampled[i-2];
                    break;
                }
            }
            if (animProgress >= 1) {
                currentTip = sampled[sampled.length - 1];
                currentPrev = sampled[sampled.length - 2] || sampled[0];
            }

            const tip = currentTip;
            const prev = currentPrev;
            const ang = Math.atan2(tip.y - prev.y, tip.x - prev.x);
            
            const hw = headLen * 0.58;
            const bx = tip.x - Math.cos(ang) * headLen;
            const by = tip.y - Math.sin(ang) * headLen;
            const px = Math.cos(ang + Math.PI / 2);
            const py = Math.sin(ang + Math.PI / 2);
            
            ctx.beginPath();
            ctx.moveTo(tip.x, tip.y);
            ctx.lineTo(bx + px * hw, by + py * hw);
            ctx.lineTo(bx - px * hw, by - py * hw);
            ctx.closePath();
            ctx.fill();
            ctx.lineWidth = 1.6;
            ctx.stroke();
        }
        ctx.restore();
      }
    } else if (d.type === ToolType.LINE) {
      if (animProgress < 1) {
          const p1 = points[0];
          const p2 = points[points.length - 1];
          const curX = p1.x + (p2.x - p1.x) * animProgress;
          const curY = p1.y + (p2.y - p1.y) * animProgress;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(curX, curY);
          if (d.props?.strokeStyle === 'dashed') ctx.setLineDash([8, 8]);
          ctx.stroke();
          ctx.setLineDash([]);
      } else {
          const pathString = generateLinePath(points);
          const p = new Path2D(pathString);
          if (d.props?.strokeStyle === 'dashed') {
            ctx.setLineDash([8, 8]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.stroke(p);
          ctx.setLineDash([]);
      }
    } else if (d.type === ToolType.POLYGON) {
      if (points.length < 2) return;
      const totalSegments = points.length;
      const visibleSegments = animProgress * totalSegments;
      const fullSegments = Math.floor(visibleSegments);
      const partialSegment = visibleSegments - fullSegments;
      
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < fullSegments; i++) {
         const nextIdx = (i + 1) % points.length;
         ctx.lineTo(points[nextIdx].x, points[nextIdx].y);
      }
      if (fullSegments < totalSegments && partialSegment > 0) {
         const currPt = points[fullSegments];
         const nextPt = points[(fullSegments + 1) % points.length];
         ctx.lineTo(
             currPt.x + (nextPt.x - currPt.x) * partialSegment,
             currPt.y + (nextPt.y - currPt.y) * partialSegment
         );
      }
      if (animProgress === 1) ctx.closePath();
      
      if (d.props?.fillStyle !== 'none' && animProgress > 0) {
          ctx.save();
          if (animProgress < 1) ctx.lineTo(points[0].x, points[0].y); // Close for filling during anim
          if (d.props?.fillStyle === 'solid') {
            ctx.fillStyle = d.color;
            ctx.globalAlpha = fadeAlpha * 0.5 * animProgress;
            ctx.fill();
          } else if (d.props?.fillStyle === 'stripes') {
            const pCanvas = document.createElement('canvas');
            pCanvas.width = 8; pCanvas.height = 8;
            const pCtx = pCanvas.getContext('2d');
            if (pCtx) { pCtx.fillStyle = d.color; pCtx.globalAlpha = 0.4; pCtx.fillRect(0,0,4,8); }
            const pattern = ctx.createPattern(pCanvas, 'repeat');
            if (pattern) {
                pattern.setTransform(new DOMMatrix().rotate(45));
                ctx.fillStyle = pattern;
                ctx.globalAlpha = fadeAlpha * animProgress;
                ctx.fill();
            }
          }
          ctx.restore();
      }
      
      ctx.globalAlpha = fadeAlpha;
      if (d.props?.strokeStyle === 'dashed') {
        ctx.setLineDash([8, 8]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = d.color;
      for (let i = 0; i < points.length; i++) {
         if (i <= fullSegments || (i === 0 && fullSegments >= totalSegments)) {
             ctx.beginPath();
             ctx.arc(points[i].x, points[i].y, 4, 0, Math.PI * 2);
             ctx.fill();
             ctx.lineWidth = 1.5;
             ctx.strokeStyle = 'white';
             ctx.stroke();
         }
      }
      ctx.strokeStyle = d.color;
      
    } else if (d.type === ToolType.CIRCLE) {
      const start = points[0];
      const startLog = d.points[0];
      const endLog = d.points[d.points.length - 1];
      const radiusLog = Math.sqrt(Math.pow(endLog.x - startLog.x, 2) + Math.pow(endLog.y - startLog.y, 2));
      const radius = radiusLog * (start as any).s;
      
      const endAngle = animProgress * Math.PI * 2;
      
      if (d.props?.fillStyle !== 'none' && animProgress > 0) {
          ctx.beginPath();
          if (ctx.ellipse) {
             ctx.ellipse(start.x, start.y, radius, radius * 0.55, 0, 0, endAngle);
          } else {
             ctx.arc(start.x, start.y, radius, 0, endAngle);
          }
          if (animProgress < 1) ctx.lineTo(start.x, start.y);
          ctx.closePath();
          
          if (d.props?.fillStyle === 'solid') {
            ctx.fillStyle = d.color;
            ctx.globalAlpha = fadeAlpha * 0.5 * animProgress;
            ctx.fill();
          } else if (d.props?.fillStyle === 'stripes') {
            const pCanvas = document.createElement('canvas');
            pCanvas.width = 8; pCanvas.height = 8;
            const pCtx = pCanvas.getContext('2d');
            if (pCtx) { pCtx.fillStyle = d.color; pCtx.globalAlpha = 0.4; pCtx.fillRect(0,0,4,8); }
            const pattern = ctx.createPattern(pCanvas, 'repeat');
            if (pattern) {
                pattern.setTransform(new DOMMatrix().rotate(45));
                ctx.fillStyle = pattern;
                ctx.globalAlpha = fadeAlpha * animProgress;
                ctx.fill();
            }
          }
      }
      
      ctx.beginPath();
      if (ctx.ellipse) {
         ctx.ellipse(start.x, start.y, radius, radius * 0.55, 0, 0, endAngle);
      } else {
         ctx.arc(start.x, start.y, radius, 0, endAngle);
      }
      
      ctx.globalAlpha = fadeAlpha;
      if (d.props?.strokeStyle === 'dashed') {
        ctx.setLineDash([8, 8]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (d.type === ToolType.TEXT) {
      if (points[0] && d.id !== editingTextId) {
        const fontSize = d.props?.fontSize || 28;
        ctx.font = `bold ${fontSize}px ${d.props?.fontFamily || '"Plus Jakarta Sans", system-ui, sans-serif'}`;
        ctx.fillStyle = d.color;
        ctx.globalAlpha = currentFadeAlpha;
        const fullText = d.text || '';
        const charsToShow = Math.round(fullText.length * animProgress);
        const textToDraw = fullText.slice(0, charsToShow);
        
        const lines = textToDraw.split('\n');
        lines.forEach((line, index) => {
           ctx.fillText(line, points[0].x, points[0].y + (index * fontSize * 1.2));
        });
      }
    } else if (d.type === ToolType.BALL) {
      if (points[0]) {
        ctx.save();
        ctx.globalAlpha = currentFadeAlpha;
        ctx.translate(points[0].x, points[0].y);
        const s = (d.props?.scale || 1) * coinSettings.globalScale * ((points[0] as any).s || 1);
        ctx.scale(s, s);
        
        ctx.rotate((d.props?.rotation || 0) * Math.PI / 180);

        drawNewBall(ctx, 4.8);
        
        ctx.restore();
      }
    } else if ([ToolType.CONE, ToolType.DISC, ToolType.GOAL, ToolType.GOAL_MINI, ToolType.GOAL_SIDE, ToolType.MANNEQUIN, ToolType.LADDER, ToolType.HURDLE, ToolType.POLE].includes(d.type)) {
       if (points[0]) {
           ctx.save();
           ctx.globalAlpha = currentFadeAlpha;
           ctx.translate(points[0].x, points[0].y);
           const s = (d.props?.scale || 1) * coinSettings.globalScale * ((points[0] as any).s || 1);
           ctx.scale(s, s);
           if (d.props?.rotation) {
               ctx.rotate(d.props.rotation * Math.PI / 180);
           }

           if (d.type === ToolType.CONE) {
              ctx.beginPath(); ctx.ellipse(2, 4, 22, 5.5, 0, 0, Math.PI*2); ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.fill();
              ctx.beginPath(); ctx.moveTo(-15,0); ctx.lineTo(-5,-40); ctx.quadraticCurveTo(0,-44,5,-40); ctx.lineTo(15,0); ctx.closePath();
              ctx.fillStyle=d.color; ctx.fill(); ctx.lineWidth=1.5; ctx.strokeStyle="rgba(0,0,0,0.3)"; ctx.stroke();
              ctx.beginPath(); ctx.moveTo(-10,-15); ctx.lineTo(10,-15); ctx.lineTo(8,-25); ctx.lineTo(-8,-25); ctx.closePath(); ctx.fillStyle="rgba(255,255,255,0.9)"; ctx.fill();
           } else if (d.type === ToolType.DISC) {
              ctx.beginPath(); ctx.ellipse(1.5, 3, 13, 4.5, 0, 0, Math.PI*2); ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.fill();
              ctx.beginPath(); ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI*2); ctx.fillStyle=d.color; ctx.fill(); ctx.lineWidth=1.5; ctx.strokeStyle="rgba(0,0,0,0.3)"; ctx.stroke();
              ctx.beginPath(); ctx.ellipse(0, -1, 10, 5, 0, 0, Math.PI*2); ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.fill();
              ctx.beginPath(); ctx.ellipse(0, -0.5, 2, 1, 0, 0, Math.PI*2); ctx.fillStyle="rgba(0,0,0,0.4)"; ctx.fill();
           } else if (d.type === ToolType.GOAL) {
              ctx.beginPath(); ctx.ellipse(0, 28, 56*0.56, 7, 0, 0, Math.PI*2); ctx.fillStyle="rgba(0,0,0,0.16)"; ctx.fill();
              ctx.lineWidth=2; ctx.strokeStyle="rgba(245,248,252,0.55)"; ctx.setLineDash([4,4]); ctx.strokeRect(-56,-23,112,46); ctx.setLineDash([]);
              ctx.fillStyle="#fbfcfd"; ctx.lineWidth=1; ctx.strokeStyle="#8d959e";
              ctx.strokeRect(-56,-23,5,46); ctx.fillRect(-56,-23,5,46);
              ctx.strokeRect(51,-23,5,46); ctx.fillRect(51,-23,5,46);
              ctx.strokeRect(-56,-23,112,5); ctx.fillRect(-56,-23,112,5);
           } else if (d.type === ToolType.GOAL_MINI) {
              ctx.beginPath(); ctx.ellipse(0, 22, 34*0.56, 6, 0, 0, Math.PI*2); ctx.fillStyle="rgba(0,0,0,0.16)"; ctx.fill();
              ctx.lineWidth=1.5; ctx.strokeStyle="rgba(245,248,252,0.55)"; ctx.setLineDash([3,3]); ctx.strokeRect(-34,-17,68,34); ctx.setLineDash([]);
              ctx.fillStyle="#fbfcfd"; ctx.lineWidth=1; ctx.strokeStyle="#8d959e";
              ctx.strokeRect(-34,-17,4,34); ctx.fillRect(-34,-17,4,34);
              ctx.strokeRect(30,-17,4,34); ctx.fillRect(30,-17,4,34);
              ctx.strokeRect(-34,-17,68,4); ctx.fillRect(-34,-17,68,4);
           } else if (d.type === ToolType.GOAL_SIDE) {
              ctx.beginPath(); ctx.ellipse(2, 27, 24*0.62, 6, 0, 0, Math.PI*2); ctx.fillStyle="rgba(0,0,0,0.16)"; ctx.fill();
              ctx.beginPath(); ctx.moveTo(-24,-23); ctx.lineTo(-24,23); ctx.lineTo(24,23); ctx.lineTo(24,-13); ctx.closePath();
              ctx.fillStyle="rgba(255,255,255,0.1)"; ctx.fill();
              ctx.lineWidth=1; ctx.strokeStyle="rgba(245,248,252,0.5)"; ctx.setLineDash([3,3]); ctx.stroke(); ctx.setLineDash([]);
              ctx.strokeStyle="#fbfcfd";
              ctx.lineWidth=3.6; ctx.beginPath(); ctx.moveTo(-24,-23); ctx.lineTo(-24,23); ctx.stroke();
              ctx.lineWidth=3.2; ctx.beginPath(); ctx.moveTo(-24,-23); ctx.lineTo(24,-13); ctx.stroke();
              ctx.lineWidth=2.6; ctx.beginPath(); ctx.moveTo(24,-13); ctx.lineTo(24,23); ctx.stroke();
           } else if (d.type === ToolType.MANNEQUIN) {
              ctx.beginPath(); ctx.ellipse(2, 3, 15, 5, 0, 0, Math.PI*2); ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.fill();
              ctx.fillStyle="#2b323b";
              if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-13,-4,26,8,3); ctx.fill(); } else { ctx.fillRect(-13,-4,26,8); }
              ctx.beginPath(); ctx.moveTo(-8,-4); ctx.bezierCurveTo(-13,-16, -15,-32, -12,-43); ctx.quadraticCurveTo(-12,-49, -4,-49);
              ctx.lineTo(4,-49); ctx.quadraticCurveTo(12,-49, 12,-43); ctx.bezierCurveTo(15,-32, 13,-16, 8,-4); ctx.closePath();
              ctx.fillStyle=d.color; ctx.fill(); ctx.lineWidth=1.5; ctx.strokeStyle="rgba(0,0,0,0.3)"; ctx.stroke();
              ctx.beginPath(); ctx.arc(0, -56, 7.2, 0, Math.PI*2); ctx.fillStyle="#e8c39a"; ctx.fill(); ctx.lineWidth=1.2; ctx.strokeStyle="#b58c5c"; ctx.stroke();
              ctx.lineWidth=1; ctx.strokeStyle="rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.moveTo(0,-46); ctx.lineTo(0,-23); ctx.stroke();
           } else if (d.type === ToolType.LADDER) {
              ctx.beginPath(); ctx.ellipse(2, 4, 65, 10, 0, 0, Math.PI*2); ctx.fillStyle="rgba(0,0,0,0.15)"; ctx.fill();
              ctx.fillStyle="#eef1f4"; ctx.strokeStyle="#9aa3ac"; ctx.lineWidth=0.8;
              for(let i=0; i<8; i++) {
                 if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-65 + 4 + i * (122/7) - 2, -14, 4, 28, 2); ctx.fill(); ctx.stroke(); }
                 else { ctx.fillRect(-65 + 4 + i * (122/7) - 2, -14, 4, 28); ctx.strokeRect(-65 + 4 + i * (122/7) - 2, -14, 4, 28); }
              }
              ctx.fillStyle=d.color; ctx.strokeStyle="rgba(0,0,0,0.2)"; ctx.lineWidth=1;
              if (ctx.roundRect) { 
                 ctx.beginPath(); ctx.roundRect(-65,-16,130,5,2.5); ctx.fill(); ctx.stroke();
                 ctx.beginPath(); ctx.roundRect(-65,11,130,5,2.5); ctx.fill(); ctx.stroke();
              } else {
                 ctx.fillRect(-65,-16,130,5); ctx.strokeRect(-65,-16,130,5);
                 ctx.fillRect(-65,11,130,5); ctx.strokeRect(-65,11,130,5);
              }
           } else if (d.type === ToolType.HURDLE) {
              ctx.beginPath(); ctx.ellipse(1.5, 3, 46*0.55, 4.5, 0, 0, Math.PI*2); ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.fill();
              ctx.fillStyle="#cfd6dd";
              if (ctx.roundRect) {
                  ctx.beginPath(); ctx.roundRect(-21,-26,4,26,1.5); ctx.fill();
                  ctx.beginPath(); ctx.roundRect(17,-26,4,26,1.5); ctx.fill();
                  ctx.beginPath(); ctx.roundRect(-25,-1.5,12,3,1.5); ctx.fill();
                  ctx.beginPath(); ctx.roundRect(13,-1.5,12,3,1.5); ctx.fill();
              } else {
                  ctx.fillRect(-21,-26,4,26); ctx.fillRect(17,-26,4,26);
                  ctx.fillRect(-25,-1.5,12,3); ctx.fillRect(13,-1.5,12,3);
              }
              ctx.fillStyle=d.color; ctx.strokeStyle="rgba(0,0,0,0.2)"; ctx.lineWidth=1;
              if (ctx.roundRect) {
                  ctx.beginPath(); ctx.roundRect(-23,-34,46,9,4.5); ctx.fill(); ctx.stroke();
              } else {
                  ctx.fillRect(-23,-34,46,9); ctx.strokeRect(-23,-34,46,9);
              }
           } else if (d.type === ToolType.POLE) {
              ctx.beginPath(); ctx.ellipse(2, 2, 9, 3.5, 0, 0, Math.PI*2); ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.fill();
              ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.2, 0, 0, Math.PI*2); ctx.fillStyle="#2e343b"; ctx.fill();
              ctx.fillStyle=d.color; ctx.strokeStyle="rgba(0,0,0,0.3)"; ctx.lineWidth=1;
              if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-2.6,-52,5.2,52,2.6); ctx.fill(); ctx.stroke(); }
              else { ctx.fillRect(-2.6,-52,5.2,52); ctx.strokeRect(-2.6,-52,5.2,52); }
              ctx.fillStyle="rgba(255,255,255,0.9)";
              ctx.fillRect(-2.6,-32,5.2,5); ctx.fillRect(-2.6,-16,5.2,5);
              ctx.beginPath(); ctx.arc(0, -52, 3, 0, Math.PI*2); ctx.fillStyle=d.color; ctx.fill();
           }

           ctx.restore();
       }
    }


  
  }; // end of renderSingleDrawing

  const renderDrawings = (isEqPhase: boolean) => {
      renderState.drawings.forEach(dState => {
         const d = dState.drawing;
         const isEq = [ToolType.BALL, ToolType.CONE, ToolType.DISC, ToolType.GOAL, ToolType.GOAL_MINI, ToolType.GOAL_SIDE, ToolType.MANNEQUIN, ToolType.LADDER, ToolType.HURDLE, ToolType.POLE].includes(d.type);
         if (isEqPhase && !isEq) return;
         if (!isEqPhase && isEq) return;
         renderSingleDrawing(d, dState.animProgress, dState.alpha * renderState.globalAlpha, renderState.globalAlpha);
      });
  };

  ctx.globalAlpha = 1;

  // 4. Draw Players
  const BASE_COIN_SIZE = 22.4;
  const globalScale = coinSettings.globalScale || 1;
  const textScale = coinSettings.globalTextScale || 1;

  const renderTeam = (side: TeamSide) => {
    const team = project.teams[side];
    if (!team) return;
    const slideTeamSettings = currentSlide.teamSettings?.[side];
    const settings = { ...coinSettings, ...(team.settings || {}), ...(slideTeamSettings || {}) };
    
    const shape = settings.shape || 'circle';
    const isCrescent = shape === 'crescent';
    const isSemicircle = shape === 'semicircle';
    const isCircle = shape === 'circle';
    const isJersey = shape === 'jersey';
    const isNewShape = ['coins', 'pucks', 'shirts', 'minis', 'domes', 'meeples', 'badges', 'holo', 'tactic'].includes(shape);
    const isLogo = shape === 'logo';

    team.players.forEach(p => {
      if (!currentSlide.positions[p.id]) return;
      
      const logicalPos = renderState.players.find(x => x.id === p.id);
      if (!logicalPos) return;
      const proj = P(logicalPos.x / P_WIDTH, logicalPos.y / P_HEIGHT);
      const pos = { ...logicalPos, x: proj.x, y: proj.y, scale: (logicalPos.scale || 1) * proj.s };
      if (!pos) return;

      const scalePlayer = (pos.scale || 1) * globalScale;
      const size = BASE_COIN_SIZE * scalePlayer;
      const visualOffset = settings.orientation === 'inverted' ? 180 : settings.orientation === 'vertical' ? -90 : 0;
      const rotation = (pos.rotation || 0) + visualOffset;
      const secColor = settings.secondaryColor || team.secondaryColor || 'white';
      const borderColor = pos.borderColor || secColor;
      const coinColor = p.color || settings.color || team.color;
      
      const pShowName = pos.showName !== undefined && pos.showName !== null ? pos.showName : settings.showName;
      const pShowNumber = pos.showNumber !== undefined && pos.showNumber !== null ? pos.showNumber : settings.showNumber;
      const pShowPositionLabel = pos.showPositionLabel !== undefined && pos.showPositionLabel !== null ? pos.showPositionLabel : settings.showPositionLabel;

      ctx.save();
      ctx.globalAlpha = 1;
      ctx.translate(pos.x, pos.y);
      
      if (dropTargetPlayerId === p.id) {
          ctx.save();
          // Scale it up slightly so it circles around the token exact shape
          ctx.scale(1.15, 1.15);
          
          const standardShapes = ['circle', 'semicircle', 'crescent', 'jersey'];
          const keepRotation = shape === 'tactic' || standardShapes.includes(shape);
          if (keepRotation) {
              ctx.rotate((rotation * Math.PI) / 180);
          }

          buildTokenOutlinePath(ctx, shape, size);
          
          // Animate 0 to 360 using a conic gradient
          const t = (performance.now() % 1500) / 1500;
          
          if (typeof (ctx as any).createConicGradient === 'function') {
              const grad = (ctx as any).createConicGradient(-Math.PI/2, 0, 0);
              grad.addColorStop(0, 'rgba(34, 197, 94, 0)');
              if (t > 0.15) grad.addColorStop(t - 0.15, 'rgba(34, 197, 94, 0)');
              grad.addColorStop(t, 'rgba(34, 197, 94, 1)');
              if (t < 0.999) grad.addColorStop(t + 0.001, 'rgba(34, 197, 94, 0)');
              grad.addColorStop(1, 'rgba(34, 197, 94, 0)');
              ctx.strokeStyle = grad;
          } else {
              ctx.strokeStyle = '#22c55e';
          }

          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          ctx.shadowColor = 'rgba(34, 197, 94, 0.8)';
          ctx.shadowBlur = 10;
          
          ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
          ctx.fill();
          ctx.stroke();
          
          ctx.restore();
      }
      
      // Draw Name
      if (pShowName) {
        ctx.font = `${7 * textScale}px sans-serif`;
        const namePos = pos.namePos || coinSettings.globalNamePos || 'bottom';
        const textMetrics = ctx.measureText(p.name);
        const textWidth = textMetrics.width;
        
        const yBoxTop = namePos === 'top' ? -size/2 - 17 : size/2 + 7;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        // Draw rounded rectangle
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-textWidth/2 - 4, yBoxTop, textWidth + 8, 12, 3);
        } else {
            // Fallback for older browsers without roundRect
            ctx.rect(-textWidth/2 - 4, yBoxTop, textWidth + 8, 12);
        }
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.name, 0, yBoxTop + 6);
      }

      if (isCircle) {
        // Draw 3D side and shadow WITHOUT rotation to ensure correct downward 3D extrusion
        const thickness = size * 0.15;
        
        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 8 * proj.s;
        ctx.shadowOffsetY = 10 * proj.s;
        ctx.beginPath();
        ctx.arc(0, thickness, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        
        // Draw side cylinder
        ctx.beginPath();
        ctx.arc(0, thickness, size / 2, 0, Math.PI);
        ctx.lineTo(-size/2, 0);
        ctx.arc(0, 0, size / 2, Math.PI, 0, true);
        ctx.closePath();
        
        // Darken side color
        ctx.fillStyle = coinColor;
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();
      }

      // Rotate for shape top face and text
      ctx.rotate((rotation * Math.PI) / 180);

      // Draw Shape
      let activePal = null;
      if (isCircle) {
        
        // Top face
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 4;
        
        ctx.fillStyle = coinColor;
        ctx.fill();
        
        // Reset shadow for border and inner effects
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        
        // Inner lighting gradient
        const gradient = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Inner shadow (simulated with an arc and stroke)
        ctx.beginPath();
        ctx.arc(0, 0, size / 2 - 2, 0, Math.PI * 2);
        const innerGrad = ctx.createLinearGradient(0, -size/2, 0, size/2);
        innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        ctx.strokeStyle = innerGrad;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Border
        ctx.beginPath();
        ctx.arc(0, 0, size / 2 - 1, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = borderColor;
        ctx.stroke();

        // White dot on top
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(0, -size / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      } else if (isSemicircle) {
        ctx.beginPath();
        // start at bottom right
        ctx.moveTo(size/2, size/2);
        // bottom line
        ctx.lineTo(-size/2, size/2);
        // left wall to the start of the arc
        ctx.lineTo(-size/2, size * 0.2);
        // arc (center 0, 0.2*size, radius size/2, from PI to 0)
        ctx.arc(0, size * 0.2, size / 2, Math.PI, 0);
        // right wall to the bottom right
        ctx.lineTo(size/2, size/2);
        ctx.closePath();
        
        ctx.fillStyle = coinColor;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = borderColor;
        ctx.stroke();
      } else if (isCrescent) {
        ctx.beginPath();
        ctx.moveTo(-0.35 * size, 0.25 * size);
        ctx.quadraticCurveTo(0, -0.45 * size, 0.35 * size, 0.25 * size);
        ctx.quadraticCurveTo(0, -0.05 * size, -0.35 * size, 0.25 * size);
        ctx.fillStyle = coinColor;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = borderColor;
        ctx.stroke();
      } else if (isJersey) {
        ctx.beginPath();
        ctx.moveTo(-0.16 * size, -0.42 * size);
        ctx.quadraticCurveTo(0, -0.45 * size, 0.16 * size, -0.42 * size);
        ctx.lineTo(0.45 * size, -0.2 * size);
        ctx.lineTo(0.38 * size, 0.05 * size);
        ctx.lineTo(0.26 * size, -0.08 * size);
        ctx.lineTo(0.24 * size, 0.45 * size);
        ctx.quadraticCurveTo(0, 0.48 * size, -0.24 * size, 0.45 * size);
        ctx.lineTo(-0.26 * size, -0.08 * size);
        ctx.lineTo(-0.38 * size, 0.05 * size);
        ctx.lineTo(-0.45 * size, -0.2 * size);
        ctx.closePath();
        ctx.fillStyle = coinColor; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = borderColor; ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-0.16 * size, -0.42 * size);
        ctx.quadraticCurveTo(0, -0.28 * size, 0.16 * size, -0.42 * size);
        ctx.lineWidth = 3; ctx.strokeStyle = borderColor; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0.45 * size, -0.2 * size);
        ctx.lineTo(0.38 * size, 0.05 * size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-0.45 * size, -0.2 * size);
        ctx.lineTo(-0.38 * size, 0.05 * size);
        ctx.stroke();
      } else if (isLogo) {
        // Draw the logo image
        ctx.rotate((-rotation * Math.PI) / 180); // unrotate for fixed perspective
        const logoSrc = settings.logo || team.logo;
        const logoImg = getCachedImage(logoSrc);
        const r = size / 2;
        if (logoImg && logoImg.complete && logoImg.width > 0 && logoImg.height > 0) {
            const imgW = logoImg.width;
            const imgH = logoImg.height;
            // Slightly enlarge logos as they have internal padding and details
            const logoSize = size * 1.3; 
            const imgScale = Math.min(logoSize / imgW, logoSize / imgH);
            const drawW = imgW * imgScale;
            const drawH = imgH * imgScale;

            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw shadow
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 8 * proj.s;
            ctx.shadowOffsetY = 10 * proj.s;
            const res = 100;
            ctx.scale(1 / res, 1 / res);
            ctx.drawImage(logoImg, (-drawW / 2) * res, (-drawH / 2) * res, drawW * res, drawH * res);
            ctx.scale(res, res);
            ctx.shadowColor = 'transparent';
            
            ctx.restore();
        } else {
            // Draw circle fallback while loading
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = coinColor;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = borderColor;
            ctx.stroke();
        }
        ctx.rotate((rotation * Math.PI) / 180);
      } else if (isNewShape) {
        activePal = createPalette(coinColor);
        const gk = p.role === PlayerRole.MAIN && p.positionLabel === 'GK';
        const r = size / 2;
        
        // Un-rotate for 3D/fixed-perspective shapes
        const keepRotation = shape === 'tactic';
        if (!keepRotation) {
           ctx.rotate((-rotation * Math.PI) / 180);
        }
        
        if (shape === 'coins') drawNewCoin(ctx, r, activePal, gk);
        else if (shape === 'pucks') drawNewPuck(ctx, r * 1.05, activePal);
        else if (shape === 'shirts') drawNewShirt(ctx, r * 1.05, activePal, gk);
        else if (shape === 'minis') drawNewMini(ctx, r * 0.8, activePal, gk);
        else if (shape === 'domes') drawNewDome(ctx, r * 0.95, activePal, gk);
        else if (shape === 'meeples') drawNewMeeple(ctx, r * 0.95, activePal, gk);
        else if (shape === 'badges') drawNewBadge(ctx, r * 0.95, activePal, gk);
        else if (shape === 'holo') drawNewHolo(ctx, r, activePal, gk);
        else if (shape === 'tactic') {
           // For tactic, rotation is face
           drawNewTactic(ctx, r, activePal, gk);
        }
        
        // Re-rotate if we un-rotated
        if (!keepRotation) {
           ctx.rotate((rotation * Math.PI) / 180);
        }
      }

      // Draw Text/Logo inside shape
      let rotatedOffsetY = 0;
      let unrotatedOffsetY = 0;
      if (isCrescent) rotatedOffsetY = -0.06 * size;
      if (isJersey) rotatedOffsetY = 0.02 * size;
      if (shape === 'shirts') unrotatedOffsetY = -0.2 * size;
      if (shape === 'minis') unrotatedOffsetY = -0.8 * size;
      if (shape === 'domes') unrotatedOffsetY = -0.25 * size;
      if (shape === 'meeples') unrotatedOffsetY = 0.2 * size;
      if (shape === 'badges') unrotatedOffsetY = 0.04 * size;
      if (shape === 'holo') unrotatedOffsetY = 0.03 * size;
      
      // Some shapes don't want the number drawn inside by default text logic
      // But we mapped offsets for them. pucks and tactic don't draw text.
      const hideInnerNumber = shape === 'pucks' || shape === 'tactic' || shape === 'logo';
      
      ctx.translate(0, rotatedOffsetY);

      // Un-rotate for text
      ctx.rotate((-rotation * Math.PI) / 180);
      ctx.translate(0, unrotatedOffsetY);
      
      if (!hideInnerNumber) {
        if (shape === 'holo') {
           ctx.shadowColor = activePal?.light || 'rgba(255,255,255,0.5)';
           ctx.shadowBlur = size * 0.35;
        }
        
        ctx.fillStyle = shape === 'holo' && activePal ? activePal.light : secColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.save();
        if (shape !== 'holo') {
            ctx.shadowColor = 'rgba(0,0,0,0.65)';
            ctx.shadowBlur = size * 0.22;
            ctx.shadowOffsetY = size * 0.1;
        }

        if (pShowPositionLabel && p.positionLabel && pShowNumber) {
           ctx.font = `bold ${5.6 * textScale}px monospace`;
           ctx.fillText(p.positionLabel.toUpperCase(), 0, -4);
           ctx.font = `bold ${9.8 * textScale}px sans-serif`;
           ctx.fillText(p.number.toString(), 0, 4);
        } else if (pShowPositionLabel && p.positionLabel) {
           ctx.font = `bold ${5.6 * textScale}px monospace`;
           ctx.fillText(p.positionLabel.toUpperCase(), 0, 0);
        } else if (pShowNumber) {
           ctx.font = `bold ${9.8 * textScale}px sans-serif`;
           ctx.fillText(p.number.toString(), 0, 0);
        }
        ctx.restore();
      }

      ctx.restore();
    });
  };

  const isEq = (type: ToolType) => [ToolType.BALL, ToolType.CONE, ToolType.DISC, ToolType.GOAL, ToolType.GOAL_MINI, ToolType.GOAL_SIDE, ToolType.MANNEQUIN, ToolType.LADDER, ToolType.HURDLE, ToolType.POLE].includes(type);
  const layerOrder = currentSlide.layerOrder || [];
  const layerVis = currentSlide.layerVisibility || { HOME: true, AWAY: true, EQUIPMENT: true, DRAWINGS: true };

  const normalizedOrder: string[] = [];
  const drawingsToDraw = renderState.drawings.map(dState => dState.drawing);
  const existingDrawingIds = new Set(drawingsToDraw.filter(d => !isEq(d.type)).map(d => `d_${d.id}`));
  
  layerOrder.forEach(layer => {
      if (layer === 'HOME' || layer === 'AWAY' || layer === 'NEUTRAL' || layer === 'EQUIPMENT') {
          normalizedOrder.push(layer);
      } else if (layer === 'DRAWINGS') {
          drawingsToDraw.forEach(d => {
              if (!isEq(d.type)) {
                  normalizedOrder.push(`d_${d.id}`);
                  existingDrawingIds.delete(`d_${d.id}`);
              }
          });
      } else if (layer.startsWith('d_') && existingDrawingIds.has(layer)) {
          normalizedOrder.push(layer);
          existingDrawingIds.delete(layer);
      }
  });

  if (!normalizedOrder.includes('EQUIPMENT')) normalizedOrder.push('EQUIPMENT');
  if (!normalizedOrder.includes('HOME')) normalizedOrder.push('HOME');
  if (!normalizedOrder.includes('AWAY')) normalizedOrder.push('AWAY');
  if (!normalizedOrder.includes('NEUTRAL')) normalizedOrder.push('NEUTRAL');

  const missingDrawings = Array.from(existingDrawingIds);
  const finalLayerOrder = [...missingDrawings, ...normalizedOrder];

  finalLayerOrder.forEach(layer => {
      if (layerVis[layer] === false || (layer === 'DRAWINGS' && layerVis['DRAWINGS'] === false)) return;
      // Handle legacy DRAWINGS visibility toggle for all drawings
      if (layer.startsWith('d_') && layerVis['DRAWINGS'] === false) return;
      
      if (layer === 'EQUIPMENT') {
          renderDrawings(true);
      } else if (layer === 'HOME') {
          renderTeam(TeamSide.HOME);
      } else if (layer === 'AWAY') {
          renderTeam(TeamSide.AWAY);
      } else if (layer === 'NEUTRAL') {
          renderTeam(TeamSide.NEUTRAL);
      } else if (layer.startsWith('d_')) {
          const did = layer.substring(2);
          const d = drawingsToDraw.find(d => d.id === did);
          if (d) {
              const dState = renderState.drawings.find(x => x.id === d.id);
              if (dState) renderSingleDrawing(d, dState.animProgress, dState.alpha * renderState.globalAlpha, renderState.globalAlpha);
              else renderSingleDrawing(d, 1, fadeAlpha, fadeAlpha);
          }
      }
  });

  ctx.globalAlpha = 1;
  if (selectedDrawingId) {
            if (selectedDrawingId.startsWith('d_') || drawingsToDraw.find(dr => dr.id === selectedDrawingId)) {
          const did = selectedDrawingId.startsWith('d_') ? selectedDrawingId.substring(2) : selectedDrawingId;
          const selectedD = drawingsToDraw.find(dr => dr.id === did);
          if (selectedD) {
              selectedD.points.forEach((p) => {
                  const proj = P(p.x / P_WIDTH, p.y / P_HEIGHT);
                  ctx.beginPath();
                  ctx.arc(proj.x, proj.y, 6, 0, Math.PI * 2);
                  ctx.fillStyle = '#3b82f6';
                  ctx.fill();
                  ctx.lineWidth = 2;
                  ctx.strokeStyle = 'white';
                  ctx.stroke();
              });
          }
      } else if (selectedDrawingId === 'HOME' || selectedDrawingId === 'AWAY' || selectedDrawingId === 'NEUTRAL') {
          const side = selectedDrawingId; // it matches TeamSide
          const team = project.teams[side];
          if (team) {
              team.players.forEach(p => {
                  if (!currentSlide.positions[p.id]) return;
                  const pos = currentSlide.positions[p.id];
                  const proj = P(pos.x / P_WIDTH, pos.y / P_HEIGHT);
                  ctx.beginPath();
                  ctx.arc(proj.x, proj.y, 20 * proj.s, 0, Math.PI * 2);
                  ctx.lineWidth = 4;
                  ctx.strokeStyle = '#3b82f6';
                  ctx.stroke();
                  ctx.beginPath();
                  ctx.arc(proj.x, proj.y, 22 * proj.s, 0, Math.PI * 2);
                  ctx.lineWidth = 1.5;
                  ctx.strokeStyle = 'white';
                  ctx.stroke();
              });
          }
      } else if (selectedDrawingId === 'EQUIPMENT') {
          drawingsToDraw.forEach(d => {
             const isEq = [ToolType.BALL, ToolType.CONE, ToolType.DISC, ToolType.GOAL, ToolType.GOAL_MINI, ToolType.GOAL_SIDE, ToolType.MANNEQUIN, ToolType.LADDER, ToolType.HURDLE, ToolType.POLE].includes(d.type);
             if (isEq) {
                 d.points.forEach((p) => {
                      const proj = P(p.x / P_WIDTH, p.y / P_HEIGHT);
                      ctx.beginPath();
                      ctx.arc(proj.x, proj.y, 10 * proj.s, 0, Math.PI * 2);
                      ctx.lineWidth = 3;
                      ctx.strokeStyle = '#3b82f6';
                      ctx.stroke();
                  });
             }
          });
      }
  }


  ctx.restore();
};
