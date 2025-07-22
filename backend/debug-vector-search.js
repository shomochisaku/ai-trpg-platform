const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugVectorSearch() {
  console.log('=== Vector Search Debug ===\n');
  
  try {
    // 1. テストデータを直接SQLで作成
    console.log('1. Creating test data with direct SQL...');
    
    const testEmbedding = new Array(1536).fill(0.1).map((_, i) => Math.random());
    const embeddingString = `[${testEmbedding.join(',')}]`;
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO memory_entries (id, content, category, importance, tags, embedding, "isActive", "sessionId", "createdAt", "updatedAt")
      VALUES 
        (gen_random_uuid(), '[DEBUG] Aldric the Brave warrior', 'CHARACTER', 9, '{"aldric","warrior"}', $1::vector, true, 'debug-session', NOW(), NOW()),
        (gen_random_uuid(), '[DEBUG] The dark forest location', 'LOCATION', 7, '{"forest","dark"}', $2::vector, true, 'debug-session', NOW(), NOW()),
        (gen_random_uuid(), '[DEBUG] Battle event occurred', 'EVENT', 8, '{"battle","event"}', $3::vector, true, 'debug-session', NOW(), NOW())
    `, embeddingString, embeddingString, embeddingString);
    
    console.log('✅ Test data created');
    
    // 2. データが正しく作成されたか確認
    console.log('\n2. Verifying created data...');
    const allData = await prisma.memoryEntry.findMany({
      where: { sessionId: 'debug-session' },
      select: { id: true, content: true, category: true, sessionId: true }
    });
    
    console.log(`Found ${allData.length} records:`);
    allData.forEach(d => console.log(`  - ${d.category}: ${d.content}`));
    
    // 3. カテゴリフィルタなしでベクトル検索を実行
    console.log('\n3. Vector search WITHOUT category filter...');
    const queryEmbedding = `[${testEmbedding.join(',')}]`;
    
    const resultsWithoutFilter = await prisma.$queryRawUnsafe(`
      SELECT 
        id,
        content,
        category,
        importance,
        tags,
        "createdAt",
        1 - (embedding::vector <=> $1::vector) as similarity
      FROM memory_entries
      WHERE 1=1
        AND "sessionId" = $2
        AND "isActive" = true
        AND cardinality(embedding) > 0
        AND 1 - (embedding::vector <=> $1::vector) > 0.1
      ORDER BY embedding::vector <=> $1::vector
      LIMIT 10
    `, queryEmbedding, 'debug-session');
    
    console.log(`Results without filter: ${resultsWithoutFilter.length}`);
    resultsWithoutFilter.forEach(r => console.log(`  - ${r.category}: ${r.content.substring(0, 50)}... (sim: ${r.similarity})`));
    
    // 4. カテゴリフィルタありでベクトル検索を実行
    console.log('\n4. Vector search WITH CHARACTER category filter...');
    
    const resultsWithFilter = await prisma.$queryRawUnsafe(`
      SELECT 
        id,
        content,
        category,
        importance,
        tags,
        "createdAt",
        1 - (embedding::vector <=> $1::vector) as similarity
      FROM memory_entries
      WHERE 1=1
        AND "sessionId" = $2
        AND category::text = $3
        AND "isActive" = true
        AND cardinality(embedding) > 0
        AND 1 - (embedding::vector <=> $1::vector) > 0.1
      ORDER BY embedding::vector <=> $1::vector
      LIMIT 10
    `, queryEmbedding, 'debug-session', 'CHARACTER');
    
    console.log(`Results with CHARACTER filter: ${resultsWithFilter.length}`);
    resultsWithFilter.forEach(r => console.log(`  - ${r.category}: ${r.content.substring(0, 50)}... (sim: ${r.similarity})`));
    
    // 5. カテゴリの実際の値を確認
    console.log('\n5. Checking actual category values...');
    const categories = await prisma.$queryRaw`
      SELECT DISTINCT category, category::text as category_text
      FROM memory_entries 
      WHERE "sessionId" = 'debug-session'
    `;
    
    console.log('Distinct categories:');
    categories.forEach(c => console.log(`  - category: "${c.category}", as text: "${c.category_text}"`));
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // クリーンアップ
    console.log('\n6. Cleaning up...');
    await prisma.memoryEntry.deleteMany({
      where: { sessionId: 'debug-session' }
    });
    console.log('✅ Cleanup completed');
    
    await prisma.$disconnect();
  }
}

debugVectorSearch();