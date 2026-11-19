
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

function localApi() {
  return {
    name: 'dreamcontinuator-local-api',

    configureServer(server) {
      const env = loadEnv(
        server.config.mode,
        process.cwd(),
        ''
      );

      // Load local environment variables
      for (const [key, value] of Object.entries(env)) {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }

      server.middlewares.use('/api', async (req, res, next) => {
        const route = (req.url || '').split('?')[0];

        const routes = {
          '/continue': 'continue.js',
          '/dreams': 'dreams.js',
        };

        const filename = routes[route];

        if (!filename) {
          return next();
        }

        try {
          // Read request body
          let body = '';

          if (!['GET', 'HEAD'].includes(req.method)) {
            for await (const chunk of req) {
              body += chunk;

              if (body.length > 100000) {
                res.statusCode = 413;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({ error: 'Payload too large' })
                );
                return;
              }
            }
          }

          try {
            req.body = body ? JSON.parse(body) : {};
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({ error: 'Invalid JSON body' })
            );
            return;
          }

          // Emulate Vercel response methods
          const fakeRes = {
            status(code) {
              res.statusCode = code;
              return this;
            },

            setHeader(name, value) {
              res.setHeader(name, value);
              return this;
            },

            json(data) {
              res.setHeader(
                'Content-Type',
                'application/json'
              );

              res.end(JSON.stringify(data));
              return this;
            },

            send(data) {
              res.end(data);
              return this;
            },

            end(data) {
              res.end(data);
              return this;
            },
          };

          // Import API file using an absolute file URL
          const filePath = resolve(
            process.cwd(),
            'api',
            filename
          );

          const moduleUrl = pathToFileURL(filePath).href;

          // Prevent Vite from bundling the API import
          const apiModule = await import(
            /* @vite-ignore */ moduleUrl
          );

          const handler = apiModule.default;

          if (typeof handler !== 'function') {
            throw new Error(
              `API handler not found: ${filename}`
            );
          }

          await handler(req, fakeRes);

        } catch (error) {
          console.error('Local API Error:', error);

          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader(
              'Content-Type',
              'application/json'
            );
          }

          if (!res.writableEnded) {
            res.end(
              JSON.stringify({
                error: 'Local API failed. Check terminal logs.',
              })
            );
          }
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    localApi(),
  ],

  server: {
    port: 5173,
  },
});
