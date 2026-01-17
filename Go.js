(function () {
    /**
     * Banter Go (Weiqi/Baduk) Embed Script
     * A fully synced multiplayer Go game for Banter.
     */

    // --- Configuration ---
    const config = {
        boardPosition: new BS.Vector3(0, 1.5, 0),
        boardRotation: new BS.Vector3(0, 0, 0),
        boardScale: new BS.Vector3(1, 1, 1),
        resetPosition: new BS.Vector3(0.3, -1.2, 0), // Moved slightly right
        passPosition: new BS.Vector3(-0.3, -1.2, 0), // New Pass button left
        passRotation: new BS.Vector3(0, 0, 0),
        passScale: new BS.Vector3(1, 1, 1),
        scoreboardPosition: new BS.Vector3(0, 1.3, 0),
        scoreboardRotation: new BS.Vector3(0, 0, 0),
        scoreboardScale: new BS.Vector3(1, 1, 1),
        resetRotation: new BS.Vector3(0, 0, 0),
        resetScale: new BS.Vector3(1, 1, 1),
        instance: window.location.href.split('?')[0],
        hideUI: false,
        boardSize: 19, // Standard Go is 19x19
        hideBoard: false,
        useCustomModels: false,
        lighting: 'unlit',
        hideBoard: false,
        useCustomModels: false,
        lighting: 'unlit',
        addLights: true,
        useAOBaking: false
    };

    const COLORS = {
        board: '#D2B48C',    // Wooden Board Color
        player1: '#000000',  // Black stone
        player2: '#FFFFFF',  // White stone
        empty: '#FFFFFF',    // Empty slot (invisible)
        lastMove: '#FF0000'  // Highlight for last move
    };

    const PIECE_MODELS = {
        1: 'DiscDarkestGrey.glb', // Black
        2: 'DiscGrey.glb',        // White
        'highlight': 'DiscGreen.glb'
    };

    // Helper to parse Vector3
    const parseVector3 = (str, defaultVal) => {
        if (!str) return defaultVal;
        const s = str.trim();
        if (s.includes(' ')) {
            const parts = s.split(' ').map(Number);
            if (parts.length >= 3) return new BS.Vector3(parts[0], parts[1], parts[2]);
        }
        return defaultVal;
    };

    // Parse URL params
    const currentScript = document.currentScript;
    if (currentScript) {
        const url = new URL(currentScript.src);
        const params = new URLSearchParams(url.search);

        if (params.has('hideUI')) config.hideUI = params.get('hideUI') === 'true';
        if (params.has('hideBoard')) config.hideBoard = params.get('hideBoard') === 'true';
        if (params.has('instance')) config.instance = params.get('instance');
        if (params.has('boardSize')) config.boardSize = parseInt(params.get('boardSize'), 10) || 19;
        if (params.has('useCustomModels')) config.useCustomModels = params.get('useCustomModels') === 'true';
        if (params.has('lighting')) config.lighting = params.get('lighting');
        if (params.has('addLights')) config.addLights = params.get('addLights') !== 'false';
        if (params.has('useAOBaking')) config.useAOBaking = params.get('useAOBaking') === 'true';

        config.boardScale = parseVector3(params.get('boardScale'), config.boardScale);
        config.boardPosition = parseVector3(params.get('boardPosition'), config.boardPosition);
        config.boardRotation = parseVector3(params.get('boardRotation'), config.boardRotation);

        config.scoreboardPosition = parseVector3(params.get('scoreboardPosition'), config.scoreboardPosition);
        config.scoreboardRotation = parseVector3(params.get('scoreboardRotation'), config.scoreboardRotation);
        config.scoreboardScale = parseVector3(params.get('scoreboardScale'), config.scoreboardScale);

        config.resetPosition = parseVector3(params.get('resetPosition'), config.resetPosition);
        config.resetRotation = parseVector3(params.get('resetRotation'), config.resetRotation);
        config.resetScale = parseVector3(params.get('resetScale'), config.resetScale);

        config.passPosition = parseVector3(params.get('passPosition'), config.passPosition);
        config.passRotation = parseVector3(params.get('passRotation'), config.passRotation);
        config.passScale = parseVector3(params.get('passScale'), config.passScale);
    }

    // --- Go Game Logic ---
    class GoGame {
        constructor(size) {
            this.size = size;
            this.board = this.createEmptyBoard();
            this.currentPlayer = 1; // 1 = Black, 2 = White
            this.captures = { 1: 0, 2: 0 };
            this.previousBoardHash = ""; // For Ko rule
            this.passes = 0;
            this.gameOver = false;
            this.lastMove = null; // [r, c]
        }

        createEmptyBoard() {
            return Array(this.size).fill(null).map(() => Array(this.size).fill(0));
        }

        reset() {
            this.board = this.createEmptyBoard();
            this.currentPlayer = 1;
            this.captures = { 1: 0, 2: 0 };
            this.previousBoardHash = "";
            this.passes = 0;
            this.gameOver = false;
            this.lastMove = null;
        }

        loadState(state) {
            this.board = state.board;
            this.currentPlayer = state.currentPlayer;
            this.captures = state.captures || { 1: 0, 2: 0 };
            this.previousBoardHash = state.previousBoardHash || "";
            this.passes = state.passes || 0;
            this.gameOver = state.gameOver || false;
            this.lastMove = state.lastMove || null;
        }

        getState() {
            return {
                board: this.board,
                currentPlayer: this.currentPlayer,
                captures: this.captures,
                previousBoardHash: this.previousBoardHash,
                passes: this.passes,
                gameOver: this.gameOver,
                lastMove: this.lastMove,
                lastModified: Date.now()
            };
        }

        // Returns new state object if move is valid, else null
        simulatePlay(row, col) {
            if (this.gameOver) return null;

            // Handle Pass (row = -1, col = -1)
            if (row === -1 && col === -1) {
                const nextPasses = this.passes + 1;
                return {
                    board: this.board, // No change
                    currentPlayer: this.currentPlayer === 1 ? 2 : 1,
                    captures: this.captures,
                    previousBoardHash: this.previousBoardHash, // Pass doesn't change board hash for Ko
                    passes: nextPasses,
                    gameOver: nextPasses >= 2, // Game over on 2 consecutive passes
                    lastMove: null,
                    lastModified: Date.now()
                };
            }

            // Basic validation
            if (this.board[row][col] !== 0) return null;

            // Create copy for simulation
            const nextBoard = this.board.map(r => [...r]);
            nextBoard[row][col] = this.currentPlayer;
            
            const opponent = this.currentPlayer === 1 ? 2 : 1;
            let capturedCount = 0;

            // 1. Check for captures of opponent
            const neighbors = this.getNeighbors(row, col);
            neighbors.forEach(([nr, nc]) => {
                if (nextBoard[nr][nc] === opponent) {
                    const group = this.getGroup(nextBoard, nr, nc);
                    if (this.countLiberties(nextBoard, group) === 0) {
                        // Capture group
                        group.forEach(([gr, gc]) => {
                            nextBoard[gr][gc] = 0;
                            capturedCount++;
                        });
                    }
                }
            });

            // 2. Check for Suicide (Self-capture)
            // A move is suicide if the placed stone has no liberties and captured nothing.
            const myGroup = this.getGroup(nextBoard, row, col);
            if (this.countLiberties(nextBoard, myGroup) === 0) {
                return null; // Invalid move (Suicide)
            }

            // 3. Check Ko Rule
            // Cannot repeat the board state from the immediate previous turn.
            const nextHash = JSON.stringify(nextBoard);
            if (nextHash === this.previousBoardHash) {
                return null; // Invalid move (Ko)
            }

            // Move is valid
            const nextCaptures = { ...this.captures };
            nextCaptures[this.currentPlayer] += capturedCount;

            return {
                board: nextBoard,
                currentPlayer: opponent,
                captures: nextCaptures,
                previousBoardHash: JSON.stringify(this.board), // Store *current* board as previous
                passes: 0,
                gameOver: false,
                lastMove: [row, col],
                lastModified: Date.now()
            };
        }

        getNeighbors(r, c) {
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            const n = [];
            dirs.forEach(([dr, dc]) => {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
                    n.push([nr, nc]);
                }
            });
            return n;
        }

        getGroup(board, r, c) {
            const color = board[r][c];
            const group = [];
            const visited = new Set();
            const stack = [[r, c]];
            visited.add(`${r},${c}`);
            
            while (stack.length > 0) {
                const [curR, curC] = stack.pop();
                group.push([curR, curC]);

                this.getNeighbors(curR, curC).forEach(([nr, nc]) => {
                    const key = `${nr},${nc}`;
                    if (board[nr][nc] === color && !visited.has(key)) {
                        visited.add(key);
                        stack.push([nr, nc]);
                    }
                });
            }
            return group;
        }

        countLiberties(board, group) {
            const liberties = new Set();
            group.forEach(([r, c]) => {
                this.getNeighbors(r, c).forEach(([nr, nc]) => {
                    if (board[nr][nc] === 0) {
                        liberties.add(`${nr},${nc}`);
                    }
                });
            });
            return liberties.size;
        }
    }

    // --- Banter Visuals ---
    const state = {
        root: null,
        piecesRoot: null,
        slots: [], // 2D array of { sphere, blackModel, whiteModel, greenModel }
        cells: [], // 2D array of clickable cell GameObjects
        isSyncing: false,
        game: new GoGame(config.boardSize),
        scoreboard: null
    };

    function getModelUrl(modelName) {
        try {
            if (currentScript) {
                return new URL(`../Models/${modelName}`, currentScript.src).href;
            }
        } catch (e) { console.error("Error resolving model URL:", e); }
        return `../Models/${modelName}`;
    }

    function hexToVector4(hex, alpha = 1.0) {
        let c = hex.substring(1);
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        return new BS.Vector4(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255, alpha);
    }

    async function init() {
        if (!window.BS) {
            console.error("Banter SDK not found!");
            return;
        }
        BS.BanterScene.GetInstance().On("unity-loaded", setupScene);
    }

    async function setupScene() {
        console.log("Go: Setup Scene Started");
        state.root = await new BS.GameObject("Go_Root").Async();
        let t = await state.root.AddComponent(new BS.Transform());
        t.position = config.boardPosition;
        t.localEulerAngles = config.boardRotation;
        t.localScale = config.boardScale;

        const rows = config.boardSize;
        const cols = config.boardSize;
        const gap = 0.08; // Slightly tighter gap for Go
        const boardDimension = (cols - 1) * gap;
        const boardThickness = 0.02;

        // Add a light if we are using lit models
        if (config.useCustomModels && config.lighting === 'lit' && config.addLights) {
            const lightGO = await new BS.GameObject("Go_DirectionalLight");
            await lightGO.SetParent(state.root, false);
            let lightTrans = await lightGO.AddComponent(new BS.Transform());
            lightTrans.localPosition = new BS.Vector3(0, 2, -2);
            lightTrans.localEulerAngles = new BS.Vector3(45, 0, 0);
            await lightGO.AddComponent(new BS.Light(1, new BS.Vector4(1, 1, 1, 1), 1, 0.1));
        }

        if (!config.hideBoard) {
            // Group Board Visuals for Baking
            const boardVisuals = await new BS.GameObject("Board_Visuals").Async();
            await boardVisuals.SetParent(state.root, false);
            await boardVisuals.AddComponent(new BS.Transform());

            // Create the board base
            await createBanterObject(boardVisuals, BS.GeometryType.BoxGeometry,
                { width: boardDimension + gap, height: boardDimension + gap, depth: boardThickness },
                COLORS.board, new BS.Vector3(0, 0, -boardThickness / 2));

            // --- Construct Grid ---
            const gridRoot = await new BS.GameObject("Grid_Root").Async();
            await gridRoot.SetParent(boardVisuals, false);
            await gridRoot.AddComponent(new BS.Transform());
            const lineThickness = 0.003;

            for (let i = 0; i < rows; i++) {
                const pos = (i - (rows - 1) / 2) * gap;
                // Vertical Line
                await createBanterObject(gridRoot, BS.GeometryType.BoxGeometry,
                    { width: lineThickness, height: boardDimension, depth: lineThickness },
                    '#000000', new BS.Vector3(pos, 0, 0.01));
                // Horizontal Line
                await createBanterObject(gridRoot, BS.GeometryType.BoxGeometry,
                    { width: boardDimension, height: lineThickness, depth: lineThickness },
                    '#000000', new BS.Vector3(0, pos, 0.01));
            }

            // Apply AO Baking if enabled
            if (config.useAOBaking) {
                console.log("Go: Baking AO...");
                // Note: Subdivision level 2 provides decent quality for box primitives without excessive geometry
                const baker = await boardVisuals.AddComponent(new BS.BanterAOBaking({
                    subdivisionLevel: 2,
                    sampleCount: 128,
                    aoIntensity: 1.2,
                    aoBias: 0.005,
                    hideSourceObjects: true,
                    targetShaderName: "Mobile/StylizedFakeLit"
                }));
                baker.BakeAO();
            }
        }

        // --- Create Clickable Intersections and Piece Placeholders ---
        state.piecesRoot = await new BS.GameObject("Pieces_Root").Async();
        await state.piecesRoot.SetParent(state.root, false);
        await state.piecesRoot.AddComponent(new BS.Transform());

        const pieceSize = gap * 0.45;

        // Initialize arrays
        for (let r = 0; r < rows; r++) {
            state.slots[r] = [];
            state.cells[r] = [];
        }

        // Processing row by row to prevent game lag/crashing from too many concurrent creations
        for (let r = 0; r < rows; r++) {
            const rowPromises = [];
            for (let c = 0; c < cols; c++) {
                rowPromises.push((async () => {
                    const x = (c - (cols - 1) / 2) * gap;
                    const y = (r - (rows - 1) / 2) * -gap; // Invert Y

                    // Invisible clickable cell at intersection (Collider only, no mesh)
                    const cellObj = await createClickableCollider(state.root, new BS.Vector3(gap, gap, 0.05), new BS.Vector3(x, y, 0));
                    cellObj.On('click', () => handleCellClick(r, c));
                    state.cells[r][c] = cellObj;

                    // Lazy Instantiation: Don't create pieces yet. They will be created in updateVisuals when needed.
                    state.slots[r][c] = {
                        sphere: null,
                        blackModel: null,
                        whiteModel: null,
                        greenModel: null,
                        x: x, // Store positions for lazy creation
                        y: y
                    };
                })());
            }
            // Await the entire row to complete before moving to the next
            await Promise.all(rowPromises);
            // Small yield to main thread to prevent UI freeze
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // --- Create UI ---
        const uiRoot = await new BS.GameObject("UI_Root").Async();
        await uiRoot.AddComponent(new BS.Transform());
        await uiRoot.SetParent(state.root, false);
        
        // Reset Button
        await createButton(
            uiRoot,
            "Reset", 
            config.resetPosition, 
            config.resetRotation,
            config.resetScale,
            '#960000', 
            () => {
                state.game.reset();
                syncState();
            }
        );
        
        // Pass Button
        await createButton(
            uiRoot,
            "Pass", 
            config.passPosition, 
            config.passRotation,
            config.passScale,
            '#00249c', 
            () => {
                handlePass();
            }
        );

        await createScoreboard(uiRoot);


        setupListeners();
        checkForExistingState();
        console.log("Go: Setup Scene Complete");
    }

    async function createButton(parent, name, pos, rot, scale, color, onClick) {
        const btn = await createBanterObject(parent, BS.GeometryType.BoxGeometry,
            { width: 0.3, height: 0.1, depth: 0.05 },
            color, pos, true, config.hideUI ? 0.0 : 1.0
        );
        let rt = btn.GetComponent(BS.ComponentType.Transform);
        rt.localEulerAngles = rot;
        rt.localScale = scale;
        
        // Add Text Label
        const label = await new BS.GameObject("Label").Async();
        await label.SetParent(btn, false);
        let lt = await label.AddComponent(new BS.Transform());
        lt.localPosition = new BS.Vector3(0, 0, 0.03);
        lt.localEulerAngles = new BS.Vector3(0, 180, 0);
        await label.AddComponent(new BS.BanterText(
            name, new BS.Vector4(1, 1, 1, 1), BS.HorizontalAlignment.Center, BS.VerticalAlignment.Center, 0.5, false, false, new BS.Vector2(3, 1)
        ));

        btn.On('click', onClick);
        return btn;
    }

    async function createScoreboard(parent) {
        const obj = await new BS.GameObject("Scoreboard").Async();
        await obj.SetParent(parent, false);
        let t = await obj.AddComponent(new BS.Transform());
        t.localPosition = config.scoreboardPosition;
        t.localEulerAngles = config.scoreboardRotation;
        t.localScale = config.scoreboardScale;

        // Background
        const bgOpacity = config.hideUI ? 0.0 : 1.0;
        await createBanterObject(obj, BS.GeometryType.BoxGeometry,
            { width: 1.2, height: 0.3, depth: 0.02 },
            '#F5F5DC', // Beige
            new BS.Vector3(0, 0, 0),
            false, // No collider for background
            bgOpacity
        );

        // Text
        const textObj = await new BS.GameObject("ScoreText").Async();
        await textObj.SetParent(obj, false);
        let tt = await textObj.AddComponent(new BS.Transform());
        tt.localPosition = new BS.Vector3(0, 0, 0.02);
        tt.localEulerAngles = new BS.Vector3(0, 180, 0);

        state.scoreboard = await textObj.AddComponent(new BS.BanterText(
            "Black's Turn\nCaptures\nBlack: 0   White: 0",
            new BS.Vector4(0, 0, 0, bgOpacity), // Use opacity for text as well
            BS.HorizontalAlignment.Center,
            BS.VerticalAlignment.Center,
            0.6, false, false, new BS.Vector2(5.0, 1.2)
        ));
    }

    function getGeoArgs(type, dims) {
        const w = dims.width || 1;
        const h = dims.height || 1;
        const d = dims.depth || 1;
        const r = dims.radius || 0.5;

        if (type === BS.GeometryType.BoxGeometry) {
            return [type, null, w, h, d];
        } else if (type === BS.GeometryType.SphereGeometry) {
            const PI2 = 6.283185;
            return [type, null, w, h, d, 24, 16, 1, r, 24, 0, PI2, 0, PI2, 8, false, r, r];
        }
        return [type, null, w, h, d];
    }

    async function createBanterObject(parent, type, dims, colorHex, pos, hasCollider = false, opacity = 1.0, cacheBust = null) {
        const obj = await new BS.GameObject("Geo").Async();
        if (parent) {
            await obj.SetParent(parent, false);
        }
        let t = await obj.AddComponent(new BS.Transform());
        if (pos) t.localPosition = pos;
        const fullArgs = getGeoArgs(type, dims);
        await obj.AddComponent(new BS.BanterGeometry(...fullArgs));
        const color = hexToVector4(colorHex, opacity);
        
        let shader = "Unlit/Diffuse";
        if (config.lighting === 'lit') {
            shader = "Standard";
        } else if (opacity < 1.0) {
            shader = "Unlit/DiffuseTransparent";
        }

        // Use cacheBust to create unique material instance for objects that need dynamic colors
        await obj.AddComponent(new BS.BanterMaterial(shader, "", color, BS.MaterialSide.Front, false, cacheBust || ""));
        if (hasCollider) {
            let colSize = new BS.Vector3(dims.width || 1, dims.height || 1, dims.depth || 1);
            await obj.AddComponent(new BS.BoxCollider(true, new BS.Vector3(0, 0, 0), colSize));
            await obj.SetLayer(5);
        }
        return obj;
    }

    async function createClickableCollider(parent, size, pos) {
        const obj = await new BS.GameObject("Collider").Async();
        if (parent) await obj.SetParent(parent, false);
        let t = await obj.AddComponent(new BS.Transform());
        if (pos) t.localPosition = pos;
        
        await obj.AddComponent(new BS.BoxCollider(true, new BS.Vector3(0,0,0), size));
        await obj.SetLayer(5); // UI Layer
        return obj;
    }

    async function createCustomPiece(parent, type, pos) {
        const modelName = PIECE_MODELS[type];
        if (!modelName) return null;

        const piece = await new BS.GameObject(`CustomPiece_${type}`).Async();
        await piece.SetParent(parent, false);
        let t = await piece.AddComponent(new BS.Transform());
        if (pos) t.localPosition = pos;
        
        // Scale and rotation for discs
        t.localScale = new BS.Vector3(0.04, 0.04, 0.04); 
        t.localEulerAngles = new BS.Vector3(90, 0, 0); 

        const url = getModelUrl(modelName);
        try {
            await piece.AddComponent(new BS.BanterGLTF(url, false, false, false, false, false, false));
            
            // Add material for coloring/lighting interaction if supported by GLB, or just to have it
            let colorHex = COLORS.player1;
            if (type === 2) colorHex = COLORS.player2;
            if (type === 'highlight') colorHex = '#00FF00';
            
            const colorVec4 = hexToVector4(colorHex);
            const shader = config.lighting === 'lit' ? "Standard" : "Unlit/Diffuse";
            await piece.AddComponent(new BS.BanterMaterial(shader, "", colorVec4, BS.MaterialSide.Front, false));
        } catch (e) {
            console.error("Failed to load custom piece", e);
        }
        return piece;
    }

    function handleCellClick(row, col) {
        if (state.isSyncing) return;
        const nextState = state.game.simulatePlay(row, col);
        if (nextState) {
            state.isSyncing = true;
            syncState(nextState);
        }
    }

    function handlePass() {
        if (state.isSyncing) return;
        const nextState = state.game.simulatePlay(-1, -1);
        if (nextState) {
            state.isSyncing = true;
            syncState(nextState);
        }
    }

    function syncState(newState) {
        const key = `go_game_${config.instance}`;
        const data = newState || state.game.getState();
        BS.BanterScene.GetInstance().SetPublicSpaceProps({ [key]: JSON.stringify(data) });
    }

    async function updateVisuals() {
        if (!state.piecesRoot) return;
        const gap = .08; 
        const pieceSize = gap * 0.45;

        for (let r = 0; r < config.boardSize; r++) {
            for (let c = 0; c < config.boardSize; c++) {
                const cell = state.game.board[r][c];
                const slot = state.slots[r][c];
                // Ensure slot exists (it should)
                if(!slot) continue;

                // Reset all existing
                if (slot.sphere) slot.sphere.SetActive(false);
                if (slot.blackModel) slot.blackModel.SetActive(false);
                if (slot.whiteModel) slot.whiteModel.SetActive(false);
                if (slot.greenModel) slot.greenModel.SetActive(false);

                if (cell === 0) continue;

                if (config.useCustomModels) {
                     if (cell === 1) {
                        if (!slot.blackModel) {
                             const modelPos = new BS.Vector3(slot.x, slot.y, 0.015);
                             slot.blackModel = await createCustomPiece(state.piecesRoot, 1, modelPos);
                        }
                        if (slot.blackModel) slot.blackModel.SetActive(true);
                     }
                     if (cell === 2) {
                        if (!slot.whiteModel) {
                             const modelPos = new BS.Vector3(slot.x, slot.y, 0.015);
                             slot.whiteModel = await createCustomPiece(state.piecesRoot, 2, modelPos);
                        }
                        if (slot.whiteModel) slot.whiteModel.SetActive(true);
                     }
                } else {
                     if (!slot.sphere) {
                        const spherePiece = await createBanterObject(state.piecesRoot, BS.GeometryType.SphereGeometry,
                            { radius: pieceSize },
                            COLORS.player1,
                            new BS.Vector3(slot.x, slot.y, 0.04),
                            false, 1.0, `piece_${r}_${c}`
                        );
                        // Flatten piece
                        const pt = spherePiece.GetComponent(BS.ComponentType.Transform);
                        pt.localScale = new BS.Vector3(1, 1, 0.3);
                        await spherePiece.SetLayer(5);
                        slot.sphere = spherePiece;
                     }
                     
                     if (slot.sphere) {
                        slot.sphere.SetActive(true);
                        const mat = slot.sphere.GetComponent(BS.ComponentType.BanterMaterial);
                        if (mat) {
                            const colorHex = (cell === 1) ? COLORS.player1 : COLORS.player2;
                            mat.color = hexToVector4(colorHex);
                        }
                     }
                }
            }
        }
        // Optional: Could add UI text for captures here
        if (state.game.gameOver) {
            console.log("Game Over. Captures:", state.game.captures);
        }

        if (state.scoreboard) {
            const turn = state.game.currentPlayer === 1 ? "Black's Turn" : "White's Turn";
            state.scoreboard.text = `${turn}\nCaptures\nBlack: ${state.game.captures[1]}   White: ${state.game.captures[2]}`;
        }
    }

    async function checkForExistingState() {
        const key = `go_game_${config.instance}`;
        const scene = BS.BanterScene.GetInstance();
        const getProp = () => {
            const s = scene.spaceState;
            return (s.public && s.public[key]) || (s.protected && s.protected[key]);
        };
        let val = getProp();
        if (val) {
            try {
                const data = JSON.parse(val);
                state.game.loadState(data);
                updateVisuals();
            } catch (e) { console.error("Failed to parse Go state", e); }
        }
    }

    function setupListeners() {
        const key = `go_game_${config.instance}`;
        BS.BanterScene.GetInstance().On("space-state-changed", e => {
            const changes = e.detail.changes;
            if (changes && changes.find(c => c.property === key)) {
                const scene = BS.BanterScene.GetInstance();
                const s = scene.spaceState;
                const val = (s.public && s.public[key]) || (s.protected && s.protected[key]);
                if (val) {
                    try {
                        const data = JSON.parse(val);
                        state.game.loadState(data);
                        updateVisuals();
                        state.isSyncing = false;
                    } catch (e) { console.error(e); }
                }
            }
        });
    }

    init();
})();