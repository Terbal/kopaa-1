import { io } from "socket.io-client";

export default class SocketManager {
  constructor(existingSocket = null, myId = null) {
    this.socket = existingSocket || io("http://localhost:3000");
    this.myId = myId || null;

    if (!myId) {
      this.socket.on("init", (data) => {
        this.myId = data.myId;
      });
    }
  }

  // ========================
  // CONNEXION INITIALE
  // ========================
  onInit(callback) {
    this.socket.on("init", (data) => {
      this.myId = data.myId;
      callback(data);
    });
  }

  onPlayerJoined(callback) {
    this.socket.on("playerJoined", callback);
  }

  onPlayerMoved(callback) {
    this.socket.on("playerMoved", callback);
  }

  onPlayerLeft(callback) {
    this.socket.on("playerLeft", callback);
  }

  onGameOver(callback) {
    this.socket.on("gameOver", callback);
  }

  // ========================
  // ÉMISSIONS
  // ========================
  sendMove(x, y) {
    this.socket.emit("move", { x, y });
  }

  sendWin() {
    this.socket.emit("win");
  }

  disconnect() {
    this.socket.disconnect();
  }

  // Ajoute cette méthode
  removeAllListeners() {
    this.socket.off("init");
    this.socket.off("playerJoined");
    this.socket.off("playerMoved");
    this.socket.off("playerLeft");
    this.socket.off("gameOver");
    this.socket.off("rematchReady");
    this.socket.off("rematchVote");
  }
}
