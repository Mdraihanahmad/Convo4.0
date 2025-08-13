// Centralized API configuration for the frontend
// Supports both Vite (VITE_*) and CRA (REACT_APP_*) env variables

// Read env from Vite if available, otherwise from process.env (CRA)
// Using a Function wrapper avoids parse-time errors in non-Vite builds
// and keeps tree-shaking friendly.
// eslint-disable-next-line no-new-func
const viteEnv = (() => { try { return new Function('return import.meta.env')(); } catch { return undefined; } })();
const ENV = { ...(viteEnv || {}), ...(typeof process !== 'undefined' ? process.env : {}) };

// Base URLs
const inferredBase = (typeof window !== 'undefined' && window.location)
  ? (window.location.port === '3000' ? 'http://localhost:5000' : window.location.origin)
  : '';
export const API_BASE_URL = ENV.VITE_API_BASE_URL || ENV.REACT_APP_API_BASE_URL || inferredBase;
export const SOCKET_URL = ENV.VITE_SOCKET_URL || ENV.REACT_APP_SOCKET_URL || API_BASE_URL || inferredBase;

// Endpoints (paths only). Compose full URLs with the helper `url`.
export const ENDPOINTS = {
  // Auth
  LOGIN: ENV.VITE_ENDPOINT_LOGIN || ENV.REACT_APP_ENDPOINT_LOGIN || '/api/v1/user/login',
  REGISTER: ENV.VITE_ENDPOINT_REGISTER || ENV.REACT_APP_ENDPOINT_REGISTER || '/api/v1/user/register',
  LOGOUT: ENV.VITE_ENDPOINT_LOGOUT || ENV.REACT_APP_ENDPOINT_LOGOUT || '/api/v1/user/logout',

  // User
  USERS: ENV.VITE_ENDPOINT_USERS || ENV.REACT_APP_ENDPOINT_USERS || '/api/v1/user',
  USER_PROFILE: ENV.VITE_ENDPOINT_USER_PROFILE || ENV.REACT_APP_ENDPOINT_USER_PROFILE || '/api/v1/user/profile',
  PROFILE_PHOTO: ENV.VITE_ENDPOINT_PROFILE_PHOTO || ENV.REACT_APP_ENDPOINT_PROFILE_PHOTO || '/api/v1/user/profile/photo',

  // Friends
  FRIEND_REQUEST: ENV.VITE_ENDPOINT_FRIEND_REQUEST || ENV.REACT_APP_ENDPOINT_FRIEND_REQUEST || '/api/v1/user/friend-request',
  FRIEND_REQUESTS: ENV.VITE_ENDPOINT_FRIEND_REQUESTS || ENV.REACT_APP_ENDPOINT_FRIEND_REQUESTS || '/api/v1/user/friend-requests',

  // Messages
  MESSAGE_SEND: ENV.VITE_ENDPOINT_MESSAGE_SEND || ENV.REACT_APP_ENDPOINT_MESSAGE_SEND || '/api/v1/message/send',
  MESSAGES: ENV.VITE_ENDPOINT_MESSAGES || ENV.REACT_APP_ENDPOINT_MESSAGES || '/api/v1/message',
};

// Helper to safely join URL parts without duplicate slashes
const joinPath = (...parts) =>
  parts
    .filter(Boolean)
    .map((p) => String(p))
    .join('/')
    .replace(/:\/\//, '://')
    .replace(/([^:])\/+/g, '$1/');

// Build a full URL from an endpoint (path) and additional segments
export const url = (endpointPath, ...segments) => {
  return joinPath(API_BASE_URL, endpointPath, ...segments);
};

// Utility to resolve images coming from backend (absolute if already http)
export const buildImageUrl = (src) => {
  if (!src || typeof src !== 'string') return '';
  if (src.startsWith('http')) return src;
  const needsLeadingSlash = src.startsWith('/') ? '' : '/';
  return `${API_BASE_URL}${needsLeadingSlash}${src}`;
};


