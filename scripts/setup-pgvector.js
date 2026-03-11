const { Client } = require('pg');
require('dotenv').config();

async function setupVector() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database. Enabling pgvector...');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('pgvector extension enabled successfully.');
  } catch (err) {
    console.error('Error enabling pgvector:', err);
  } finally {
    await client.end();
  }
}

setupVector();
