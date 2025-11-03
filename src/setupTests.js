import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills necesarios para react-router-dom v7 en entorno de test
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;