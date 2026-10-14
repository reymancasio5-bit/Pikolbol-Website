/* ==========================================================
   three.js scene — fixed behind every page.
   - Full-screen shader plane plays your videos (or the built-in
     animated court) and reacts to scroll, speed and mouse.
   - 3D pickleballs, paddles and dust fly past as you scroll.
   ========================================================== */
(function () {
  const C = window.APC || {};
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(innerWidth, innerHeight) < 700;
  const lite = coarse || small;

  const state = { p: 0, sp: 0, vel: 0, mx: 0.5, my: 0.5, smx: 0.5, smy: 0.5, ready: false };
  const TINTS = {
    none:   { a: [0.02, 0.05, 0.1],  b: [0.9, 0.95, 1.0],  amt: 0.0 },
    lime:   { a: [0.02, 0.07, 0.03], b: [0.85, 1.0, 0.25], amt: 0.55 },
    blue:   { a: [0.01, 0.03, 0.14], b: [0.35, 0.6, 1.0],  amt: 0.6 },
    orange: { a: [0.09, 0.02, 0.01], b: [1.0, 0.55, 0.3],  amt: 0.55 },
    teal:   { a: [0.0, 0.07, 0.07],  b: [0.2, 0.95, 0.8],  amt: 0.55 }
  };

  function init(canvas) {
    if (!window.THREE) { canvas.style.display = "none"; return null; }
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: false, powerPreference: "high-performance" });
    } catch (e) { canvas.style.display = "none"; document.body.classList.add("no-webgl"); return null; }

    const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.autoClear = false;
    renderer.setClearColor(0x060a11, 1);

    /* ---------- background (video) scene ---------- */
    const bgScene = new THREE.Scene();
    const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const court = makeCourtTexture();
    const slots = [{ tex: court.tex, aspect: court.aspect, video: null }];   // procedural fallback always present
    const uniforms = {
      uTex0: { value: court.tex }, uTex1: { value: court.tex },
      uA0: { value: court.aspect }, uA1: { value: court.aspect },
      uMix: { value: 0 }, uTime: { value: 0 }, uScroll: { value: 0 }, uVel: { value: 0 },
      uAspect: { value: innerWidth / innerHeight }, uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uTintA: { value: new THREE.Color(...TINTS.none.a) }, uTintB: { value: new THREE.Color(...TINTS.none.b) },
      uTintAmt: { value: 0 }
    };
    const bgMat = new THREE.ShaderMaterial({
      uniforms, depthTest: false, depthWrite: false,
      vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
      fragmentShader: `
        precision highp float;
        uniform sampler2D uTex0,uTex1; uniform float uA0,uA1,uMix,uTime,uScroll,uVel,uAspect,uTintAmt;
        uniform vec2 uMouse; uniform vec3 uTintA,uTintB; varying vec2 vUv;
        vec2 cover(vec2 uv,float ta){ vec2 r=uv-.5; float s=uAspect/ta; if(s>1.) r.y/=s; else r.x*=s; return r+.5; }
        vec3 samp(sampler2D t,float ta,vec2 uv,float ca){
          vec2 c=cover(uv,ta);
          return vec3(texture2D(t,c+vec2(ca,0.)).r,texture2D(t,c).g,texture2D(t,c-vec2(ca,0.)).b);
        }
        void main(){
          vec2 uv=vUv;
          float zoom=1.06+uScroll*.35;
          uv=(uv-.5)/zoom+.5;
          uv.y+=uScroll*.10;
          uv.x+=sin(uv.y*7.+uTime*.5)*.003+sin(uTime*.2)*.006;
          vec2 m=uMouse; float d=distance(uv*vec2(uAspect,1.),m*vec2(uAspect,1.));
          uv+=(uv-m)*.05*smoothstep(.5,.0,d);
          float ca=clamp(abs(uVel)*.0022,0.,.012);
          vec3 c0=samp(uTex0,uA0,uv,ca), c1=samp(uTex1,uA1,uv,ca);
          vec3 col=mix(c0,c1,uMix);
          float lum=dot(col,vec3(.299,.587,.114));
          vec3 duo=mix(uTintA,uTintB,smoothstep(.0,.9,lum))*1.1;
          col=mix(col,duo,uTintAmt);
          float v=smoothstep(1.15,.25,distance(vUv,vec2(.5)));
          col*=mix(.55,1.,v)*.9;
          col+=(fract(sin(dot(vUv*uTime,vec2(12.9898,78.233)))*43758.5453)-.5)*.035;
          gl_FragColor=vec4(col,1.);
        }`
    });
    bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));

    /* ---------- 3D scene ---------- */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
    camera.position.set(0, 0, 12);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(4, 6, 8); scene.add(key);
    const warm = new THREE.PointLight(0xff7a4d, 2.2, 40); warm.position.set(-6, -2, 6); scene.add(warm);
    const cool = new THREE.PointLight(0x2f6bff, 2.0, 40); cool.position.set(7, 3, 4); scene.add(cool);

    const H = 58;                           // world height the camera travels
    const things = [];
    const ballTex = makeBallTexture();
    const ballGeo = new THREE.SphereGeometry(0.5, lite ? 24 : 40, lite ? 18 : 28);
    const ballMat = new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.45, metalness: 0.05, emissive: 0x3a4a00, emissiveIntensity: 0.35 });

    // hero ball (big, interactive)
    const hero = new THREE.Mesh(ballGeo, ballMat);
    hero.scale.setScalar(lite ? 2.6 : 3.4);
    scene.add(hero);

    const nBalls = lite ? 9 : 18, nPad = lite ? 5 : 9;
    for (let i = 0; i < nBalls; i++) {
      const m = new THREE.Mesh(ballGeo, ballMat);
      const s = 0.45 + Math.random() * 0.9;
      m.scale.setScalar(s);
      things.push({ m, nx: Math.random() * 2 - 1, y: -3 - (i / nBalls) * (H - 3) - Math.random() * 2, z: -5 + Math.random() * 8.5,
        sp: 0.3 + Math.random(), ph: Math.random() * 6.28, rx: Math.random() * 0.8, ry: Math.random() * 0.8, bob: 0.2 + Math.random() * 0.4 });
      scene.add(m);
    }
    const padMats = [0xff7a4d, 0x2f6bff, 0x19d3b4, 0xf4f7fb].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.25 }));
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x10151f, roughness: 0.8 });
    const padGeo = makePaddleGeo();
    const handleGeo = new THREE.CylinderGeometry(0.13, 0.16, 1.0, 14);
    for (let i = 0; i < nPad; i++) {
      const g = new THREE.Group();
      const face = new THREE.Mesh(padGeo, padMats[i % padMats.length]);
      const handle = new THREE.Mesh(handleGeo, gripMat); handle.position.y = -1.55;
      g.add(face, handle);
      const s = 0.8 + Math.random() * 0.7; g.scale.setScalar(s);
      things.push({ m: g, nx: Math.random() * 2 - 1, y: -6 - (i / nPad) * (H - 6) - Math.random() * 3, z: -4 + Math.random() * 7,
        sp: 0.2 + Math.random() * 0.6, ph: Math.random() * 6.28, rx: 0.15 + Math.random() * 0.5, ry: 0.3 + Math.random() * 0.8, bob: 0.25 + Math.random() * 0.3, paddle: true });
      scene.add(g);
    }

    // dust
    const dustN = lite ? 260 : 700, dp = new Float32Array(dustN * 3);
    for (let i = 0; i < dustN; i++) { dp[i * 3] = (Math.random() - 0.5) * 30; dp[i * 3 + 1] = 4 - Math.random() * (H + 8); dp[i * 3 + 2] = -8 + Math.random() * 16; }
    const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xd9ff3f, size: lite ? 0.05 : 0.04, transparent: true, opacity: 0.55, depthWrite: false }));
    scene.add(dust);

    /* ---------- videos ---------- */
    loadVideos(C.videos || [], (v) => {
      const tex = new THREE.VideoTexture(v.video);
      tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
      slots.unshift({ tex, aspect: (v.video.videoWidth || 16) / (v.video.videoHeight || 9), video: v.video });
      if (slots.length > 1 && slots[slots.length - 1].video === null && slots.length > 2) { /* keep court last */ }
      document.body.classList.add("has-video");
    });

    /* ---------- sizing ---------- */
    function resize() {
      const w = innerWidth, h = innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      uniforms.uAspect.value = w / h;
    }
    resize();
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 120); }, { passive: true });
    addEventListener("pointermove", (e) => { state.mx = e.clientX / innerWidth; state.my = 1 - e.clientY / innerHeight; }, { passive: true });
    const unlock = () => slots.forEach(s => s.video && s.video.paused && s.video.play().catch(() => {}));
    addEventListener("touchstart", unlock, { once: true, passive: true });
    addEventListener("click", unlock, { once: true });

    /* ---------- tint control ---------- */
    function setTint(name) {
      const t = TINTS[name] || TINTS.none;
      if (!window.gsap) return;
      gsap.to(uniforms.uTintA.value, { r: t.a[0], g: t.a[1], b: t.a[2], duration: 1.1, ease: "power2.out" });
      gsap.to(uniforms.uTintB.value, { r: t.b[0], g: t.b[1], b: t.b[2], duration: 1.1, ease: "power2.out" });
      gsap.to(uniforms.uTintAmt, { value: t.amt, duration: 1.1, ease: "power2.out" });
    }

    /* ---------- loop ---------- */
    const clock = new THREE.Clock();
    let running = true, lastP = 0, frame = 0;
    document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) clock.getDelta(); });

    function visHalfW(z) { return Math.tan((camera.fov * Math.PI) / 360) * (camera.position.z - z) * camera.aspect; }

    function render() {
      requestAnimationFrame(render);
      if (!running) return;
      const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
      frame++;
      state.sp += (state.p - state.sp) * Math.min(1, dt * 5);
      const v = (state.sp - lastP) / Math.max(dt, 0.001) * 90; lastP = state.sp;
      state.vel += (v - state.vel) * Math.min(1, dt * 8);
      state.smx += (state.mx - state.smx) * Math.min(1, dt * 4);
      state.smy += (state.my - state.smy) * Math.min(1, dt * 4);

      camera.position.y = -state.sp * H;
      camera.position.x += ((state.smx - 0.5) * 1.4 - camera.position.x) * 0.05;
      camera.lookAt(camera.position.x * 0.3, camera.position.y - 0.4 + (state.smy - 0.5) * 0.6, 0);

      // hero ball
      const hx = camera.aspect < 1 ? 0.9 : Math.min(visHalfW(0) * 0.55, 5.2);
      hero.position.set(hx + (state.smx - 0.5) * 0.8, 0.2 + Math.sin(t * 1.4) * 0.35 + (state.smy - 0.5) * 0.5 - state.sp * 14, -1.5);
      hero.rotation.y = t * 0.45 + state.sp * 18 + (state.smx - 0.5) * 1.2;
      hero.rotation.x = t * 0.2 + state.sp * 9;

      for (const o of things) {
        const hw = visHalfW(o.z);
        o.m.position.set(o.nx * hw * 1.05 + Math.sin(t * o.sp + o.ph) * 0.4, o.y + Math.sin(t * o.sp * 1.3 + o.ph) * o.bob, o.z);
        o.m.rotation.x += dt * o.rx + state.vel * 0.0008;
        o.m.rotation.y += dt * o.ry + state.vel * 0.0012;
        if (o.paddle) o.m.rotation.z = Math.sin(t * o.sp + o.ph) * 0.35;
      }
      dust.rotation.y = t * 0.02;

      // video blend across the page
      const n = slots.length;
      if (n > 1) {
        const f = state.sp * (n - 1), i = Math.min(n - 2, Math.floor(f)), k = f - i;
        uniforms.uTex0.value = slots[i].tex; uniforms.uA0.value = slots[i].aspect;
        uniforms.uTex1.value = slots[i + 1].tex; uniforms.uA1.value = slots[i + 1].aspect;
        uniforms.uMix.value = Math.min(1, Math.max(0, (k - 0.3) / 0.4));
        slots.forEach((s, j) => { if (s.video) { const near = Math.abs(j - f) < 1.2; if (near && s.video.paused) s.video.play().catch(() => {}); else if (!near && !s.video.paused) s.video.pause(); } });
      } else {
        uniforms.uMix.value = 0;
      }
      if (frame % 2 === 0 && (n === 1 || state.sp > (n - 2) / (n - 1) - 0.02)) court.draw(t);
      uniforms.uTime.value = t; uniforms.uScroll.value = state.sp; uniforms.uVel.value = state.vel;
      uniforms.uMouse.value.set(state.smx, state.smy);

      renderer.clear();
      renderer.render(bgScene, bgCam);
      renderer.clearDepth();
      renderer.render(scene, camera);
    }
    if (reduce) { court.draw(0); }
    render();
    state.ready = true;
    return { setTint, state };
  }

  /* ---------- helpers ---------- */
  function loadVideos(list, onOk) {
    list.forEach((src) => {
      const video = document.createElement("video");
      video.muted = true; video.loop = true; video.playsInline = true; video.setAttribute("playsinline", "");
      video.crossOrigin = "anonymous"; video.preload = "auto";
      let done = false;
      const ok = () => { if (done) return; done = true; video.play().catch(() => {}); onOk({ video, src }); };
      video.addEventListener("loadeddata", ok, { once: true });
      video.addEventListener("error", () => { done = true; }, { once: true });
      video.src = src; video.load();
    });
  }

  function makeBallTexture() {
    const c = document.createElement("canvas"); c.width = 512; c.height = 256;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "#e6ff6a"); g.addColorStop(0.5, "#d9ff3f"); g.addColorStop(1, "#a9d312");
    x.fillStyle = g; x.fillRect(0, 0, 512, 256);
    for (let row = 0; row < 11; row++) {
      const y = 12 + row * 23, k = Math.sin((y / 256) * Math.PI);
      const cnt = Math.max(5, Math.round(26 * k));
      for (let i = 0; i < cnt; i++) {
        const px = ((i + (row % 2) * 0.5) / cnt) * 512;
        x.beginPath(); x.arc(px, y, 5.5 * (0.6 + 0.4 * k), 0, 6.283);
        x.fillStyle = "rgba(40,55,0,.75)"; x.fill();
        x.beginPath(); x.arc(px - 0.8, y - 0.8, 3.2 * (0.6 + 0.4 * k), 0, 6.283);
        x.fillStyle = "rgba(10,18,0,.6)"; x.fill();
      }
    }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }

  function makePaddleGeo() {
    const w = 0.95, h = 1.25, r = 0.5, s = new THREE.Shape();
    s.moveTo(-w + r, -h);
    s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r);
    s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h);
    s.lineTo(-w + r, h); s.quadraticCurveTo(-w, h, -w, h - r);
    s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 10 });
    g.translate(0, 0, -0.06); g.scale(0.9, 0.9, 1); return g;
  }

  /* Animated top-down pickleball court (used when no video loads, and as the last blend layer) */
  function makeCourtTexture() {
    const W = lite ? 640 : 960, Hh = lite ? 400 : 600;
    const c = document.createElement("canvas"); c.width = W; c.height = Hh;
    const x = c.getContext("2d");
    const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    const trail = [];
    function draw(t) {
      const g = x.createLinearGradient(0, 0, W, Hh); g.addColorStop(0, "#0d2f86"); g.addColorStop(1, "#0a1e5a");
      x.fillStyle = g; x.fillRect(0, 0, W, Hh);
      const mx = W * 0.08, my = Hh * 0.1, cw = W - mx * 2, ch = Hh - my * 2;
      x.fillStyle = "#0f7f86"; x.fillRect(mx, my, cw, ch);
      x.fillStyle = "rgba(25,211,180,.45)"; x.fillRect(mx + cw * 0.3, my, cw * 0.4, ch);
      x.strokeStyle = "rgba(255,255,255,.92)"; x.lineWidth = 4;
      x.strokeRect(mx, my, cw, ch);
      x.beginPath(); x.moveTo(mx + cw * 0.3, my); x.lineTo(mx + cw * 0.3, my + ch);
      x.moveTo(mx + cw * 0.7, my); x.lineTo(mx + cw * 0.7, my + ch);
      x.moveTo(mx + cw * 0.5, my); x.lineTo(mx + cw * 0.5, my + ch); x.stroke();
      x.lineWidth = 8; x.beginPath(); x.moveTo(mx + cw * 0.5, my - 14); x.lineTo(mx + cw * 0.5, my + ch + 14); x.stroke();
      // rally ball
      const k = t * 0.9, bx = mx + cw * (0.5 + 0.42 * Math.sin(k)), by = my + ch * (0.5 + 0.34 * Math.sin(k * 1.7 + 0.8));
      trail.push([bx, by]); if (trail.length > 26) trail.shift();
      trail.forEach((p, i) => { x.beginPath(); x.arc(p[0], p[1], 5 + i * 0.5, 0, 6.283); x.fillStyle = "rgba(217,255,63," + (i / trail.length) * 0.25 + ")"; x.fill(); });
      x.beginPath(); x.arc(bx, by, 14, 0, 6.283); x.fillStyle = "#d9ff3f"; x.shadowColor = "#d9ff3f"; x.shadowBlur = 24; x.fill(); x.shadowBlur = 0;
      // players
      [[0.12, 0.5 + 0.2 * Math.sin(k * 1.7)], [0.88, 0.5 + 0.2 * Math.sin(k * 1.7 + 1)]].forEach((p, i) => {
        x.beginPath(); x.arc(mx + cw * p[0] + (i ? -1 : 1) * 10 * Math.sin(k), my + ch * p[1], 18, 0, 6.283);
        x.fillStyle = i ? "rgba(255,122,77,.9)" : "rgba(244,247,251,.9)"; x.fill();
      });
      tex.needsUpdate = true;
    }
    draw(0);
    return { tex, aspect: W / Hh, draw, active: !reduce || true };
  }

  window.APCScene = { init, setTint: null, state, TINTS };
})();
