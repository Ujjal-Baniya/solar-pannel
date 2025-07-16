// js/panelPlacer.js
class PanelPlacer {
    constructor() {
        this.roofBoundary = null;
        this.panels = [];
        this.panelSpecs = {
            width: 5.4,  // feet
            height: 3.25, // feet
            power: 400,   // watts
            efficiency: 0.20
        };
        this.spacing = {
            horizontal: 0.5, // feet
            vertical: 0.5    // feet
        };
        this.selectedPanels = [];
    }

    setRoofBoundary(roofData) {
        this.roofBoundary = roofData;
        this.generatePanelLayout();
    }

    generatePanelLayout() {
        if (!this.roofBoundary) return;
        
        this.panels = [];
        
        // Calculate panel placement based on roof shape
        switch (this.roofBoundary.shape) {
            case 'rectangular':
                this.generateRectangularLayout();
                break;
            case 'triangular':
                this.generateTriangularLayout();
                break;
            case 'complex':
                this.generateComplexLayout();
                break;
            default:
                this.generateGenericLayout();
        }
        
        // Filter out panels that conflict with keepouts
        this.filterKeepoutConflicts();
        
        // Update statistics
        this.updatePanelStats();
    }

    generateRectangularLayout() {
        const bounds = this.calculateRoofBounds();
        const roofWidth = this.calculateDistance(bounds.west, bounds.north, bounds.east, bounds.north);
        const roofHeight = this.calculateDistance(bounds.west, bounds.north, bounds.west, bounds.south);
        
        // Calculate how many panels fit
        const panelsPerRow = Math.floor(roofWidth / (this.panelSpecs.width + this.spacing.horizontal));
        const panelsPerColumn = Math.floor(roofHeight / (this.panelSpecs.height + this.spacing.vertical));
        
        // Generate panel positions
        for (let row = 0; row < panelsPerColumn; row++) {
            for (let col = 0; col < panelsPerRow; col++) {
                const x = bounds.west + col * (this.panelSpecs.width + this.spacing.horizontal) + this.panelSpecs.width / 2;
                const y = bounds.north - row * (this.panelSpecs.height + this.spacing.vertical) - this.panelSpecs.height / 2;
                
                // Check if panel position is within roof boundary
                if (this.isPointInRoof(x, y)) {
                    const panel = this.createPanel(x, y, row, col);
                    this.panels.push(panel);
                }
            }
        }
    }

    generateTriangularLayout() {
        const bounds = this.calculateRoofBounds();
        const coords = this.roofBoundary.coordinates;
        
        // Find the base and apex of the triangle
        const base = this.findLongestEdge(coords);
        const apex = coords.find(coord => !base.includes(coord));
        
        // Generate panels in rows from base to apex
        const baseWidth = this.calculateDistance(base[0].lng, base[0].lat, base[1].lng, base[1].lat);
        const maxPanelsInBase = Math.floor(baseWidth / (this.panelSpecs.width + this.spacing.horizontal));
        
        const height = this.calculateDistance(
            (base[0].lng + base[1].lng) / 2, (base[0].lat + base[1].lat) / 2,
            apex.lng, apex.lat
        );
        const numRows = Math.floor(height / (this.panelSpecs.height + this.spacing.vertical));
        
        for (let row = 0; row < numRows; row++) {
            const rowProgress = row / numRows;
            const panelsInRow = Math.floor(maxPanelsInBase * (1 - rowProgress));
            
            for (let col = 0; col < panelsInRow; col++) {
                const x = bounds.west + (bounds.east - bounds.west) * (col + 0.5) / panelsInRow;
                const y = bounds.north - row * (this.panelSpecs.height + this.spacing.vertical) - this.panelSpecs.height / 2;
                
                if (this.isPointInRoof(x, y)) {
                    const panel = this.createPanel(x, y, row, col);
                    this.panels.push(panel);
                }
            }
        }
    }

    generateComplexLayout() {
        // For complex shapes, use a grid-based approach
        const bounds = this.calculateRoofBounds();
        const gridSize = Math.min(this.panelSpecs.width, this.panelSpecs.height) / 2;
        
        const cols = Math.ceil((bounds.east - bounds.west) / gridSize);
        const rows = Math.ceil((bounds.north - bounds.south) / gridSize);
        
        let panelRow = 0;
        let panelCol = 0;
        
        for (let row = 0; row < rows; row += Math.ceil(this.panelSpecs.height / gridSize)) {
            for (let col = 0; col < cols; col += Math.ceil(this.panelSpecs.width / gridSize)) {
                const x = bounds.west + col * gridSize + this.panelSpecs.width / 2;
                const y = bounds.north - row * gridSize - this.panelSpecs.height / 2;
                
                if (this.isPointInRoof(x, y) && this.canFitPanel(x, y)) {
                    const panel = this.createPanel(x, y, panelRow, panelCol);
                    this.panels.push(panel);
                    panelCol++;
                }
            }
            panelRow++;
            panelCol = 0;
        }
    }

    generateGenericLayout() {
        // Fallback to rectangular layout
        this.generateRectangularLayout();
    }

    createPanel(x, y, row, col) {
        return {
            id: `panel_${row}_${col}`,
            position: { lng: x, lat: y },
            row: row,
            col: col,
            width: this.panelSpecs.width,
            height: this.panelSpecs.height,
            power: this.panelSpecs.power,
            azimuth: this.roofBoundary.azimuth,
            tilt: this.roofBoundary.pitch,
            efficiency: this.calculatePanelEfficiency(x, y),
            selected: false,
            corners: this.calculatePanelCorners(x, y)
        };
    }

    calculatePanelCorners(centerX, centerY) {
        const halfWidth = this.panelSpecs.width / 2;
        const halfHeight = this.panelSpecs.height / 2;
        
        return [
            { lng: centerX - halfWidth, lat: centerY + halfHeight },
            { lng: centerX + halfWidth, lat: centerY + halfHeight },
            { lng: centerX + halfWidth, lat: centerY - halfHeight },
            { lng: centerX - halfWidth, lat: centerY - halfHeight }
        ];
    }

    calculatePanelEfficiency(x, y) {
        // Base efficiency from panel specs
        let efficiency = this.panelSpecs.efficiency;
        
        // Adjust for roof characteristics
        if (this.roofBoundary.sunExposure) {
            efficiency *= this.roofBoundary.sunExposure;
        }
        
        // Adjust for position on roof (simplified)
        const bounds = this.calculateRoofBounds();
        const centerX = (bounds.west + bounds.east) / 2;
        const centerY = (bounds.north + bounds.south) / 2;
        
        const distanceFromCenter = Math.sqrt(
            Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );
        
        const maxDistance = Math.sqrt(
            Math.pow(bounds.east - bounds.west, 2) + Math.pow(bounds.north - bounds.south, 2)
        ) / 2;
        
        const positionFactor = 1 - (distanceFromCenter / maxDistance) * 0.1;
        efficiency *= positionFactor;
        
        return Math.max(0.1, Math.min(1.0, efficiency));
    }

    filterKeepoutConflicts() {
        if (!window.roofDetector) return;
        
        const keepouts = window.roofDetector.getKeepouts();
        if (!keepouts || keepouts.length === 0) return;
        
        this.panels = this.panels.filter(panel => {
            return !keepouts.some(keepout => {
                return this.panelConflictsWithKeepout(panel, keepout);
            });
        });
    }

    panelConflictsWithKeepout(panel, keepout) {
        const panelBounds = {
            west: panel.position.lng - panel.width / 2,
            east: panel.position.lng + panel.width / 2,
            north: panel.position.lat + panel.height / 2,
            south: panel.position.lat - panel.height / 2
        };
        
        const keepoutBounds = {
            west: keepout.position.lng - (keepout.size.width + keepout.buffer) / 2,
            east: keepout.position.lng + (keepout.size.width + keepout.buffer) / 2,
            north: keepout.position.lat + (keepout.size.height + keepout.buffer) / 2,
            south: keepout.position.lat - (keepout.size.height + keepout.buffer) / 2
        };
        
        return !(panelBounds.east < keepoutBounds.west ||
                panelBounds.west > keepoutBounds.east ||
                panelBounds.north < keepoutBounds.south ||
                panelBounds.south > keepoutBounds.north);
    }

    calculateRoofBounds() {
        const coords = this.roofBoundary.coordinates;
        let north = -90, south = 90, east = -180, west = 180;
        
        coords.forEach(coord => {
            north = Math.max(north, coord.lat);
            south = Math.min(south, coord.lat);
            east = Math.max(east, coord.lng);
            west = Math.min(west, coord.lng);
        });
        
        return { north, south, east, west };
    }

    isPointInRoof(lng, lat) {
        // Point-in-polygon test
        const coords = this.roofBoundary.coordinates;
        let inside = false;
        
        for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
            if (((coords[i].lat > lat) !== (coords[j].lat > lat)) &&
                (lng < (coords[j].lng - coords[i].lng) * (lat - coords[i].lat) / (coords[j].lat - coords[i].lat) + coords[i].lng)) {
                inside = !inside;
            }
        }
        
        return inside;
    }

    canFitPanel(centerX, centerY) {
        const corners = this.calculatePanelCorners(centerX, centerY);
        return corners.every(corner => this.isPointInRoof(corner.lng, corner.lat));
    }

    findLongestEdge(coords) {
        let maxLength = 0;
        let longestEdge = [];
        
        for (let i = 0; i < coords.length; i++) {
            const start = coords[i];
            const end = coords[(i + 1) % coords.length];
            const length = this.calculateDistance(start.lng, start.lat, end.lng, end.lat);
            
            if (length > maxLength) {
                maxLength = length;
                longestEdge = [start, end];
            }
        }
        
        return longestEdge;
    }

    calculateDistance(lng1, lat1, lng2, lat2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c * 3.28084; // Convert to feet
    }

    updatePanelStats() {
        if (window.statsCalculator) {
            window.statsCalculator.updatePanelData(this.panels);
        }
    }

    // Panel selection methods
    selectPanel(panelId) {
        const panel = this.panels.find(p => p.id === panelId);
        if (panel) {
            panel.selected = !panel.selected;
            if (panel.selected) {
                this.selectedPanels.push(panel);
            } else {
                this.selectedPanels = this.selectedPanels.filter(p => p.id !== panelId);
            }
        }
    }

    selectAllPanels() {
        this.panels.forEach(panel => {
            panel.selected = true;
        });
        this.selectedPanels = [...this.panels];
    }

    deselectAllPanels() {
        this.panels.forEach(panel => {
            panel.selected = false;
        });
        this.selectedPanels = [];
    }

    deleteSelectedPanels() {
        this.panels = this.panels.filter(panel => !panel.selected);
        this.selectedPanels = [];
        this.updatePanelStats();
    }

    // Panel manipulation methods
    movePanels(deltaX, deltaY) {
        this.selectedPanels.forEach(panel => {
            panel.position.lng += deltaX;
            panel.position.lat += deltaY;
            panel.corners = this.calculatePanelCorners(panel.position.lng, panel.position.lat);
        });
        this.updatePanelStats();
    }

    rotatePanels(angle) {
        this.selectedPanels.forEach(panel => {
            // Simple rotation around panel center
            panel.azimuth = (panel.azimuth + angle) % 360;
        });
        this.updatePanelStats();
    }

    clearPanels() {
        this.panels = [];
        this.selectedPanels = [];
        this.updatePanelStats();
    }

    // Getters
    getPanels() {
        return this.panels;
    }

    getSelectedPanels() {
        return this.selectedPanels;
    }

    getPanelCount() {
        return this.panels.length;
    }

    getTotalPower() {
        return this.panels.reduce((total, panel) => total + panel.power, 0);
    }

    getAverageEfficiency() {
        if (this.panels.length === 0) return 0;
        const totalEfficiency = this.panels.reduce((total, panel) => total + panel.efficiency, 0);
        return totalEfficiency / this.panels.length;
    }

    // Configuration methods
    setPanelSpecs(specs) {
        this.panelSpecs = { ...this.panelSpecs, ...specs };
        this.generatePanelLayout();
    }

    setSpacing(spacing) {
        this.spacing = { ...this.spacing, ...spacing };
        this.generatePanelLayout();
    }

    // Export data
    exportPanelData() {
        return {
            panels: this.panels,
            panelSpecs: this.panelSpecs,
            spacing: this.spacing,
            totalPower: this.getTotalPower(),
            averageEfficiency: this.getAverageEfficiency()
        };
    }
}

// Global instance
window.panelPlacer = new PanelPlacer();