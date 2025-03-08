// Increase the default timeout
jest.setTimeout(30000);

// Configure console to handle large objects
const util = require('util');

// Override console.log to handle objects better
const originalLog = console.log;
console.log = (...args) => {
  const formattedArgs = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      return util.inspect(arg, { 
        depth: 4, 
        colors: true, 
        compact: false,
        maxArrayLength: 100
      });
    }
    return arg;
  });
  originalLog.apply(console, formattedArgs);
};

// Add better error formatting
const originalError = console.error;
console.error = (...args) => {
  const formattedArgs = args.map(arg => {
    if (arg instanceof Error) {
      return util.inspect(arg, { 
        depth: 4, 
        colors: true, 
        compact: false,
        showHidden: true
      });
    }
    return arg;
  });
  originalError.apply(console, formattedArgs);
}; 