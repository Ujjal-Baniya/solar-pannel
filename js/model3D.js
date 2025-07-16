// js/model3D.js
class Model3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.houseGroup = null;
        this.roofGroup = null;
        this.panelsGroup = null;
        this.currentView = 'perspective'; // 'perspective' or 'orthographic'
        this.isInitialized = false;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedPanels = [];
    }

    init() {
        const container = document.getElementById('canvas3d');
        if (!container) return;

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(20, 30, 20);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Lighting
        this.setupLighting();

        // Controls (simplified OrbitControls)
        this.setupControls();

        // Event listeners
        this.setupEventListeners();

        // Groups for organizing objects
        this.houseGroup = new THREE.Group();
        this.roofGroup = new THREE.Group();
        this.panelsGroup = new THREE.Group();
        
        this.scene.add(this.houseGroup);
        this.scene.add(this.roofGroup);
        this.scene.add(this.panelsGroup);

        // Add ground plane
        this.addGround();

        this.isInitialized = true;
        this.animate();
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(50, 100, 50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 200;
        sunLight.shadow.camera.left = -50;
        sunLight.shadow.camera.right = 50;
        sunLight.shadow.camera.top = 50;
        sunLight.shadow.camera.bottom = -50;
        this.scene.add(sunLight);

        // Helper for sun light (optional)
        // const helper = new THREE.DirectionalLightHelper(sunLight, 5);
        // this.scene.add(helper);
    }

    setupControls() {
        // Simple mouse controls
        this.controls = {
            isMouseDown: false,
            previousMousePosition: { x: 0, y: 0 },
            rotationSpeed: 0.005,
            zoomSpeed: 0.1
        };
    }

    setupEventListeners() {
        const canvas = this.renderer.domElement;

        // Mouse events
        canvas.addEventListener('mousedown', (event) => {
            this.controls.isMouseDown = true;
            this.controls.previousMousePosition = { x: event.clientX, y: event.clientY };
        });

        canvas.addEventListener('mouseup', () => {
            this.controls.isMouseDown = false;
        });

        canvas.addEventListener('mousemove', (event) => {
            if (this.controls.isMouseDown) {
                const deltaX = event.clientX - this.controls.previousMousePosition.x;
                const deltaY = event.clientY - this.controls.previousMousePosition.y;

                // Rotate camera around the scene
                const spherical = new THREE.Spherical();
                spherical.setFromVector3(this.camera.position);
                
                spherical.theta -= deltaX * this.controls.rotationSpeed;
                spherical.phi += deltaY * this.controls.rotationSpeed;
                
                // Limit phi to avoid flipping
                spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
                
                this.camera.position.setFromSpherical(spherical);
                this.camera.lookAt(0, 0, 0);

                this.controls.previousMousePosition = { x: event.clientX, y: event.clientY };
            }
        });

        // Zoom with mouse wheel
        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            const scale = event.deltaY > 0 ? 1.1 : 0.9;
            this.camera.position.multiplyScalar(scale);
        });

        // Click events for panel selection
        canvas.addEventListener('click', (event) => {
            this.handlePanelClick(event);
        });

        // Resize handling
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    handlePanelClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.panelsGroup.children);

        if (intersects.length > 0) {
            const panel = intersects[0].object;
            this.togglePanelSelection(panel);
        }
    }

    togglePanelSelection(panel) {
        if (panel.userData.selected) {
            panel.material.color.setHex(0x1e40af); // Blue
            panel.userData.selected = false;
            this.selectedPanels = this.selectedPanels.filter(p => p !== panel);
        } else {
            panel.material.color.setHex(0xfbbf24); // Yellow
            panel.userData.selected = true;
            this.selectedPanels.push(panel);
        }
    }

    handleResize() {
        const container = document.getElementById('canvas3d');
        if (!container) return;

        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    addGround() {
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    generate3DModel() {
        if (!this.isInitialized) {
            this.init();
        }

        this.showLoading('3dLoading');

        // Clear existing models
        this.clearModel();

        // Get roof data
        const roofData = window.roofDetector?.getRoofData();
        if (!roofData) {
            this.hideLoading('3dLoading');
            return;
        }

        // Generate house base
        this.generateHouseBase(roofData);

        // Generate roof
        this.generateRoof(roofData);

        // Generate solar panels
        this.generateSolarPanels();

        // Position camera for best view
        this.positionCamera(roofData);

        this.hideLoading('3dLoading');
    }

    generateHouseBase(roofData) {
        const coords = roofData.coordinates;
        const height = 8; // House height in feet

        // Create house base using extrusion
        const shape = new THREE.Shape();
        
        // Convert coordinates to local space
        const localCoords = this.convertToLocalCoords(coords);
        
        shape.moveTo(localCoords[0].x, localCoords[0].z);
        for (let i = 1; i < localCoords.length; i++) {
            shape.lineTo(localCoords[i].x, localCoords[i].z);
        }
        shape.lineTo(localCoords[0].x, localCoords[0].z);

        const extrudeSettings = {
            depth: height,
            bevelEnabled: false
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const material = new THREE.MeshLambertMaterial({ color: 0xD2B48C });
        const house = new THREE.Mesh(geometry, material);
        
        house.castShadow = true;
        house.receiveShadow = true;
        
        this.houseGroup.add(house);
    }

    generateRoof(roofData) {
        const coords = roofData.coordinates;
        const pitch = roofData.pitch || 30;
        const height = 8; // House height

        // Create roof geometry
        const localCoords = this.convertToLocalCoords(coords);
        
        // Simple gabled roof for now
        const roofGeometry = this.createRoofGeometry(localCoords, pitch, height);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        
        roof.castShadow = true;
        roof.receiveShadow = true;
        
        this.roofGroup.add(roof);
    }

    createRoofGeometry(coords, pitch, baseHeight) {
        const pitchRadians = pitch * Math.PI / 180;
        const roofHeight = 4; // Additional height for roof

        // Create a simple peaked roof
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];

        // Add base vertices
        coords.forEach(coord => {
            vertices.push(coord.x, baseHeight, coord.z);
        });

        // Add peak vertices (simplified for rectangular roofs)
        const center = this.calculateCenter(coords);
        vertices.push(center.x, baseHeight + roofHeight, center.z);

        // Create triangular faces
        const centerIndex = coords.length;
        for (let i = 0; i < coords.length; i++) {
            const next = (i + 1) % coords.length;
            indices.push(i, next, centerIndex);
        }

        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();

        return geometry;
    }

    generateSolarPanels() {
        const panels = window.panelPlacer?.getPanels();
        if (!panels || panels.length === 0) return;

        const roofData = window.roofDetector?.getRoofData();
        if (!roofData) return;

        const panelGeometry = new THREE.BoxGeometry(
            window.panelPlacer.panelSpecs.width,
            0.2,
            window.panelPlacer.panelSpecs.height
        );

        panels.forEach(panel => {
            const panelMaterial = new THREE.MeshLambertMaterial({ color: 0x1e40af });
            const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
            
            // Convert panel position to 3D coordinates
            const localPos = this.convertToLocalCoords([panel.position])[0];