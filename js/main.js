// js/main.js
class SolarAnalyzerApp {
    constructor() {
        this.initialized = false;
        this.currentMode = 'design'; // 'design', 'analysis', 'report'
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        console.log('🌞 Solar Panel Roof Analyzer - Initializing...');
        
        // Initialize UI components
        this.initializeUI();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize Google Maps (callback will be called when Maps API loads)
        window.initMap = () => this.initializeGoogleMaps();
        
        // Initialize other modules
        this.initializeModules();
        
        // Show welcome message
        this.showWelcomeMessage();
        
        this.initialized = true;
        console.log('✅ Application initialized successfully!');
    }

    initializeUI() {
        // Add loading states
        this.showLoading('mapLoading');
        
        // Initialize project name field
        const projectNameField = document.getElementById('projectName');
        if (projectNameField && !projectNameField.value) {
            projectNameField.value = 'My Solar Project ' + new Date().toLocaleDateString();
        }
        
        // Initialize any UI components that need setup
        this.setupToolTips();
        this.setupProgressIndicators();
    }

    setupEventListeners() {
        // Address search
        const addressInput = document.getElementById('addressSearch');
        if (addressInput) {
            addressInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchAddress();
                }
            });
        }
        
        // Project management events
        window.addEventListener('beforeunload', (e) => {
            if (window.projectManager?.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
        
        // Module change events
        document.addEventListener('roofDataChanged', () => {
            this.onRoofDataChanged();
        });
        
        document.addEventListener('panelsChanged', () => {
            this.onPanelsChanged();
        });
    }

    initializeGoogleMaps() {
        console.log('📍 Initializing Google Maps...');
        if (window.mapManager) {
            window.mapManager.initMap();
        }
    }

    initializeModules() {
        // Modules are already initialized via their constructors
        // Just verify they're available
        const modules = ['mapManager', 'roofDetector', 'panelPlacer', 'model3D', 'projectManager', 'statsCalculator'];
        
        modules.forEach(module => {
            if (window[module]) {
                console.log(`✅ ${module} initialized`);
            } else {
                console.warn(`⚠️ ${module} not found`);
            }
        });
    }

    setupToolTips() {
        // Add helpful tooltips to buttons and controls
        const tooltips = {
            'addressSearch': 'Enter any address to find and analyze the roof',
            'startRoofDetection': 'Click to manually outline the roof area',
            'generate3DModel': 'Generate a 3D visualization of your solar installation',
            'saveProject': 'Save your current project to browser storage',
            'exportProject': 'Download your project as a JSON file'
        };
        
        Object.entries(tooltips).forEach(([id, text]) => {
            const element = document.getElementById(id);
            if (element) {
                element.title = text;
            }
        });
    }

    setupProgressIndicators() {
        // Add progress indicators for multi-step processes
        // This could be enhanced with a step-by-step wizard
    }

    showWelcomeMessage() {
        const hasSeenWelcome = localStorage.getItem('solarAnalyzer_welcomeSeen');
        
        if (!hasSeenWelcome) {
            setTimeout(() => {
                this.showNotification(
                    '🌞 Welcome to Solar Panel Roof Analyzer! Start by searching for an address, then outline the roof to see optimal panel placement.',
                    'info',
                    8000
                );
                localStorage.setItem('solarAnalyzer_welcomeSeen', 'true');
            }, 1000);
        }
    }

    // Event Handlers
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + S: Save project
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveProject();
        }
        
        // Ctrl/Cmd + N: New project
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.newProject();
        }
        
        // Escape: Cancel current operation
        if (e.key === 'Escape') {
            this.cancelCurrentOperation();
        }
        
        // Delete: Remove selected panels
        if (e.key === 'Delete') {
            this.deleteSelectedPanels();
        }
    }

    handleWindowResize() {
        // Notify modules that need to handle resize
        if (window.model3D && window.model3D.handleResize) {
            window.model3D.handleResize();
        }
    }

    onRoofDataChanged() {
        console.log('🏠 Roof data changed');
        window.projectManager?.markAsModified();
        
        // Auto-generate panels when roof is detected
        if (window.panelPlacer) {
            // Small delay to ensure roof data is fully processed
            setTimeout(() => {
                window.panelPlacer.generatePanelLayout();
            }, 100);
        }
    }

    onPanelsChanged() {
        console.log('⚡ Panel data changed');
        window.projectManager?.markAsModified();
        
        // Update 3D view if it's generated
        if (window.model3D && window.model3D.isInitialized) {
            window.model3D.generateSolarPanels();
        }
    }

    cancelCurrentOperation() {
        // Cancel roof detection if in progress
        if (window.mapManager && window.mapManager.isDrawingMode) {
            window.mapManager.stopDrawing();
        }
        
        // Deselect panels
        if (window.panelPlacer) {
            window.panelPlacer.deselectAllPanels();
        }
    }

    deleteSelectedPanels() {
        if (window.panelPlacer) {
            const selectedCount = window.panelPlacer.getSelectedPanels().length;
            if (selectedCount > 0) {
                window.panelPlacer.deleteSelectedPanels();
                this.showNotification(`Deleted ${selectedCount} panel(s)`, 'info');
            }
        }
    }

    // Public API methods (called from HTML)
    searchAddress() {
        const addressInput = document.getElementById('addressSearch');
        const address = addressInput?.value?.trim();
        
        if (!address) {
            this.showNotification('Please enter an address', 'error');
            return;
        }
        
        if (window.mapManager) {
            window.mapManager.searchAddress(address);
        }
    }

    startRoofDetection() {
        if (window.mapManager) {
            window.mapManager.startRoofDetection();
        }
    }

    clearRoofDetection() {
        if (window.mapManager) {
            window.mapManager.clearRoofDetection();
        }
    }

    generate3DModel() {
        if (!window.roofDetector?.getRoofData()) {
            this.showNotification('Please detect a roof first!', 'error');
            return;
        }
        
        if (window.model3D) {
            window.model3D.generate3DModel();
        }
    }

    toggleView() {
        if (window.model3D) {
            window.model3D.toggleView();
        }
    }

    clearPanels() {
        if (window.panelPlacer) {
            window.panelPlacer.clearPanels();
        }
        
        if (window.model3D) {
            window.model3D.clearPanels();
        }
    }

    saveProject() {
        const projectNameInput = document.getElementById('projectName');
        const projectName = projectNameInput?.value?.trim() || 'Untitled Project';
        
        if (window.projectManager) {
            if (window.projectManager.saveProject(projectName)) {
                this.showNotification('Project saved successfully!', 'success');
            }
        }
    }

    newProject() {
        if (window.projectManager?.hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Create a new project anyway?')) {
                return;
            }
        }
        
        // Clear all modules
        this.clearRoofDetection();
        this.clearPanels();
        
        // Create new project
        if (window.projectManager) {
            const projectName = 'New Project ' + new Date().toLocaleDateString();
            window.projectManager.createNewProject(projectName);
            
            const projectNameInput = document.getElementById('projectName');
            if (projectNameInput) {
                projectNameInput.value = projectName;
            }
        }
        
        this.showNotification('New project created', 'info');
    }

    loadProject() {
        // For now, implement as a simple prompt
        // In a production app, this would show a project selection dialog
        const projects = window.projectManager?.getProjectsList() || [];
        
        if (projects.length === 0) {
            this.showNotification('No saved projects found', 'info');
            return;
        }
        
        // Simple implementation - load the most recent project
        const mostRecent = projects.sort((a, b) => 
            new Date(b.lastModified) - new Date(a.lastModified)
        )[0];
        
        if (window.projectManager) {
            if (window.projectManager.loadProject(mostRecent.id)) {
                const projectNameInput = document.getElementById('projectName');
                if (projectNameInput) {
                    projectNameInput.value = mostRecent.name;
                }
            }
        }
    }

    exportProject() {
        if (window.projectManager) {
            window.projectManager.exportProject();
        }
    }

    importProject(event) {
        const file = event.target.files[0];
        if (file && window.projectManager) {
            window.projectManager.importProject(file);
        }
        
        // Reset file input
        event.target.value = '';
    }

    // Utility methods
    showNotification(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            max-width: 400px;
            ${this.getNotificationStyles(type)}
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Slide in animation
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 10);
        
        // Auto-remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    getNotificationStyles(type) {
        const styles = {
            success: 'background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);',
            error: 'background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);',
            warning: 'background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);',
            info: 'background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);'
        };
        
        return styles[type] || styles.info;
    }

    showLoadingModal(message = 'Processing...') {
        const modal = document.createElement('div');
        modal.id = 'loadingModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 20000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; min-width: 200px;">
                <div style="border: 4px solid #f3f4f6; border-top: 4px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <p style="margin: 0; font-size: 16px; color: #333;">${message}</p>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    hideLoadingModal() {
        const modal = document.getElementById('loadingModal');
        if (modal) {
            modal.remove();
        }
    }

    // Advanced features
    generateReport() {
        if (!window.projectManager?.getCurrentProject()) {
            this.showNotification('No project data available for report generation', 'error');
            return;
        }
        
        this.showLoadingModal('Generating report...');
        
        setTimeout(() => {
            const report = window.projectManager.generateReport();
            
            if (report) {
                // Create a new window with the report
                const reportWindow = window.open('', '_blank');
                reportWindow.document.write(report.html);
                reportWindow.document.close();
                
                this.showNotification('Report generated successfully!', 'success');
            } else {
                this.showNotification('Failed to generate report', 'error');
            }
            
            this.hideLoadingModal();
        }, 1000);
    }

    showProjectSelector() {
        const projects = window.projectManager?.getProjectsList() || [];
        
        if (projects.length === 0) {
            this.showNotification('No saved projects found', 'info');
            return;
        }
        
        // Create project selector modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 20000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            width: 90%;
        `;
        
        content.innerHTML = `
            <h2 style="margin-top: 0; color: #333;">Select Project to Load</h2>
            <div id="projectsList"></div>
            <div style="margin-top: 20px; text-align: right;">
                <button onclick="this.closest('.modal').remove()" style="padding: 10px 20px; background: #ccc; border: none; border-radius: 5px; margin-right: 10px; cursor: pointer;">Cancel</button>
            </div>
        `;
        
        modal.className = 'modal';
        modal.appendChild(content);
        
        // Populate projects list
        const projectsList = content.querySelector('#projectsList');
        projects.forEach(project => {
            const projectDiv = document.createElement('div');
            projectDiv.style.cssText = `
                border: 1px solid #ddd;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 8px;
                cursor: pointer;
                transition: background-color 0.2s;
            `;
            
            projectDiv.innerHTML = `
                <h3 style="margin: 0 0 5px 0; color: #333;">${project.name}</h3>
                <p style="margin: 0; color: #666; font-size: 14px;">
                    Created: ${new Date(project.createdAt).toLocaleDateString()}<br>
                    Modified: ${new Date(project.lastModified).toLocaleDateString()}
                </p>
            `;
            
            projectDiv.addEventListener('mouseenter', () => {
                projectDiv.style.backgroundColor = '#f8f9fa';
            });
            
            projectDiv.addEventListener('mouseleave', () => {
                projectDiv.style.backgroundColor = '';
            });
            
            projectDiv.addEventListener('click', () => {
                if (window.projectManager.loadProject(project.id)) {
                    const projectNameInput = document.getElementById('projectName');
                    if (projectNameInput) {
                        projectNameInput.value = project.name;
                    }
                }
                modal.remove();
            });
            
            projectsList.appendChild(projectDiv);
        });
        
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Performance monitoring
    startPerformanceMonitoring() {
        if (typeof performance !== 'undefined') {
            this.performanceStart = performance.now();
        }
    }

    logPerformance(operation) {
        if (typeof performance !== 'undefined' && this.performanceStart) {
            const duration = performance.now() - this.performanceStart;
            console.log(`⏱️ ${operation} took ${duration.toFixed(2)}ms`);
        }
    }

    // Error handling
    handleError(error, context = 'Unknown') {
        console.error(`❌ Error in ${context}:`, error);
        this.showNotification(`Error: ${error.message || 'An unexpected error occurred'}`, 'error');
        
        // Log error for debugging
        if (window.projectManager) {
            window.projectManager.markAsModified();
        }
    }

    // Data validation
    validateProjectData() {
        const validation = {
            hasLocation: !!window.mapManager?.getCurrentLocation(),
            hasRoof: !!window.roofDetector?.getRoofData(),
            hasPanels: (window.panelPlacer?.getPanelCount() || 0) > 0,
            isValid: false
        };
        
        validation.isValid = validation.hasLocation && validation.hasRoof && validation.hasPanels;
        
        return validation;
    }

    // Auto-save functionality
    enableAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        this.autoSaveInterval = setInterval(() => {
            if (window.projectManager?.hasUnsavedChanges) {
                const currentProject = window.projectManager.getCurrentProject();
                if (currentProject) {
                    window.projectManager.autoSave();
                    console.log('📁 Project auto-saved');
                }
            }
        }, 30000); // Auto-save every 30 seconds
    }

    disableAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    // Help system
    showHelp(topic = 'general') {
        const helpContent = {
            general: `
                <h3>Getting Started</h3>
                <ol>
                    <li>Search for an address in the map panel</li>
                    <li>Click "Start Roof Detection" and outline the roof</li>
                    <li>View the automatically placed solar panels</li>
                    <li>Generate a 3D model to visualize the installation</li>
                    <li>Save your project for future reference</li>
                </ol>
            `,
            controls: `
                <h3>Keyboard Shortcuts</h3>
                <ul>
                    <li><strong>Ctrl+S:</strong> Save project</li>
                    <li><strong>Ctrl+N:</strong> New project</li>
                    <li><strong>Delete:</strong> Remove selected panels</li>
                    <li><strong>Escape:</strong> Cancel current operation</li>
                </ul>
            `,
            3d: `
                <h3>3D View Controls</h3>
                <ul>
                    <li><strong>Mouse drag:</strong> Rotate view</li>
                    <li><strong>Mouse wheel:</strong> Zoom in/out</li>
                    <li><strong>Click panels:</strong> Select/deselect</li>
                </ul>
            `
        };
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 20000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%;">
                <h2 style="margin-top: 0; color: #333;">Help & Instructions</h2>
                ${helpContent[topic] || helpContent.general}
                <div style="text-align: right; margin-top: 20px;">
                    <button onclick="this.closest('div').remove()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // App status and diagnostics
    getAppStatus() {
        return {
            initialized: this.initialized,
            modules: {
                mapManager: !!window.mapManager,
                roofDetector: !!window.roofDetector,
                panelPlacer: !!window.panelPlacer,
                model3D: !!window.model3D,
                projectManager: !!window.projectManager,
                statsCalculator: !!window.statsCalculator
            },
            currentProject: window.projectManager?.getCurrentProject()?.name || 'None',
            validation: this.validateProjectData()
        };
    }

    // Debug mode
    enableDebugMode() {
        window.solarAnalyzerDebug = true;
        console.log('🐛 Debug mode enabled');
        console.log('App Status:', this.getAppStatus());
        
        // Add debug panel
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debugPanel';
        debugPanel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 15000;
            max-width: 300px;
        `;
        
        debugPanel.innerHTML = `
            <div>🐛 Debug Mode</div>
            <div>Status: ${this.initialized ? 'Ready' : 'Loading'}</div>
            <div>Project: ${window.projectManager?.getCurrentProject()?.name || 'None'}</div>
            <button onclick="console.log(window.solarApp.getAppStatus())" style="margin-top: 5px; padding: 2px 8px; background: #333; color: white; border: 1px solid #666; border-radius: 3px; cursor: pointer;">Log Status</button>
        `;
        
        document.body.appendChild(debugPanel);
    }
}

// Global application instance
window.solarApp = new SolarAnalyzerApp();

// Global functions for HTML onclick handlers
function searchAddress() {
    window.solarApp.searchAddress();
}

function startRoofDetection() {
    window.solarApp.startRoofDetection();
}

function clearRoofDetection() {
    window.solarApp.clearRoofDetection();
}

function generate3DModel() {
    window.solarApp.generate3DModel();
}

function toggleView() {
    window.solarApp.toggleView();
}

function clearPanels() {
    window.solarApp.clearPanels();
}

function saveProject() {
    window.solarApp.saveProject();
}

function loadProject() {
    window.solarApp.showProjectSelector();
}

function exportProject() {
    window.solarApp.exportProject();
}

function importProject(event) {
    window.solarApp.importProject(event);
}

// Initialize Google Maps callback
function initMap() {
    if (window.mapManager) {
        window.mapManager.initMap();
    }
}

// Error handling
window.addEventListener('error', (event) => {
    if (window.solarApp) {
        window.solarApp.handleError(event.error, 'Global');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    if (window.solarApp) {
        window.solarApp.handleError(event.reason, 'Promise Rejection');
    }
});

console.log('🚀 Solar Panel Roof Analyzer - Main script loaded');