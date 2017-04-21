import { AUTH_API_ROOT, TOKEN_STORAGE_KEY } from '../lib/constants.js';
import fetch from 'isomorphic-fetch';
import AuthError from 'lib/rest/AuthError';
import moment from 'moment';

export class AuthService {
  constructor(fetchImpl, localStorageImpl) {
    this.fetch = fetchImpl;
    this.localStorage = localStorageImpl;
  }

  authorize(username, password) {
    return this.fetch(`${AUTH_API_ROOT}/auth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then(::this.authHander('invalid credentials'));
  }

  authHander(message) {
    return response => {
      if (response.ok) {
        return response.json().then(tokens => {
          this.storeTokens(tokens);
          return tokens;
        });
      }

      throw new AuthError(message);
    };
  }

  logout() {
    clearTimeout(this.refreshTimeoutId);
    this.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  checkStorageInitially() {
    const storedTokens = this.getStoredTokens();

    if (!storedTokens) {
      return null;
    }

    const expiresIn = -moment().diff(storedTokens.expiresAt);

    // token is expired, jump ship
    if (expiresIn <= 0) {
      /* eslint-disable no-console */
      console.warn(`token has expired ${Math.floor(expiresIn / 1000)} seconds ago, logging out`);

      this.logout();
      return null;
    }

    this.scheduleRefresh();
    return storedTokens;
  }

  getStoredTokens() {
    return JSON.parse(this.localStorage.getItem(TOKEN_STORAGE_KEY));
  }

  refreshToken() {
    return this.fetch(`${AUTH_API_ROOT}/auth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.getStoredTokens().refresh_token }),
    }).then(::this.authHander('Token refresh failed'));
  }

  scheduleRefresh() {
    const refreshAt = this.getStoredTokens().refreshAt;
    let refreshIn = -moment().diff(refreshAt);

    /* eslint-disable no-console */
    console.warn(`token will refresh in ${Math.floor(refreshIn / 1000)} seconds`);

    clearTimeout(this.refreshTimeoutId);

    // we need to refresh in negative time, meaning we're late, so we need to do it right now
    if (refreshIn <= 0) {
      refreshIn = 0;
    }

    this.refreshTimeoutId = setTimeout(::this.refreshToken, refreshIn);
  }

  storeTokens(tokens) {
    const expiresIn = parseInt(tokens.expires_in, 10);
    // refresh when auth token has about 1/4 more time to live
    const refreshIn = expiresIn * 0.75;

    this.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({
      ...tokens,
      refreshAt: moment().add(refreshIn, 'seconds').valueOf(),
      expiresAt: moment().add(expiresIn, 'seconds').valueOf(),
    }));

    this.scheduleRefresh();
  }
}

export default new AuthService(fetch, localStorage);
