import { NaturalSoundEngine } from './audio';
import { GameEngine } from './game/GameEngine';
import { SaveManager } from './storage';
import './ui/styles.css';
import { UIManager } from './ui/UIManager';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const appRoot = document.getElementById('app') as HTMLElement;
const uiRoot = document.getElementById('ui-root') as HTMLElement;

const saveManager = new SaveManager();
const initialSave = saveManager.getData();
const soundEngine = new NaturalSoundEngine(initialSave.muted);
const ui = new UIManager(uiRoot);

const engine = new GameEngine(canvas, appRoot, saveManager, soundEngine, {
  onHudUpdate: (hud) => ui.updateHud(hud),
  onStatusChange: (status) => ui.handleStatusChange(status),
  onGameOver: (summary) => ui.showGameOver(summary),
});

ui.bindEngine(engine);
engine.startLoop();

// Expose clean debug handle for automated browser verification
(window as unknown as { __SALZACH_SPRINT__?: GameEngine }).__SALZACH_SPRINT__ = engine;
