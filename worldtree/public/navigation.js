export function renderNavigation(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <button class="nav-toggle"></button>
            <div class="nav-menu">
                <h3>Navigation</h3>
                <div class="routes">
                    <div class="route-item">
                        <a href="/ordinal.html">
                            <div>Ψ Home</div>
                            <div class="description">Welcome</div>
                        </a>
                    </div>
                    <div class="route-item">
                        <a href="/viewer.html">
                            <div>Θ Orbital View</div>
                            <div class="description">Galactic viewer interface</div>
                        </a>
                    </div>
                    <div class="route-item">
                        <a href="/lsystem.html">
                            <div>Δ Leaf L-System</div>
                            <div class="description">L-System visualization</div>
                        </a>
                    </div>
                    <div class="route-item">
                        <a href="/key.html">
                            <div>β Key Debug</div>
                            <div class="description">System debugging interface</div>
                        </a>
                    </div>
                </div>

                <h3>Folder Structure</h3>
                <div class="folder-structure">
                    <ul>
                        <li class="folder">public/
                            <ul>
                                <li class="folder">components/
                                    <ul>
                                        <li class="folder">core/
                                            <ul>
                                                <li class="file">DashMerged.js</li>
                                                <li class="file">ThreeScene.js</li>
                                            </ul>
                                        </li>
                                        <li class="folder">windows/
                                            <ul>
                                                <li class="file">BaseWindow.js</li>
                                            </ul>
                                        </li>
                                    </ul>
                                </li>
                                <li class="folder">lsystems/
                                    <ul>
                                        <li class="file">dashboard-3d.js</li>
                                        <li class="file">dashboard-network.js</li>
                                        <li class="file">dashboard-ui.js</li>
                                    </ul>
                                </li>
                                <li class="folder">sound/
                                    <ul>
                                        <li class="file">notification.wav</li>
                                        <li class="file">pop.wav</li>
                                        <li class="file">blip.wav</li>
                                    </ul>
                                </li>
                                <li class="file"><a href="/ordinal.html">ordinal.html</a></li>
                                <li class="file"><a href="/dashmerge.html">dashmerge.html</a></li>
                                <li class="file"><a href="/lsystem.html">lsystem.html</a></li>
                                <li class="file"><a href="/debug">debug_tools.html</a></li>
                                <li class="file"><a href="/timer.html">timer.html</a></li>
                            </ul>
                        </li>
                    </ul>
                </div>

                <h3>System Info</h3>
                <div class="route-item">
                    <a href="/health">
                        <div>💓 Health Check</div>
                        <div class="description">System status and metrics</div>
                    </a>
                </div>
            </div>
        `;

        const navToggle = container.querySelector('.nav-toggle');
        const navMenu = container.querySelector('.nav-menu');
        
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            navToggle.style.opacity = navMenu.classList.contains('active') ? '0' : '1';
        });

        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
                navMenu.classList.remove('active');
                navToggle.style.opacity = '1';
            }
        });
    }
}
