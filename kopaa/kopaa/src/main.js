import Phaser from "phaser";
import LobbyScene from "./scenes/LobbyScene";
import GameScene from "./scenes/GameScene";

// Détection mobile
export const IS_MOBILE =
  /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    navigator.userAgent,
  ) || window.innerWidth < 768;

const config = {
  type: Phaser.CANVAS,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#0a0a12",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: { debug: true },
  },
  scene: [LobbyScene, GameScene],
};

const game = new Phaser.Game(config);

// Resize propre
window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
