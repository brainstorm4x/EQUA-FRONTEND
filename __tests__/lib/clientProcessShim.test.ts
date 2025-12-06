/**
 * Tests for client process shim
 */

describe('clientProcessShim', () => {
  let originalProcess: any;
  
  beforeEach(() => {
    // Save original process object
    originalProcess = (window as any).process;
  });
  
  afterEach(() => {
    // Restore original process object
    if (originalProcess !== undefined) {
      (window as any).process = originalProcess;
    } else {
      delete (window as any).process;
    }
  });

  it('should define window.process when it does not exist', () => {
    // Remove process if it exists
    delete (window as any).process;
    
    // Reset module cache before importing
    jest.resetModules();
    
    // Import the shim (this executes the code)
    require('@/lib/clientProcessShim');
    
    // Verify process is now defined
    expect((window as any).process).toBeDefined();
    expect((window as any).process.env).toBeDefined();
  });

  it('should define NODE_ENV in process.env', () => {
    // Remove process if it exists
    delete (window as any).process;
    
    // Reset module cache before importing
    jest.resetModules();
    
    // Import the shim
    require('@/lib/clientProcessShim');
    
    // Verify NODE_ENV is defined
    expect((window as any).process.env.NODE_ENV).toBeDefined();
    expect(typeof (window as any).process.env.NODE_ENV).toBe('string');
  });

  it('should not override existing window.process', () => {
    // Set a custom process object
    const customProcess = {
      env: {
        NODE_ENV: 'custom',
        CUSTOM_VAR: 'value',
      },
    };
    (window as any).process = customProcess;
    
    // Import the shim (should not override)
    jest.resetModules(); // Reset module cache
    require('@/lib/clientProcessShim');
    
    // Verify custom process is preserved
    expect((window as any).process).toBe(customProcess);
    expect((window as any).process.env.CUSTOM_VAR).toBe('value');
  });

  it('should set NODE_ENV to development as fallback', () => {
    // Remove window.process
    delete (window as any).process;
    
    // Save and temporarily remove NODE_ENV from Node's process.env
    // In jsdom environment, we need to check if process is available
    let originalNodeEnv: string | undefined;
    let wasNodeEnvDefined = false;
    if (typeof process !== 'undefined' && process.env) {
      wasNodeEnvDefined = 'NODE_ENV' in process.env;
      originalNodeEnv = process.env.NODE_ENV;
      delete (process.env as any).NODE_ENV;
    }
    
    // Reset modules and import shim
    jest.resetModules();
    require('@/lib/clientProcessShim');
    
    // Should default to development when NODE_ENV is not set
    expect((window as any).process.env.NODE_ENV).toBe('development');
    
    // Restore original environment state
    if (typeof process !== 'undefined' && process.env) {
      if (wasNodeEnvDefined && originalNodeEnv !== undefined) {
        (process.env as any).NODE_ENV = originalNodeEnv;
      } else if (!wasNodeEnvDefined) {
        // Leave it undefined as it was originally
        delete (process.env as any).NODE_ENV;
      }
    }
  });
});
