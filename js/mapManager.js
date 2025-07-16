// js/mapManager.js
class MapManager {
    constructor() {
        this.map = null;
        this.geocoder = null;
        this.currentMarker = null;
        this.roofPolygon = null;
        this.drawingManager = null;
        this.isDrawingMode = false;
    }

    initMap() {
        // Default location (you can change this)
        const defaultLocation = { lat: 40.7128, lng: -74.0060 };
        
        this.map = new google.maps.Map(document.getElementById('map'), {
            zoom: 18,
            center: defaultLocation,
            mapTypeId: 'satellite',
            tilt: 0,
            heading: 0,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true
        });

        this.geocoder = new google.maps.Geocoder();
        
        // Initialize drawing manager
        this.drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: false,
            polygonOptions: {
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0.35,
                editable: true,
                draggable: true
            }
        });

        this.drawingManager.setMap(this.map);

        // Listen for polygon completion
        this.drawingManager.addListener('polygoncomplete', (polygon) => {
            this.handlePolygonComplete(polygon);
        });

        // Map click listener for roof detection
        this.map.addListener('click', (event) => {
            if (this.isDrawingMode) {
                // Let drawing manager handle it
                return;
            }
            this.handleMapClick(event);
        });

        this.hideLoading('mapLoading');
    }

    searchAddress(address) {
        this.showLoading('mapLoading');
        
        this.geocoder.geocode({ address: address }, (results, status) => {
            if (status === 'OK') {
                const location = results[0].geometry.location;
                this.map.setCenter(location);
                this.map.setZoom(19);
                
                // Clear previous marker
                if (this.currentMarker) {
                    this.currentMarker.setMap(null);
                }
                
                // Add new marker
                this.currentMarker = new google.maps.Marker({
                    position: location,
                    map: this.map,
                    title: results[0].formatted_address
                });
                
                // Store current location for roof detection
                this.currentLocation = {
                    lat: location.lat(),
                    lng: location.lng(),
                    address: results[0].formatted_address
                };
                
                this.hideLoading('mapLoading');
            } else {
                alert('Geocoding failed: ' + status);
                this.hideLoading('mapLoading');
            }
        });
    }

    startRoofDetection() {
        this.isDrawingMode = true;
        this.drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
        
        // Show instructions
        const instructions = document.createElement('div');
        instructions.id = 'drawingInstructions';
        instructions.innerHTML = `
            <div style="background: rgba(0,0,0,0.8); color: white; padding: 15px; border-radius: 10px; position: fixed; top: 20px; right: 20px; z-index: 1000;">
                <h3>🖱️ Roof Detection Mode</h3>
                <p>Click around the roof perimeter to outline it</p>
                <p>Click the starting point again to complete</p>
                <button onclick="this.parentElement.parentElement.remove(); mapManager.stopDrawing();" style="margin-top: 10px; padding: 5px 15px; background: #ff4444; color: white; border: none; border-radius: 5px; cursor: pointer;">Cancel</button>
            </div>
        `;
        document.body.appendChild(instructions);
    }

    stopDrawing() {
        this.isDrawingMode = false;
        this.drawingManager.setDrawingMode(null);
    }

    handlePolygonComplete(polygon) {
        this.isDrawingMode = false;
        this.drawingManager.setDrawingMode(null);
        
        // Remove instructions
        const instructions = document.getElementById('drawingInstructions');
        if (instructions) {
            instructions.remove();
        }
        
        // Clear previous roof polygon
        if (this.roofPolygon) {
            this.roofPolygon.setMap(null);
        }
        
        this.roofPolygon = polygon;
        
        // Extract roof data
        const roofData = this.extractRoofData(polygon);
        
        // Notify other modules
        if (window.roofDetector) {
            window.roofDetector.processRoofData(roofData);
        }
        
        if (window.panelPlacer) {
            window.panelPlacer.setRoofBoundary(roofData);
        }
        
        // Update stats
        if (window.statsCalculator) {
            window.statsCalculator.updateRoofArea(roofData.area);
        }
    }

    extractRoofData(polygon) {
        const path = polygon.getPath();
        const coordinates = [];
        
        for (let i = 0; i < path.getLength(); i++) {
            const point = path.getAt(i);
            coordinates.push({
                lat: point.lat(),
                lng: point.lng()
            });
        }
        
        // Calculate area using Google Maps geometry library
        const area = google.maps.geometry.spherical.computeArea(path);
        const areaInSqFt = area * 10.764; // Convert to square feet
        
        // Estimate roof pitch and azimuth (simplified)
        const bounds = new google.maps.LatLngBounds();
        coordinates.forEach(coord => bounds.extend(coord));
        const center = bounds.getCenter();
        
        // Calculate azimuth based on building orientation
        const azimuth = this.calculateAzimuth(coordinates);
        
        return {
            coordinates,
            area: areaInSqFt,
            center: {
                lat: center.lat(),
                lng: center.lng()
            },
            azimuth: azimuth,
            pitch: 30, // Default pitch, can be enhanced with elevation data
            polygon: polygon
        };
    }

    calculateAzimuth(coordinates) {
        if (coordinates.length < 2) return 180; // Default south-facing
        
        // Find the longest edge to determine building orientation
        let maxLength = 0;
        let azimuth = 180;
        
        for (let i = 0; i < coordinates.length; i++) {
            const start = coordinates[i];
            const end = coordinates[(i + 1) % coordinates.length];
            
            const length = google.maps.geometry.spherical.computeDistanceBetween(
                new google.maps.LatLng(start.lat, start.lng),
                new google.maps.LatLng(end.lat, end.lng)
            );
            
            if (length > maxLength) {
                maxLength = length;
                // Calculate bearing
                const bearing = google.maps.geometry.spherical.computeHeading(
                    new google.maps.LatLng(start.lat, start.lng),
                    new google.maps.LatLng(end.lat, end.lng)
                );
                azimuth = (bearing + 90) % 360; // Perpendicular to longest edge
            }
        }
        
        return azimuth;
    }

    handleMapClick(event) {
        // Auto-detect roof area around clicked point (simplified version)
        // In a real implementation, this would use image processing
        console.log('Map clicked at:', event.latLng.lat(), event.latLng.lng());
    }

    clearRoofDetection() {
        if (this.roofPolygon) {
            this.roofPolygon.setMap(null);
            this.roofPolygon = null;
        }
        
        // Clear instructions if visible
        const instructions = document.getElementById('drawingInstructions');
        if (instructions) {
            instructions.remove();
        }
        
        this.stopDrawing();
        
        // Notify other modules
        if (window.panelPlacer) {
            window.panelPlacer.clearPanels();
        }
        
        if (window.statsCalculator) {
            window.statsCalculator.reset();
        }
    }

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

    getRoofData() {
        if (!this.roofPolygon) return null;
        return this.extractRoofData(this.roofPolygon);
    }

    getCurrentLocation() {
        return this.currentLocation;
    }
}

// Global instance
window.mapManager = new MapManager();