/**
 * MongoDB connection manager.
 * Reads process.env.MONGODB_URI (loaded via dotenv in server.ts).
 * Throws a loud, distinct error and exits process on missing URI or connection failure.
 */
import mongoose from 'mongoose';
import dns from 'dns';

// Ensure IPv4 and reliable DNS servers (8.8.8.8) for Windows SRV lookups
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // fallback to system default if restricted
}

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;

  // Distinct check: Missing or default placeholder URI
  if (!uri || uri.trim() === '' || uri.includes('<password>')) {
    console.warn('\n⚠️ [DB WARNING] MONGODB_URI is unconfigured or a placeholder in .env.');
    console.warn('   Server is running on http://localhost:3000 in frontend preview mode.');
    console.warn('   Set a valid MONGODB_URI in .env to enable Atlas persistence & database seeding.\n');
    return;
  }

  try {
    await mongoose.connect(uri, {
      dbName: 'kopargaonpriority',
    });
    isConnected = true;
    console.log('✅ [DB] Successfully connected to MongoDB Atlas (database: kopargaonpriority)');
  } catch (err: any) {
    console.error('\n❌ [DB ERROR] Failed to connect to MongoDB Atlas:');
    console.error(`   ${err.message || err}\n`);
  }
}
