import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    video: true,
    screenshotOnRunFailure: true,
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    defaultCommandTimeout: 30000, // Extra long timeout
    requestTimeout: 30000, // Extra long timeout
    pageLoadTimeout: 60000, // Extra long timeout
    numTestsKeptInMemory: 0, // Don't reuse test instances for debugging
    experimentalMemoryManagement: true,
    env: {
      // Debug environment variables
      debug: true,
      trace: true
    },
    setupNodeEvents(on, config) {
      // Enable debug logging
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        table(message) {
          console.table(message);
          return null;
        },
      });
      
      // Log all network requests for debugging
      on('before:browser:launch', (browser, launchOptions) => {
        console.log('Launching browser with options:', launchOptions);
        
        if (browser.name === 'chrome') {
          launchOptions.args = launchOptions.args || [];
          launchOptions.args.push('--disable-gpu');
          launchOptions.args.push('--disable-dev-shm-usage');
          launchOptions.args.push('--disable-software-rasterizer');
          launchOptions.args.push('--no-sandbox');
          launchOptions.args.push('--disable-web-security'); // Disable CORS for testing
          launchOptions.args.push('--remote-debugging-port=9222');
        }
        
        return launchOptions;
      });
      
      return config;
    },
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    supportFile: 'cypress/support/component.ts',
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    video: true,
  },
  retries: {
    runMode: 3,
    openMode: 1
  },
}) 