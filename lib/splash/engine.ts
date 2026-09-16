// @ts-nocheck
/*
 * Ranked Lobby splash screen.
 *
 * Ported as-is from the standalone WebGL prototype, so this module is plain
 * vanilla JavaScript and opts out of type checking. Everything it needs is
 * created and torn down by mountSplash(); it touches no app state.
 */
import * as THREE from "three";

// The grade was authored before three enabled colour management by default.
THREE.ColorManagement.enabled = false;

const FONTS =
  "https://fonts.googleapis.com/css2?family=Anton&family=Instrument+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap";

const CSS = `#rl-splash{ position:fixed; inset:0; z-index:200;
  --void:#050506; --paper:#ecebe6; --dim:#83868a; --accent:#f2d027;
  --gut:clamp(20px,4vw,58px); --gutT:clamp(18px,3vh,30px);
  background:var(--void); color:var(--paper); overflow:hidden;
  font-family:'Instrument Sans', system-ui, sans-serif; }
#rl-splash *{ box-sizing:border-box; }
#rl-splash .scene { position:relative; height:100%; width:100%; overflow:hidden;
    transition:opacity .55s ease; }
#rl-splash .scene.gone { opacity:0; pointer-events:none; }
#rl-splash canvas { position:absolute; inset:0; width:100%; height:100%; display:block; }
#rl-splash .vignette { position:absolute; inset:0; pointer-events:none;
    background:radial-gradient(125% 95% at 50% 46%, rgba(5,5,6,0) 40%, rgba(5,5,6,.78) 100%); }
#rl-splash .grain { position:absolute; inset:-150%; pointer-events:none; opacity:.13;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E");
    animation:rlGrain .7s steps(1) infinite; }
@keyframes rlGrain{ 0%{transform:translate(0,0)} 25%{transform:translate(-3%,2%)}
    50%{transform:translate(2%,-3%)} 75%{transform:translate(-2%,-2%)} 100%{transform:translate(0,0)} }
#rl-splash .micro { font-family:'DM Mono', ui-monospace, monospace; font-size:10px;
    letter-spacing:.16em; text-transform:uppercase; color:var(--dim); }
#rl-splash .skip { position:absolute; right:var(--gut); top:var(--gutT); font-family:'DM Mono',monospace;
    font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--dim);
    background:none; border:0; padding:6px 2px; cursor:pointer; opacity:0;
    animation:rlRise .8s ease 1.8s both; transition:color .3s ease; }
#rl-splash .skip:hover { color:var(--paper); }
#rl-splash .title { position:absolute; inset:0; pointer-events:none; display:flex; flex-direction:column;
    justify-content:center; padding:0 var(--gut); opacity:0; }
#rl-splash .title.on { opacity:1; }
#rl-splash .word { font-family:'Anton', Impact, sans-serif; font-weight:400; text-transform:uppercase;
    font-size:clamp(3.4rem,13.5vw,13rem); line-height:.86; letter-spacing:.005em;
    color:var(--paper); margin:0; white-space:nowrap; }
#rl-splash .word .l { display:inline-block; overflow:hidden; vertical-align:bottom; }
#rl-splash .word .l i { display:inline-block; font-style:normal; transform:translateY(106%); }
#rl-splash .title.on .word .l i { animation:rlLetterUp .82s cubic-bezier(.16,.9,.24,1) both;
    animation-delay:calc(var(--i) * 42ms); }
@keyframes rlLetterUp{ from{transform:translateY(106%)} to{transform:translateY(0)} }
#rl-splash .title.on .word { animation:rlTitleSettle 1.05s cubic-bezier(.16,.9,.24,1) both; }
@keyframes rlTitleSettle{
    0%{ transform:scale(1.05);
        text-shadow:6px 0 rgba(255,70,90,.55), -6px 0 rgba(70,200,255,.55); }
    55%{ text-shadow:2px 0 rgba(255,70,90,.24), -2px 0 rgba(70,200,255,.24); }
    100%{ transform:none; text-shadow:none; }
  }
#rl-splash .title::after { content:''; position:absolute; left:var(--gut); right:42%; height:2px; opacity:0;
    background:linear-gradient(90deg,rgba(236,235,230,0),rgba(236,235,230,.85),rgba(236,235,230,0)); }
#rl-splash .title.on::after { animation:rlScanDown .95s cubic-bezier(.3,.7,.3,1) .2s both; }
@keyframes rlScanDown{ 0%{ top:34%; opacity:0 } 18%{ opacity:.95 } 100%{ top:64%; opacity:0 } }
#rl-splash .rule { height:1px; background:rgba(236,235,230,.34); margin:clamp(14px,2.4vh,26px) 0 0;
    max-width:min(640px,72vw); transform:scaleX(0); transform-origin:left center; }
#rl-splash .title.on .rule { animation:rlRuleIn .9s cubic-bezier(.2,.8,.2,1) .72s both; }
@keyframes rlRuleIn{ to{transform:scaleX(1)} }
#rl-splash .sub { margin:clamp(12px,2vh,18px) 0 0; max-width:36ch; font-size:clamp(12px,1.05vw,14px);
    line-height:1.55; color:var(--dim); opacity:0; }
#rl-splash .sub b { color:var(--paper); font-weight:500; }
#rl-splash .title.on .sub { animation:rlRise .8s cubic-bezier(.2,.8,.2,1) .95s both; }
#rl-splash .title.on .cta { animation:rlRise .8s cubic-bezier(.2,.8,.2,1) 1.15s both; }
#rl-splash .cta { margin:clamp(20px,3.2vh,34px) 0 0; }
#rl-splash .pill { display:inline-flex; align-items:center; gap:10px; background:var(--accent); color:#0b0b0c;
    border:0; border-radius:999px; padding:12px 22px; font-family:'DM Mono',monospace; font-size:11px;
    letter-spacing:.15em; text-transform:uppercase; white-space:nowrap; opacity:0;
    pointer-events:none; transform:translateY(10px);
    transition:opacity .55s ease, transform .55s cubic-bezier(.2,.8,.2,1), box-shadow .3s ease; }
#rl-splash .pill.on { opacity:1; transform:none; cursor:pointer; pointer-events:auto; }
#rl-splash .pill.on:hover { transform:translateY(-2px); box-shadow:0 10px 30px rgba(242,208,39,.34); }
@keyframes rlRise{ from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:none} }
#rl-splash .fadeout { position:absolute; inset:0; background:var(--void); pointer-events:none; opacity:0; }
#rl-splash .flash { position:absolute; inset:0; background:#fff; pointer-events:none; opacity:0; }
@media (max-width:820px){
  #rl-splash .sub { font-size:12px; }
}
@media (prefers-reduced-motion: reduce){
  #rl-splash .skip { animation:none; opacity:1; }
  #rl-splash .title.on .word .l i, #rl-splash .title.on .rule, #rl-splash .title.on .sub { animation:none; }
  #rl-splash .title.on .word .l i { transform:none; }
  #rl-splash .title.on .rule { transform:scaleX(1); }
  #rl-splash .title.on .sub { opacity:1; }
}`;

/**
 * Mounts the splash into `mount` and returns a teardown function.
 * `onDone` fires once the sequence has handed over, so the host can unmount.
 */
export function mountSplash(mount: HTMLElement, onDone: () => void) {
  if (!document.getElementById("rl-splash-fonts")) {
    const link = document.createElement("link");
    link.id = "rl-splash-fonts";
    link.rel = "stylesheet";
    link.href = FONTS;
    document.head.appendChild(link);
  }
  if (!document.getElementById("rl-splash-style")) {
    const style = document.createElement("style");
    style.id = "rl-splash-style";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  const root = document.createElement("div");
  root.id = "rl-splash";
  root.innerHTML = [
    '<div class="scene">',
    '  <canvas></canvas>',
    '  <div class="pen"></div>',
    '  <button class="skip" type="button">Passer</button>',
    '  <div class="title">',
    '    <p class="word" data-w="RANKED"></p>',
    '    <p class="word" data-w="LOBBY"></p>',
    '    <div class="rule"></div>',
    '    <p class="sub"><b>Construisez votre appareil, domaine par domaine.</b> ',
    "     Entraînement chronométré, progression mesurée, classement.</p>",
    '    <div class="cta"><button class="pill" type="button">Entrer <span aria-hidden="true">&rarr;</span></button></div>',
    "  </div>",
    '  <div class="flash"></div>',
    '  <div class="fadeout"></div>',
    "</div>"
  ].join("");
  mount.appendChild(root);

  var host = root.querySelector(".scene");
  var sceneEl = host;
  var canvas = root.querySelector("canvas");
  var penEl = root.querySelector(".pen");
  var skipEl = root.querySelector(".skip");
  var titleEl = root.querySelector(".title");
  var pillEl = root.querySelector(".pill");
  var flashEl = root.querySelector(".flash");
  var fadeEl = root.querySelector(".fadeout");

  var rafId = 0, onMove = null, onResize = null, reduceTimer = 0, disposed = false;

  function dispose() {
    if (disposed) return;
    disposed = true;
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (reduceTimer) clearTimeout(reduceTimer);
    if (onMove) window.removeEventListener("pointermove", onMove);
    if (onResize) window.removeEventListener("resize", onResize);
    [rtScene, rtA, rtB, rtC, rtD].forEach(function (rt) { if (rt) rt.dispose(); });
    if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  (function(){
    var words=titleEl.querySelectorAll('.word'), n=0;
    for(var w=0;w<words.length;w++){
      var txt=words[w].dataset.w, out='';
      for(var i=0;i<txt.length;i++) out+='<span class="l" style="--i:'+(n++)+'"><i>'+txt.charAt(i)+'</i></span>';
      words[w].innerHTML=out;
    }
  })();

  var VOID=0x050506;
  var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setClearColor(VOID,1);
  var scene=new THREE.Scene(); scene.fog=new THREE.Fog(VOID,30,110);
  var camera=new THREE.PerspectiveCamera(24,1,0.2,600);

  function lerp(a,b,t){ return a+(b-a)*t; }
  function cl(x){ return x<0?0:(x>1?1:x); }
  function eOutCubic(x){ return 1-Math.pow(1-x,3); }
  function eOutExpo(x){ return x>=1?1:1-Math.pow(2,-10*x); }
  function eInOutQuint(x){ return x<.5?16*x*x*x*x*x:1-Math.pow(-2*x+2,5)/2; }
  function sstep(x){ return x*x*(3-2*x); }
  // one continuous hand: ramps up over the first stretch, then holds speed
  function drawCurve(u){
    var a=.12, m=1-a/2;
    return (u<a ? (u*u)/(2*a) : a/2+(u-a))/m;
  }
  function V(x,y,z){ return new THREE.Vector3(x,y,z); }

  // ======================================================================
  //  THE AIRCRAFT — one dataset drives the drawing and the model.
  //  +X forward, +Y up, +Z starboard. Metres.
  // ======================================================================
  // x, half-width, half-height, centre-y, section exponent (high = chined)
  var FUS=[
    [ 7.75,0.02,0.02,-0.03,2.0],[ 7.45,0.09,0.08,-0.02,2.1],[ 7.00,0.19,0.16, 0.00,2.3],
    [ 6.40,0.31,0.25, 0.01,2.5],[ 5.70,0.43,0.33, 0.02,2.7],[ 5.00,0.54,0.40, 0.02,2.8],
    [ 4.30,0.64,0.46, 0.00,2.9],
    [ 3.40,0.72,0.53,-0.02,3.1],[ 2.40,0.78,0.60,-0.04,2.9],[ 1.20,0.82,0.66,-0.05,2.7],
    [ 0.00,0.84,0.70,-0.05,2.6],[-1.40,0.84,0.71,-0.04,2.5],[-2.80,0.82,0.70,-0.03,2.5],
    [-4.20,0.78,0.68,-0.02,2.5],[-5.60,0.70,0.64, 0.00,2.5],[-6.60,0.62,0.59, 0.02,2.5],
    [-7.30,0.55,0.53, 0.02,2.5],[-7.85,0.50,0.49, 0.02,2.5]
  ];
  var WING=[[0.95,1.45,-6.95],[2.10,0.20,-6.86],[3.30,-1.10,-6.74],
            [4.45,-2.35,-6.20],[5.20,-3.20,-5.55],[5.45,-3.55,-5.25]];
  var CANARD=[[0.76,4.52,3.28],[1.28,4.14,3.20],[1.76,3.72,3.12]];
  var FIN=[[0.80,-2.95,-6.95],[1.70,-3.68,-6.86],[2.50,-4.32,-6.76],[3.05,-4.86,-6.66]];
  var CANOPY=[[5.45,0.05,0.02],[5.00,0.24,0.18],[4.45,0.38,0.34],[3.70,0.44,0.44],
              [2.85,0.44,0.45],[2.00,0.40,0.36],[1.25,0.30,0.18],[0.80,0.16,0.03]];
  var INTAKE=[[2.95,0.30,0.36],[2.55,0.40,0.48],[1.90,0.46,0.54],
              [0.80,0.48,0.56],[-0.40,0.46,0.54],[-1.40,0.42,0.50]];
  var NOZZLE=[[-6.45,0.40],[-7.05,0.41],[-7.45,0.35],[-7.95,0.37]];
  var IN_Z=1.26, IN_Y=-0.20;
  var TANK=[[0.60,0.06],[0.10,0.28],[-0.70,0.40],[-2.20,0.40],[-3.10,0.32],[-3.70,0.08]];
  var TANK_Z=3.00, TANK_Y=-0.66;
  var MSL=[[-3.15,0.02],[-3.45,0.075],[-3.90,0.095],[-5.80,0.095],[-6.20,0.075],[-6.35,0.03]];
  var MSL_Z=5.36, MSL_Y=-0.30;

  function fusAt(x){
    for(var i=0;i<FUS.length-1;i++){
      var a=FUS[i],b=FUS[i+1];
      if(x<=a[0]&&x>=b[0]){ var t=(a[0]-x)/(a[0]-b[0]);
        return [lerp(a[1],b[1],t),lerp(a[2],b[2],t),lerp(a[3],b[3],t),lerp(a[4],b[4],t)]; }
    }
    var e=x>FUS[0][0]?FUS[0]:FUS[FUS.length-1];
    return [e[1],e[2],e[3],e[4]];
  }
  function chordAt(list,z){
    for(var i=0;i<list.length-1;i++){
      var a=list[i],b=list[i+1];
      if(z>=a[0]&&z<=b[0]){ var t=(z-a[0])/(b[0]-a[0]);
        return [lerp(a[1],b[1],t),lerp(a[2],b[2],t)]; }
    }
    var e=z<list[0][0]?list[0]:list[list.length-1];
    return [e[1],e[2]];
  }

  // ======================================================================
  //  A.  THE SHEET — a single plan view on a lamp-lit drafting surface
  // ======================================================================
  var SHEET={x0:-12,x1:12,z0:-10,z1:10};
  var lamp=new THREE.Vector2(0,0), paperMat;
  (function(){
    var g=new THREE.PlaneGeometry(SHEET.x1-SHEET.x0+16,SHEET.z1-SHEET.z0+16);
    paperMat=new THREE.ShaderMaterial({
      uniforms:{ uLamp:{value:lamp}, uPaper:{value:new THREE.Color(0x15161c)},
                 uVoid:{value:new THREE.Color(VOID)}, uOp:{value:1} },
      vertexShader:['varying vec3 vW;','void main(){ vW=(modelMatrix*vec4(position,1.0)).xyz;',
        ' gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'].join('\n'),
      fragmentShader:['uniform vec2 uLamp; uniform vec3 uPaper,uVoid; uniform float uOp;',
        'varying vec3 vW;','void main(){',
        ' float d=distance(vW.xz,uLamp);',
        ' float pool=exp(-d*d/260.0), wide=exp(-d*d/5200.0);',
        ' vec3 col=mix(uVoid,uPaper,clamp(pool*0.95+wide*0.30,0.0,1.0));',
        ' gl_FragColor=vec4(mix(uVoid,col,uOp),1.0); }'].join('\n'),
      depthWrite:false
    });
    var mesh=new THREE.Mesh(g,paperMat); mesh.rotation.x=-Math.PI/2; mesh.position.y=-.06;
    mesh.renderOrder=-1; scene.add(mesh);
  })();

  var inkMats=[];
  function ink(op){ var m=new THREE.LineBasicMaterial({color:0xecebe6,transparent:true,
    opacity:op,fog:false}); m.userData.base=op; inkMats.push(m); return m; }
  var sheetGrp=new THREE.Group(); scene.add(sheetGrp);
  function resample(pts,step){
    var out=[pts[0].clone()];
    for(var i=1;i<pts.length;i++){
      var a=pts[i-1],b=pts[i],seg=a.distanceTo(b);
      if(seg<1e-6) continue;
      var n=Math.max(1,Math.ceil(seg/step));
      for(var j=1;j<=n;j++) out.push(a.clone().lerp(b,j/n));
    }
    return out;
  }
  var strokes=[];
  function stroke(view,pts,op,closed){
    if(closed) pts=pts.concat([pts[0].clone()]);
    var p=resample(pts,.11);
    var line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(p),ink(op===undefined?.9:op));
    line.frustumCulled=false; sheetGrp.add(line);
    strokes.push({view:view,obj:line,pts:p,n:p.length});
  }
  function P(x,z){ return V(x,0,z); }

  (function furniture(){
    var o=.075;
    stroke(1,[P(SHEET.x0,SHEET.z0),P(SHEET.x1,SHEET.z0),P(SHEET.x1,SHEET.z1),P(SHEET.x0,SHEET.z1)],.2,true);
    for(var x=SHEET.x0+3;x<SHEET.x1;x+=3) stroke(1,[P(x,SHEET.z0),P(x,SHEET.z1)],o);
    for(var z=SHEET.z0+3;z<SHEET.z1;z+=3) stroke(1,[P(SHEET.x0,z),P(SHEET.x1,z)],o);
    stroke(1,[P(4.4,6.6),P(11.6,6.6),P(11.6,9.6),P(4.4,9.6)],.22,true);
    stroke(1,[P(4.4,7.6),P(11.6,7.6)],.16);
    stroke(1,[P(4.4,8.6),P(11.6,8.6)],.16);
    stroke(1,[P(7.8,6.6),P(7.8,7.6)],.16);
  })();

  (function planView(){
    // Drawn in a draughtsman's order: the body, then everything on one side,
    // then the other. The pen used to hop left/right/front/back between every
    // stroke, which made anything tracking it lurch.
    var r=[],l=[];
    for(var x=7.70;x>=-7.85;x-=.14){ var f=fusAt(x); r.push(P(x,f[0])); l.push(P(x,-f[0])); }
    stroke(0,r.concat(l.slice().reverse()),.92,true);
    var cp=[];
    for(var c2=0;c2<CANOPY.length;c2++) cp.push(P(CANOPY[c2][0],CANOPY[c2][1]));
    for(var d2=CANOPY.length-1;d2>=0;d2--) cp.push(P(CANOPY[d2][0],-CANOPY[d2][1]));
    stroke(0,cp,.7,true);
    stroke(0,[P(3.70,.44),P(3.70,-.44)],.42);
    stroke(0,[P(2.85,.44),P(2.85,-.44)],.30);
    stroke(0,[P(-2.95,0),P(-6.95,0)],.5);                      // fin root

    function planform(list,sign,op){
      var le=[],te=[];
      for(var i=0;i<list.length;i++) le.push(P(list[i][1],sign*list[i][0]));
      for(var j=list.length-1;j>=0;j--) te.push(P(list[j][2],sign*list[j][0]));
      stroke(0,le.concat(te),op,true);
    }
    for(var si=0;si<2;si++){
      var s=si===0?1:-1;
      planform(WING,s,.9);
      planform(CANARD,s,.84);
      var sl=[],hi=[];
      for(var z=1.20;z<=5.10;z+=.5){ var c=chordAt(WING,z);
        sl.push(P(c[0]-(c[0]-c[1])*.10,s*z)); hi.push(P(c[1]+(c[0]-c[1])*.12,s*z)); }
      stroke(0,sl,.40); stroke(0,hi,.44);
      var cm=chordAt(WING,3.20);
      stroke(0,[P(cm[1],s*3.20),P(cm[1]+(cm[0]-cm[1])*.12,s*3.20)],.40);
      var it=[];
      for(var i2=0;i2<INTAKE.length;i2++) it.push(P(INTAKE[i2][0],s*(IN_Z+INTAKE[i2][1])));
      for(var j2=INTAKE.length-1;j2>=0;j2--) it.push(P(INTAKE[j2][0],s*(IN_Z-INTAKE[j2][1]*.55)));
      stroke(0,it,.62,true);
      stroke(0,[P(.30,s*1.96),P(-1.30,s*1.96),P(-1.30,s*2.14),P(.30,s*2.14)],.34,true);
      var tt=[],tb=[];
      for(var t2=0;t2<TANK.length;t2++){ tt.push(P(TANK[t2][0],s*TANK_Z+TANK[t2][1]));
        tb.push(P(TANK[t2][0],s*TANK_Z-TANK[t2][1])); }
      stroke(0,tt.concat(tb.slice().reverse()),.60,true);
      stroke(0,[P(.10,s*(TANK_Z-.09)),P(-1.60,s*(TANK_Z-.09)),
                P(-1.60,s*(TANK_Z+.09)),P(.10,s*(TANK_Z+.09))],.38,true);
      stroke(0,[P(-3.90,s*5.36),P(-5.60,s*5.36)],.5);          // wingtip rail
      var mt=[],mb=[];
      for(var m2=0;m2<MSL.length;m2++){ mt.push(P(MSL[m2][0],s*MSL_Z+MSL[m2][1]));
        mb.push(P(MSL[m2][0],s*MSL_Z-MSL[m2][1])); }
      stroke(0,mt.concat(mb.slice().reverse()),.55,true);
      stroke(0,[P(-1.10,s*.16),P(-2.55,s*.16),P(-2.55,s*.60),P(-1.10,s*.60)],.34,true);
      stroke(0,[P(.45,s*.30),P(-1.40,s*.30),P(-1.40,s*.72),P(.45,s*.72)],.30,true);
      var nz=[];
      for(var k2=0;k2<=22;k2++){ var a=k2/22*Math.PI*2;
        nz.push(P(-7.2+Math.cos(a)*.75,s*0.52+Math.sin(a)*.40)); }
      stroke(0,nz,.44);
    }

    stroke(0,[P(3.55,.20),P(2.15,.20),P(2.15,-.20),P(3.55,-.20)],.30,true);   // nose gear door
    stroke(0,[P(6.30,.34),P(7.36,.44)],.55);                   // refuelling probe
    var os=[];
    for(var o2=0;o2<=14;o2++){ var b=o2/14*Math.PI*2;
      os.push(P(5.20+Math.cos(b)*.085,-.24+Math.sin(b)*.085)); }
    stroke(0,os,.45);                                          // OSF sensor
    stroke(0,[P(8.9,0),P(-9.0,0)],.16);                        // centreline
    stroke(0,[P(7.70,7.6),P(-7.85,7.6)],.34);
    stroke(0,[P(7.70,7.3),P(7.70,7.9)],.34);
    stroke(0,[P(-7.85,7.3),P(-7.85,7.9)],.34);
  })();

  var views=[[],[]];
  strokes.forEach(function(s){ views[s.view].push(s); });
  views.forEach(function(list){
    var tot=0; list.forEach(function(s){ tot+=s.n; });
    list.forEach(function(s){ s.share=s.n/tot; });
  });
  function drawView(i,p){
    var list=views[i], budget=p, head=null;
    for(var k=0;k<list.length;k++){
      var s=list[k], f=cl(budget/s.share), cnt=Math.round(f*s.n);
      s.obj.geometry.setDrawRange(0,cnt); s.obj.visible=cnt>1;
      if(f>0&&f<1) head=s.pts[Math.max(0,cnt-1)];
      budget-=s.share;
    }
    return head;
  }
  function viewOpacity(i,o){
    views[i].forEach(function(s){ s.obj.material.opacity=s.obj.material.userData.base*o; });
  }
  drawView(1,1);

  // ======================================================================
  //  B.  THE MODEL — dark shell + dense line work. No paint: a light sweep
  //      inks the drawing, turning construction lines into finished ones.
  // ======================================================================
  var surfMats=[], lineMats=[];
  function surface(baseHex,rimK,gloss){
    var m=new THREE.ShaderMaterial({
      uniforms:{ uBase:{value:new THREE.Color(baseHex)}, uRim:{value:new THREE.Color(0xd8d7d1)},
        uFog:{value:new THREE.Color(VOID)}, uNear:{value:30}, uFar:{value:110},
        uSweep:{value:9999}, uBuild:{value:-9999},
        uRimK:{value:rimK}, uGloss:{value:gloss}, uDim:{value:1} },
      vertexShader:['varying vec3 vN,vV; varying float vD,vLX;',
        'void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0);',
        ' vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); vD=-mv.z; vLX=position.x;',
        ' gl_Position=projectionMatrix*mv; }'].join('\n'),
      fragmentShader:['uniform vec3 uBase,uRim,uFog;',
        'uniform float uNear,uFar,uSweep,uBuild,uRimK,uGloss,uDim;',
        'varying vec3 vN,vV; varying float vD,vLX;','void main(){',
        ' if(vLX<uBuild) discard;',
        ' vec3 N=normalize(vN),V=normalize(vV);',
        ' vec3 L=normalize(vec3(0.34,0.78,0.52)), L2=normalize(vec3(-0.70,0.14,-0.50));',
        ' float f=pow(1.0-clamp(dot(N,V),0.0,1.0),2.4);',
        ' float diff=max(dot(N,L),0.0)*0.16, fill=max(dot(N,L2),0.0)*0.07;',
        ' float spec=pow(max(dot(reflect(-L,N),V),0.0),40.0)*uGloss;',
        ' vec3 col=uBase+uRim*(f*0.62*uRimK+diff+fill+spec);',
        ' col+=vec3(0.90,0.90,0.86)*exp(-pow((vLX-uSweep)*1.15,2.0))*0.40;',
        ' col+=vec3(0.96,0.96,0.92)*exp(-pow((vLX-uBuild)*2.1,2.0))*0.95;',
        ' col*=uDim;',
        ' col=mix(col,uFog,smoothstep(uNear,uFar,vD));',
        ' gl_FragColor=vec4(col,1.0); }'].join('\n'),
      polygonOffset:true, polygonOffsetFactor:2, polygonOffsetUnits:2
    });
    surfMats.push(m); return m;
  }
  function lineMat(baseOp){
    var m=new THREE.ShaderMaterial({
      uniforms:{ uOp:{value:baseOp}, uSweep:{value:9999}, uBuild:{value:-9999}, uDim:{value:1},
        uCol:{value:new THREE.Color(0xecebe6)}, uFog:{value:new THREE.Color(VOID)},
        uNear:{value:30}, uFar:{value:110} },
      vertexShader:['varying float vLX,vD;','void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0);',
        ' vLX=position.x; vD=-mv.z; gl_Position=projectionMatrix*mv; }'].join('\n'),
      fragmentShader:['uniform float uOp,uSweep,uBuild,uDim,uNear,uFar; uniform vec3 uCol,uFog;',
        'varying float vLX,vD;','void main(){',
        ' if(vLX<uBuild) discard;',
        ' float inked=smoothstep(uSweep-0.35,uSweep+1.7,vLX);',
        ' float band=exp(-pow((vLX-uSweep)*1.25,2.0));',
        ' float a=uOp*(0.40+0.60*inked)+band*0.55+exp(-pow((vLX-uBuild)*1.9,2.0))*0.75;',
        ' float fg=smoothstep(uNear,uFar,vD);',
        ' gl_FragColor=vec4(mix(uCol+vec3(band*0.8),uFog,fg), a*uDim*(1.0-fg*0.85)); }'].join('\n'),
      transparent:true, depthWrite:false
    });
    m.userData.base=baseOp; lineMats.push(m); return m;
  }
  var matBody=surface(0x101015,1.00,.55), matDark=surface(0x0b0b0f,1.25,.70),
      matStore=surface(0x0d0d12,1.15,.62);

  var glassMat=new THREE.ShaderMaterial({
    uniforms:{ uRim:{value:new THREE.Color(0xd8d7d1)}, uFog:{value:new THREE.Color(VOID)},
      uNear:{value:30}, uFar:{value:110}, uSweep:{value:9999}, uBuild:{value:-9999}, uDim:{value:1} },
    vertexShader:['varying vec3 vN,vV; varying float vD,vLX;',
      'void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0);',
      ' vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); vD=-mv.z; vLX=position.x;',
      ' gl_Position=projectionMatrix*mv; }'].join('\n'),
    fragmentShader:['uniform vec3 uRim,uFog; uniform float uNear,uFar,uSweep,uBuild,uDim;',
      'varying vec3 vN,vV; varying float vD,vLX;','void main(){',
      ' if(vLX<uBuild) discard;',
      ' vec3 N=normalize(vN),V=normalize(vV);',
      ' float f=pow(1.0-clamp(dot(N,V),0.0,1.0),2.2);',
      ' float band=exp(-pow((vLX-uSweep)*1.15,2.0));',
      ' vec3 col=uRim*(f*0.50)+vec3(0.018)+vec3(0.9,0.9,0.86)*band*0.35;',
      ' gl_FragColor=vec4(col*uDim,(0.30+0.55*f+band*0.3)*uDim); }'].join('\n'),
    transparent:true, depthWrite:false, side:THREE.DoubleSide
  });
  surfMats.push(glassMat);

  var plane=new THREE.Group(); scene.add(plane);
  var parts=[];
  function addPart(geos,mat,fine,fineOp){
    var meshes=[],lines=[];
    for(var i=0;i<geos.length;i++){
      if(geos[i]){
        var mesh=new THREE.Mesh(geos[i],mat); plane.add(mesh); meshes.push(mesh);
        var e=new THREE.LineSegments(new THREE.EdgesGeometry(geos[i],24),lineMat(.92));
        plane.add(e); lines.push(e);
      }
    }
    if(fine&&fine.length){
      var d=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(fine),
        lineMat(fineOp===undefined?.26:fineOp));
      plane.add(d); lines.push(d);
    }
    parts.push({meshes:meshes,lines:lines}); return parts.length-1;
  }
  function linesOnly(pts,op){
    var d=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),lineMat(op));
    plane.add(d); parts.push({meshes:[],lines:[d]}); return parts.length-1;
  }
  function loft(secs){
    var rows=secs.length, cols=secs[0].length, pos=[], idx=[];
    for(var i=0;i<rows;i++) for(var j=0;j<cols;j++){ var v=secs[i][j]; pos.push(v.x,v.y,v.z); }
    for(var a=0;a<rows-1;a++) for(var b=0;b<cols;b++){
      var b2=(b+1)%cols, p0=a*cols+b, p1=a*cols+b2, p2=(a+1)*cols+b, p3=(a+1)*cols+b2;
      idx.push(p0,p2,p1, p1,p2,p3); }
    var g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  function bodySection(x,w,h,cy,e,n){
    var pts=[];
    for(var i=0;i<n;i++){
      var t=i/n*Math.PI*2, c=Math.cos(t), s=Math.sin(t);
      var yy=(s<0?-1:1)*Math.pow(Math.abs(s),2/e)*h*(s<0?.80:1);
      var zz=(c<0?-1:1)*Math.pow(Math.abs(c),2/e)*w;
      pts.push(V(x,cy+yy,zz));
    }
    return pts;
  }
  function bodyPt(x,ang,k){
    var f=fusAt(x), c=Math.cos(ang), s=Math.sin(ang), e=f[3]; k=k||1.006;
    var yy=(s<0?-1:1)*Math.pow(Math.abs(s),2/e)*f[1]*(s<0?.80:1);
    var zz=(c<0?-1:1)*Math.pow(Math.abs(c),2/e)*f[0];
    return V(x,f[2]+yy*k,zz*k);
  }
  function foil(z,xLE,xTE,y,thickFrac,n){
    var ch=xLE-xTE, pts=[];
    for(var i=0;i<=n;i++){ var t=i/n;
      pts.push(V(xLE-ch*t,y+ch*thickFrac*Math.sin(Math.PI*Math.pow(t,.62))*.5,z)); }
    for(var j=n-1;j>0;j--){ var u=j/n;
      pts.push(V(xLE-ch*u,y-ch*thickFrac*Math.sin(Math.PI*Math.pow(u,.62))*.5,z)); }
    return pts;
  }
  function tubeX(prof,cy,cz,segs){
    var secs=[];
    for(var i=0;i<prof.length;i++){
      var r=[];
      for(var j=0;j<segs;j++){ var t=j/segs*Math.PI*2;
        r.push(V(prof[i][0],cy+Math.sin(t)*prof[i][1],cz+Math.cos(t)*prof[i][1])); }
      secs.push(r);
    }
    return loft(secs);
  }
  function edgePts(geo){
    var e=new THREE.EdgesGeometry(geo,24), a=e.attributes.position, out=[];
    for(var i=0;i<a.count;i++) out.push(V(a.getX(i),a.getY(i),a.getZ(i)));
    return out;
  }
  function box(w,h,d,x,y,z){ var g=new THREE.BoxGeometry(w,h,d); g.translate(x,y,z); return g; }
  function seg(a,p,q){ a.push(p); a.push(q); }
  function ringPts(a,pts){ for(var i=0;i<pts.length;i++){ a.push(pts[i].clone()); a.push(pts[(i+1)%pts.length].clone()); } }
  // a seam running along the body surface between two stations
  function surfLine(a,x0,x1,a0,a1,n,k){
    var prev=null;
    for(var i=0;i<=n;i++){ var t=i/n, p=bodyPt(lerp(x0,x1,t),lerp(a0,a1,t),k);
      if(prev) seg(a,prev,p); prev=p; }
  }
  // a rectangular access panel lying on the body surface
  function surfPanel(a,x0,x1,a0,a1,k){
    surfLine(a,x0,x1,a0,a0,7,k); surfLine(a,x1,x1,a0,a1,5,k);
    surfLine(a,x1,x0,a1,a1,7,k); surfLine(a,x0,x0,a1,a0,5,k);
  }
  // a row of fasteners along a seam
  function dashRow(a,x0,x1,ang,count,len,k){
    for(var i=0;i<count;i++){ var x=lerp(x0,x1,i/(count-1));
      seg(a,bodyPt(x,ang-len,k),bodyPt(x,ang+len,k)); }
  }

  var IDX={};

  (function fuselage(){
    var secs=[], frames=[], fine=[], N=34, STA=36;
    for(var i=0;i<=STA;i++){
      var x=lerp(7.70,-7.85,i/STA), f=fusAt(x);
      secs.push(bodySection(x,f[0],f[1],f[2],f[3],N));
    }
    for(var j=0;j<FUS.length;j++){                                  // structural frames
      var g=fusAt(FUS[j][0]);
      ringPts(frames,bodySection(FUS[j][0],g[0],g[1],g[2],g[3],N));
    }
    for(var m=0;m<N;m+=2)                                           // stringers
      for(var n=0;n<STA;n++){ frames.push(secs[n][m].clone()); frames.push(secs[n+1][m].clone()); }
    // skin seams, access panels and fastener rows
    surfLine(fine,6.60,-6.60,Math.PI/2,Math.PI/2,40);               // spine
    surfLine(fine,6.20,-6.80,0,0,40); surfLine(fine,6.20,-6.80,Math.PI,Math.PI,40);
    surfLine(fine,5.00,-6.40,-Math.PI/2,-Math.PI/2,34);             // keel
    dashRow(fine,6.30,-6.40,Math.PI/2,30,.10);
    dashRow(fine,6.00,-6.60,0,28,.09); dashRow(fine,6.00,-6.60,Math.PI,28,.09);
    surfPanel(fine,5.90,4.70,.55,1.15); surfPanel(fine,4.55,3.60,.55,1.15);
    surfPanel(fine,-.30,-1.70,1.15,2.00); surfPanel(fine,-2.00,-3.40,1.15,2.00);
    surfPanel(fine,1.10,-.20,-.55,-1.15); surfPanel(fine,-.40,-1.80,-.55,-1.15);
    surfPanel(fine,-1.10,-2.55,1.30,1.84);                          // airbrake, port
    surfPanel(fine,-1.10,-2.55,1.30+Math.PI/2,1.84+Math.PI/2);
    surfPanel(fine,3.55,2.15,-1.35,-1.79);                          // nose gear door
    surfPanel(fine,.45,-1.40,-1.10,-1.60); surfPanel(fine,.45,-1.40,-1.54,-2.04);
    for(var s=0;s<8;s++) surfLine(fine,lerp(5.6,-5.6,s/7),lerp(5.6,-5.6,s/7),0.35,Math.PI-0.35,12);
    IDX.fus=addPart([loft(secs)],matBody,frames.concat(fine),.24);
  })();

  (function intakes(){
    var gs=[], fine=[];
    for(var s=-1;s<=1;s+=2){
      var secs=[];
      for(var i=0;i<INTAKE.length;i++){
        var r=[], cz=s*IN_Z, w=INTAKE[i][1], h=INTAKE[i][2];
        for(var j=0;j<24;j++){
          var t=j/24*Math.PI*2, c=Math.cos(t), sn=Math.sin(t);
          r.push(V(INTAKE[i][0],IN_Y+sn*h,cz+c*(s*c>0?w:w*.55)));    // D-section, flat inboard
        }
        secs.push(r); if(i<3) ringPts(fine,r);                       // lip rings
      }
      gs.push(loft(secs));
    }
    IDX.intakes=addPart(gs,matDark,fine,.30);
  })();

  (function cockpit(){
    // the canopy keeps a light glaze so the office reads as an interior,
    // not as boxes sitting in the open
    var glaze=[], secs=[];
    for(var i=0;i<CANOPY.length;i++){
      var c=CANOPY[i], f=fusAt(c[0]), base=f[2]+f[1], half=[], ring=[];
      for(var j=0;j<=18;j++){ var t=j/18*Math.PI;
        half.push(V(c[0],base+Math.sin(t)*c[2],Math.cos(t)*c[1])); }
      for(var k=0;k<half.length-1;k++) seg(glaze,half[k],half[k+1]);
      for(var m=0;m<24;m++){ var u=m/24*Math.PI*2;
        ring.push(V(c[0],base+Math.max(0,Math.sin(u))*c[2]-Math.max(0,-Math.sin(u))*.05,
                    Math.cos(u)*c[1])); }
      secs.push(ring);
    }
    for(var a=1;a<8;a++){
      var prev=null;
      for(var b=0;b<CANOPY.length;b++){
        var c2=CANOPY[b], f2=fusAt(c2[0]), base2=f2[2]+f2[1], t2=a/8*Math.PI;
        var q=V(c2[0],base2+Math.sin(t2)*c2[2],Math.cos(t2)*c2[1]);
        if(prev) seg(glaze,prev,q); prev=q;
      }
    }
    var gm=new THREE.Mesh(loft(secs),glassMat); gm.renderOrder=12; plane.add(gm);
    var gl=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(glaze),lineMat(.30));
    plane.add(gl);
    parts.push({meshes:[gm],lines:[gl]}); IDX.canopy=parts.length-1;

    // sunk into the fuselage and drawn in outline only: a hint, not furniture
    var f3=fusAt(3.20), deck=f3[2]+f3[1]-.58, pts=[];
    var gs=[box(.46,.07,.52,3.02,deck+.04,0),      // seat pan
            box(.11,.50,.48,2.68,deck+.27,0),      // backrest
            box(.19,.13,.40,2.58,deck+.58,0),      // head box
            box(.24,.16,.58,4.18,deck+.30,0),      // coaming
            box(.04,.22,.44,4.02,deck+.50,0)];     // HUD combiner
    for(var g=0;g<gs.length;g++) pts=pts.concat(edgePts(gs[g]));
    IDX.office=linesOnly(pts,.20);
  })();

  var canardGrp=[];
  (function canards(){
    // the geometry stays in aircraft coordinates (the shaders gate on
    // position.x) — the pivot is done by offsetting the mesh inside a group
    var hinge=V(4.20,.30,0);
    for(var sgn=-1;sgn<=1;sgn+=2){
      var secs=[], fine=[];
      for(var i=0;i<CANARD.length;i++)
        secs.push(foil(sgn*CANARD[i][0],CANARD[i][1],CANARD[i][2],.30,.060,16));
      for(var r=0;r<secs.length;r++) ringPts(fine,secs[r]);
      if(sgn<0) secs.reverse();
      var geo=loft(secs);
      var grp=new THREE.Group(); grp.position.copy(hinge); plane.add(grp);
      var mesh=new THREE.Mesh(geo,matBody); mesh.position.copy(hinge).negate(); grp.add(mesh);
      var e=new THREE.LineSegments(new THREE.EdgesGeometry(geo,24),lineMat(.92));
      e.position.copy(mesh.position); grp.add(e);
      var d=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(fine),lineMat(.22));
      d.position.copy(mesh.position); grp.add(d);
      parts.push({meshes:[mesh],lines:[e,d]});
      canardGrp.push(grp);
    }
    IDX.canards=parts.length-1;
  })();

  var brakeGrp=null;
  (function airbrakes(){
    var hinge=V(-1.10,.69,0), gs=[box(1.42,.05,.44,-1.83,.69,.39),box(1.42,.05,.44,-1.83,.69,-.39)];
    var grp=new THREE.Group(); grp.position.copy(hinge); plane.add(grp);
    var meshes=[],lines=[];
    for(var i=0;i<gs.length;i++){
      var m=new THREE.Mesh(gs[i],matDark); m.position.copy(hinge).negate(); grp.add(m); meshes.push(m);
      var e=new THREE.LineSegments(new THREE.EdgesGeometry(gs[i],24),lineMat(.85));
      e.position.copy(m.position); grp.add(e); lines.push(e);
    }
    parts.push({meshes:meshes,lines:lines});
    brakeGrp=grp;
  })();

  (function wing(){
    var gs=[], fine=[];
    for(var s=-1;s<=1;s+=2){
      var secs=[];
      for(var i=0;i<WING.length;i++)
        secs.push(foil(s*WING[i][0],WING[i][1],WING[i][2],-.10-(WING[i][0]-.95)*.046,.040,22));
      for(var r=0;r<secs.length;r++) ringPts(fine,secs[r]);           // ribs
      var slatP=null,hingeP=null,splitDone=false;
      for(var z=1.10;z<=5.25;z+=.30){
        var c=chordAt(WING,z), y=-.10-(z-.95)*.046, ch=c[0]-c[1];
        var sl=V(c[0]-ch*.10,y,s*z), hi=V(c[1]+ch*.12,y,s*z);
        if(slatP){ seg(fine,slatP,sl); seg(fine,hingeP,hi); }
        slatP=sl; hingeP=hi;
        if(!splitDone&&z>=3.20){ seg(fine,V(c[1],y,s*z),hi); splitDone=true; }
      }
      for(var d=0;d<5;d++){                                          // static dischargers
        var zz=1.6+d*.85, cc=chordAt(WING,zz), yy=-.10-(zz-.95)*.046;
        seg(fine,V(cc[1],yy,s*zz),V(cc[1]-.30,yy+.04,s*zz));
      }
      if(s<0) secs.reverse();
      gs.push(loft(secs));
    }
    IDX.wing=addPart(gs,matBody,fine,.24);
  })();

  (function fin(){
    var secs=[], fine=[];
    for(var i=0;i<FIN.length;i++){
      var pts=foil(0,FIN[i][1],FIN[i][2],0,.058,16), r=[];
      for(var j=0;j<pts.length;j++) r.push(V(pts[j].x,FIN[i][0],pts[j].y));
      secs.push(r); ringPts(fine,r);
    }
    seg(fine,V(-5.75,.80,0),V(-6.05,3.05,0));                        // rudder hinge
    for(var d=0;d<3;d++){ var y=1.1+d*.85;
      seg(fine,V(-6.90+d*.06,y,0),V(-7.22+d*.06,y+.04,0)); }
    var pod=tubeX([[-4.60,.03],[-4.95,.11],[-6.20,.12],[-6.55,.04]],3.12,0,12);
    IDX.fin=addPart([loft(secs),pod],matBody,fine,.24);
  })();

  (function nozzles(){
    var gs=[], fine=[];
    for(var s=-1;s<=1;s+=2){
      var secs=[];
      for(var i=0;i<NOZZLE.length;i++){
        var r=[];
        for(var j=0;j<24;j++){ var t=j/24*Math.PI*2;
          r.push(V(NOZZLE[i][0],.02+Math.sin(t)*NOZZLE[i][1],s*.52+Math.cos(t)*NOZZLE[i][1])); }
        secs.push(r); ringPts(fine,r);
      }
      for(var p=0;p<16;p++){                                         // convergent petals
        var t2=p/16*Math.PI*2;
        seg(fine,V(-7.05,.02+Math.sin(t2)*.41,s*.52+Math.cos(t2)*.41),
                 V(-7.95,.02+Math.sin(t2)*.37,s*.52+Math.cos(t2)*.37));
      }
      gs.push(loft(secs));
    }
    IDX.nozzles=addPart(gs,matDark,fine,.30);
  })();

  (function stores(){
    var gs=[], fine=[];
    for(var s=-1;s<=1;s+=2){
      gs.push(tubeX(TANK,TANK_Y,s*TANK_Z,16));                       // drop tank
      gs.push(box(1.70,.34,.16,-.75,-.46,s*TANK_Z));                 // outer pylon
      gs.push(box(1.60,.30,.16,-.50,-.36,s*2.05));                   // inner pylon
      gs.push(tubeX(MSL,MSL_Y,s*MSL_Z,14));                          // wingtip missile
      for(var q=0;q<4;q++){                                          // missile fins
        var a=q*Math.PI/2+Math.PI/4, cy=Math.sin(a), cz=Math.cos(a);
        seg(fine,V(-5.80,MSL_Y+cy*.09,s*MSL_Z+cz*.09),V(-6.30,MSL_Y+cy*.34,s*MSL_Z+cz*.34));
        seg(fine,V(-6.30,MSL_Y+cy*.34,s*MSL_Z+cz*.34),V(-6.30,MSL_Y+cy*.09,s*MSL_Z+cz*.09));
        seg(fine,V(-3.80,MSL_Y+cy*.09,s*MSL_Z+cz*.09),V(-4.10,MSL_Y+cy*.24,s*MSL_Z+cz*.24));
        seg(fine,V(-4.10,MSL_Y+cy*.24,s*MSL_Z+cz*.24),V(-4.35,MSL_Y+cy*.09,s*MSL_Z+cz*.09));
      }
      for(var b=0;b<4;b++){                                          // tank strakes
        var bx=lerp(-.20,-2.60,b/3);
        seg(fine,V(bx,TANK_Y+.40,s*TANK_Z),V(bx,TANK_Y-.40,s*TANK_Z));
      }
      seg(fine,V(-3.85,-.30,s*5.36),V(-5.65,-.30,s*5.36));           // rail
    }
    IDX.stores=addPart(gs,matStore,fine,.28);
  })();

  (function sensors(){
    var gs=[];
    // a slimmer probe and a single flush sensor: the IRST and the gun port
    // only read as clutter at this scale
    gs.push(tubeX([[6.30,.034],[6.75,.044],[7.20,.034],[7.40,.018]],.24,.34,10));
    gs.push(tubeX([[5.42,.03],[5.30,.085],[5.10,.085],[4.98,.04]],.30,-.24,14));
    gs.push(box(.46,.22,.05,-3.10,.78,0));                                          // spine blade
    IDX.sensors=addPart(gs,matDark,null);
  })();

  // Nothing is revealed by draw order any more: every part is live from the
  // start and the shader gate decides what exists, so the build reads as one
  // continuous front travelling down the aircraft.
  function showAll(){
    for(var i=0;i<parts.length;i++){
      var p=parts[i];
      for(var j=0;j<p.lines.length;j++){ p.lines[j].geometry.setDrawRange(0,Infinity); p.lines[j].visible=true; }
      for(var m=0;m<p.meshes.length;m++) p.meshes[m].visible=true;
    }
  }
  showAll();
  function setSurf(n,v){ for(var i=0;i<surfMats.length;i++) if(surfMats[i].uniforms[n]) surfMats[i].uniforms[n].value=v; }
  function setLines(n,v){ for(var j=0;j<lineMats.length;j++) if(lineMats[j].uniforms[n]) lineMats[j].uniforms[n].value=v; }
  function setAll(n,v){ setSurf(n,v); setLines(n,v); }

  var dust;
  (function(){
    var n=900,pos=new Float32Array(n*3);
    for(var i=0;i<n;i++){ var r=14+Math.random()*60,th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1);
      pos[i*3]=r*Math.sin(ph)*Math.cos(th); pos[i*3+1]=r*Math.cos(ph)*.7; pos[i*3+2]=r*Math.sin(ph)*Math.sin(th); }
    var g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    dust=new THREE.Points(g,new THREE.PointsMaterial({color:0xaeb2b6,size:.14,sizeAttenuation:true,
      transparent:true,opacity:0,fog:true,depthWrite:false}));
    scene.add(dust);
  })();

  // ======================================================================
  //  C.  THE CUT
  // ======================================================================
  var SHOTS=[
    { id:'draw', p:[0,.50], label:'Pl. 01 — Plan',    dur:1.90, cut:false,
      hh:[7.8,7.3], fov:[24,24], az:[ .04,-.01], el:[1.44,1.39], lead:.12, tau:.42 },
    { id:'draw', p:[.50,1], label:'Pl. 01 — Tracé',   dur:2.10, cut:false,
      hh:[5.4,6.6], fov:[24,25], az:[-.01, .06], el:[1.37,1.32], lead:.38, tau:.38 },
    { id:'lift',            label:'Envol',            dur:3.50, cut:false,
      hh:[6.4,9.2], fov:[25,32], az:[ .10, .42], el:[1.30, .30], lead:0,   tau:.055 },
    { id:'finish',          label:'Mise au net',      dur:1.70, cut:false,
      hh:[9.2,8.8], fov:[32,33], az:[ .42, .80], el:[ .30, .40], lead:0,   tau:.055 },
    // hard-cut inserts: each one snaps, punches in and settles
    { id:'beat', label:'Radome',       dur:.78, cut:true, aim:[5.85,.16,.10], roll:-.07,
      hh:[1.45,1.75], fov:[30,30], az:[1.02,1.30], el:[ .14, .26], tau:.05 },
    { id:'beat', label:"Entrée d'air", dur:.70, cut:true, aim:[1.70,-.05,1.45], roll:.06,
      hh:[2.05,2.45], fov:[32,32], az:[2.26,2.00], el:[ .30, .16], tau:.05 },
    { id:'beat', label:'Voilure',      dur:.74, cut:true, aim:[-3.40,-.20,3.30], roll:-.05,
      hh:[2.60,3.05], fov:[30,30], az:[ .58, .30], el:[ .72, .50], tau:.05 },
    { id:'beat', label:'Tuyères',      dur:.70, cut:true, aim:[-7.10,.02,0], roll:.07,
      hh:[1.55,1.90], fov:[32,32], az:[3.32,3.04], el:[ .18, .30], tau:.05 },
    { id:'beat', label:'Verrière',     dur:.74, cut:true, aim:[3.20,.66,0], roll:-.04,
      hh:[1.75,2.05], fov:[30,30], az:[1.82,1.54], el:[ .42, .26], tau:.05 },
    { id:'name',            label:'Ranked Lobby',     dur:5.40, cut:true,
      hh:[12.2,13.0],fov:[30,29],az:[2.15,2.48], el:[ .36, .44], lead:0,   tau:.055 }
  ];
  var starts=[], SEQ=0;
  for(var i=0;i<SHOTS.length;i++){ starts[i]=SEQ; SEQ+=SHOTS[i].dur; }
  var HOLD=3.4;                       // the lockup breathes, then hands over
  var LIFT=2, FINISH=3, BEAT0=4, NAME=SHOTS.length-1;

  var rig={aim:V(0,0,0),hh:7.8,az:.04,el:1.44,fov:24}, rigReady=false, buildFront=0;
  var entering=-1, enterPush=0, enterFlash=0, handedOver=false, running=true;
  var focus=V(0,0,0), focusReady=false;
  var aimTarget=V(0,0,0), tmpV=V(0,0,0), upV=V(0,1,0);
  var tmx=0,tmy=0,mx=0,my=0;
  onMove=function(e){ tmx=(e.clientX/window.innerWidth)-.5; tmy=(e.clientY/window.innerHeight)-.5; };
  window.addEventListener('pointermove',onMove);

  var VW=1,VH=1,fitW=1;
  function resize(){
    VW=Math.max(1,host.clientWidth); VH=Math.max(1,host.clientHeight);
    renderer.setSize(VW,VH,false); camera.aspect=VW/VH;
    fitW=Math.min(1.9,Math.max(1,1.30/camera.aspect)); }
  onResize=resize; window.addEventListener('resize',onResize); resize();

  function shotAt(x){ for(var i=SHOTS.length-1;i>=0;i--) if(x>=starts[i]) return i; return 0; }
  function approach(c,t,tau,dt){ return c+(t-c)*(1-Math.exp(-dt/tau)); }

  function place(si,k,t,dt,head,sinceCut){
    var s=SHOTS[si], e=(s.id==='lift')?eInOutQuint(k):eOutExpo(Math.min(1,k*1.2));
    if(s.aim){                       // inserts frame a point ON the aircraft,
      plane.updateMatrixWorld();     // so the aim rides its bank
      aimTarget.set(s.aim[0],s.aim[1],s.aim[2]).applyMatrix4(plane.matrixWorld);
    } else {
      aimTarget.set(0,0,0);
      if(focusReady&&s.lead>0) aimTarget.lerp(focus,s.lead);
      if(si>=LIFT) aimTarget.set(0,si===LIFT?lerp(0,2.2,e):2.2,0);
      if(s.id==='lift') aimTarget.x=buildFront*.22*Math.sin(Math.PI*k);
    }
    var hh=lerp(s.hh[0],s.hh[1],e)*(si<LIFT?fitW:lerp(fitW,1,si===LIFT?e:1));
    // each cut lands tight and opens out — the punch that makes an edit read
    if(s.cut) hh*=1-.09*(1-eOutExpo(Math.min(1,sinceCut/.34)));
    hh*=1-.42*enterPush;                 // pressing Entrer drives the camera in
    var dr=(s.id==='draw')?.35:1;
    var az=lerp(s.az[0],s.az[1],e)+Math.sin(t*.19)*.012*dr;
    var el=lerp(s.el[0],s.el[1],e)+Math.sin(t*.16+1.1)*.005*dr;
    var fov=lerp(s.fov[0],s.fov[1],e);
    var tau=s.tau;
    if(!rigReady){ rig.aim.copy(aimTarget); rig.hh=hh; rig.az=az; rig.el=el; rig.fov=fov; rigReady=true; }
    rig.aim.x=approach(rig.aim.x,aimTarget.x,tau,dt);
    rig.aim.y=approach(rig.aim.y,aimTarget.y,tau,dt);
    rig.aim.z=approach(rig.aim.z,aimTarget.z,tau,dt);
    rig.hh=approach(rig.hh,hh,tau,dt); rig.az=approach(rig.az,az,tau,dt);
    rig.el=approach(rig.el,el,tau,dt); rig.fov=approach(rig.fov,fov,tau,dt);

    var dist=rig.hh/Math.tan(rig.fov*Math.PI/360);
    camera.fov=rig.fov; camera.updateProjectionMatrix();
    camera.position.set(rig.aim.x+Math.sin(rig.az)*Math.cos(rig.el)*dist,
                        rig.aim.y+Math.sin(rig.el)*dist,
                        rig.aim.z+Math.cos(rig.az)*Math.cos(rig.el)*dist);
    var w=cl((rig.el-1.02)/.40);
    upV.set(-Math.sin(rig.az)*w,1-w,-Math.cos(rig.az)*w);
    if(upV.lengthSq()<1e-6) upV.set(0,1,0);
    camera.up.copy(upV.normalize());
    camera.lookAt(rig.aim);
    if(s.roll) camera.rotateZ(s.roll*(1-e*.55));

    mx+=(tmx-mx)*.055; my+=(tmy-my)*.055;
    var fx=(si===NAME)?-.22:0;
    var shake=s.cut?Math.max(0,1-sinceCut/.26):0;
    camera.translateX(rig.hh*camera.aspect*fx+mx*rig.hh*.10+Math.sin(t*57)*shake*rig.hh*.016);
    camera.translateY(-my*rig.hh*.07+Math.sin(t*43+2)*shake*rig.hh*.016);

    lamp.set(rig.aim.x,rig.aim.z);
    var near=dist*(s.id==='beat'?.42:.45), far=dist*(s.id==='beat'?2.2:3.2);
    scene.fog.near=near; scene.fog.far=far;
    setAll('uNear',near); setAll('uFar',far);
  }

  // ======================================================================
  //  C2.  POST — bloom, chromatic aberration, vignette and grain.
  //  Hand-rolled so it stays one file and one dependency.
  // ======================================================================
  var NL=String.fromCharCode(10);
  var quadScene=new THREE.Scene(), quadCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  var quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2)); quadScene.add(quad);
  var VS=['varying vec2 vUv;','void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }'].join(NL);

  var brightMat=new THREE.ShaderMaterial({
    uniforms:{ tDiffuse:{value:null}, uThresh:{value:.58} }, vertexShader:VS,
    fragmentShader:['uniform sampler2D tDiffuse; uniform float uThresh; varying vec2 vUv;',
      'void main(){ vec3 c=texture2D(tDiffuse,vUv).rgb;',
      ' float l=max(max(c.r,c.g),c.b);',
      ' gl_FragColor=vec4(c*smoothstep(uThresh,uThresh+0.30,l),1.0); }'].join(NL) });

  var blurMat=new THREE.ShaderMaterial({
    uniforms:{ tDiffuse:{value:null}, uDir:{value:new THREE.Vector2()} }, vertexShader:VS,
    fragmentShader:['uniform sampler2D tDiffuse; uniform vec2 uDir; varying vec2 vUv;',
      'void main(){ vec3 s=texture2D(tDiffuse,vUv).rgb*0.2270;',
      ' s+=(texture2D(tDiffuse,vUv+uDir*1.3846).rgb+texture2D(tDiffuse,vUv-uDir*1.3846).rgb)*0.3162;',
      ' s+=(texture2D(tDiffuse,vUv+uDir*3.2308).rgb+texture2D(tDiffuse,vUv-uDir*3.2308).rgb)*0.0703;',
      ' gl_FragColor=vec4(s,1.0); }'].join(NL) });

  var compMat=new THREE.ShaderMaterial({
    uniforms:{ tBase:{value:null}, tB1:{value:null}, tB2:{value:null},
      uRes:{value:new THREE.Vector2(1,1)}, uTime:{value:0},
      uBloom:{value:.58}, uCA:{value:.0009}, uVig:{value:.95}, uGrain:{value:.038} },
    vertexShader:VS,
    fragmentShader:['uniform sampler2D tBase,tB1,tB2; uniform vec2 uRes;',
      'uniform float uTime,uBloom,uCA,uVig,uGrain; varying vec2 vUv;',
      'void main(){',
      ' vec2 d=vUv-0.5; float r2=dot(d,d);',
      ' float ca=uCA*(0.55+r2*3.2);',           // lens dispersion grows off-axis
      ' vec3 base;',
      ' base.r=texture2D(tBase,vUv+d*ca).r;',
      ' base.g=texture2D(tBase,vUv).g;',
      ' base.b=texture2D(tBase,vUv-d*ca).b;',
      ' vec3 bloom=texture2D(tB1,vUv).rgb*0.65+texture2D(tB2,vUv).rgb*1.05;',
      ' vec3 col=base+bloom*uBloom;',
      ' col*=1.0-uVig*smoothstep(0.10,0.92,r2*2.3);',
      ' col=max(col-0.014,vec3(0.0))*1.05;',
      ' float n=fract(sin(dot(vUv*uRes+vec2(uTime,uTime*1.7),vec2(12.9898,78.233)))*43758.5453);',
      ' float lum=dot(col,vec3(0.299,0.587,0.114));',
      ' col+=(n-0.5)*uGrain*(1.0-0.62*clamp(lum,0.0,1.0));',
      ' gl_FragColor=vec4(col,1.0); }'].join(NL) });

  var rtScene=null,rtA,rtB,rtC,rtD;
  function makeRT(w,h){
    return new THREE.WebGLRenderTarget(Math.max(1,w),Math.max(1,h),
      {minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat});
  }
  function allocRT(){
    var pr=renderer.getPixelRatio(), w=Math.floor(VW*pr), h=Math.floor(VH*pr);
    if(rtScene){ rtScene.dispose(); rtA.dispose(); rtB.dispose(); rtC.dispose(); rtD.dispose(); }
    rtScene=makeRT(w,h);
    rtA=makeRT(w>>1,h>>1); rtB=makeRT(w>>1,h>>1);
    rtC=makeRT(w>>2,h>>2); rtD=makeRT(w>>2,h>>2);
    compMat.uniforms.uRes.value.set(w,h);
  }
  function blit(mat,target){
    quad.material=mat; renderer.setRenderTarget(target||null);
    renderer.clear(); renderer.render(quadScene,quadCam);
  }
  function blur(src,tmp,dst,radius){
    blurMat.uniforms.tDiffuse.value=src.texture;
    blurMat.uniforms.uDir.value.set(radius/src.width,0); blit(blurMat,tmp);
    blurMat.uniforms.tDiffuse.value=tmp.texture;
    blurMat.uniforms.uDir.value.set(0,radius/src.height); blit(blurMat,dst);
  }
  function renderFrame(t){
    renderer.setRenderTarget(rtScene); renderer.clear(); renderer.render(scene,camera);
    brightMat.uniforms.tDiffuse.value=rtScene.texture; blit(brightMat,rtA);
    blur(rtA,rtB,rtA,1.0);                       // half res
    blurMat.uniforms.tDiffuse.value=rtA.texture;
    blurMat.uniforms.uDir.value.set(0,0); blit(blurMat,rtC);   // downsample
    blur(rtC,rtD,rtC,1.4);                       // quarter res, wider
    compMat.uniforms.tBase.value=rtScene.texture;
    compMat.uniforms.tB1.value=rtA.texture;
    compMat.uniforms.tB2.value=rtC.texture;
    compMat.uniforms.uTime.value=t;
    blit(compMat,null);
  }

  // ======================================================================
  //  D.  PLAYBACK
  // ======================================================================
  if(reduce){
    drawView(0,1); viewOpacity(0,0); sheetGrp.visible=false; paperMat.uniforms.uOp.value=0;
    setAll('uBuild',-9999); setAll('uSweep',-9999); setAll('uDim',.74);
    plane.position.y=2.40; plane.rotation.set(-.06,0,.18); dust.material.opacity=.34;
    titleEl.classList.add('on'); pillEl.classList.add('on');
    place(NAME,.5,0,1,null,9); allocRT(); renderFrame(0);
    reduceTimer=window.setTimeout(function(){ sceneEl.classList.add('gone'); onDone(); },2600);
    return dispose;
  }

  allocRT();
  function enter(){ if(entering<0) entering=performance.now(); }
  pillEl.addEventListener('click',enter);
  skipEl.addEventListener('click',enter);

  var start=performance.now(), prev=start, lastShot=-1;
  (function frame(now){
    // smoothing runs on wall-clock time, so this must be the real frame gap
    var dt=Math.min(.30,Math.max(.001,(now-prev)/1000)); prev=now;
    if(host.clientWidth!==VW||host.clientHeight!==VH){ resize(); allocRT(); }
    // wall clock on purpose: a splash must never outstay its welcome,
    // even on a slow device or after the tab has been backgrounded
    var t=(now-start)/1000, x=Math.min(t,SEQ);
    if(t>SEQ+HOLD) enter();
    if(entering>=0){
      var et=(now-entering)/1000;
      enterPush=eOutCubic(cl(et/.62));
      enterFlash=et<.42?Math.pow(et/.42,1.5):Math.max(0,1-(et-.42)/.50);
      if(et>.40&&!handedOver){
        handedOver=true; sceneEl.classList.add('gone');
        skipEl.style.display='none'; onDone();
      }
      if(et>1.5) running=false;              // landed: stop driving the GPU
    }
    var si=shotAt(x), s=SHOTS[si], k=cl((x-starts[si])/s.dur);

    if(si!==lastShot){
      lastShot=si; if(s.cut) rigReady=false;      // snap: a glide is not a cut
      titleEl.classList.toggle('on',si===NAME);
      pillEl.classList.toggle('on',si===NAME);
    }

    var head=null;
    // the drawing never leaves: it stays underneath as a ghost, so the
    // aircraft always has a ground, a scale and somewhere to be
    sheetGrp.visible=true;
    var ghost=si<LIFT?1:(si===LIFT?lerp(1,.20,eOutCubic(cl((k-.22)/.42)))
                        :(s.id==='beat'?.05:(si===NAME?.15:.20)));
    if(s.id==='draw'){
      var u=cl((x-.10)/(starts[LIFT]-.16));
      var dp=drawCurve(u);
      head=drawView(0,dp); viewOpacity(0,1);
      if(head){
        if(!focusReady){ focus.copy(head); focusReady=true; }
        focus.lerp(head,1-Math.exp(-dt/.85));   // long enough to ignore the hops
      }
    } else { drawView(0,1); viewOpacity(0,ghost); }
    var paperOp=si<LIFT?1:(si===LIFT?1-eOutCubic(cl((k-.30)/.45)):0);
    paperMat.uniforms.uOp.value=paperOp;
    drawView(1,1); viewOpacity(1,Math.max(paperOp,ghost*.5));

    if(head&&si<LIFT){
      tmpV.copy(head).project(camera);
      penEl.style.transform='translate('+((tmpV.x*.5+.5)*VW).toFixed(1)+'px,'+
                                        ((-tmpV.y*.5+.5)*VH).toFixed(1)+'px)';
      penEl.style.opacity=.95;
    } else penEl.style.opacity=0;

    var bk=si<LIFT?0:(si===LIFT?sstep(cl((k-.10)/.78)):1);
    buildFront=lerp(8.4,-8.6,bk);
    setAll('uBuild',bk<=0?9.2:(bk>=1?-9999:buildFront));
    plane.visible=si>=LIFT;
    var liftK=si<LIFT?0:(si===LIFT?eInOutQuint(k):1);
    plane.position.y=lerp(0,2.40,liftK);
    plane.rotation.z=lerp(0,.18,liftK)+Math.sin(t*.52)*.09*liftK;
    plane.rotation.x=lerp(0,-.06,liftK)+Math.sin(t*.37+1.4)*.035*liftK;
    plane.rotation.y=Math.sin(t*.29+.7)*.05*liftK;

    // the light sweep inks the drawing — it leaves finished lines, not paint
    var fk=si<FINISH?0:(si===FINISH?cl((k-.04)/.82):1);
    if(fk<=0) setAll('uSweep',9.4);
    else if(fk>=1) setAll('uSweep',-9999);
    else setAll('uSweep',lerp(9.4,-9.4,eInOutQuint(fk)));
    var beat=s.id==='beat';
    var nameDim=si===NAME?lerp(1,.74,eOutCubic(cl(k*2.4))):1;
    setSurf('uDim',beat?.74:nameDim);
    setLines('uDim',beat?2.1:nameDim);
    dust.material.opacity=si>=LIFT?lerp(0,.34,eOutCubic(cl((si===LIFT?k:1)*1.6))):0;

    var sinceCut=x-starts[si];
    // systems come alive for the inserts, then stow before the name
    var sysOn=cl((x-starts[BEAT0])/.55)*(1-cl((x-(starts[NAME]-.55))/.55));
    if(brakeGrp) brakeGrp.rotation.z=-.60*sstep(sysOn);
    if(canardGrp.length){
      var cd=Math.sin((x-starts[BEAT0])*2.1)*.15*sysOn;
      canardGrp[0].rotation.z=cd; canardGrp[1].rotation.z=cd;
    }
    place(si,k,t,dt,head,sinceCut);

    // inserts flash white; only the drop into the name dips to black
    flashEl.style.opacity=Math.max(s.cut&&si!==NAME?cl(1-sinceCut/.12)*.30:0,enterFlash).toFixed(3);
    fadeEl.style.opacity=((si===NAME)?cl(1-sinceCut/.16):0).toFixed(3);

    if(dust) dust.rotation.y=t*.01;
    renderFrame(t);
    if(running) rafId=requestAnimationFrame(frame);
  })(performance.now());

  return dispose;
}
