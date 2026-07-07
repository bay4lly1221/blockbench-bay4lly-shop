/**
 * Bay4lly Shop - Professional Third-Party Plugin Marketplace for Blockbench
 * Production Version
 * 
 * A complete marketplace solution that reads plugin information from a custom GitHub repository.
 * This version fetches all data from a live repository - no demo data included.
 * 
 * CONFIGURATION:
 * ===============
 * To use this plugin, you MUST configure the REPO_URL variable below to point to your GitHub repository.
 * 
 * Example repository structure:
 * - https://github.com/YourUsername/your-repo/
 *   - plugins.json (metadata for all plugins)
 *   - plugins/
 *     - plugin_id_1/
 *       - plugin.js
 *       - icon.png
 *       - banner.png
 *       - README.md
 *       - changelog.json
 *     - plugin_id_2/
 *       - ...
 * 
 * @author Bay4lly
 * @version 2.0.0
 * @license MIT
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION - EDIT THIS SECTION
    // ============================================
    const PLUGIN_ID = 'bay4lly_shop';
    
    // Replace this URL with your GitHub repository URL
    // Must point to the raw GitHub content (main branch)
    // Example: https://raw.githubusercontent.com/YourUsername/your-repo/main/
    const REPO_URL = 'https://raw.githubusercontent.com/bay4lly1221/bay4lly-shop-repo/main/';
    
    // Cache duration in milliseconds (1 hour)
    const CACHE_DURATION = 3600000;
    
    // ============================================
    // END CONFIGURATION
    // ============================================
    
    let shop_dialog = null;
    let current_view = 'home';
    let current_category = 'All';
    let current_search = '';
    let repo_error = null;

    const Bay4llyShop = {
        plugins: [],
        installed_plugins: {},
        cache: { plugins: null, timestamp: 0 },
        
        categories: [
            { name: 'All', icon: 'apps' },
            { name: 'Featured', icon: 'star' },
            { name: 'Models', icon: 'view_in_ar' },
            { name: 'Textures', icon: 'texture' },
            { name: 'Tools', icon: 'build' },
            { name: 'Animations', icon: 'movie' },
            { name: 'Shaders', icon: 'wb_sunny' },
            { name: 'Other', icon: 'extension' }
        ],

        async init() {
            this.setupActions();
            await this.loadInstalledPlugins();
            console.log('[Bay4lly Shop] Plugin initialized - Repository: ' + REPO_URL);
        },

        setupActions() {
            this.action = new Action('open_bay4lly_shop', {
                name: 'Bay4lly Shop',
                icon: 'shopping_cart',
                category: 'help',
                click: () => this.open()
            });
            MenuBar.addAction(this.action, 'help.1');
        },

        async loadInstalledPlugins() {
            try {
                const stored = localStorage.getItem('bay4lly_shop_installed');
                this.installed_plugins = stored ? JSON.parse(stored) : {};
            } catch (e) {
                console.warn('[Bay4lly Shop] Error loading installed plugins:', e);
                this.installed_plugins = {};
            }
        },

        saveInstalledPlugins() {
            localStorage.setItem('bay4lly_shop_installed', JSON.stringify(this.installed_plugins));
        },

        /**
         * Fetch plugins from repository with caching and error handling
         */
        async fetchPlugins(force_refresh = false) {
            try {
                // Check cache first
                if (!force_refresh && this.cache.plugins && 
                    (Date.now() - this.cache.timestamp) < CACHE_DURATION) {
                    return this.cache.plugins;
                }

                console.log('[Bay4lly Shop] Fetching plugins from: ' + REPO_URL + 'plugins.json');
                
                const response = await fetch(`${REPO_URL}plugins.json`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                // Validate data
                if (!Array.isArray(data)) {
                    throw new Error('Invalid plugins.json format - expected an array');
                }
                
                this.plugins = data;
                this.cache.plugins = this.plugins;
                this.cache.timestamp = Date.now();
                repo_error = null;
                
                console.log(`[Bay4lly Shop] Successfully loaded ${this.plugins.length} plugins`);
                return this.plugins;
                
            } catch (e) {
                console.error('[Bay4lly Shop] Error fetching plugins:', e);
                repo_error = e.message;
                
                // Try to return cached data if available
                if (this.cache.plugins) {
                    console.log('[Bay4lly Shop] Using cached data');
                    return this.cache.plugins;
                }
                
                // No cache available - throw error
                throw e;
            }
        },

        open() {
            current_view = 'home';
            current_category = 'All';
            current_search = '';

            shop_dialog = new Dialog({
                id: 'bay4lly_shop_dialog',
                title: 'Bay4lly Shop',
                width: 1100,
                lines: [this.getMainHTML()],
                onConfirm() {
                    shop_dialog.close();
                },
                buttons: []
            }).show();

            setTimeout(() => this.initializeUI(), 100);
        },

        getMainHTML() {
            return `
                <style>
                    ${this.getStyles()}
                </style>
                <div id="bay4lly_shop_container">
                    <div class="shop-header">
                        <h2 class="shop-title">
                            <i class="material-icons">shopping_cart</i>
                            Bay4lly Shop
                        </h2>
                        <input type="text" class="shop-search-bar" id="shop_search" placeholder="Search...">
                        <div class="shop-user-actions">
                            <button class="button" onclick="Bay4llyShop.showUpdates()" title="Check for updates">
                                <i class="material-icons">update</i>
                            </button>
                            <button class="button" onclick="Bay4llyShop.showInstalled()" title="Show installed plugins">
                                <i class="material-icons">download</i>
                            </button>
                            <button class="button" onclick="Bay4llyShop.refreshRepository()" title="Refresh from repository">
                                <i class="material-icons">refresh</i>
                            </button>
                        </div>
                    </div>
                    <div id="error_banner" style="display: none;"></div>
                    <div class="shop-content">
                        <div class="shop-sidebar" id="shop_sidebar"></div>
                        <div class="shop-main" id="shop_main">
                            <div class="loading-container">
                                <div class="loading-spinner"></div>
                                <p>Loading marketplace from repository...</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        getStyles() {
            return `
                * { box-sizing: border-box; }
                
                #bay4lly_shop_container {
                    display: flex;
                    flex-direction: column;
                    height: 85vh;
                    width: 100%;
                    color: var(--color-text);
                    font-family: var(--font-ui);
                    background: var(--color-ui);
                    overflow: hidden;
                }
                
                #error_banner {
                    background: #f44336;
                    color: white;
                    padding: 12px 15px;
                    font-size: 12px;
                    border-bottom: 1px solid #d32f2f;
                }
                
                #error_banner.warning {
                    background: #ff9800;
                    border-bottom-color: #e65100;
                }
                
                .shop-header {
                    display: flex;
                    align-items: center;
                    padding: 12px 15px;
                    background: var(--color-back);
                    border-bottom: 1px solid var(--color-border);
                    gap: 10px;
                    flex-wrap: wrap;
                    min-height: 50px;
                }
                
                .shop-title {
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 18px;
                    font-weight: 600;
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                
                .shop-title i {
                    font-size: 24px;
                    color: var(--color-accent);
                }
                
                .shop-search-bar {
                    flex: 1;
                    min-width: 150px;
                    padding: 8px 12px;
                    background: var(--color-button);
                    border: 1px solid var(--color-border);
                    border-radius: 16px;
                    color: var(--color-text);
                    outline: none;
                    font-size: 13px;
                }
                
                .shop-search-bar:focus {
                    border-color: var(--color-accent);
                }
                
                .shop-user-actions {
                    display: flex;
                    gap: 6px;
                    flex-shrink: 0;
                }
                
                .shop-user-actions .button {
                    padding: 6px 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .shop-user-actions i {
                    font-size: 18px;
                }
                
                .shop-content {
                    display: flex;
                    flex: 1;
                    overflow: hidden;
                    width: 100%;
                }
                
                .shop-sidebar {
                    width: 200px;
                    padding: 10px;
                    background: var(--color-back);
                    border-right: 1px solid var(--color-border);
                    overflow-y: auto;
                    overflow-x: hidden;
                    flex-shrink: 0;
                }
                
                .sidebar-item {
                    padding: 8px 12px;
                    margin-bottom: 4px;
                    cursor: pointer;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    white-space: nowrap;
                    transition: all 0.2s;
                }
                
                .sidebar-item i {
                    font-size: 18px;
                    flex-shrink: 0;
                }
                
                .sidebar-item:hover {
                    background: var(--color-button);
                }
                
                .sidebar-item.active {
                    background: var(--color-accent);
                    color: var(--color-accent_text);
                    font-weight: 600;
                }
                
                .shop-main {
                    flex: 1;
                    padding: 15px;
                    overflow-y: auto;
                    overflow-x: hidden;
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                }
                
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    text-align: center;
                }
                
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid var(--color-border);
                    border-top-color: var(--color-accent);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 15px;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                .plugins-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    gap: 15px;
                    width: 100%;
                }
                
                .plugin-card {
                    background: var(--color-button);
                    border-radius: 10px;
                    overflow: hidden;
                    transition: all 0.3s;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    border: 1px solid transparent;
                    position: relative;
                    min-height: 220px;
                }
                
                .plugin-card:active {
                    transform: scale(0.98);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                }
                
                .plugin-banner {
                    height: 100px;
                    background-size: cover;
                    background-position: center;
                    background-color: #333;
                    position: relative;
                }
                
                .plugin-icon-overlay {
                    width: 45px;
                    height: 45px;
                    background: var(--color-button);
                    border-radius: 8px;
                    position: absolute;
                    top: 80px;
                    left: 10px;
                    border: 2px solid var(--color-back);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1;
                }
                
                .plugin-icon-overlay i {
                    font-size: 24px;
                    color: var(--color-accent);
                }
                
                .plugin-icon-overlay img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 6px;
                }
                
                .plugin-info {
                    padding: 30px 12px 12px 12px;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                }
                
                .plugin-title {
                    font-size: 13px;
                    font-weight: 600;
                    margin-bottom: 3px;
                    line-height: 1.2;
                    word-break: break-word;
                }
                
                .plugin-author {
                    font-size: 11px;
                    opacity: 0.6;
                    margin-bottom: 8px;
                }
                
                .plugin-badges {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    margin-top: auto;
                }
                
                .plugin-badge {
                    font-size: 9px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-weight: bold;
                    text-transform: uppercase;
                    white-space: nowrap;
                }
                
                .badge-verified { background: #4caf50; color: white; }
                .badge-featured { background: #ff9800; color: white; }
                .badge-beta { background: #2196f3; color: white; }
                
                .details-container {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    width: 100%;
                    height: 100%;
                    overflow-y: auto;
                }
                
                .details-header {
                    position: relative;
                    height: 150px;
                    border-radius: 10px;
                    overflow: hidden;
                    flex-shrink: 0;
                }
                
                .details-banner {
                    width: 100%;
                    height: 100%;
                    background-size: cover;
                    background-position: center;
                    background-color: #333;
                }
                
                .details-meta {
                    display: flex;
                    gap: 15px;
                    align-items: flex-end;
                    margin-top: -50px;
                    padding: 0 15px;
                    flex-shrink: 0;
                }
                
                .details-icon {
                    width: 90px;
                    height: 90px;
                    background: var(--color-button);
                    border-radius: 15px;
                    border: 3px solid var(--color-back);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1;
                    flex-shrink: 0;
                }
                
                .details-icon img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 12px;
                }
                
                .details-title-box {
                    flex: 1;
                    padding-bottom: 10px;
                }
                
                .details-title-box h1 {
                    margin: 0 0 3px 0;
                    font-size: 18px;
                }
                
                .details-actions {
                    display: flex;
                    gap: 8px;
                    flex-shrink: 0;
                    padding-bottom: 10px;
                }
                
                .btn-install {
                    background: var(--color-accent);
                    color: var(--color-accent_text);
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-weight: bold;
                    border: none;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                
                .readme-content {
                    background: var(--color-button);
                    padding: 15px;
                    border-radius: 10px;
                    line-height: 1.5;
                    font-size: 12px;
                    flex: 1;
                    overflow-y: auto;
                }
                
                .readme-content h3 {
                    margin-top: 0;
                    font-size: 14px;
                }
                
                .info-block {
                    background: var(--color-button);
                    padding: 12px;
                    border-radius: 8px;
                    font-size: 12px;
                }
                
                .info-label {
                    font-size: 10px;
                    opacity: 0.6;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                }
                
                .info-value {
                    font-weight: bold;
                }
                
                /* Mobile Styles */
                @media (max-width: 768px) {
                    .shop-header {
                        padding: 10px;
                        min-height: 45px;
                    }
                    
                    .shop-title {
                        font-size: 16px;
                    }
                    
                    .shop-search-bar {
                        min-width: 100px;
                        font-size: 12px;
                    }
                    
                    .shop-user-actions .button {
                        padding: 5px 8px;
                    }
                    
                    .shop-content {
                        flex-direction: column;
                    }
                    
                    .shop-sidebar {
                        width: 100%;
                        height: auto;
                        display: flex;
                        overflow-x: auto;
                        overflow-y: hidden;
                        padding: 8px;
                        border-right: none;
                        border-bottom: 1px solid var(--color-border);
                        -webkit-overflow-scrolling: touch;
                    }
                    
                    .sidebar-item {
                        margin-bottom: 0;
                        margin-right: 6px;
                        padding: 6px 10px;
                        display: inline-flex;
                        flex-shrink: 0;
                    }
                    
                    .plugins-grid {
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        gap: 12px;
                    }
                    
                    .plugin-card {
                        min-height: 200px;
                    }
                    
                    .plugin-banner {
                        height: 90px;
                    }
                    
                    .plugin-icon-overlay {
                        width: 40px;
                        height: 40px;
                        top: 75px;
                    }
                    
                    .plugin-info {
                        padding: 28px 10px 10px 10px;
                    }
                    
                    .plugin-title {
                        font-size: 12px;
                    }
                    
                    .plugin-author {
                        font-size: 10px;
                    }
                    
                    .details-header {
                        height: 120px;
                    }
                    
                    .details-meta {
                        margin-top: -40px;
                    }
                    
                    .details-icon {
                        width: 75px;
                        height: 75px;
                    }
                    
                    .details-title-box h1 {
                        font-size: 16px;
                    }
                    
                    .btn-install {
                        padding: 6px 12px;
                        font-size: 11px;
                    }
                    
                    .readme-content {
                        font-size: 11px;
                    }
                }
                
                @media (max-width: 480px) {
                    .shop-title {
                        font-size: 14px;
                    }
                    
                    .plugins-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .plugin-card {
                        min-height: 180px;
                    }
                    
                    .details-meta {
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                    }
                    
                    .details-actions {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `;
        },

        async initializeUI() {
            try {
                await this.fetchPlugins();
                this.renderSidebar();
                this.applyFilters();
                this.attachEventListeners();
            } catch (e) {
                this.showError('Failed to load plugins from repository', e.message);
            }
        },

        showError(title, message) {
            const errorBanner = document.getElementById('error_banner');
            if (errorBanner) {
                errorBanner.innerHTML = `<strong>${title}:</strong> ${message}`;
                errorBanner.style.display = 'block';
            }
            
            const main = document.getElementById('shop_main');
            if (main) {
                main.innerHTML = `
                    <div class="loading-container">
                        <i class="material-icons" style="font-size: 64px; opacity: 0.3; color: #f44336;">error_outline</i>
                        <h3>${title}</h3>
                        <p style="opacity: 0.6; max-width: 400px;">${message}</p>
                        <p style="opacity: 0.5; font-size: 11px;">Make sure your repository URL is correct and contains a valid plugins.json file.</p>
                        <button class="button" onclick="Bay4llyShop.refreshRepository()" style="margin-top: 10px;">
                            <i class="material-icons">refresh</i> Try Again
                        </button>
                    </div>
                `;
            }
        },

        attachEventListeners() {
            const searchInput = document.getElementById('shop_search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    current_search = e.target.value;
                    this.applyFilters();
                });
            }
        },

        renderSidebar() {
            const sidebar = document.getElementById('shop_sidebar');
            if (!sidebar) return;
            
            sidebar.innerHTML = this.categories.map(cat => `
                <div class="sidebar-item ${cat.name === current_category ? 'active' : ''}" 
                     onclick="Bay4llyShop.filterByCategory('${cat.name}')">
                    <i class="material-icons">${cat.icon}</i>
                    <span>${cat.name}</span>
                </div>
            `).join('');
        },

        applyFilters() {
            let filtered = this.plugins;

            if (current_category === 'Featured') {
                filtered = filtered.filter(p => p.featured);
            } else if (current_category !== 'All') {
                filtered = filtered.filter(p => 
                    p.category === current_category || 
                    (p.tags && p.tags.includes(current_category))
                );
            }

            if (current_search) {
                const query = current_search.toLowerCase();
                filtered = filtered.filter(p =>
                    p.title.toLowerCase().includes(query) ||
                    p.description.toLowerCase().includes(query) ||
                    p.author.toLowerCase().includes(query) ||
                    (p.tags && p.tags.some(t => t.toLowerCase().includes(query)))
                );
            }

            this.renderPlugins(filtered);
        },

        renderPlugins(plugins) {
            const main = document.getElementById('shop_main');
            if (!main) return;

            if (plugins.length === 0) {
                main.innerHTML = `
                    <div class="loading-container">
                        <i class="material-icons" style="font-size: 48px; opacity: 0.3;">search_off</i>
                        <p style="opacity: 0.5;">No plugins found.</p>
                    </div>
                `;
                return;
            }

            main.innerHTML = `
                <div class="plugins-grid">
                    ${plugins.map(plugin => `
                        <div class="plugin-card" onclick="Bay4llyShop.showDetails('${plugin.id}')">
                            <div class="plugin-banner" style="background-image: url('${REPO_URL}plugins/${plugin.folder}/${plugin.banner || 'banner.png'}')"></div>
                            <div class="plugin-icon-overlay">
                                <img src="${REPO_URL}plugins/${plugin.folder}/icon.png" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                                <i class="material-icons" style="display: none;">extension</i>
                            </div>
                            <div class="plugin-info">
                                <div class="plugin-title">${plugin.title}</div>
                                <div class="plugin-author">by ${plugin.author}</div>
                                <div class="plugin-badges">
                                    ${plugin.verified ? '<span class="plugin-badge badge-verified">✓</span>' : ''}
                                    ${plugin.featured ? '<span class="plugin-badge badge-featured">★</span>' : ''}
                                    ${plugin.beta ? '<span class="plugin-badge badge-beta">β</span>' : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        },

        filterByCategory(category) {
            current_category = category;
            current_search = '';
            
            const searchInput = document.getElementById('shop_search');
            if (searchInput) searchInput.value = '';
            
            const items = document.querySelectorAll('.sidebar-item');
            items.forEach(item => {
                if (item.innerText.includes(category)) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            this.applyFilters();
        },

        async showDetails(pluginId) {
            const plugin = this.plugins.find(p => p.id === pluginId);
            if (!plugin) return;

            const main = document.getElementById('shop_main');
            const sidebar = document.getElementById('shop_sidebar');
            
            if (sidebar) sidebar.style.display = 'none';
            
            main.innerHTML = `
                <div class="details-container">
                    <div class="details-header">
                        <div class="details-banner" style="background-image: url('${REPO_URL}plugins/${plugin.folder}/${plugin.banner || 'banner.png'}')"></div>
                    </div>
                    <div class="details-meta">
                        <div class="details-icon">
                            <img src="${REPO_URL}plugins/${plugin.folder}/icon.png" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                            <i class="material-icons" style="font-size: 48px; color: var(--color-accent); display: none;">extension</i>
                        </div>
                        <div class="details-title-box">
                            <h1>${plugin.title}</h1>
                            <div class="plugin-author">by ${plugin.author} • v${plugin.version}</div>
                        </div>
                        <div class="details-actions">
                            <button class="btn-install" onclick="Bay4llyShop.installPlugin('${plugin.id}')">
                                <i class="material-icons">download</i> Install
                            </button>
                            <button class="button" onclick="Bay4llyShop.backToHome()" style="padding: 8px 12px;">
                                <i class="material-icons">arrow_back</i>
                            </button>
                        </div>
                    </div>
                    <div class="readme-content">
                        <h3>About</h3>
                        <p>${plugin.description}</p>
                        <hr style="border: 0; border-top: 1px solid var(--color-border); margin: 15px 0;">
                        <div id="readme_markdown">Loading details...</div>
                        ${plugin.tags ? `<p><strong>Tags:</strong> ${plugin.tags.join(', ')}</p>` : ''}
                        <p><strong>Version:</strong> ${plugin.version}</p>
                        <p><strong>Category:</strong> ${plugin.category}</p>
                    </div>
                </div>
            `;

            this.loadReadme(plugin);
        },

        async loadReadme(plugin) {
            try {
                const resp = await fetch(`${REPO_URL}plugins/${plugin.folder}/README.md`);
                if (resp.ok) {
                    const text = await resp.text();
                    const readmeDiv = document.getElementById('readme_markdown');
                    if (readmeDiv) {
                        readmeDiv.innerHTML = this.markdownToHtml(text);
                    }
                }
            } catch (e) {
                console.warn('[Bay4lly Shop] Could not load README:', e);
            }
        },

        markdownToHtml(markdown) {
            let html = markdown
                .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
                .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
                .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/^/gm, '<p>')
                .replace(/$/gm, '</p>');
            return html;
        },

        async installPlugin(pluginId) {
            const plugin = this.plugins.find(p => p.id === pluginId);
            if (!plugin) return;

            Blockbench.showQuickMessage(`Installing ${plugin.title}...`, 2000);

            try {
                const targetFilename = plugin.filename || `${plugin.id}.js`;
                const resp = await fetch(`${REPO_URL}plugins/${plugin.folder}/${targetFilename}`);
                if (!resp.ok) throw new Error('Failed to download plugin');
                
                const code = await resp.text();

                // Extract actual register ID from code to avoid any caching mismatch in Blockbench
                const idMatch = /Plugin\.register\(\s*['"]([a-z0-9_-]+)['"]/i.exec(code);
                const actualRegisterId = idMatch ? idMatch[1] : plugin.id;

                const isAppMode = typeof fs !== 'undefined' && typeof PathModule !== 'undefined';
                if (isAppMode) {
                    const path = PathModule.join(Blockbench.plugin_directory, targetFilename);
                    fs.writeFileSync(path, code);
                    
                    if (typeof Plugins !== 'undefined' && typeof Plugins.updateLocalList === 'function') {
                        Plugins.updateLocalList();
                    }
                    
                    // Reload/load the plugin in Blockbench so it registers under the correct file name context
                    if (typeof autoUnloadPlugin === 'function') {
                        autoUnloadPlugin(actualRegisterId);
                    }
                    if (typeof loadPlugin === 'function') {
                        loadPlugin(actualRegisterId);
                    } else {
                        // Fallback: require the newly written file if loadPlugin is not globally exposed
                        if (typeof require !== 'undefined') {
                            const resolvedPath = require.resolve(path);
                            if (require.cache[resolvedPath]) {
                                delete require.cache[resolvedPath];
                            }
                            require(path);
                        }
                    }
                } else {
                    eval(code);
                }

                this.installed_plugins[plugin.id] = plugin.version;
                this.saveInstalledPlugins();
                
                Blockbench.showQuickMessage(`${plugin.title} installed!`, 3000);
            } catch (e) {
                Blockbench.showMessageBox({
                    title: 'Installation Failed',
                    icon: 'error',
                    message: `Could not install ${plugin.title}. Error: ${e.message}`
                });
            }
        },

        showUpdates() {
            Blockbench.showQuickMessage('Checking for updates...', 2000);
        },

        showInstalled() {
            const installed = this.plugins.filter(p => this.installed_plugins[p.id]);
            if (installed.length === 0) {
                Blockbench.showQuickMessage('No plugins installed from Bay4lly Shop.', 2000);
                return;
            }
            this.renderPlugins(installed);
        },

        async refreshRepository() {
            Blockbench.showQuickMessage('Refreshing repository...', 2000);
            try {
                await this.fetchPlugins(true);
                this.applyFilters();
                const errorBanner = document.getElementById('error_banner');
                if (errorBanner) errorBanner.style.display = 'none';
            } catch (e) {
                this.showError('Failed to refresh', e.message);
            }
        },

        backToHome() {
            const sidebar = document.getElementById('shop_sidebar');
            if (sidebar) sidebar.style.display = 'block';
            
            current_view = 'home';
            current_category = 'All';
            current_search = '';
            
            const searchInput = document.getElementById('shop_search');
            if (searchInput) searchInput.value = '';
            
            this.renderSidebar();
            this.applyFilters();
        }
    };

    Plugin.register(PLUGIN_ID, {
        title: 'Bay4lly Shop',
        author: 'Bay4lly',
        icon: 'shopping_cart',
        description: 'A complete third-party plugin marketplace for Blockbench with custom repository support.',
        version: '2.0.0',
        variant: 'both',
        onload() {
            Bay4llyShop.init();
        },
        onunload() {
            if (Bay4llyShop.action) Bay4llyShop.action.delete();
            if (shop_dialog) shop_dialog.close();
        }
    });

    window.Bay4llyShop = Bay4llyShop;
})();
