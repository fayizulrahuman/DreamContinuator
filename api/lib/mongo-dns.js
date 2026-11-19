
import dns from 'node:dns/promises';

let configured = false;

export function configureMongoDNS() {
  if (configured) return;

  // Use public DNS resolvers for MongoDB Atlas SRV lookups.
  dns.setServers([
    '8.8.8.8',
    '1.1.1.1'
  ]);

  configured = true;

  console.log('MongoDB DNS configured successfully');
}
