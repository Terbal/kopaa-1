import Phaser from "phaser";

import GameScene from "./scenes/GameScene";

const config = {
  type: Phaser.CANVAS,

  width: window.innerWidth,

  height: window.innerHeight,

  backgroundColor: "#111111",

  physics: {
    default: "arcade",

    arcade: {
      debug: false,
    },
  },

  scene: [GameScene],
};

new Phaser.Game(config);
