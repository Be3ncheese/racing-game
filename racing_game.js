<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3D Racing Game</title>
  <style>
    body { margin: 0; overflow: hidden; font-family: sans-serif; }
    canvas { display: block; }
    #ui {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      padding: 10px;
      border-radius: 8px;
    }
    #minimap {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 150px;
      height: 150px;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid white;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.min.js"></script>
</head>
<body>
<div id="ui">
  <div>Speed: <span id="speedDisplay">0</span></div>
</div>
<canvas id="minimap"></canvas>
<script>
  let scene, camera, renderer;
  let car, track, otherRacers = [], checkpoints = [];
  let keys = {};
  let speed = 0;

  let minimapCanvas = document.getElementById("minimap");
  let minimapCtx = minimapCanvas.getContext("2d");

  function createF1Car(color = 0xff0000) {
    const group = new THREE.Group();

    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.5, 4),
      new THREE.MeshStandardMaterial({ color })
    );
    chassis.position.y = 0.25;
    group.add(chassis);

    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.3, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x990000 })
    );
    nose.position.set(0, 0.15, -2.75);
    group.add(nose);

    const rearWing = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.1, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    rearWing.position.set(0, 0.5, 2);
    group.add(rearWing);

    const frontWing = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.1, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    frontWing.position.set(0, 0.2, -3);
    group.add(frontWing);

    return group;
  }

  function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, -20);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    car = createF1Car();
    car.position.y = 0.5;
    scene.add(car);

    // Add AI racers
    for (let i = 0; i < 3; i++) {
      let racer = createF1Car(0x0000ff);
      racer.position.set(5 * i, 0.5, 10 * i);
      scene.add(racer);
      otherRacers.push(racer);
    }

    // Add checkpoints
    for (let i = 0; i <= 200; i += 40) {
      const cp = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffff00 }));
      cp.position.set(0, 0.5, -i);
      scene.add(cp);
      checkpoints.push(cp);
    }

    const trackGeometry = new THREE.PlaneGeometry(200, 200, 32, 32);
    const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, side: THREE.DoubleSide });
    track = new THREE.Mesh(trackGeometry, trackMaterial);
    track.rotation.x = -Math.PI / 2;

    const position = track.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const y = (Math.random() - 0.5) * 0.5;
      position.setY(i, y);
    }
    position.needsUpdate = true;
    track.geometry.computeVertexNormals();
    scene.add(track);

    // ... rest of terrain, rails, bridge, water, trees, mountains ... [unchanged from previous code]

    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', (e) => keys[e.key] = true);
    document.addEventListener('keyup', (e) => keys[e.key] = false);
    animate();
  }

  function animate() {
    requestAnimationFrame(animate);
    handleControls();
    camera.position.set(car.position.x, car.position.y + 10, car.position.z - 20);
    camera.lookAt(car.position);
    document.getElementById("speedDisplay").textContent = speed.toFixed(2);
    renderer.render(scene, camera);
    drawMinimap();
  }

  function drawMinimap() {
    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    minimapCtx.fillStyle = "#222";
    minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

    function worldToMinimap(x, z) {
      return {
        x: minimapCanvas.width / 2 + x * 0.5,
        y: minimapCanvas.height / 2 - z * 0.5
      };
    }

    // Player car
    let carPos = worldToMinimap(car.position.x, car.position.z);
    minimapCtx.fillStyle = "red";
    minimapCtx.fillRect(carPos.x - 3, carPos.y - 3, 6, 6);

    // AI racers
    minimapCtx.fillStyle = "blue";
    otherRacers.forEach(r => {
      let pos = worldToMinimap(r.position.x, r.position.z);
      minimapCtx.fillRect(pos.x - 3, pos.y - 3, 6, 6);
    });

    // Checkpoints
    minimapCtx.fillStyle = "yellow";
    checkpoints.forEach(cp => {
      let pos = worldToMinimap(cp.position.x, cp.position.z);
      minimapCtx.fillRect(pos.x - 2, pos.y - 2, 4, 4);
    });
  }

  function handleControls() {
    const maxSpeed = 1;
    const accel = 0.01;
    if (keys['ArrowUp']) speed = Math.min(maxSpeed, speed + accel);
    else if (keys['ArrowDown']) speed = Math.max(-maxSpeed, speed - accel);
    else speed *= 0.95;
    car.position.z -= speed;
    if (keys['ArrowLeft']) car.position.x -= 0.2;
    if (keys['ArrowRight']) car.position.x += 0.2;
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  init();
</script>
</body>
</html>
