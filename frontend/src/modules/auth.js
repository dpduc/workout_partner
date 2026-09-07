/**
 * auth.js
 * Manages user authentication state (Supabase user vs Local/Guest user).
 * Supports:
 * - Alias/Name
 * - Unique ID / username (at least 3 characters alphanumeric/underscore)
 * - Password (at least 8 characters) + Confirmation
 * - Optional email (with warning that accounts without email may be pruned when database space is limited)
 * - Seamless offline/local fallback storage
 */

import { supabase, isSupabaseConfigured } from './supabase.js';

const GUEST_KEY = 'wp_guest_user';
const LOCAL_USERS_KEY = 'wp_local_users';
const CURRENT_USER_KEY = 'wp_current_user';

class AuthManager {
  constructor() {
    this.user = null;
    this.isGuest = false;
    this.listeners = new Set();
  }

  async init() {
    // 1. Check if Supabase session exists
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          this.user = session.user;
          this.isGuest = false;
          this._notify();
          this._setupAuthListener();
          return;
        }
      } catch (err) {
        console.warn('Failed to retrieve Supabase session:', err);
      }
      this._setupAuthListener();
    }

    // 2. Check if a local registered user session exists
    const storedUser = localStorage.getItem(CURRENT_USER_KEY);
    if (storedUser) {
      try {
        this.user = JSON.parse(storedUser);
        this.isGuest = false;
        this._notify();
        return;
      } catch {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }

    // 3. Check if guest user session exists
    const guestData = localStorage.getItem(GUEST_KEY);
    if (guestData) {
      try {
        this.user = JSON.parse(guestData);
        this.isGuest = true;
      } catch {
        this.user = null;
        this.isGuest = false;
      }
    }

    this._notify();
  }

  _setupAuthListener() {
    if (!supabase) return;
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        this.user = session.user;
        this.isGuest = false;
        localStorage.removeItem(GUEST_KEY);
        localStorage.removeItem(CURRENT_USER_KEY);
      } else if (!this.isGuest && !localStorage.getItem(CURRENT_USER_KEY)) {
        this.user = null;
      }
      this._notify();
    });
  }

  setGuestMode(guestName = 'Guest Athlete') {
    this.isGuest = true;
    this.user = {
      id: 'guest_' + Date.now(),
      uniqueId: 'guest_' + Math.floor(Math.random() * 10000),
      alias: guestName,
      email: null,
      hasLinkedEmail: false,
      user_metadata: {
        username: guestName,
        alias: guestName,
      },
      isGuest: true,
      created_at: new Date().toISOString(),
    };
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.setItem(GUEST_KEY, JSON.stringify(this.user));
    this._notify();
    return this.user;
  }

  /**
   * Helper to fetch local registered users (for offline / fallback auth)
   */
  _getLocalUsers() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  _saveLocalUsers(users) {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  }

  /**
   * Register a new account with:
   * - alias: Name / nickname
   * - uniqueId: Unique User identifier / username
   * - password: At least 8 characters
   * - email: Optional
   */
  async signUp({ alias, uniqueId, password, email = '' }) {
    const cleanUniqueId = uniqueId.trim().toLowerCase();
    const cleanAlias = alias.trim() || cleanUniqueId;
    const cleanEmail = email.trim();
    const hasLinkedEmail = Boolean(cleanEmail);

    // If Supabase is active, use auth with synthesized email if none provided
    if (isSupabaseConfigured && supabase) {
      const authEmail = cleanEmail || `${cleanUniqueId}@workoutpartner.local`;
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            username: cleanUniqueId,
            alias: cleanAlias,
            unique_id: cleanUniqueId,
            has_linked_email: hasLinkedEmail,
            display_email: cleanEmail || null,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        this.user = {
          ...data.user,
          uniqueId: cleanUniqueId,
          alias: cleanAlias,
          hasLinkedEmail,
        };
        this.isGuest = false;
        localStorage.removeItem(GUEST_KEY);
        localStorage.removeItem(CURRENT_USER_KEY);
        this._notify();
        return this.user;
      }
    }

    // Fallback: Store account in LocalStore
    const localUsers = this._getLocalUsers();
    if (localUsers.some((u) => u.uniqueId.toLowerCase() === cleanUniqueId)) {
      throw new Error(`The ID "${cleanUniqueId}" is already taken. Please choose another unique ID.`);
    }

    const newUser = {
      id: 'local_user_' + Date.now(),
      uniqueId: cleanUniqueId,
      alias: cleanAlias,
      email: cleanEmail || null,
      hasLinkedEmail,
      passwordHash: btoa(password), // simple client-side encoding for local demo
      user_metadata: {
        username: cleanUniqueId,
        alias: cleanAlias,
      },
      isGuest: false,
      created_at: new Date().toISOString(),
    };

    localUsers.push(newUser);
    this._saveLocalUsers(localUsers);

    this.user = newUser;
    this.isGuest = false;
    localStorage.removeItem(GUEST_KEY);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    this._notify();
    return newUser;
  }

  /**
   * Sign in using either unique ID or email + password
   */
  async signIn({ identifier, password }) {
    const cleanId = identifier.trim().toLowerCase();

    // 1. Try Supabase first if available
    if (isSupabaseConfigured && supabase) {
      const authEmail = cleanId.includes('@') ? cleanId : `${cleanId}@workoutpartner.local`;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });

        if (!error && data?.user) {
          this.user = {
            ...data.user,
            uniqueId: data.user.user_metadata?.unique_id || data.user.user_metadata?.username || cleanId,
            alias: data.user.user_metadata?.alias || cleanId,
            hasLinkedEmail: Boolean(data.user.user_metadata?.has_linked_email),
          };
          this.isGuest = false;
          localStorage.removeItem(GUEST_KEY);
          localStorage.removeItem(CURRENT_USER_KEY);
          this._notify();
          return this.user;
        }
      } catch (err) {
        console.warn('Supabase sign-in failed, checking local users:', err);
      }
    }

    // 2. Check local users fallback
    const localUsers = this._getLocalUsers();
    const found = localUsers.find(
      (u) =>
        (u.uniqueId.toLowerCase() === cleanId || (u.email && u.email.toLowerCase() === cleanId)) &&
        u.passwordHash === btoa(password)
    );

    if (found) {
      this.user = found;
      this.isGuest = false;
      localStorage.removeItem(GUEST_KEY);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(found));
      this._notify();
      return found;
    }

    throw new Error('Invalid Unique ID / Email or Password.');
  }

  async signOut() {
    if (this.isGuest) {
      localStorage.removeItem(GUEST_KEY);
      this.user = null;
      this.isGuest = false;
      this._notify();
      return;
    }

    localStorage.removeItem(CURRENT_USER_KEY);
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut error:', e);
      }
    }
    this.user = null;
    this.isGuest = false;
    this._notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getUserState());
    return () => this.listeners.delete(listener);
  }

  _notify() {
    const state = this.getUserState();
    this.listeners.forEach((fn) => fn(state));
  }

  getUserState() {
    const uniqueId =
      this.user?.uniqueId ||
      this.user?.user_metadata?.unique_id ||
      this.user?.user_metadata?.username ||
      '';

    const alias =
      this.user?.alias ||
      this.user?.user_metadata?.alias ||
      uniqueId ||
      (this.isGuest ? 'Guest Athlete' : 'Athlete');

    const hasLinkedEmail =
      Boolean(this.user?.hasLinkedEmail || this.user?.user_metadata?.has_linked_email || (this.user?.email && !this.user?.email.endsWith('@workoutpartner.local')));

    return {
      user: this.user,
      isGuest: this.isGuest,
      isAuthenticated: Boolean(this.user && !this.isGuest),
      isLoggedIn: Boolean(this.user),
      uniqueId,
      alias,
      displayName: alias,
      hasLinkedEmail,
      email: hasLinkedEmail ? (this.user?.user_metadata?.display_email || this.user?.email) : null,
    };
  }
}

export const auth = new AuthManager();
