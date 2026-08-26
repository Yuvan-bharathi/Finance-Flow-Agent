import pool from '../config/db.js';

const reindexCases = async () => {
  console.log('🔄 Starting Safe Re-indexing of Reconciliation Cases to Strict Sequential Order...');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Check for payments without cases and insert missing cases
    const [missingCases] = await conn.query(`
      SELECT p.id as payment_id, p.created_at
      FROM payments p
      LEFT JOIN reconciliation_cases rc ON rc.payment_id = p.id
      WHERE rc.id IS NULL
      ORDER BY p.id ASC;
    `);

    for (const m of missingCases) {
      console.log(`Creating missing case for payment ${m.payment_id}...`);
      await conn.query(`
        INSERT INTO reconciliation_cases (payment_id, status, priority, created_at)
        VALUES (?, 'new', 'medium', ?);
      `, [m.payment_id, m.created_at]);
    }

    // 2. Fetch all cases in chronological order
    const [allCases] = await conn.query(`
      SELECT id, created_at, status FROM reconciliation_cases
      ORDER BY created_at ASC, id ASC;
    `);

    console.log(`Found ${allCases.length} total cases to re-index sequentially.`);

    // 3. Create temporary table to hold new sequential mapping
    await conn.query(`CREATE TEMPORARY TABLE temp_case_mapping (old_id INT, new_id INT);`);

    let seq = 1;
    for (const c of allCases) {
      await conn.query(`INSERT INTO temp_case_mapping (old_id, new_id) VALUES (?, ?);`, [c.id, seq]);
      seq++;
    }

    // Disable FK checks temporarily for primary key re-assignment
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0;`);

    // 4. Offset all IDs by +5,000,000 to prevent unique key collisions
    await conn.query(`
      UPDATE ai_recommendations ar
      JOIN temp_case_mapping m ON ar.reconciliation_case_id = m.old_id
      SET ar.reconciliation_case_id = m.new_id + 5000000;
    `);

    await conn.query(`
      UPDATE reconciliation_cases rc
      JOIN temp_case_mapping m ON rc.id = m.old_id
      SET rc.id = m.new_id + 5000000;
    `);

    // 5. Shift back to clean sequential 1..N
    await conn.query(`
      UPDATE reconciliation_cases rc
      SET rc.id = rc.id - 5000000;
    `);

    await conn.query(`
      UPDATE ai_recommendations ar
      SET ar.reconciliation_case_id = ar.reconciliation_case_id - 5000000;
    `);

    await conn.query(`SET FOREIGN_KEY_CHECKS = 1;`);

    // 6. Update pipeline_executions context_data JSON
    const [pipelines] = await conn.query(`SELECT id, context_data FROM pipeline_executions WHERE context_data IS NOT NULL;`);
    const [mappingRows] = await conn.query(`SELECT old_id, new_id FROM temp_case_mapping;`);
    const map = {};
    mappingRows.forEach(r => { map[r.old_id] = r.new_id; });

    for (const p of pipelines) {
      let ctx = p.context_data;
      if (typeof ctx === 'string') {
        try { ctx = JSON.parse(ctx); } catch (e) { ctx = null; }
      }
      if (ctx && ctx.caseId && map[ctx.caseId]) {
        ctx.caseId = map[ctx.caseId];
        await conn.query(`UPDATE pipeline_executions SET context_data = ? WHERE id = ?;`, [JSON.stringify(ctx), p.id]);
      }
    }

    await conn.commit();
    console.log(`✅ Successfully re-indexed ${allCases.length} cases to sequential IDs 1..${allCases.length}!`);

    // 7. Verify result
    const [finalCases] = await pool.query(`
      SELECT rc.id, rc.status, p.transaction_id, p.sender_name, p.amount
      FROM reconciliation_cases rc
      LEFT JOIN payments p ON rc.payment_id = p.id
      ORDER BY rc.id ASC;
    `);
    console.log('Final Sequential Cases (Count: ' + finalCases.length + '):');
    console.table(finalCases);
  } catch (err) {
    await conn.rollback();
    console.error('❌ Reindexing failed, rolled back:', err);
  } finally {
    conn.release();
    await pool.end();
  }
};

reindexCases();
