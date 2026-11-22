// SAMPLE DATA for local development only — not real users or activity.
// Run with: npx prisma db seed

import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const sampleThoughts: { text: string; mood: string }[] = [
  { text: 'Do you ever miss someone you have never met?', mood: 'deep' },
  { text: 'Some songs feel like memories.', mood: 'reflective' },
  { text: 'I wonder if someone is thinking about me right now.', mood: 'lonely' },
  { text: 'Today I finally felt happy after a long time.', mood: 'happy' },
  { text: 'Does anyone else want to disappear into a new city for a while?', mood: 'curious' },
];

async function main() {
  const author = await prisma.user.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000001' },
  });

  await prisma.userProfile.upsert({
    where: { userId: author.id },
    update: {},
    create: {
      userId: author.id,
      displayName: 'Sample Author',
      username: 'sample_author',
    },
  });

  for (const thought of sampleThoughts) {
    await prisma.thought.create({
      data: {
        id: randomUUID(),
        authorId: author.id,
        text: thought.text,
        mood: thought.mood as never,
      },
    });
  }

  console.log(`Seeded ${sampleThoughts.length} sample thoughts for ${author.id}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
