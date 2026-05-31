import Phaser from "phaser";
import LobbyScene from "./scenes/LobbyScene";
import GameScene from "./scenes/GameScene";

const config = {
  type: Phaser.CANVAS,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#0a0a0a",
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [LobbyScene, GameScene], // LobbyScene en premier
};

new Phaser.Game(config);
