import { Player, TeamSide } from './types';

export interface Palette {
    base: string;
    light: string;
    dark: string;
    wall: string;
}

export function createPalette(baseColor: string): Palette {
    // Simple logic to create light, dark, wall colors
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;

    const clamp = (val: number) => Math.min(255, Math.max(0, val));
    const toHex = (c: number) => clamp(Math.round(c)).toString(16).padStart(2, '0');

    // light
    const lr = clamp(r + 60); const lg = clamp(g + 60); const lb = clamp(b + 60);
    // dark
    const dr = clamp(r - 50); const dg = clamp(g - 50); const db = clamp(b - 50);
    // wall
    const wr = clamp(r - 20); const wg = clamp(g - 20); const wb = clamp(b - 20);

    return {
        base: baseColor,
        light: `#${toHex(lr)}${toHex(lg)}${toHex(lb)}`,
        dark: `#${toHex(dr)}${toHex(dg)}${toHex(db)}`,
        wall: `#${toHex(wr)}${toHex(wg)}${toHex(wb)}`,
    };
}

export const GKCOL: Palette = { base: '#f0b429', light: '#ffe08a', dark: '#7a5200', wall: '#b8860b' };

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, blur?: number) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = blur || r * 0.9;
    ctx.shadowOffsetX = -r * 0.22;
    ctx.shadowOffsetY = r * 0.5;
    return () => ctx.restore();
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// x,y is always 0,0 since we translate context before calling these
export function drawNewCoin(ctx: CanvasRenderingContext2D, r: number, pal: Palette, gk: boolean) {
    const rs = shadow(ctx, 0, 0, r);
    const g = ctx.createRadialGradient(-r*.35, -r*.42, r*.1, 0, 0, r);
    g.addColorStop(0, pal.light);
    g.addColorStop(0.45, pal.base);
    g.addColorStop(1, pal.dark);
    
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    rs();

    if (gk) {
        ctx.strokeStyle = '#ffd54a';
        ctx.lineWidth = r*.22;
        ctx.beginPath(); ctx.arc(0, 0, r*.98, 0, 7); ctx.stroke();
    }
    
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = r*.09;
    ctx.beginPath(); ctx.arc(0, 0, r*.95, 0, 7); ctx.stroke();
    
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = r*.12;
    ctx.beginPath(); ctx.arc(0, 0, r*.78, -2.5, 0.6); ctx.stroke();
    
    const hg = ctx.createRadialGradient(-r*.35, -r*.5, 0, -r*.35, -r*.5, r*.6);
    hg.addColorStop(0, 'rgba(255,255,255,.5)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, 0, r*.93, 0, 7); ctx.fill();
}

export function drawNewPuck(ctx: CanvasRenderingContext2D, r: number, pal: Palette) {
    const h = r*.62, sq = .9;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = r*.8;
    ctx.shadowOffsetX = -r*.2;
    ctx.shadowOffsetY = r*.55;
    
    const wg = ctx.createLinearGradient(-r, 0, r, 0);
    wg.addColorStop(0, pal.dark); wg.addColorStop(.5, pal.wall); wg.addColorStop(1, pal.dark);
    
    ctx.beginPath();
    ctx.moveTo(-r, 0); ctx.lineTo(-r, h);
    ctx.ellipse(0, h, r, r*sq, 0, Math.PI, 0, true);
    ctx.lineTo(r, 0);
    ctx.ellipse(0, 0, r, r*sq, 0, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = wg; ctx.fill();
    ctx.restore();
    
    const g = ctx.createRadialGradient(-r*.3, -r*.35, r*.1, 0, 0, r);
    g.addColorStop(0, pal.light); g.addColorStop(.5, pal.base); g.addColorStop(1, pal.dark);
    
    ctx.beginPath(); ctx.ellipse(0, 0, r, r*sq, 0, 0, 7); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = r*.16;
    ctx.beginPath(); ctx.ellipse(0, 0, r*.86, r*sq*.86, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.ellipse(-r*.28, -r*.3, r*.34, r*.18, -.5, 0, 7); ctx.fill();
}

export function drawNewShirt(ctx: CanvasRenderingContext2D, r: number, pal: Palette, gk: boolean) {
    const k = r/10;
    // shift up to center jersey
    const oy = -r*.55; 
    const rs = shadow(ctx, 0, oy+r*.6, r*1.15, r*.6);
    
    ctx.beginPath();
    ctx.moveTo(0, oy-6.2*k);
    ctx.quadraticCurveTo(2.6*k, oy-6.0*k, 5.8*k, oy-4.8*k);
    ctx.quadraticCurveTo(8.2*k, oy-3.8*k, 9.6*k, oy-1.0*k);
    ctx.quadraticCurveTo(10.0*k, oy+0.2*k, 8.9*k, oy+1.6*k);
    ctx.quadraticCurveTo(7.0*k, oy+1.2*k, 4.9*k, oy+0.6*k);
    ctx.quadraticCurveTo(5.1*k, oy+3.4*k, 4.9*k, oy+6.6*k);
    ctx.quadraticCurveTo(4.8*k, oy+8.0*k, 3.2*k, oy+8.0*k);
    ctx.quadraticCurveTo(1.6*k, oy+8.3*k, 0, oy+8.3*k);
    ctx.quadraticCurveTo(-1.6*k, oy+8.3*k, -3.2*k, oy+8.0*k);
    ctx.quadraticCurveTo(-4.8*k, oy+8.0*k, -4.9*k, oy+6.6*k);
    ctx.quadraticCurveTo(-5.1*k, oy+3.4*k, -4.9*k, oy+0.6*k);
    ctx.quadraticCurveTo(-7.0*k, oy+1.2*k, -8.9*k, oy+1.6*k);
    ctx.quadraticCurveTo(-10.0*k, oy+0.2*k, -9.6*k, oy-1.0*k);
    ctx.quadraticCurveTo(-8.2*k, oy-3.8*k, -5.8*k, oy-4.8*k);
    ctx.quadraticCurveTo(-2.6*k, oy-6.0*k, 0, oy-6.2*k);
    ctx.closePath();
    
    const g = ctx.createLinearGradient(0, oy-6*k, 0, oy+8.5*k);
    g.addColorStop(0, pal.light); g.addColorStop(.45, pal.base); g.addColorStop(1, pal.dark);
    ctx.fillStyle = g; ctx.fill();
    rs();
    
    const ao = ctx.createLinearGradient(-10*k, oy, 10*k, oy);
    ao.addColorStop(0, 'rgba(0,0,0,.3)'); ao.addColorStop(.25, 'rgba(0,0,0,0)');
    ao.addColorStop(.75, 'rgba(0,0,0,0)'); ao.addColorStop(1, 'rgba(0,0,0,.3)');
    ctx.fillStyle = ao; ctx.fill();
    
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = Math.max(1, r*.08); ctx.stroke();
    
    const sh = ctx.createRadialGradient(0, oy-3*k, 0, 0, oy-3*k, 7*k);
    sh.addColorStop(0, 'rgba(255,255,255,.28)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(-2.4*k, oy-5.9*k);
    ctx.quadraticCurveTo(0, oy-3.2*k, 2.4*k, oy-5.9*k);
    ctx.quadraticCurveTo(0, oy-4.9*k, -2.4*k, oy-5.9*k);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
    
    ctx.strokeStyle = gk ? '#ffd54a' : 'rgba(255,255,255,.85)';
    ctx.lineWidth = k*.9;
    ctx.beginPath(); ctx.moveTo(-2.6*k, oy-5.9*k); ctx.quadraticCurveTo(0, oy-3.1*k, 2.6*k, oy-5.9*k); ctx.stroke();
    
    ctx.beginPath(); ctx.moveTo(9.5*k, oy-0.7*k); ctx.lineTo(8.7*k, oy+1.4*k);
    ctx.moveTo(-9.5*k, oy-0.7*k); ctx.lineTo(-8.7*k, oy+1.4*k); ctx.stroke();
}

export function drawNewMini(ctx: CanvasRenderingContext2D, r: number, pal: Palette, gk: boolean) {
    const oy = 0;
    const tp = gk ? GKCOL : pal;
    ctx.save();
    ctx.translate(0, oy); ctx.rotate(-.32);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(-r*1.1, r*.15, r*1.7, r*.5, 0, 0, 7); ctx.fill();
    ctx.restore();
    
    ctx.fillStyle = pal.base;
    ctx.fillRect(-r*.44, oy-r*.62, r*.3, r*.62);
    ctx.fillRect(r*.14, oy-r*.62, r*.3, r*.62);
    
    ctx.fillStyle = '#e9b489';
    ctx.fillRect(-r*.42, oy-r*1.05, r*.26, r*.5);
    ctx.fillRect(r*.16, oy-r*1.05, r*.26, r*.5);
    
    ctx.fillStyle = '#f5f5f5';
    rr(ctx, -r*.56, oy-r*1.62, r*1.12, r*.62, r*.12); ctx.fill();
    
    ctx.fillStyle = '#e9b489';
    ctx.fillRect(-r*.88, oy-r*2.45, r*.24, r*.95);
    ctx.fillRect(r*.64, oy-r*2.45, r*.24, r*.95);
    
    const g = ctx.createLinearGradient(0, oy-r*2.7, 0, oy-r*1.5);
    g.addColorStop(0, tp.light); g.addColorStop(.5, tp.base); g.addColorStop(1, tp.dark);
    ctx.fillStyle = g;
    rr(ctx, -r*.62, oy-r*2.68, r*1.24, r*1.15, r*.25); ctx.fill();
    
    ctx.fillStyle = '#e9b489';
    ctx.beginPath(); ctx.arc(0, oy-r*3.05, r*.44, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2417';
    ctx.beginPath(); ctx.arc(0, oy-r*3.12, r*.42, Math.PI, 0); ctx.fill();
}

export function drawNewDome(ctx: CanvasRenderingContext2D, r: number, pal: Palette, gk: boolean) {
    const oy = 0;
    const rs = shadow(ctx, 0, oy, r, r*.8);
    const g = ctx.createRadialGradient(-r*.35, oy-r*.9, r*.15, 0, oy-r*.4, r*1.5);
    g.addColorStop(0, pal.light); g.addColorStop(.5, pal.base); g.addColorStop(1, pal.dark);
    
    ctx.beginPath();
    ctx.moveTo(-r, oy-r*.15);
    ctx.quadraticCurveTo(-r*.95, oy-r*1.2, 0, oy-r*1.25);
    ctx.quadraticCurveTo(r*.95, oy-r*1.2, r, oy-r*.15);
    ctx.quadraticCurveTo(r*.8, oy+r*.28, 0, oy+r*.32);
    ctx.quadraticCurveTo(-r*.8, oy+r*.28, -r, oy-r*.15);
    ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    rs();
    
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1; ctx.stroke();
    
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.beginPath(); ctx.ellipse(-r*.3, oy-r*.75, r*.32, r*.18, -.6, 0, 7); ctx.fill();
    
    const tp = gk ? GKCOL : pal;
    ctx.fillStyle = '#e9b489';
    ctx.fillRect(-r*.62, oy-r*2.05, r*.18, r*.7);
    ctx.fillRect(r*.44, oy-r*2.05, r*.18, r*.7);
    
    const tg = ctx.createLinearGradient(0, oy-r*2.2, 0, oy-r*1.2);
    tg.addColorStop(0, tp.light); tg.addColorStop(1, tp.dark);
    ctx.fillStyle = tg;
    rr(ctx, -r*.45, oy-r*2.15, r*.9, r*.95, r*.2); ctx.fill();
    
    ctx.fillStyle = '#e9b489';
    ctx.beginPath(); ctx.arc(0, oy-r*2.45, r*.34, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2417';
    ctx.beginPath(); ctx.arc(0, oy-r*2.5, r*.32, Math.PI, 0); ctx.fill();
}

function meeplePath(ctx: CanvasRenderingContext2D, oy: number, u: number) {
    ctx.beginPath();
    ctx.moveTo(0, oy-8*u);
    ctx.bezierCurveTo(2.5*u, oy-8*u, 4*u, oy-6.3*u, 4*u, oy-4.5*u);
    ctx.bezierCurveTo(4*u, oy-3.8*u, 3.8*u, oy-3.2*u, 3.4*u, oy-2.7*u);
    ctx.bezierCurveTo(5.5*u, oy-2.3*u, 7.5*u, oy-1.5*u, 8.3*u, oy-0.4*u);
    ctx.bezierCurveTo(8.9*u, oy+0.4*u, 8.5*u, oy+1.4*u, 7.4*u, oy+1.4*u);
    ctx.bezierCurveTo(6*u, oy+1.4*u, 4.8*u, oy+1.1*u, 3.9*u, oy+0.7*u);
    ctx.bezierCurveTo(4.3*u, oy+2.6*u, 5*u, oy+4.6*u, 5.5*u, oy+6.2*u);
    ctx.bezierCurveTo(5.8*u, oy+7.2*u, 5.2*u, oy+7.8*u, 4.2*u, oy+7.8*u);
    ctx.lineTo(-4.2*u, oy+7.8*u);
    ctx.bezierCurveTo(-5.2*u, oy+7.8*u, -5.8*u, oy+7.2*u, -5.5*u, oy+6.2*u);
    ctx.bezierCurveTo(-5*u, oy+4.6*u, -4.3*u, oy+2.6*u, -3.9*u, oy+0.7*u);
    ctx.bezierCurveTo(-4.8*u, oy+1.1*u, -6*u, oy+1.4*u, -7.4*u, oy+1.4*u);
    ctx.bezierCurveTo(-8.5*u, oy+1.4*u, -8.9*u, oy+0.4*u, -8.3*u, oy-0.4*u);
    ctx.bezierCurveTo(-7.5*u, oy-1.5*u, -5.5*u, oy-2.3*u, -3.4*u, oy-2.7*u);
    ctx.bezierCurveTo(-3.8*u, oy-3.2*u, -4*u, oy-3.8*u, -4*u, oy-4.5*u);
    ctx.bezierCurveTo(-4*u, oy-6.3*u, -2.5*u, oy-8*u, 0, oy-8*u);
    ctx.closePath();
}

export function drawNewMeeple(ctx: CanvasRenderingContext2D, r: number, pal: Palette, gk: boolean) {
    const oy = -r*.15;
    const u = r/8;
    const rs = shadow(ctx, 0, oy+r*.4, r*1.1, r*.6);
    
    meeplePath(ctx, oy, u);
    const g = ctx.createLinearGradient(0, oy-8*u, 0, oy+8*u);
    g.addColorStop(0, pal.light); g.addColorStop(.5, pal.base); g.addColorStop(1, pal.dark);
    ctx.fillStyle = g; ctx.fill();
    rs();
    
    ctx.strokeStyle = gk ? '#ffd54a' : 'rgba(0,0,0,.45)';
    ctx.lineWidth = Math.max(1, r*.09); ctx.stroke();
    
    const sh = ctx.createRadialGradient(-r*.3, oy-r*.6, 0, -r*.3, oy-r*.6, r);
    sh.addColorStop(0, 'rgba(255,255,255,.3)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    meeplePath(ctx, oy, u);
    ctx.fillStyle = sh; ctx.fill();
}

function hexPath(ctx: CanvasRenderingContext2D, oy: number, r: number) {
    ctx.beginPath();
    for(let i=0; i<6; i++){
        const a = -Math.PI/2 + i*Math.PI/3;
        const px = Math.cos(a)*r;
        const py = oy + Math.sin(a)*r;
        if(i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
}

export function drawNewBadge(ctx: CanvasRenderingContext2D, r: number, pal: Palette, gk: boolean) {
    const oy = -r*.2;
    const h = r*.45;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = r*.7;
    ctx.shadowOffsetX = -r*.2;
    ctx.shadowOffsetY = r*.5;
    hexPath(ctx, oy+h, r);
    ctx.fillStyle = pal.dark; ctx.fill();
    ctx.restore();
    
    const wg = ctx.createLinearGradient(-r, oy, r, oy);
    wg.addColorStop(0, pal.dark); wg.addColorStop(.5, pal.wall); wg.addColorStop(1, pal.dark);
    hexPath(ctx, oy+h, r);
    ctx.fillStyle = wg; ctx.fill();
    
    const g = ctx.createRadialGradient(-r*.3, oy-r*.4, r*.1, 0, oy, r);
    g.addColorStop(0, pal.light); g.addColorStop(.5, pal.base); g.addColorStop(1, pal.dark);
    hexPath(ctx, oy, r);
    ctx.fillStyle = g; ctx.fill();
    
    if (gk) {
        hexPath(ctx, oy, r*1.02);
        ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = r*.16; ctx.stroke();
    }
    
    hexPath(ctx, oy, r*.82);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = r*.08; ctx.stroke();
    
    ctx.save();
    hexPath(ctx, oy, r); ctx.clip();
    const sg = ctx.createLinearGradient(-r, oy-r, r, oy+r);
    sg.addColorStop(0, 'rgba(255,255,255,.35)'); sg.addColorStop(.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(-r, oy-r, 2*r, 2*r);
    ctx.restore();
}

export function drawNewHolo(ctx: CanvasRenderingContext2D, r: number, pal: Palette, gk: boolean) {
    const oy = 0;
    const rs = shadow(ctx, 0, oy, r, r*.6);
    const g = ctx.createRadialGradient(0, oy, 0, 0, oy, r);
    g.addColorStop(0, '#1a222d'); g.addColorStop(1, '#0b0f14');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, oy, r, 0, 7); ctx.fill();
    rs();
    
    ctx.save();
    ctx.shadowColor = pal.light; ctx.shadowBlur = r*.7;
    ctx.strokeStyle = pal.light; ctx.lineWidth = r*.14;
    ctx.beginPath(); ctx.arc(0, oy, r*.92, 0, 7); ctx.stroke();
    ctx.restore();
    
    ctx.strokeStyle = gk ? '#ffd54a' : pal.base;
    ctx.lineWidth = r*.08;
    ctx.setLineDash([r*.55, r*.4]);
    // Simulate animation with performance.now()
    ctx.lineDashOffset = -(performance.now() / 40) % (r*.55 + r*.4);
    ctx.beginPath(); ctx.arc(0, oy, r*.66, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1;
    for (let i=-2; i<=2; i++) {
        const w = Math.sqrt(Math.max(0, r*r - (i*r*.35)*(i*r*.35)));
        ctx.beginPath();
        ctx.moveTo(-w, oy+i*r*.35); ctx.lineTo(w, oy+i*r*.35);
        ctx.stroke();
    }
}

export function drawNewTactic(ctx: CanvasRenderingContext2D, r: number, pal: Palette, gk: boolean) {
    const oy = 0;
    // face rotation handles by outer context
    ctx.save();
    ctx.strokeStyle = '#0d0d0d'; ctx.lineWidth = r*.3; ctx.lineCap = 'round';
    
    ctx.beginPath();
    // right hand
    ctx.moveTo(-r*.30, r*.50);
    ctx.quadraticCurveTo(r*.35, r*.95, r*.85, r*.20);
    // left hand
    ctx.moveTo(-r*.30, -r*.50);
    ctx.quadraticCurveTo(r*.35, -r*.95, r*.85, -r*.20);
    ctx.stroke();
    ctx.lineCap = 'butt';
    
    // body
    ctx.beginPath(); ctx.ellipse(0, 0, r*.62, r*.80, 0, 0, 7);
    ctx.fillStyle = gk ? '#f4c20d' : pal.base; ctx.fill();
    ctx.strokeStyle = '#0d0d0d'; ctx.lineWidth = r*.24; ctx.stroke();
    ctx.restore();
}

export function drawNewBall(ctx: CanvasRenderingContext2D, r: number, colorMode: 'normal' | 'away' | 'gk' = 'normal') {
    let d = '#22262c', dHi = '#4a515c', dLo = '#0c0e11';
    let b1 = '#eef0f4', b2 = '#cfd3da', b3 = '#aeb3bd';

    if (colorMode === 'away') {
        d = '#b3121f'; dHi = '#e0565f'; dLo = '#6f0a12';
        b1 = '#fdeef0'; b2 = '#e7c9cd'; b3 = '#d5aeb3';
    } else if (colorMode === 'gk') {
        d = '#f07f00'; dHi = '#ffb35c'; dLo = '#9c5200';
        b1 = '#fff6e6'; b2 = '#ecd8ba'; b3 = '#d9bf98';
    }

    ctx.save();
    
    // drop-shadow
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = r * 0.14;
    ctx.shadowOffsetY = r * 0.18;

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    
    // base sphere
    const bg = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 0, -r * 0.3, -r * 0.4, r * 2.4);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(0.45, b1);
    bg.addColorStop(0.78, b2);
    bg.addColorStop(1, b3);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();

    // 5 rim patches
    const patch = (cx: number, cy: number, rx: number, ry: number) => {
        const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
        pg.addColorStop(0, d);
        pg.addColorStop(0.97, d);
        pg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
    };

    patch(0, -0.92 * r, 0.48 * r, 0.44 * r);                 
    patch(0.94 * r, -0.2 * r, 0.44 * r, 0.44 * r);           
    patch(0.6 * r, 0.94 * r, 0.48 * r, 0.44 * r);            
    patch(-0.6 * r, 0.94 * r, 0.48 * r, 0.44 * r);           
    patch(-0.94 * r, -0.2 * r, 0.44 * r, 0.44 * r);          

    // inset shadows
    const drawInset = (ox: number, oy: number, blur: number, color: string) => {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowOffsetX = ox;
        ctx.shadowOffsetY = oy;
        ctx.shadowBlur = blur;
        
        ctx.beginPath();
        ctx.arc(0, 0, r + r, 0, Math.PI * 2); // path is outside
        ctx.strokeStyle = '#000';
        ctx.lineWidth = r * 2;
        ctx.stroke();
        ctx.restore();
    };

    drawInset(-r * 0.1, -r * 0.16, r * 0.24, 'rgba(255,255,255,0.7)');
    drawInset(r * 0.14, r * 0.2, r * 0.3, 'rgba(0,0,0,0.3)');

    ctx.restore();

    // Center pentagon
    ctx.save();
    const pw = 0.76 * r;
    const ph = 0.72 * r;
    const px = -pw / 2;
    const py = -ph / 2;
    ctx.beginPath();
    ctx.moveTo(px + pw * 0.5, py + 0);
    ctx.lineTo(px + pw * 1.0, py + ph * 0.38);
    ctx.lineTo(px + pw * 0.81, py + ph * 1.0);
    ctx.lineTo(px + pw * 0.19, py + ph * 1.0);
    ctx.lineTo(px + 0, py + ph * 0.38);
    ctx.closePath();

    const pg = ctx.createRadialGradient(px + pw*0.35, py + ph*0.25, 0, px + pw*0.35, py + ph*0.25, pw*1.4);
    pg.addColorStop(0, dHi);
    pg.addColorStop(0.55, d);
    pg.addColorStop(1, dLo);
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.restore();

    // Specular highlight
    const hx = -0.3 * r;
    const hy = -0.54 * r;
    const hrx = 0.38 * r;
    const hry = 0.26 * r;
    const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hrx);
    hg.addColorStop(0, 'rgba(255,255,255,0.85)');
    hg.addColorStop(0.72, 'rgba(255,255,255,0)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(hx, hy, hrx, hry, 0, 0, Math.PI * 2);
    ctx.fill();
}

export function traceTokenOutline(ctx: CanvasRenderingContext2D, shape: string, r: number) {
    if (shape === 'coins' || shape === 'holo' || shape === 'ball') {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
    } else if (shape === 'pucks') {
        const sq = .9;
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r*sq, 0, 0, Math.PI * 2);
    } else if (shape === 'shirts') {
        const k = r/10;
        const oy = -r*.55; 
        ctx.beginPath();
        ctx.moveTo(0, oy-6.2*k);
        ctx.quadraticCurveTo(2.6*k, oy-6.0*k, 5.8*k, oy-4.8*k);
        ctx.quadraticCurveTo(8.2*k, oy-3.8*k, 9.6*k, oy-1.0*k);
        ctx.quadraticCurveTo(10.0*k, oy+0.2*k, 8.9*k, oy+1.6*k);
        ctx.quadraticCurveTo(8.5*k, oy+2.2*k, 7.8*k, oy+2.2*k);
        ctx.quadraticCurveTo(7.4*k, oy+2.2*k, 6.8*k, oy+1.4*k);
        ctx.quadraticCurveTo(6.6*k, oy+3.8*k, 6.2*k, oy+7.2*k);
        ctx.quadraticCurveTo(6.0*k, oy+10.0*k, 0, oy+10.0*k);
        ctx.quadraticCurveTo(-6.0*k, oy+10.0*k, -6.2*k, oy+7.2*k);
        ctx.quadraticCurveTo(-6.6*k, oy+3.8*k, -6.8*k, oy+1.4*k);
        ctx.quadraticCurveTo(-7.4*k, oy+2.2*k, -7.8*k, oy+2.2*k);
        ctx.quadraticCurveTo(-8.5*k, oy+2.2*k, -8.9*k, oy+1.6*k);
        ctx.quadraticCurveTo(-10.0*k, oy+0.2*k, -9.6*k, oy-1.0*k);
        ctx.quadraticCurveTo(-8.2*k, oy-3.8*k, -5.8*k, oy-4.8*k);
        ctx.quadraticCurveTo(-2.6*k, oy-6.0*k, 0, oy-6.2*k);
        ctx.closePath();
    } else if (shape === 'minis') {
        ctx.beginPath();
        ctx.ellipse(0, -r * 1.5, r * 1.2, r * 2.2, 0, 0, Math.PI * 2);
    } else if (shape === 'domes') {
        const oy = 0;
        ctx.beginPath();
        ctx.moveTo(-r, oy-r*.15);
        ctx.quadraticCurveTo(-r*.95, oy-r*1.2, 0, oy-r*1.25);
        ctx.quadraticCurveTo(r*.95, oy-r*1.2, r, oy-r*.15);
        ctx.quadraticCurveTo(r*.8, oy+r*.28, 0, oy+r*.32);
        ctx.quadraticCurveTo(-r*.8, oy+r*.28, -r, oy-r*.15);
        ctx.closePath();
    } else if (shape === 'meeples') {
        const oy = -r*.15;
        const u = r/8;
        ctx.beginPath();
        ctx.moveTo(0, oy-8*u);
        ctx.bezierCurveTo(2.5*u, oy-8*u, 4*u, oy-6.3*u, 4*u, oy-4.5*u);
        ctx.bezierCurveTo(4*u, oy-3.8*u, 3.8*u, oy-3.2*u, 3.4*u, oy-2.7*u);
        ctx.bezierCurveTo(5.5*u, oy-2.3*u, 7.5*u, oy-1.5*u, 8.3*u, oy-0.4*u);
        ctx.bezierCurveTo(8.9*u, oy+0.4*u, 8.5*u, oy+1.4*u, 7.4*u, oy+1.4*u);
        ctx.bezierCurveTo(6*u, oy+1.4*u, 4.8*u, oy+1.1*u, 3.9*u, oy+0.7*u);
        ctx.bezierCurveTo(4.3*u, oy+2.6*u, 5*u, oy+4.6*u, 5.5*u, oy+6.2*u);
        ctx.bezierCurveTo(5.8*u, oy+7.2*u, 5.2*u, oy+7.8*u, 4.2*u, oy+7.8*u);
        ctx.lineTo(-4.2*u, oy+7.8*u);
        ctx.bezierCurveTo(-5.2*u, oy+7.8*u, -5.8*u, oy+7.2*u, -5.5*u, oy+6.2*u);
        ctx.bezierCurveTo(-5*u, oy+4.6*u, -4.3*u, oy+2.6*u, -3.9*u, oy+0.7*u);
        ctx.bezierCurveTo(-4.8*u, oy+1.1*u, -6*u, oy+1.4*u, -7.4*u, oy+1.4*u);
        ctx.bezierCurveTo(-8.5*u, oy+1.4*u, -8.9*u, oy+0.4*u, -8.3*u, oy-0.4*u);
        ctx.bezierCurveTo(-7.5*u, oy-1.5*u, -5.5*u, oy-2.3*u, -3.4*u, oy-2.7*u);
        ctx.bezierCurveTo(-3.8*u, oy-3.2*u, -4*u, oy-3.8*u, -4*u, oy-4.5*u);
        ctx.bezierCurveTo(-4*u, oy-6.3*u, -2.5*u, oy-8*u, 0, oy-8*u);
        ctx.closePath();
    } else if (shape === 'badges') {
        const oy = -r*.2;
        ctx.beginPath();
        for(let i=0; i<6; i++){
            const a = -Math.PI/2 + i*Math.PI/3;
            const px = Math.cos(a)*r;
            const py = oy + Math.sin(a)*r;
            if(i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.closePath();
    } else if (shape === 'tactic') {
        ctx.beginPath();
        ctx.ellipse(0, 0, r*.62, r*.80, 0, 0, Math.PI * 2);
    } else {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
}

export function buildTokenOutlinePath(ctx: CanvasRenderingContext2D, shape: string, size: number) {
    const r = size / 2;
    ctx.beginPath();
    if (shape === 'circle' || shape === 'coins' || shape === 'holo' || shape === 'logo' || shape === 'ball' || shape === 'tactic') {
        ctx.arc(0, 0, r, 0, Math.PI * 2);
    } else if (shape === 'semicircle') {
        ctx.moveTo(r, r);
        ctx.lineTo(-r, r);
        ctx.lineTo(-r, size * 0.2);
        ctx.arc(0, size * 0.2, r, Math.PI, 0);
        ctx.closePath();
    } else if (shape === 'crescent') {
        ctx.moveTo(-0.35 * size, 0.25 * size);
        ctx.quadraticCurveTo(0, -0.45 * size, 0.35 * size, 0.25 * size);
        ctx.quadraticCurveTo(0, -0.05 * size, -0.35 * size, 0.25 * size);
        ctx.closePath();
    } else if (shape === 'jersey') {
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
    } else if (shape === 'shirts') {
        const k = r/10;
        const oy = -r*.55;
        ctx.moveTo(0, oy-6.2*k);
        ctx.quadraticCurveTo(2.6*k, oy-6.0*k, 5.8*k, oy-4.8*k);
        ctx.quadraticCurveTo(8.2*k, oy-3.8*k, 9.6*k, oy-1.0*k);
        ctx.quadraticCurveTo(10.0*k, oy+0.2*k, 8.9*k, oy+1.6*k);
        ctx.quadraticCurveTo(7.0*k, oy+1.2*k, 4.9*k, oy+0.6*k);
        ctx.quadraticCurveTo(5.1*k, oy+3.4*k, 4.9*k, oy+6.6*k);
        ctx.quadraticCurveTo(4.8*k, oy+8.0*k, 3.2*k, oy+8.0*k);
        ctx.quadraticCurveTo(1.6*k, oy+8.3*k, 0, oy+8.3*k);
        ctx.quadraticCurveTo(-1.6*k, oy+8.3*k, -3.2*k, oy+8.0*k);
        ctx.quadraticCurveTo(-4.8*k, oy+8.0*k, -4.9*k, oy+6.6*k);
        ctx.quadraticCurveTo(-5.1*k, oy+3.4*k, -4.9*k, oy+0.6*k);
        ctx.quadraticCurveTo(-7.0*k, oy+1.2*k, -8.9*k, oy+1.6*k);
        ctx.quadraticCurveTo(-10.0*k, oy+0.2*k, -9.6*k, oy-1.0*k);
        ctx.quadraticCurveTo(-8.2*k, oy-3.8*k, -5.8*k, oy-4.8*k);
        ctx.quadraticCurveTo(-2.6*k, oy-6.0*k, 0, oy-6.2*k);
        ctx.closePath();
    } else if (shape === 'pucks') {
        const h = r*.62, sq = .9;
        ctx.moveTo(-r, 0); ctx.lineTo(-r, h);
        ctx.ellipse(0, h, r, r*sq, 0, Math.PI, 0, true);
        ctx.lineTo(r, 0);
        ctx.ellipse(0, 0, r, r*sq, 0, 0, Math.PI, false);
        ctx.closePath();
    } else if (shape === 'domes') {
        const oy = 0;
        ctx.moveTo(-r, oy-r*.15);
        ctx.quadraticCurveTo(-r*.95, oy-r*1.2, 0, oy-r*1.25);
        ctx.quadraticCurveTo(r*.95, oy-r*1.2, r, oy-r*.15);
        ctx.quadraticCurveTo(r*.8, oy+r*.28, 0, oy+r*.32);
        ctx.quadraticCurveTo(-r*.8, oy+r*.28, -r, oy-r*.15);
        ctx.closePath();
    } else if (shape === 'meeples') {
        const oy = -r*.15;
        const u = r/8;
        ctx.moveTo(0, oy-8*u);
        ctx.bezierCurveTo(2.5*u, oy-8*u, 4*u, oy-6.3*u, 4*u, oy-4.5*u);
        ctx.bezierCurveTo(4*u, oy-3.8*u, 3.8*u, oy-3.2*u, 3.4*u, oy-2.7*u);
        ctx.bezierCurveTo(5.5*u, oy-2.3*u, 7.5*u, oy-1.5*u, 8.3*u, oy-0.4*u);
        ctx.bezierCurveTo(8.9*u, oy+0.4*u, 8.5*u, oy+1.4*u, 7.4*u, oy+1.4*u);
        ctx.bezierCurveTo(6*u, oy+1.4*u, 4.8*u, oy+1.1*u, 3.9*u, oy+0.7*u);
        ctx.bezierCurveTo(4.3*u, oy+2.6*u, 5*u, oy+4.6*u, 5.5*u, oy+6.2*u);
        ctx.bezierCurveTo(5.8*u, oy+7.2*u, 5.2*u, oy+7.8*u, 4.2*u, oy+7.8*u);
        ctx.lineTo(-4.2*u, oy+7.8*u);
        ctx.bezierCurveTo(-5.2*u, oy+7.8*u, -5.8*u, oy+7.2*u, -5.5*u, oy+6.2*u);
        ctx.bezierCurveTo(-5*u, oy+4.6*u, -4.3*u, oy+2.6*u, -3.9*u, oy+0.7*u);
        ctx.bezierCurveTo(-4.8*u, oy+1.1*u, -6*u, oy+1.4*u, -7.4*u, oy+1.4*u);
        ctx.bezierCurveTo(-8.5*u, oy+1.4*u, -8.9*u, oy+0.4*u, -8.3*u, oy-0.4*u);
        ctx.bezierCurveTo(-7.5*u, oy-1.5*u, -5.5*u, oy-2.3*u, -3.4*u, oy-2.7*u);
        ctx.bezierCurveTo(-3.8*u, oy-3.2*u, -4*u, oy-3.8*u, -4*u, oy-4.5*u);
        ctx.bezierCurveTo(-4*u, oy-6.3*u, -2.5*u, oy-8*u, 0, oy-8*u);
        ctx.closePath();
    } else if (shape === 'badges') {
        const oy = -r*.2;
        const h = r*.45;
        for(let i=0; i<6; i++){
            const a = -Math.PI/2 + i*Math.PI/3;
            const px = Math.cos(a)*r;
            const py = oy + h + Math.sin(a)*r;
            if(i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.closePath();
    } else if (shape === 'minis') {
        ctx.arc(0, -size*0.4, size*0.8, 0, Math.PI * 2);
    } else {
        ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
}
