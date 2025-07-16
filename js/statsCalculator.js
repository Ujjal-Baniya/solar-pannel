// js/statsCalculator.js
class StatsCalculator {
    constructor() {
        this.roofArea = 0;
        this.panelData = [];
        this.totalPower = 0;
        this.averageEfficiency = 0;
        this.panelCount = 0;
        this.energyProduction = {
            daily: 0,
            monthly: 0,
            yearly: 0
        };
        this.costSavings = {
            monthly: 0,
            yearly: 0,
            lifetime: 0
        };
        this.environmentalImpact = {
            co2Avoided: 0,
            treesEquivalent: 0
        };
    }

    updateRoofArea(area) {
        this.roofArea = area;
        this.updateDisplay();
        this.calculateEnergyProduction();
    }

    updatePanelData(panels) {
        this.panelData = panels || [];
        this.panelCount = this.panelData.length;
        
        // Calculate total power
        this.totalPower = this.panelData.reduce((total, panel) => {
            return total + (panel.power || 0);
        }, 0);
        
        // Calculate average efficiency
        if (this.panelCount > 0) {
            const totalEfficiency = this.panelData.reduce((total, panel) => {
                return total + (panel.efficiency || 0);
            }, 0);
            this.averageEfficiency = totalEfficiency / this.panelCount;
        } else {
            this.averageEfficiency = 0;
        }
        
        this.updateDisplay();
        this.calculateEnergyProduction();
        this.calculateCostSavings();
        this.calculateEnvironmentalImpact();
    }

    calculateEnergyProduction() {
        if (this.totalPower === 0) {
            this.energyProduction = { daily: 0, monthly: 0, yearly: 0 };
            return;
        }

        // Average sun hours per day (location dependent - using Calgary, Alberta)
        const sunHoursPerDay = 4.2; // Annual average for Calgary
        
        // Seasonal variations
        const seasonalFactors = {
            spring: 1.1,
            summer: 1.3,
            fall: 0.9,
            winter: 0.6
        };
        
        // System losses (inverter, wiring, etc.)
        const systemEfficiency = 0.85;
        
        // Basic calculation: Power (kW) × Sun Hours × Efficiency × System Efficiency
        const baseDaily = (this.totalPower / 1000) * sunHoursPerDay * this.averageEfficiency * systemEfficiency;
        
        this.energyProduction.daily = baseDaily;
        this.energyProduction.monthly = baseDaily * 30;
        this.energyProduction.yearly = baseDaily * 365;
    }

    calculateCostSavings() {
        if (this.energyProduction.yearly === 0) {
            this.costSavings = { monthly: 0, yearly: 0, lifetime: 0 };
            return;
        }

        // Alberta electricity rates (approximate)
        const electricityRate = 0.12; // CAD per kWh
        const annualRateIncrease = 0.03; // 3% per year
        
        // Calculate yearly savings
        this.costSavings.yearly = this.energyProduction.yearly * electricityRate;
        this.costSavings.monthly = this.costSavings.yearly / 12;
        
        // Calculate 25-year lifetime savings with rate increases
        let lifetimeSavings = 0;
        let currentRate = electricityRate;
        
        for (let year = 1; year <= 25; year++) {
            lifetimeSavings += this.energyProduction.yearly * currentRate;
            currentRate *= (1 + annualRateIncrease);
        }
        
        this.costSavings.lifetime = lifetimeSavings;
    }

    calculateEnvironmentalImpact() {
        if (this.energyProduction.yearly === 0) {
            this.environmentalImpact = { co2Avoided: 0, treesEquivalent: 0 };
            return;
        }

        // Alberta grid emissions factor (kg CO2 per kWh)
        const emissionsFactor = 0.610; // kg CO2/kWh for Alberta
        
        // Calculate CO2 avoided per year
        this.environmentalImpact.co2Avoided = this.energyProduction.yearly * emissionsFactor;
        
        // Trees equivalent (1 tree absorbs ~21.77 kg CO2 per year)
        this.environmentalImpact.treesEquivalent = this.environmentalImpact.co2Avoided / 21.77;
    }

    updateDisplay() {
        // Update main stats cards
        this.updateStatCard('roofAreaStat', this.formatNumber(this.roofArea, 0));
        this.updateStatCard('panelCountStat', this.panelCount);
        this.updateStatCard('powerOutputStat', this.formatNumber(this.totalPower / 1000, 1));
        this.updateStatCard('efficiencyStat', this.formatNumber(this.averageEfficiency * 100, 1));
    }

    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    formatNumber(number, decimals = 2) {
        if (isNaN(number) || number === null || number === undefined) return '0';
        return number.toLocaleString('en-CA', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    formatCurrency(amount, decimals = 0) {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(amount);
    }

    generateDetailedReport() {
        return {
            overview: {
                roofArea: this.roofArea,
                panelCount: this.panelCount,
                totalPower: this.totalPower,
                averageEfficiency: this.averageEfficiency,
                systemSize: this.totalPower / 1000 // kW
            },
            energyProduction: {
                daily: this.energyProduction.daily,
                monthly: this.energyProduction.monthly,
                yearly: this.energyProduction.yearly
            },
            financials: {
                monthlySavings: this.costSavings.monthly,
                yearlySavings: this.costSavings.yearly,
                lifetimeSavings: this.costSavings.lifetime,
                paybackPeriod: this.calculatePaybackPeriod(),
                roi: this.calculateROI()
            },
            environmental: {
                co2AvoidedYearly: this.environmentalImpact.co2Avoided,
                co2AvoidedLifetime: this.environmentalImpact.co2Avoided * 25,
                treesEquivalent: this.environmentalImpact.treesEquivalent
            },
            technical: {
                panelDetails: this.analyzePanelPerformance(),
                roofUtilization: this.calculateRoofUtilization(),
                seasonalProduction: this.calculateSeasonalProduction()
            }
        };
    }

    calculatePaybackPeriod() {
        if (this.costSavings.yearly === 0) return 0;
        
        // Estimate system cost (CAD per watt installed)
        const costPerWatt = 3.50; // Alberta average
        const systemCost = (this.totalPower / 1000) * 1000 * costPerWatt;
        
        // Calculate payback period in years
        return systemCost / this.costSavings.yearly;
    }

    calculateROI() {
        const paybackPeriod = this.calculatePaybackPeriod();
        if (paybackPeriod === 0 || paybackPeriod > 25) return 0;
        
        // ROI over 25 years
        const systemCost = (this.totalPower / 1000) * 1000 * 3.50;
        const totalReturn = this.costSavings.lifetime;
        
        return ((totalReturn - systemCost) / systemCost) * 100;
    }

    analyzePanelPerformance() {
        if (this.panelData.length === 0) return {};
        
        const efficiencies = this.panelData.map(panel => panel.efficiency || 0);
        const powers = this.panelData.map(panel => panel.power || 0);
        
        return {
            minEfficiency: Math.min(...efficiencies),
            maxEfficiency: Math.max(...efficiencies),
            avgEfficiency: efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length,
            minPower: Math.min(...powers),
            maxPower: Math.max(...powers),
            avgPower: powers.reduce((a, b) => a + b, 0) / powers.length,
            totalPanels: this.panelData.length
        };
    }

    calculateRoofUtilization() {
        if (this.roofArea === 0) return 0;
        
        // Estimate panel area
        const panelSpecs = window.panelPlacer?.panelSpecs || { width: 5.4, height: 3.25 };
        const singlePanelArea = panelSpecs.width * panelSpecs.height;
        const totalPanelArea = this.panelCount * singlePanelArea;
        
        return (totalPanelArea / this.roofArea) * 100;
    }

    calculateSeasonalProduction() {
        const baseDaily = this.energyProduction.daily;
        
        // Seasonal factors for Calgary
        const seasons = {
            winter: { factor: 0.6, months: ['Dec', 'Jan', 'Feb'] },
            spring: { factor: 1.1, months: ['Mar', 'Apr', 'May'] },
            summer: { factor: 1.3, months: ['Jun', 'Jul', 'Aug'] },
            fall: { factor: 0.9, months: ['Sep', 'Oct', 'Nov'] }
        };
        
        const seasonalData = {};
        Object.keys(seasons).forEach(season => {
            seasonalData[season] = {
                dailyAverage: baseDaily * seasons[season].factor,
                monthlyAverage: baseDaily * seasons[season].factor * 30,
                months: seasons[season].months
            };
        });
        
        return seasonalData;
    }

    exportStatsData() {
        return {
            timestamp: new Date().toISOString(),
            basicStats: {
                roofArea: this.roofArea,
                panelCount: this.panelCount,
                totalPower: this.totalPower,
                averageEfficiency: this.averageEfficiency
            },
            energyProduction: this.energyProduction,
            costSavings: this.costSavings,
            environmentalImpact: this.environmentalImpact,
            detailedReport: this.generateDetailedReport()
        };
    }

    reset() {
        this.roofArea = 0;
        this.panelData = [];
        this.totalPower = 0;
        this.averageEfficiency = 0;
        this.panelCount = 0;
        this.energyProduction = { daily: 0, monthly: 0, yearly: 0 };
        this.costSavings = { monthly: 0, yearly: 0, lifetime: 0 };
        this.environmentalImpact = { co2Avoided: 0, treesEquivalent: 0 };
        this.updateDisplay();
    }

    // Comparison methods
    compareScenarios(scenarios) {
        return scenarios.map(scenario => {
            const stats = new StatsCalculator();
            stats.updateRoofArea(scenario.roofArea);
            stats.updatePanelData(scenario.panels);
            
            return {
                name: scenario.name,
                stats: stats.generateDetailedReport()
            };
        });
    }

    // Performance benchmarking
    benchmarkAgainstAverage() {
        // Average solar installation benchmarks for Alberta
        const benchmarks = {
            systemSizeKW: 7.5,
            yearlyProductionKWh: 8500,
            yearlySavingsCAD: 1020,
            paybackYears: 12,
            roiPercent: 180
        };
        
        const currentStats = this.generateDetailedReport();
        
        return {
            systemSize: {
                current: currentStats.overview.systemSize,
                benchmark: benchmarks.systemSizeKW,
                comparison: ((currentStats.overview.systemSize / benchmarks.systemSizeKW) - 1) * 100
            },
            yearlyProduction: {
                current: currentStats.energyProduction.yearly,
                benchmark: benchmarks.yearlyProductionKWh,
                comparison: ((currentStats.energyProduction.yearly / benchmarks.yearlyProductionKWh) - 1) * 100
            },
            yearlySavings: {
                current: currentStats.financials.yearlySavings,
                benchmark: benchmarks.yearlySavingsCAD,
                comparison: ((currentStats.financials.yearlySavings / benchmarks.yearlySavingsCAD) - 1) * 100
            },
            paybackPeriod: {
                current: currentStats.financials.paybackPeriod,
                benchmark: benchmarks.paybackYears,
                comparison: ((benchmarks.paybackYears / currentStats.financials.paybackPeriod) - 1) * 100
            },
            roi: {
                current: currentStats.financials.roi,
                benchmark: benchmarks.roiPercent,
                comparison: ((currentStats.financials.roi / benchmarks.roiPercent) - 1) * 100
            }
        };
    }

    // Real-time monitoring simulation
    simulateRealTimeProduction() {
        if (this.totalPower === 0) return 0;
        
        const now = new Date();
        const hour = now.getHours();
        const month = now.getMonth();
        
        // Seasonal factor
        const seasonalFactors = [0.6, 0.7, 0.9, 1.1, 1.2, 1.3, 1.3, 1.2, 1.0, 0.8, 0.6, 0.5];
        const seasonalFactor = seasonalFactors[month];
        
        // Daily production curve (simplified)
        let hourlyFactor = 0;
        if (hour >= 6 && hour <= 18) {
            const normalizedHour = (hour - 6) / 12; // 0 to 1
            hourlyFactor = Math.sin(normalizedHour * Math.PI); // Bell curve
        }
        
        // Current power output (kW)
        const currentPower = (this.totalPower / 1000) * hourlyFactor * seasonalFactor * this.averageEfficiency;
        
        return Math.max(0, currentPower);
    }
}

// Global instance
window.statsCalculator = new StatsCalculator();