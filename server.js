// Wrapper for server-v5.js to maintain compatibility with Render deployment
// Render is looking for server.js, so we redirect to server-v5.js

import('./server-v5.js');
