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
            
            // Position panel on roof surface
            const roofHeight = 8 + this.getRoofHeightAtPosition(localPos, roofData);
            panelMesh.position.set(localPos.x, roofHeight + 0.1, localPos.z);
            
            // Apply tilt based on roof pitch
            const pitchRadians = (roofData.pitch || 30) * Math.PI / 180;
            panelMesh.rotation.x = pitchRadians;
            
            // Apply azimuth rotation
            const azimuthRadians = (panel.azimuth || 0) * Math.PI / 180;
            panelMesh.rotation.y = azimuthRadians;
            
            // Store panel data for interaction
            panelMesh.userData = {
                panelId: panel.id,
                selected: false,
                power: panel.power,
                efficiency: panel.efficiency
            };
            
            panelMesh.castShadow = true;
            panelMesh.receiveShadow = true;
            
            this.panelsGroup.add(panelMesh);
        });
    }

    getRoofHeightAtPosition(position, roofData) {
        // Simplified roof height calculation
        // In a real implementation, this would calculate the exact height based on roof geometry
        return 2; // Assume 2 feet above house base
    }

    convertToLocalCoords(geoCoords) {
        if (!geoCoords || geoCoords.length === 0) return [];
        
        // Find bounds to center the model
        let minLat = geoCoords[0].lat, maxLat = geoCoords[0].lat;
        let minLng = geoCoords[0].lng, maxLng = geoCoords[0].lng;
        
        geoCoords.forEach(coord => {
            minLat = Math.min(minLat, coord.lat);
            maxLat = Math.max(maxLat, coord.lat);
            minLng = Math.min(minLng, coord.lng);
            maxLng = Math.max(maxLng, coord.lng);
        });
        
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        
        // Convert to local coordinates (simplified)
        const scale = 100000; // Scale factor for lat/lng to meters conversion
        
        return geoCoords.map(coord => ({
            x: (coord.lng - centerLng) * scale,
            z: -(coord.lat - centerLat) * scale // Negative Z for proper orientation
        }));
    }

    calculateCenter(coords) {
        let centerX = 0, centerZ = 0;
        coords.forEach(coord => {
            centerX += coord.x;
            centerZ += coord.z;
        });
        return {
            x: centerX / coords.length,
            z: centerZ / coords.length
        };
    }

    positionCamera(roofData) {
        // Calculate optimal camera position based on roof bounds
        const coords = this.convertToLocalCoords(roofData.coordinates);
        const bounds = this.calculateBounds3D(coords);
        
        const size = Math.max(bounds.width, bounds.depth);
        const distance = size * 1.5;
        
        this.camera.position.set(distance, distance * 0.8, distance);
        this.camera.lookAt(bounds.center.x, 0, bounds.center.z);
    }

    calculateBounds3D(coords) {
        let minX = coords[0].x, maxX = coords[0].x;
        let minZ = coords[0].z, maxZ = coords[0].z;
        
        coords.forEach(coord => {
            minX = Math.min(minX, coord.x);
            maxX = Math.max(maxX, coord.x);
            minZ = Math.min(minZ, coord.z);
            maxZ = Math.max(maxZ, coord.z);
        });
        
        return {
            center: { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 },
            width: maxX - minX,
            depth: maxZ - minZ
        };
    }

    toggleView() {
        if (this.currentView === 'perspective') {
            this.switchToOrthographic();
        } else {
            this.switchToPerspective();
        }
    }

    switchToPerspective() {
        const container = document.getElementById('canvas3d');
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(20, 30, 20);
        this.camera.lookAt(0, 0, 0);
        this.currentView = 'perspective';
    }

    switchToOrthographic() {
        const container = document.getElementById('canvas3d');
        const aspect = container.clientWidth / container.clientHeight;
        const viewSize = 30;
        
        this.camera = new THREE.OrthographicCamera(
            -viewSize * aspect, viewSize * aspect,
            viewSize, -viewSize,
            0.1, 1000
        );
        this.camera.position.set(0, 50, 0);
        this.camera.lookAt(0, 0, 0);
        this.currentView = 'orthographic';
    }

    clearModel() {
        // Clear all groups
        this.clearGroup(this.houseGroup);
        this.clearGroup(this.roofGroup);
        this.clearGroup(this.panelsGroup);
        this.selectedPanels = [];
    }

    clearGroup(group) {
        if (!group) return;
        
        while (group.children.length > 0) {
            const child = group.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            group.remove(child);
        }
    }

    clearPanels() {
        this.clearGroup(this.panelsGroup);
        this.selectedPanels = [];
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    // Utility methods
    showLoading(elementId) {
        const loading = document.getElementById(elementId);
        if (loading) {
            loading.classList.add('active');
        }
    }

    hideLoading(elementId) {
        const loading = document.getElementById(elementId);
        if (loading) {
            loading.classList.remove('active');
        }
    }

    // Export methods
    exportScene() {
        if (!this.scene) return null;
        
        return {
            houseVertices: this.extractGroupVertices(this.houseGroup),
            roofVertices: this.extractGroupVertices(this.roofGroup),
            panelData: this.extractPanelData()
        };
    }

    extractGroupVertices(group) {
        const vertices = [];
        group.children.forEach(child => {
            if (child.geometry) {
                const position = child.geometry.attributes.position;
                if (position) {
                    for (let i = 0; i < position.count; i++) {
                        vertices.push({
                            x: position.getX(i),
                            y: position.getY(i),
                            z: position.getZ(i)
                        });
                    }
                }
            }
        });
        return vertices;
    }

    extractPanelData() {
        return this.panelsGroup.children.map(panel => ({
            id: panel.userData.panelId,
            position: {
                x: panel.position.x,
                y: panel.position.y,
                z: panel.position.z
            },
            rotation: {
                x: panel.rotation.x,
                y: panel.rotation.y,
                z: panel.rotation.z
            },
            power: panel.userData.power,
            efficiency: panel.userData.efficiency,
            selected: panel.userData.selected
        }));
    }

    // Screenshot/render methods
    captureScreenshot() {
        if (!this.renderer) return null;
        
        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL('image/png');
    }

    // Panel management in 3D view
    selectAllPanels3D() {
        this.panelsGroup.children.forEach(panel => {
            panel.material.color.setHex(0xfbbf24); // Yellow
            panel.userData.selected = true;
        });
        this.selectedPanels = [...this.panelsGroup.children];
    }

    deselectAllPanels3D() {
        this.panelsGroup.children.forEach(panel => {
            panel.material.color.setHex(0x1e40af); // Blue
            panel.userData.selected = false;
        });
        this.selectedPanels = [];
    }

    deleteSelectedPanels3D() {
        this.selectedPanels.forEach(panel => {
            if (panel.geometry) panel.geometry.dispose();
            if (panel.material) panel.material.dispose();
            this.panelsGroup.remove(panel);
        });
        this.selectedPanels = [];
        
        // Notify panel placer to update its data
        if (window.panelPlacer) {
            window.panelPlacer.deleteSelectedPanels();
        }
    }

    // Lighting controls
    adjustLighting(intensity, azimuth, elevation) {
        // Find the sun light (directional light)
        const sunLight = this.scene.children.find(child => 
            child instanceof THREE.DirectionalLight && child.intensity > 0.5
        );
        
        if (sunLight) {
            sunLight.intensity = intensity;
            
            // Update position based on azimuth and elevation
            const distance = 100;
            const x = distance * Math.cos(elevation) * Math.sin(azimuth);
            const y = distance * Math.sin(elevation);
            const z = distance * Math.cos(elevation) * Math.cos(azimuth);
            
            sunLight.position.set(x, y, z);
        }
    }

    // Performance optimization
    setLevelOfDetail(enabled) {
        // Simple LOD implementation
        this.panelsGroup.children.forEach(panel => {
            if (enabled) {
                // Use simpler geometry for distant panels
                const distance = this.camera.position.distanceTo(panel.position);
                if (distance > 50) {
                    panel.visible = false;
                } else {
                    panel.visible = true;
                }
            } else {
                panel.visible = true;
            }
        });
    }
}

// Global instance
window.model3D = new Model3D();