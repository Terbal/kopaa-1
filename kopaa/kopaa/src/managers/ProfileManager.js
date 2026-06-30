const PROFILE_KEY = "mazecup_profile";

export default class ProfileManager {
  static save(pseudo, color) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ pseudo, color }));
  }

  static load() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  static clear() {
    localStorage.removeItem(PROFILE_KEY);
  }

  static exists() {
    return !!localStorage.getItem(PROFILE_KEY);
  }
}
