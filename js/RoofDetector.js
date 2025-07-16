// js/roofDetector.js
class RoofDetector {
    constructor() {
        this.roofData = null;
        this.keepouts = [];
        this.detectionMode = 'manual'; // 'manual' or 'auto'
    }

    processRoofData(roofData) {
        this.roofData = roofData;
        
        // Analyze roof characteristics
        this.analyzeRoofCharacteristics();
        
        // Detect potential keepouts (simplified)
        this.detectKeepouts();
        
        // Calculate optimal panel placement zones
        this.calculateOptimalZones();
        
        console.log('Roof analysis complete:', this.roofData);
    }

    analyzeRoofCharacteristics() {
        if (!this.roofData) return;
        
        // Enhance roof data with additional analysis
        this.roofData.shape = this.classifyRoofShape();
        this.roofData.complexity = this.calculateComplexity();
        this.roofData.suitability = this.calculateSuitability();
        
        // Calculate sun exposure based on azimuth
        this.roofData.sunExposure = this.calculateSunExposure();
    }

    classifyRoofShape() {
        const coords = this.roofData.coordinates;
        const vertexCount = coords.length;
        
        if (vertexCount === 4) {
            return this.isRectangular(coords) ? 'rectangular' : 'quadrilateral';
        } else if (vertexCount === 3) {
            return 'triangular';
        } else if (vertexCount > 4) {
            return 'complex';
        }
        
        return 'unknown';
    }

    isRectangular(coords) {
        if (coords.length !== 4) return false;
        
        // Calculate angles between consecutive edges
        const angles = [];
        for (let i = 0; i < coords.length; i++) {
            const prev = coords[(i - 1 + coords.length) % coords.length];
            const curr = coords[i];
            const next = coords[(i + 1) % coords.length];
            
            const angle = this.calculateAngle(prev, curr, next);
            angles.push(angle);
        }
        
        // Check if all angles are approximately 90 degrees
        return angles.every(angle => Math.abs(angle - 90) < 15);
    }

    calculateAngle(p1, p2, p3) {
        const dx1 = p1.lat - p2.lat;
        const dy1 = p1.lng - p2.lng;
        const dx2 = p3.lat - p2.lat;
        const dy2 = p3.lng - p2.lng;
        
        const angle1 = Math.atan2(dy1, dx1);
        const angle2 = Math.atan2(dy2, dx2);
        
        let angle = Math.abs(angle1 - angle2) * 180 / Math.PI;
        if (angle > 180) angle = 360 - angle;
        
        return angle;
    }

    calculateComplexity() {
        const coords = this.roofData.coordinates;
        const vertexCount = coords.length;
        
        // Simple complexity score based on vertex count and shape irregularity
        let complexity = vertexCount * 0.1;
        
        // Add complexity for irregular shapes
        if (this.roofData.shape === 'complex') {
            complexity += 0.3;
        }
        
        return Math.min(complexity, 1.0);
    }

    calculateSuitability() {
        let suitability = 0.8; // Base suitability
        
        // Factor in roof area
        if (this.roofData.area < 200) {
            suitability -= 0.2; // Small roof penalty
        }
        
        // Factor in azimuth (south-facing is optimal)
        const azimuthPenalty = this.calculateAzimuthPenalty(this.roofData.azimuth);
        suitability -= azimuthPenalty;
        
        // Factor in complexity
        suitability -= this.roofData.complexity * 0.2;
        
        return Math.max(0, Math.min(1, suitability));
    }

    calculateAzimuthPenalty(azimuth) {
        // Optimal azimuth is 180 degrees (south-facing)
        const optimal = 180;
        const deviation = Math.abs(azimuth - optimal);
        
        // Normalize to 0-180 range
        const normalizedDeviation = Math.min(deviation, 360 - deviation);
        
        // Convert to penalty (0-0.4 range)
        return (normalizedDeviation / 180) * 0.4;
    }

    calculateSunExposure() {
        // Simplified sun exposure calculation
        const azimuth = this.roofData.azimuth;
        const pitch = this.roofData.pitch;
        
        // South-facing roofs get maximum exposure
        let exposure = 1.0 - Math.abs(azimuth - 180) / 180;
        
        // Optimal pitch is around 30-40 degrees
        const pitchFactor = 1.0 - Math.abs(pitch - 35) / 55;
        
        return exposure * pitchFactor;
    }

    detectKeepouts() {
        // Simplified keepout detection
        // In a real implementation, this would analyze satellite imagery
        this.keepouts = [];
        
        if (this.roofData.area > 500) {
            // Assume larger roofs have more keepouts
            this.generateMockKeepouts();
        }
    }

    generateMockKeepouts() {
        const center = this.roofData.center;
        const coords = this.roofData.coordinates;
        
        // Calculate roof bounds
        const bounds = this.calculateBounds(coords);
        
        // Generate mock keepouts (chimneys, vents, etc.)
        const keepoutTypes = ['chimney', 'vent', 'skylight', 'hvac'];
        const keepoutCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < keepoutCount; i++) {
            const type = keepoutTypes[Math.floor(Math.random() * keepoutTypes.length)];
            const size = this.getKeepoutSize(type);
            
            // Random position within roof bounds
            const keepout = {
                type: type,
                position: {
                    lat: bounds.south + Math.random() * (bounds.north - bounds.south),
                    lng: bounds.west + Math.random() * (bounds.east - bounds.west)
                },
                size: size,
                buffer: this.getKeepoutBuffer(type)
            };
            
            this.keepouts.push(keepout);
        }
    }

    getKeepoutSize(type) {
        const sizes = {
            chimney: { width: 4, height: 4 },
            vent: { width: 2, height: 2 },
            skylight: { width: 6, height: 8 },
            hvac: { width: 8, height: 6 }
        };
        
        return sizes[type] || { width: 3, height: 3 };
    }

    getKeepoutBuffer(type) {
        const buffers = {
            chimney: 3,
            vent: 2,
            skylight: 2,
            hvac: 4
        };
        
        return buffers[type] || 2;
    }

    calculateBounds(coords) {
        let north = -90, south = 90, east = -180, west = 180;
        
        coords.forEach(coord => {
            north = Math.max(north, coord.lat);
            south = Math.min(south, coord.lat);
            east = Math.max(east, coord.lng);
            west = Math.min(west, coord.lng);
        });
        
        return { north, south, east, west };
    }

    calculateOptimalZones() {
        if (!this.roofData) return;
        
        // Calculate areas suitable for panel placement
        this.roofData.optimalZones = [];
        
        // For simple implementation, consider the whole roof as one zone
        // minus keepout areas
        const totalArea = this.roofData.area;
        const keepoutArea = this.calculateKeepoutArea();
        
        this.roofData.optimalZones.push({
            area: totalArea - keepoutArea,
            efficiency: this.roofData.suitability,
            coordinates: this.roofData.coordinates // Simplified
        });
    }

    calculateKeepoutArea() {
        return this.keepouts.reduce((total, keepout) => {
            const area = keepout.size.width * keepout.size.height;
            const bufferArea = Math.pow(keepout.buffer * 2, 2);
            return total + area + bufferArea;
        }, 0);
    }

    getRoofData() {
        return this.roofData;
    }

    getKeepouts() {
        return this.keepouts;
    }

    // Method to manually add keepouts
    addKeepout(type, position, size) {
        const keepout = {
            type: type,
            position: position,
            size: size || this.getKeepoutSize(type),
            buffer: this.getKeepoutBuffer(type)
        };
        
        this.keepouts.push(keepout);
        this.calculateOptimalZones(); // Recalculate zones
        
        return keepout;
    }

    removeKeepout(index) {
        if (index >= 0 && index < this.keepouts.length) {
            this.keepouts.splice(index, 1);
            this.calculateOptimalZones(); // Recalculate zones
        }
    }

    clearKeepouts() {
        this.keepouts = [];
        this.calculateOptimalZones();
    }

    // Auto-detection method (placeholder for future ML implementation)
    autoDetectRoof(mapCenter, bounds) {
        // This would integrate with satellite imagery analysis
        // For now, return mock data
        return {
            detected: false,
            confidence: 0,
            message: "Auto-detection not implemented. Please use manual roof outlining."
        };
    }

    // Export roof data for analysis
    exportRoofData() {
        return {
            roofData: this.roofData,
            keepouts: this.keepouts,
            analysis: {
                shape: this.roofData?.shape,
                complexity: this.roofData?.complexity,
                suitability: this.roofData?.suitability,
                sunExposure: this.roofData?.sunExposure
            }
        };
    }
}

// Global instance
window.roofDetector = new RoofDetector();