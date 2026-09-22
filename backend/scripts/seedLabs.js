import { query, closeDatabasePool } from '../src/config/database.js';

async function seedLabs() {
  const labs = [
    [1, 'Central Forensic Science Laboratory'],
    [2, 'Cyber Forensics Unit Lab'],
    [3, 'Regional Digital Forensics Lab'],
  ];

  for (const [id, name] of labs) {
    try {
      await query(
        `MERGE INTO LABORATORY l
         USING (SELECT :id AS Laboratory_ID, :name AS Lab_Name FROM DUAL) src
         ON (l.Laboratory_ID = src.Laboratory_ID)
         WHEN NOT MATCHED THEN INSERT (Laboratory_ID, Lab_Name) VALUES (src.Laboratory_ID, src.Lab_Name)`,
        { id, name }
      );
      console.log(`Laboratory #${id} (${name}) ensured.`);
    } catch (err) {
      console.error(`Error ensuring Lab #${id}:`, err.message);
    }
  }

  await closeDatabasePool();
}

seedLabs();
