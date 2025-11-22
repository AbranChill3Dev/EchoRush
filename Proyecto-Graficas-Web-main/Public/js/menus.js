export function initializeMenuLogic(appInstance) {
    // --- REFERENCIAS DOM ---
    const startButton = document.getElementById('start-button');
    const menuInicio = document.getElementById('MenuInicio');
    const mainMenu = document.getElementById('MainMenu');
    
    // Botones de navegación MainMenu
    const backToMenuButton = document.getElementById('back-to-menu-button');
    const jugarButton = document.getElementById('jugar-button');
    const optionsButton = document.getElementById('options-button');
    const scoreButton = document.getElementById('score-button');
    
    // Menús (Pantallas)
    const gameMenu = document.getElementById('GameMenu');
    const difficultyMenu = document.getElementById('DifficultyMenu');
    const levelMenu = document.getElementById('LevelMenu');
    const optionsMenu = document.getElementById('OptionsMenu');

    // Botones de GameMenu (Modo)
    const solitarioOption = document.querySelector('.game-option[data-mode="solitario"]');
    const multijugadorOption = document.querySelector('.game-option[data-mode="multijugador"]');
    const backButtonFromGameMenu = document.getElementById('back-to-main-menu');

    // Botones de DifficultyMenu (NUEVO)
    const normalButton = document.getElementById('normal-button');
    const hardButton = document.getElementById('hard-button');
    const backFromDifficultyButton = document.getElementById('back-from-difficulty');

    // Botones de LevelMenu
    const backFromLevelButton = document.getElementById('back-from-level');
    const levelOptions = document.querySelectorAll('.level-option');

    // Botones de Options
    const backFromOptionsButton = document.getElementById('back-from-options');

    // Elementos del Modal de Puntuaciones
    const scoreModal = document.getElementById('scoreModal');
    const closeScoreModal = document.getElementById('closeScoreModal');
    const list1 = document.getElementById('list-nivel1');
    const list2 = document.getElementById('list-nivel2');
    const list3 = document.getElementById('list-nivel3');

    // Audio
    const backgroundMusic = document.getElementById('background-music');
    const audioIcon = document.getElementById('audio-icon');
    const audioImg = document.getElementById('audio-img');

    let isPlaying = false;

    // Validación para que no falle si falta algo
    if (startButton && menuInicio && mainMenu) {
        
        if(backgroundMusic) backgroundMusic.volume = 0.1;

        if (audioIcon) {
            audioIcon.addEventListener('click', () => {
                if (isPlaying) {
                    backgroundMusic.pause();
                    audioImg.src = "Resources/Imagenes/SonidoOFF.png";
                } else {
                    backgroundMusic.play().catch(console.error);
                    audioImg.src = "Resources/Imagenes/SonidoON.png";
                }
                isPlaying = !isPlaying;
            });
        }

        startButton.addEventListener('click', () => {
            menuInicio.style.display = 'none';
            mainMenu.style.display = 'flex';
            if (!isPlaying && backgroundMusic) {
                backgroundMusic.play().catch(() => {});
                isPlaying = true;
                if(audioImg) audioImg.src = "Resources/Imagenes/SonidoON.png";
            }
        });

        if (scoreButton && scoreModal) {
            scoreButton.addEventListener('click', async () => {
                scoreModal.style.display = 'flex';

                // Mensaje de carga
                const loadingHTML = '<li style="color:#aaa; padding:5px;">Cargando...</li>';
                if(list1) list1.innerHTML = loadingHTML;
                if(list2) list2.innerHTML = loadingHTML;
                if(list3) list3.innerHTML = loadingHTML;

                try {
                    const response = await fetch('http://localhost:3000/top-scores');
                    const data = await response.json();

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

                    fillColumn(list1, data.nivel1);
                    fillColumn(list2, data.nivel2);
                    fillColumn(list3, data.nivel3);

                } catch (err) {
                    console.error("Error:", err);
                    if(list1) list1.innerHTML = '<li style="color:red">Error de conexión</li>';
                }
            });
        }

        if (closeScoreModal && scoreModal) {
            closeScoreModal.addEventListener('click', () => scoreModal.style.display = 'none');
            window.addEventListener('click', (e) => { if (e.target === scoreModal) scoreModal.style.display = 'none'; });
        }

        // 1. Main -> Modo
        jugarButton.addEventListener('click', () => {
            mainMenu.style.display = 'none';
            gameMenu.style.display = 'flex';
        });

        // 2. Modo -> Dificultad
        if(solitarioOption) solitarioOption.addEventListener('click', () => {
            sessionStorage.setItem('isMultiplayer', 'false');
            gameMenu.style.display = 'none';
            difficultyMenu.style.display = 'flex';
        });

        if(multijugadorOption) multijugadorOption.addEventListener('click', () => {
            sessionStorage.setItem('isMultiplayer', 'true');
            gameMenu.style.display = 'none';
            difficultyMenu.style.display = 'flex';
        });

        // 3. Dificultad -> Nivel
        if(normalButton) normalButton.addEventListener('click', () => {
            sessionStorage.setItem('difficulty', 'normal');
            difficultyMenu.style.display = 'none';
            levelMenu.style.display = 'flex';
        });

        if(hardButton) hardButton.addEventListener('click', () => {
            sessionStorage.setItem('difficulty', 'hard');
            difficultyMenu.style.display = 'none';
            levelMenu.style.display = 'flex';
        });

        // 4. Nivel -> JUEGO
        if (levelOptions) {
            levelOptions.forEach(option => {
                option.addEventListener('click', () => {
                    const selectedLevel = option.dataset.level;
                    // Leemos la dificultad que eligió en el paso anterior
                    const difficulty = sessionStorage.getItem('difficulty'); 
                    
                    console.log(`Viajando a: ${selectedLevel} | Dificultad: ${difficulty}`);

                    if (difficulty === 'hard') {
                        // DIFÍCIL
                        if (selectedLevel === 'plano') window.location.href = 'Nivel1Dificil.html';
                        else if (selectedLevel === 'obstaculos') window.location.href = 'Nivel2Dificil.html';
                        else if (selectedLevel === 'laberinto') window.location.href = 'Nivel3Dificil.html';
                    } else {
                        // NORMAL
                        if (selectedLevel === 'plano') window.location.href = 'Nivel1.html';
                        else if (selectedLevel === 'obstaculos') window.location.href = 'Nivel2.html';
                        else if (selectedLevel === 'laberinto') window.location.href = 'Nivel3.html';
                    }
                });
            });
        }
        
        // De Nivel -> Dificultad
        if(backFromLevelButton) backFromLevelButton.addEventListener('click', () => {
            levelMenu.style.display = 'none';
            difficultyMenu.style.display = 'flex';
        });

        // De Dificultad -> Modo
        if(backFromDifficultyButton) backFromDifficultyButton.addEventListener('click', () => {
            difficultyMenu.style.display = 'none';
            gameMenu.style.display = 'flex';
        });

        // De Modo -> Menú Principal
        if(backButtonFromGameMenu) backButtonFromGameMenu.addEventListener('click', () => {
            gameMenu.style.display = 'none';
            mainMenu.style.display = 'flex';
        });

        // De Menú Principal -> Inicio
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

    } else {
        console.error("Error crítico: Faltan elementos del DOM en index.html");
    }
}