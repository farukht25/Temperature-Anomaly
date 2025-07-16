let scene, camera, renderer, globe;
let heatmapSphere = null;
let stars;
let climateData;

const IMAGE_PATH = './public/output_earth_texture_optimized.jpg';
const GLOBE_RADIUS = 50;
const HEATMAP_RESOLUTION = 2048;
const MIN_ANOMALY = -2.0;
const MAX_ANOMALY = 2.0;

let currentYear = 1850;
let yearSlider, yearDisplay, heatmapToggle, controls;
let heatmapRotationY = 0;

function init() {
    setupScene();
    setupCamera();
    setupRenderer();
    setupControls();
    setupGlobe();
    setupLighting();
    addStarryBackground();
    setupUI();

    window.addEventListener('resize', onWindowResize);

    loadClimateData();
    animate();
}

function setupScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
}

function setupCamera() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = GLOBE_RADIUS * 2.5;
}

function setupRenderer() {
    const canvas = document.getElementById('globeCanvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
}

function setupControls() {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.minDistance = GLOBE_RADIUS * 1.2;
    controls.maxDistance = GLOBE_RADIUS * 5;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
}

function setupGlobe() {
    const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const image = new Image();
    image.src = IMAGE_PATH;
    image.crossOrigin = 'anonymous';

    image.onload = () => {
        const texture = new THREE.Texture(image);
        texture.needsUpdate = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;

        const material = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.7,
            metalness: 0.3,
            map: texture
        });

        globe = new THREE.Mesh(globeGeometry, material);
        scene.add(globe);
    };

    image.onerror = () => {
        const fallbackMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.7,
            metalness: 0.3
        });

        globe = new THREE.Mesh(globeGeometry, fallbackMaterial);
        scene.add(globe);
    };
}

function setupLighting() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    scene.add(new THREE.HemisphereLight(0xb1e1ff, 0xb97a20, 0.5));

    const light = new THREE.DirectionalLight(0xffffff, 0.7);
    light.position.set(50, 50, 50);
    scene.add(light);
}

function setupUI() {
    yearSlider = document.getElementById('year-slider');
    yearDisplay = document.getElementById('year-display');
    heatmapToggle = document.getElementById('heatmap-toggle');

    yearSlider.addEventListener('input', () => {
        currentYear = parseInt(yearSlider.value);
        yearDisplay.textContent = currentYear;
        if (climateData) updateGlobeVisualization(currentYear);
    });

    heatmapToggle.addEventListener('change', () => {
        if (heatmapSphere) heatmapSphere.visible = heatmapToggle.checked;
        if (heatmapToggle.checked && !heatmapSphere && climateData) {
            updateGlobeVisualization(currentYear);
        }
    });

    yearDisplay.textContent = currentYear;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if (stars) stars.rotation.y += 0.0001;
    renderer.render(scene, camera);
}

async function loadClimateData() {
    try {
        const response = await fetch('./public/temperature_anomalies.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        climateData = await response.json();

        const years = Object.keys(climateData).map(Number).sort((a, b) => a - b);
        if (years.length > 0) {
            yearSlider.min = years[0];
            yearSlider.max = years.at(-1);
            currentYear = years.at(-1);
            yearSlider.value = currentYear;
            yearDisplay.textContent = currentYear;
        }

        if (heatmapToggle.checked) updateGlobeVisualization(currentYear);
    } catch (err) {
        console.error('Climate data load error:', err);
        yearDisplay.textContent = "Error loading data!";
    }
}

function latLonToPixel(lat, lon, width, height) {
    let normalizedLon = lon;
    if (normalizedLon > 180) normalizedLon -= 360;
    else if (normalizedLon < -180) normalizedLon += 360;

    const epsilon = 3;
    const x = (normalizedLon + 180) / 360 * (width + epsilon);
    const y = (90 - lat) / 180 * height;
    return { x, y };
}

function getAnomalyColor(anomaly) {
    const normalized = Math.max(0, Math.min(1, (anomaly - MIN_ANOMALY) / (MAX_ANOMALY - MIN_ANOMALY)));

    const colors = [
        new THREE.Color(0x08306b),
        new THREE.Color(0x2171b5),
        new THREE.Color(0xf7f7f7),
        new THREE.Color(0xfeb24c),
        new THREE.Color(0x800026)
    ];

    const breakpoints = [0, 0.25, 0.5, 0.75, 1];

    for (let i = 0; i < breakpoints.length - 1; i++) {
        if (normalized >= breakpoints[i] && normalized <= breakpoints[i + 1]) {
            const t = (normalized - breakpoints[i]) / (breakpoints[i + 1] - breakpoints[i]);
            const color = new THREE.Color();
            color.lerpColors(colors[i], colors[i + 1], t);
            return color;
        }
    }
    return colors.at(-1);
}

function updateGlobeVisualization(year) {
    if (heatmapSphere) {
        scene.remove(heatmapSphere);
        heatmapSphere.geometry.dispose();
        heatmapSphere.material.map?.dispose();
        heatmapSphere.material.dispose();
        heatmapSphere = null;
    }

    if (!heatmapToggle.checked || !climateData) return;

    const yearData = climateData[String(year)];
    if (!yearData?.length) return;

    const canvas = document.createElement('canvas');
    canvas.width = HEATMAP_RESOLUTION;
    canvas.height = HEATMAP_RESOLUTION / 2;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.5;

    const radius = canvas.width * 0.03;

    for (const { lat, lon, value } of yearData) {
        const { x, y } = latLonToPixel(lat, lon, canvas.width, canvas.height);
        const color = getAnomalyColor(value);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
        gradient.addColorStop(0, `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius * 1.5, y - radius * 1.5, radius * 3, radius * 3);
    }

    ctx.filter = 'blur(1.2px)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const geometry = new THREE.SphereGeometry(GLOBE_RADIUS + 0.2, 64, 64);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.8,
        blending: THREE.NormalBlending,
        side: THREE.FrontSide
    });

    heatmapSphere = new THREE.Mesh(geometry, material);
    heatmapSphere.rotation.y = heatmapRotationY;
    scene.add(heatmapSphere);
}

function addStarryBackground() {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.5,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const starVertices = [];
    const radius = GLOBE_RADIUS * 10;

    for (let i = 0; i < 5000; i++) {
        const x = (Math.random() * 2 - 1) * radius;
        const y = (Math.random() * 2 - 1) * radius;
        const z = (Math.random() * 2 - 1) * radius;
        starVertices.push(x, y, z);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    stars = new THREE.Points(geometry, material);
    scene.add(stars);
}

init();
