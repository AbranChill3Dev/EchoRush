export function initializeMenuLogic(appInstance) {
    // Referencias principales
    const startButton = document.getElementById('start-button');
    const menuInicio = document.getElementById('MenuInicio');
    const mainMenu = document.getElementById('MainMenu');
    
    // Botones de navegación
    const backToMenuButton = document.getElementById('back-to-menu-button');
    const jugarButton = document.getElementById('jugar-button');
    const backButtonFromGameMenu = document.getElementById('back-to-main-menu');
    const optionsButton = document.getElementById('options-button');
    const backFromOptionsButton = document.getElementById('back-from-options');
    const backFromLevelButton = document.getElementById('back-from-level');

    // Menús
    const gameMenu = document.getElementById('GameMenu');
    const optionsMenu = document.getElementById('OptionsMenu');
    const levelMenu = document.getElementById('LevelMenu');

    // Opciones de juego
    const solitarioOption = document.querySelector('.game-option[data-mode="solitario"]');
    const multijugadorOption = document.querySelector('.game-option[data-mode="multijugador"]');
    const levelOptions = document.querySelectorAll('.level-option');

    // Audio
    const backgroundMusic = document.getElementById('background-music');
    const audioIcon = document.getElementById('audio-icon');
    const audioImg = document.getElementById('audio-img');

    // Puntuaciones (Nuevas referencias para las 3 columnas)
    const scoreButton = document.getElementById('score-button');
    const scoreModal = document.getElementById('scoreModal');
    const closeScoreModal = document.getElementById('closeScoreModal');
    const list1 = document.getElementById('list-nivel1');
    const list2 = document.getElementById('list-nivel2');
    const list3 = document.getElementById('list-nivel3');

    let isPlaying = false;

    // Validación básica para no romper el script si faltan elementos
    if (startButton && menuInicio && mainMenu) {
        
        if(backgroundMusic) backgroundMusic.volume = 0.1;

        // --- 1. LÓGICA DE PUNTUACIONES (TOP 10 POR NIVEL) ---
        if (scoreButton && scoreModal) {
            scoreButton.addEventListener('click', async () => {
                scoreModal.style.display = 'flex';

                // Mensaje de carga
                const loadingHTML = '<li style="color:#aaa; padding:5px;">Cargando...</li>';
                if(list1) list1.innerHTML = loadingHTML;
                if(list2) list2.innerHTML = loadingHTML;
                if(list3) list3.innerHTML = loadingHTML;

                try {
                    // Pedimos los datos al servidor
                    const response = await fetch('http://localhost:3000/top-scores');
                    const data = await response.json();

                    // Función para llenar una lista
                    const fillColumn = (ulElement, scores) => {
                        if (!ulElement) return;
                        ulElement.innerHTML = ''; // Limpiar

                        if (!scores || scores.length === 0) {
                            ulElement.innerHTML = '<li style="color:#666; padding:5px;">Sin datos</li>';
                            return;
                        }

                        scores.forEach((entry, index) => {
                            const li = document.createElement('li');
                            li.style.padding = "5px 0";
                            li.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
                            li.style.display = "flex";
                            li.style.justifyContent = "space-between";

                            // Medallas
                            let rank = `#${index + 1}`;
                            if(index === 0) rank = "🥇";
                            if(index === 1) rank = "🥈";
                            if(index === 2) rank = "🥉";

                            li.innerHTML = `
                                <span style="font-weight:bold; color:#ffd700; width:30px;">${rank}</span>
                                <span style="flex:1; color:#fff; margin-left:5px;">${entry.username}</span>
                                <span style="color:#00ff00; font-weight:bold;">${entry.score}</span>
                            `;
                            ulElement.appendChild(li);
                        });
                    };

                    // Llenamos las 3 columnas
                    fillColumn(list1, data.nivel1);
                    fillColumn(list2, data.nivel2);
                    fillColumn(list3, data.nivel3);

                } catch (err) {
                    console.error("Error cargando scores:", err);
                    if(list1) list1.innerHTML = '<li style="color:red">Error de conexión</li>';
                }
            });
        }

        if (closeScoreModal && scoreModal) {
            closeScoreModal.addEventListener('click', () => {
                scoreModal.style.display = 'none';
            });
            window.addEventListener('click', (event) => {
                if (event.target === scoreModal) scoreModal.style.display = 'none';
            });
        }

        // --- 2. AUDIO ---
        if (audioIcon && audioImg && backgroundMusic) {
            audioIcon.addEventListener('click', () => {
                if (isPlaying) {
                    backgroundMusic.pause();
                    audioImg.src = "Resources/Imagenes/SonidoOFF.png";
                } else {
                    backgroundMusic.play().catch(e => console.error(e));
                    audioImg.src = "Resources/Imagenes/SonidoON.png";
                }
                isPlaying = !isPlaying;
            });
        }

        // --- 3. NAVEGACIÓN ---
        startButton.addEventListener('click', () => {
            menuInicio.style.display = 'none';
            mainMenu.style.display = 'flex';
            // Intentar reproducir música al iniciar
            if (!isPlaying && backgroundMusic) {
                backgroundMusic.play().catch(e => console.log("Click necesario para audio"));
                isPlaying = true;
                if(audioImg) audioImg.src = "Resources/Imagenes/SonidoON.png";
            }
        });

        if(jugarButton) jugarButton.addEventListener('click', () => {
            mainMenu.style.display = 'none';
            gameMenu.style.display = 'flex';
        });

        if(backButtonFromGameMenu) backButtonFromGameMenu.addEventListener('click', () => {
            gameMenu.style.display = 'none';
            mainMenu.style.display = 'flex';
        });

        if(backToMenuButton) backToMenuButton.addEventListener('click', () => {
            mainMenu.style.display = 'none';
            menuInicio.style.display = 'flex';
        });

        // Opciones
        if(optionsButton) optionsButton.addEventListener('click', () => {
            mainMenu.style.display = 'none';
            optionsMenu.style.display = 'flex';
        });
        if(backFromOptionsButton) backFromOptionsButton.addEventListener('click', () => {
            optionsMenu.style.display = 'none';
            mainMenu.style.display = 'flex';
        });

        // Modos de Juego (Guardar en SessionStorage)
        if(solitarioOption) solitarioOption.addEventListener('click', () => {
            sessionStorage.setItem('isMultiplayer', 'false');
            console.log("Modo: Solitario");
            gameMenu.style.display = 'none';
            levelMenu.style.display = 'flex';
        });

        if(multijugadorOption) multijugadorOption.addEventListener('click', () => {
            sessionStorage.setItem('isMultiplayer', 'true');
            console.log("Modo: Multijugador");
            gameMenu.style.display = 'none';
            levelMenu.style.display = 'flex';
        });

        if(backFromLevelButton) backFromLevelButton.addEventListener('click', () => {
            levelMenu.style.display = 'none';
            gameMenu.style.display = 'flex';
        });

        // --- 4. SELECCIÓN DE NIVEL ---
        if (levelOptions) {
            levelOptions.forEach(option => {
                option.addEventListener('click', () => {
                    const selectedLevel = option.dataset.level;
                    console.log(`Viajando a: ${selectedLevel}`);

                    if (selectedLevel === 'plano') window.location.href = 'Nivel1.html';
                    else if (selectedLevel === 'obstaculos') window.location.href = 'nivel2.html';
                    else if (selectedLevel === 'laberinto') window.location.href = 'nivel3.html';
                });
            });
        }

    } else {
        console.error("Error crítico: Faltan elementos del DOM en el menú. Revisa los IDs.");
    }
}