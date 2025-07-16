// js/projectManager.js
class ProjectManager {
    constructor() {
        this.currentProject = null;
        this.projects = [];
        this.autoSaveEnabled = true;
        this.autoSaveInterval = 30000; // 30 seconds
        this.lastSaveTime = null;
        this.hasUnsavedChanges = false;
        
        this.initializeAutoSave();
        this.loadProjectsList();
    }

    initializeAutoSave() {
        if (this.autoSaveEnabled) {
            setInterval(() => {
                if (this.hasUnsavedChanges) {
                    this.autoSave();
                }
            }, this.autoSaveInterval);
        }
    }

    createNewProject(name) {
        const project = {
            id: this.generateProjectId(),
            name: name || 'Untitled Project',
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            version: '1.0',
            location: null,
            roofData: null,
            panelData: null,
            keepouts: [],
            settings: this.getDefaultSettings(),
            stats: null,
            notes: '',
            tags: []
        };
        
        this.currentProject = project;
        this.hasUnsavedChanges = false;
        return project;
    }

    generateProjectId() {
        return 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getDefaultSettings() {
        return {
            panelSpecs: {
                width: 5.4,
                height: 3.25,
                power: 400,
                efficiency: 0.20
            },
            spacing: {
                horizontal: 0.5,
                vertical: 0.5
            },
            units: 'imperial', // 'imperial' or 'metric'
            currency: 'CAD',
            location: 'Calgary, AB',
            electricityRate: 0.12,
            systemEfficiency: 0.85,
            preferences: {
                autoSave: true,
                showKeepouts: true,
                show3DPreview: true,
                highlightOptimalPanels: true
            }
        };
    }

    saveProject(name) {
        if (!this.currentProject) {
            this.createNewProject(name);
        }
        
        if (name) {
            this.currentProject.name = name;
        }
        
        // Gather current data from all modules
        this.currentProject.lastModified = new Date().toISOString();
        this.currentProject.location = window.mapManager?.getCurrentLocation();
        this.currentProject.roofData = window.roofDetector?.exportRoofData();
        this.currentProject.panelData = window.panelPlacer?.exportPanelData();
        this.currentProject.stats = window.statsCalculator?.exportStatsData();
        this.currentProject.model3D = window.model3D?.exportScene();
        
        // Save to localStorage
        try {
            const projectsData = this.getStoredProjects();
            const existingIndex = projectsData.findIndex(p => p.id === this.currentProject.id);
            
            if (existingIndex >= 0) {
                projectsData[existingIndex] = this.currentProject;
            } else {
                projectsData.push(this.currentProject);
            }
            
            localStorage.setItem('solarProjects', JSON.stringify(projectsData));
            this.projects = projectsData;
            this.lastSaveTime = new Date();
            this.hasUnsavedChanges = false;
            
            this.showSaveNotification('Project saved successfully!');
            return true;
        } catch (error) {
            console.error('Failed to save project:', error);
            this.showSaveNotification('Failed to save project!', 'error');
            return false;
        }
    }

    loadProject(projectId) {
        const projects = this.getStoredProjects();
        const project = projects.find(p => p.id === projectId);
        
        if (!project) {
            this.showSaveNotification('Project not found!', 'error');
            return false;
        }
        
        this.currentProject = project;
        
        // Load data into all modules
        try {
            // Load location and map
            if (project.location && window.mapManager) {
                window.mapManager.searchAddress(project.location.address);
            }
            
            // Load roof data
            if (project.roofData && window.roofDetector) {
                window.roofDetector.processRoofData(project.roofData.roofData);
                
                // Restore keepouts
                if (project.roofData.keepouts) {
                    project.roofData.keepouts.forEach(keepout => {
                        window.roofDetector.addKeepout(keepout.type, keepout.position, keepout.size);
                    });
                }
            }
            
            // Load panel data
            if (project.panelData && window.panelPlacer) {
                if (project.panelData.panelSpecs) {
                    window.panelPlacer.setPanelSpecs(project.panelData.panelSpecs);
                }
                if (project.panelData.spacing) {
                    window.panelPlacer.setSpacing(project.panelData.spacing);
                }
            }
            
            // Update settings
            if (project.settings) {
                this.applyProjectSettings(project.settings);
            }
            
            this.hasUnsavedChanges = false;
            this.showSaveNotification('Project loaded successfully!');
            return true;
        } catch (error) {
            console.error('Failed to load project:', error);
            this.showSaveNotification('Failed to load project!', 'error');
            return false;
        }
    }

    autoSave() {
        if (this.currentProject && this.autoSaveEnabled) {
            const originalName = this.currentProject.name;
            this.currentProject.name = originalName + ' (Auto-saved)';
            
            if (this.saveProject()) {
                this.currentProject.name = originalName; // Restore original name
                console.log('Project auto-saved at', new Date().toLocaleTimeString());
            }
        }
    }

    exportProject() {
        if (!this.currentProject) {
            this.showSaveNotification('No project to export!', 'error');
            return;
        }
        
        // Update project with current data
        this.saveProject();
        
        // Create downloadable JSON
        const exportData = {
            ...this.currentProject,
            exportedAt: new Date().toISOString(),
            exportVersion: '1.0',
            application: 'Solar Panel Roof Analyzer'
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `${this.currentProject.name.replace(/[^a-z0-9]/gi, '_')}_solar_project.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.showSaveNotification('Project exported successfully!');
    }

    importProject(file) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const projectData = JSON.parse(event.target.result);
                
                // Validate project data
                if (!this.validateProjectData(projectData)) {
                    this.showSaveNotification('Invalid project file!', 'error');
                    return;
                }
                
                // Generate new ID to avoid conflicts
                projectData.id = this.generateProjectId();
                projectData.name = projectData.name + ' (Imported)';
                projectData.importedAt = new Date().toISOString();
                
                // Load the project
                this.currentProject = projectData;
                
                // Save to local storage
                const projects = this.getStoredProjects();
                projects.push(projectData);
                localStorage.setItem('solarProjects', JSON.stringify(projects));
                this.projects = projects;
                
                // Load into modules
                this.loadProject(projectData.id);
                
                this.showSaveNotification('Project imported successfully!');
            } catch (error) {
                console.error('Failed to import project:', error);
                this.showSaveNotification('Failed to import project!', 'error');
            }
        };
        
        reader.readAsText(file);
    }

    validateProjectData(data) {
        const requiredFields = ['id', 'name', 'createdAt'];
        return requiredFields.every(field => data.hasOwnProperty(field));
    }

    getStoredProjects() {
        try {
            const stored = localStorage.getItem('solarProjects');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load projects from storage:', error);
            return [];
        }
    }

    loadProjectsList() {
        this.projects = this.getStoredProjects();
        return this.projects;
    }

    deleteProject(projectId) {
        const projects = this.getStoredProjects();
        const filteredProjects = projects.filter(p => p.id !== projectId);
        
        try {
            localStorage.setItem('solarProjects', JSON.stringify(filteredProjects));
            this.projects = filteredProjects;
            
            if (this.currentProject && this.currentProject.id === projectId) {
                this.currentProject = null;
            }
            
            this.showSaveNotification('Project deleted successfully!');
            return true;
        } catch (error) {
            console.error('Failed to delete project:', error);
            this.showSaveNotification('Failed to delete project!', 'error');
            return false;
        }
    }

    duplicateProject(projectId) {
        const projects = this.getStoredProjects();
        const project = projects.find(p => p.id === projectId);
        
        if (!project) {
            this.showSaveNotification('Project not found!', 'error');
            return false;
        }
        
        const duplicatedProject = {
            ...project,
            id: this.generateProjectId(),
            name: project.name + ' (Copy)',
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
        
        projects.push(duplicatedProject);
        
        try {
            localStorage.setItem('solarProjects', JSON.stringify(projects));
            this.projects = projects;
            this.showSaveNotification('Project duplicated successfully!');
            return duplicatedProject;
        } catch (error) {
            console.error('Failed to duplicate project:', error);
            this.showSaveNotification('Failed to duplicate project!', 'error');
            return false;
        }
    }

    applyProjectSettings(settings) {
        // Apply panel specifications
        if (settings.panelSpecs && window.panelPlacer) {
            window.panelPlacer.setPanelSpecs(settings.panelSpecs);
        }
        
        // Apply spacing settings
        if (settings.spacing && window.panelPlacer) {
            window.panelPlacer.setSpacing(settings.spacing);
        }
        
        // Apply other preferences
        if (settings.preferences) {
            this.autoSaveEnabled = settings.preferences.autoSave;
        }
    }

    createProjectSummary() {
        if (!this.currentProject) return null;
        
        return {
            id: this.currentProject.id,
            name: this.currentProject.name,
            createdAt: this.currentProject.createdAt,
            lastModified: this.currentProject.lastModified,
            location: this.currentProject.location?.address || 'Unknown',
            panelCount: this.currentProject.panelData?.panels?.length || 0,
            totalPower: this.currentProject.panelData?.totalPower || 0,
            roofArea: this.currentProject.roofData?.roofData?.area || 0,
            estimatedSavings: this.currentProject.stats?.costSavings?.yearly || 0
        };
    }

    generateReport() {
        if (!this.currentProject) {
            this.showSaveNotification('No project data to generate report!', 'error');
            return null;
        }
        
        const report = {
            projectInfo: this.createProjectSummary(),
            roofAnalysis: this.currentProject.roofData,
            panelConfiguration: this.currentProject.panelData,
            energyProduction: this.currentProject.stats?.energyProduction,
            financialAnalysis: this.currentProject.stats?.costSavings,
            environmentalImpact: this.currentProject.stats?.environmentalImpact,
            generatedAt: new Date().toISOString()
        };
        
        // Create PDF-ready HTML content
        const htmlContent = this.generateReportHTML(report);
        
        return {
            data: report,
            html: htmlContent
        };
    }

    generateReportHTML(report) {
        return `
            <html>
            <head>
                <title>Solar Analysis Report - ${report.projectInfo.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .section { margin-bottom: 25px; }
                    .section h2 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
                    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
                    .stat-box { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
                    .stat-value { font-size: 1.5em; font-weight: bold; color: #667eea; }
                    .financial-table { width: 100%; border-collapse: collapse; }
                    .financial-table th, .financial-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .financial-table th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Solar Panel Analysis Report</h1>
                    <h2>${report.projectInfo.name}</h2>
                    <p>Generated on ${new Date(report.generatedAt).toLocaleDateString()}</p>
                </div>
                
                <div class="section">
                    <h2>Project Overview</h2>
                    <div class="stats-grid">
                        <div class="stat-box">
                            <div class="stat-value">${report.projectInfo.panelCount}</div>
                            <div>Solar Panels</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${(report.projectInfo.totalPower / 1000).toFixed(1)} kW</div>
                            <div>System Size</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${report.projectInfo.roofArea.toFixed(0)} sq ft</div>
                            <div>Roof Area</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${report.projectInfo.estimatedSavings.toFixed(0)}</div>
                            <div>Annual Savings</div>
                        </div>
                    </div>
                </div>
                
                ${report.energyProduction ? `
                <div class="section">
                    <h2>Energy Production</h2>
                    <table class="financial-table">
                        <tr><th>Period</th><th>Energy Production (kWh)</th></tr>
                        <tr><td>Daily Average</td><td>${report.energyProduction.daily.toFixed(1)}</td></tr>
                        <tr><td>Monthly Average</td><td>${report.energyProduction.monthly.toFixed(0)}</td></tr>
                        <tr><td>Yearly Total</td><td>${report.energyProduction.yearly.toFixed(0)}</td></tr>
                    </table>
                </div>
                ` : ''}
                
                ${report.financialAnalysis ? `
                <div class="section">
                    <h2>Financial Analysis</h2>
                    <table class="financial-table">
                        <tr><th>Period</th><th>Estimated Savings (CAD)</th></tr>
                        <tr><td>Monthly</td><td>${report.financialAnalysis.monthly.toFixed(0)}</td></tr>
                        <tr><td>Yearly</td><td>${report.financialAnalysis.yearly.toFixed(0)}</td></tr>
                        <tr><td>25-Year Lifetime</td><td>${report.financialAnalysis.lifetime.toFixed(0)}</td></tr>
                    </table>
                </div>
                ` : ''}
                
                ${report.environmentalImpact ? `
                <div class="section">
                    <h2>Environmental Impact</h2>
                    <div class="stats-grid">
                        <div class="stat-box">
                            <div class="stat-value">${report.environmentalImpact.co2Avoided.toFixed(0)} kg</div>
                            <div>CO₂ Avoided Annually</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${report.environmentalImpact.treesEquivalent.toFixed(0)}</div>
                            <div>Trees Equivalent</div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <div class="section">
                    <h2>Technical Specifications</h2>
                    <p><strong>Location:</strong> ${report.projectInfo.location}</p>
                    <p><strong>Report Generated:</strong> ${new Date(report.generatedAt).toLocaleString()}</p>
                    <p><strong>Analysis Software:</strong> Solar Panel Roof Analyzer v1.0</p>
                </div>
            </body>
            </html>
        `;
    }

    showSaveNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            transition: all 0.3s ease;
            ${type === 'error' ? 'background-color: #e53e3e;' : 'background-color: #48bb78;'}
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Utility methods
    markAsModified() {
        this.hasUnsavedChanges = true;
        if (this.currentProject) {
            this.currentProject.lastModified = new Date().toISOString();
        }
    }

    getCurrentProject() {
        return this.currentProject;
    }

    getProjectsList() {
        return this.projects;
    }

    clearCurrentProject() {
        this.currentProject = null;
        this.hasUnsavedChanges = false;
    }

    // Settings management
    updateProjectSettings(newSettings) {
        if (this.currentProject) {
            this.currentProject.settings = { ...this.currentProject.settings, ...newSettings };
            this.markAsModified();
        }
    }

    getProjectSettings() {
        return this.currentProject?.settings || this.getDefaultSettings();
    }
}

// Global instance
window.projectManager = new ProjectManager();