/**
 * Seed script para popular coleções do MongoDB do BFF com dados iniciais.
 * Roda via: npx ts-node scripts/seed-mongodb.ts
 *
 * Usado pelo migrator job para garantir que o BFF tenha configs mínimas.
 * É idempotente — não sobrescreve dados existentes.
 */

import { MongoClient, Collection } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://mongo:27017/domestic-bff';

const DEFAULT_SCREEN_CONFIGS = [
  {
    screen_id: 'home',
    version: '1.0.0',
    is_active: true,
    components: [
      {
        id: 'search_bar',
        type: 'search_bar' as const,
        data_source: 'static' as const,
        order: 0,
        config: { placeholder: 'Buscar serviços...' },
        visible: true,
        action: null,
      },
      {
        id: 'categories',
        type: 'category_list' as const,
        data_source: 'categories' as const,
        order: 1,
        config: { scroll: 'horizontal', showSeeAll: true },
        visible: true,
        action: { type: 'navigate' as const, route: '/search?category={slug}' },
      },
      {
        id: 'featured_providers',
        type: 'provider_grid' as const,
        data_source: 'featured_providers' as const,
        order: 2,
        config: { columns: 2, showRating: true },
        visible: true,
        action: { type: 'navigate' as const, route: '/providers/{id}' },
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const DEFAULT_NAVIGATION_CONFIGS = [
  {
    screen_id: 'default',
    is_active: true,
    tab_bar: {
      visible: true,
      items: [
        { id: 'home', label: 'Início', icon: 'home', route: '/home', visible: true, badge: null },
        { id: 'search', label: 'Buscar', icon: 'search', route: '/search', visible: true, badge: null },
        { id: 'dashboard', label: 'Pedidos', icon: 'list', route: '/dashboard', visible: true, badge: null },
        { id: 'chat', label: 'Chat', icon: 'chat', route: '/chat', visible: true, badge: null },
        { id: 'notifications', label: 'Avisos', icon: 'bell', route: '/notifications', visible: true, badge: null },
      ],
    },
    header: {
      title: null,
      show_back: false,
      actions: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function seedCollection<T extends { screen_id: string }>(
  collection: Collection<T>,
  seedData: T[],
): Promise<void> {
  const existing = await collection.find({}).toArray();
  const existingIds = new Set(existing.map((doc) => doc.screen_id));

  const toInsert = seedData.filter((doc) => !existingIds.has(doc.screen_id));

  if (toInsert.length === 0) {
    console.log(`  ${collection.collectionName}: já possui dados, pulando`);
    return;
  }

  await collection.insertMany(toInsert);
  console.log(`  ${collection.collectionName}: inseridos ${toInsert.length} documento(s)`);
}

async function main(): Promise<void> {
  console.log('🌱 Seed MongoDB BFF...');
  console.log(`  URI: ${MONGO_URI}`);

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('  Conectado ao MongoDB');

    const db = client.db();

    await seedCollection(db.collection('screen_configs'), DEFAULT_SCREEN_CONFIGS as any);
    await seedCollection(db.collection('navigation_configs'), DEFAULT_NAVIGATION_CONFIGS as any);

    console.log('✅ Seed concluído');
  } catch (err) {
    console.error('❌ Seed falhou:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
