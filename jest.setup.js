import '@testing-library/jest-dom';

// Polyfill TextEncoder and TextDecoder for jsdom environment
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
