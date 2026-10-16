/* A contained, responsive Three.js court. No WebGL work runs offscreen. */
(function () {
  const state = { p: 0, ready: false };
  function init(canvas) {
    if (!canvas || !window.THREE) return null;
    const stage = canvas.parentElement;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = matchMedia('(pointer:coarse)').matches;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch (_) { canvas.hidden = true; return null; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.25 : 1.75));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .8;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
    camera.position.set(14, 18, 23); camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xf4f8df, 0x344130, 1.4));
    const light = new THREE.DirectionalLight(0xf4ffd5, 1.4);
    light.position.set(-6, 16, 8); scene.add(light);
    const model = new THREE.Group(); scene.add(model);
    const material = (color, roughness = .8) => new THREE.MeshStandardMaterial({ color, roughness });
    const baseMat = material(0x293526), courtMat = material(0x385443), kitchenMat = material(0x637449);
    const lineMat = material(0xd7e0c7), darkMat = material(0x172117), ballMat = material(0xd9ef78, .5);
    function box(w, h, d, mat, x = 0, y = 0, z = 0) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z); model.add(mesh); return mesh;
    }
    box(10.6, .4, 18.6, baseMat, 0, -.3);
    box(8, .06, 16, courtMat);
    box(8, .07, 5.1, kitchenMat);
    const lineY = .055;
    [-4, 4].forEach(x => box(.045, .02, 16, lineMat, x, lineY));
    [-8, -2.55, 2.55, 8].forEach(z => box(8, .02, .045, lineMat, 0, lineY, z));
    [-5.275, 5.275].forEach(z => box(.045, .02, 5.45, lineMat, 0, lineY, z));
    // Net posts, top tape and individual fine mesh strands.
    [-4.3, 4.3].forEach(x => box(.1, 1.4, .1, darkMat, x, .65));
    box(8.6, .055, .055, lineMat, 0, 1.25);
    const netPoints = [];
    for (let x = -4.2; x <= 4.2; x += .21) netPoints.push(x, .12, 0, x, 1.22, 0);
    for (let y = .12; y <= 1.22; y += .14) netPoints.push(-4.2, y, 0, 4.2, y, 0);
    const netGeo = new THREE.BufferGeometry(); netGeo.setAttribute('position', new THREE.Float32BufferAttribute(netPoints, 3));
    model.add(new THREE.LineSegments(netGeo, new THREE.LineBasicMaterial({ color: 0xc5d2b6, transparent: true, opacity: .3 })));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.16, 24, 16), ballMat);
    model.add(ball);
    // Dark inset marks keep the ball recognizably a pickleball at small sizes.
    const holes = new THREE.Group(); ball.add(holes);
    const holeGeo = new THREE.CircleGeometry(.02, 8), holeMat = new THREE.MeshBasicMaterial({ color: 0x48572a });
    for (let i = 0; i < 20; i++) {
      const y = 1 - (i / 19) * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996;
      const hole = new THREE.Mesh(holeGeo, holeMat);
      hole.position.set(Math.cos(a) * r * .162, y * .162, Math.sin(a) * r * .162);
      hole.lookAt(hole.position.clone().multiplyScalar(2)); holes.add(hole);
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(.22, 24), new THREE.MeshBasicMaterial({ color: 0x101910, transparent: true, opacity: .35, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = .09; model.add(shadow);
    // Two understated athletic figures: articulated legs and paddle arms.
    const skin = material(0xcaa78a), shorts = material(0x1b2821), shoes = material(0xe6e9db);
    function player(side, color) {
      const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
      root.position.z = side * 6.6; root.rotation.y = side > 0 ? 0 : Math.PI;
      const jersey = material(color);
      const mesh = (geometry, mat, x, y, z, parent = body) => {
        const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); parent.add(m); return m;
      };
      mesh(new THREE.CylinderGeometry(.26, .21, .65, 10), jersey, 0, 1.13, 0);
      mesh(new THREE.SphereGeometry(.2, 12, 10), skin, 0, 1.69, 0);
      mesh(new THREE.CylinderGeometry(.21, .21, .12, 12), shorts, 0, 1.82, .01);
      mesh(new THREE.BoxGeometry(.46, .26, .3), shorts, 0, .75, 0);
      const legs = [-1, 1].map(sign => {
        const pivot = new THREE.Group(); pivot.position.set(sign * .15, .68, 0); body.add(pivot);
        mesh(new THREE.CylinderGeometry(.085, .07, .51, 8), skin, 0, -.24, 0, pivot);
        mesh(new THREE.BoxGeometry(.17, .13, .32), shoes, 0, -.52, -.065, pivot);
        return pivot;
      });
      const arm = new THREE.Group(); arm.position.set(.28, 1.33, 0); body.add(arm);
      const forearm = mesh(new THREE.CylinderGeometry(.07, .065, .56, 8), skin, .09, -.17, -.2, arm);
      forearm.rotation.x = .85;
      const paddle = new THREE.Group(); paddle.position.set(.14, -.2, -.68); arm.add(paddle);
      mesh(new THREE.CylinderGeometry(.04, .04, .24, 8), shorts, 0, -.12, 0, paddle);
      const face = mesh(new THREE.SphereGeometry(1, 12, 10), jersey, 0, .1, 0, paddle);
      face.scale.set(.19, .26, .045);
      const free = mesh(new THREE.CylinderGeometry(.07, .065, .5, 8), skin, -.31, 1.13, -.08);
      free.rotation.x = -.3;
      model.add(root); return { root, body, legs, arm, side };
    }
    const players = [player(1, 0xb4ca60), player(-1, 0xe3e8da)];
    const contacts = [-1.5, 1.45, .8, -1.25, 1.6, -.65, -.9, 1.1];
    const contact = n => contacts[((n % contacts.length) + contacts.length) % contacts.length];
    let frame = 0, visible = true, elapsed = .5, last = 0, available = true;
    const videos = (window.APC?.videos || []).map(src => {
      const v = document.createElement('video'); v.className = 'scene-video'; v.muted = true; v.loop = true; v.playsInline = true;
      v.preload = preference.matches ? 'none' : 'metadata'; v.src = src; v.setAttribute('aria-hidden', 'true'); stage.prepend(v);
      return v;
    });
    function syncVideos() {
      const selected = Math.floor(elapsed / 12) % Math.max(1, videos.length);
      videos.forEach((v, i) => {
        const active = i === selected && visible && !document.hidden && !preference.matches && available;
        v.classList.toggle('active', active);
        if (active && v.paused) v.play().catch(() => {}); else if (!active) v.pause();
      });
    }
    function draw() {
      const t = preference.matches ? .5 : elapsed;
      const leg = Math.floor(t / 1.8), u = (t / 1.8) % 1, side = leg % 2 === 0 ? 1 : -1;
      // Each return clears the net, bounces once, then reaches the receiver.
      const bounce = .77, v = u < bounce ? u / bounce : (u - bounce) / (1 - bounce);
      const height = u < bounce ? 1.0 * (1 - v) + 8.4 * v * (1 - v) : 1.0 * v + .35 * v * (1 - v);
      ball.position.set(contact(leg) + (contact(leg + 1) - contact(leg)) * u, .16 + height, side * (5.9 - 11.8 * u));
      ball.rotation.set(t * 3, t * 2, 0);
      shadow.position.x = ball.position.x; shadow.position.z = ball.position.z;
      shadow.scale.setScalar(1 + ball.position.y * .12);
      players.forEach(p => {
        const sending = p.side === side;
        const from = contact(sending ? leg : leg - 1), to = contact(sending ? leg + 2 : leg + 1);
        const move = sending ? 0 : Math.min(1, u / .78);
        const ease = move * move * (3 - 2 * move);
        p.root.position.x = from + (to - from) * ease - p.side * .42;
        const hit = sending ? Math.exp(-u * 12) : Math.exp(-(1 - u) * 18);
        p.arm.rotation.x = -.15 + hit * .65;
        p.arm.rotation.y = -.25 + hit * .5;
        const stride = Math.sin(t * 12) * .16 * Math.abs(to - from) * Math.sin(Math.PI * move);
        p.legs[0].rotation.x = stride; p.legs[1].rotation.x = -stride;
        p.body.position.y = Math.abs(stride) * .08;
        p.body.rotation.z = (to - from) * .025 * Math.sin(Math.PI * move);
      });
      renderer.render(scene, camera);
    }
    function animate(now) {
      frame = 0;
      if (document.hidden || !visible || preference.matches || !available) return;
      if (now - last >= (coarse ? 1000 / 30 : 1000 / 60) - 1) {
        elapsed += Math.min((now - last) / 1000, .06); last = now; draw();
        if (videos.length) syncVideos();
      }
      frame = requestAnimationFrame(animate);
    }
    function sync() {
      cancelAnimationFrame(frame); frame = 0; last = performance.now(); syncVideos();
      if (!visible || document.hidden || !available) return;
      if (preference.matches) { draw(); return; }
      frame = requestAnimationFrame(animate);
    }
    function resize() {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h;
      camera.position.set(14, 18, 23).multiplyScalar(camera.aspect < 1.3 ? 1.12 : 1);
      camera.updateProjectionMatrix(); camera.lookAt(0, 0, 0); draw();
    }
    new ResizeObserver(resize).observe(stage);
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: 0 }).observe(stage);
    preference.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    addEventListener('pagehide', () => { cancelAnimationFrame(frame); videos.forEach(v => v.pause()); });
    addEventListener('pageshow', sync);
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); available = false; cancelAnimationFrame(frame); syncVideos(); stage.classList.remove('webgl-ready'); canvas.hidden = true; });
    resize(); stage.classList.add('webgl-ready'); state.ready = true; sync();
    return { state, setTint() {} };
  }
  window.APCScene = { init, state };
})();
