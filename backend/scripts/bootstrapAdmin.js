import readline from 'readline';
import bcrypt from 'bcryptjs';
import oracledb from 'oracledb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

function questionHidden(query) {
  return new Promise((resolve) => {
    process.stdout.write(query);
    const stdin = process.stdin;
    const oldRaw = stdin.isRaw;
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    stdin.resume();

    let password = '';
    const onData = (chunk) => {
      const char = chunk.toString('utf8');
      if (char === '\n' || char === '\r' || char === '\u0004') {
        if (stdin.isTTY) stdin.setRawMode(oldRaw);
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
      } else if (char === '\u0008' || char === '\x7f') {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else if (char === '\u0003') {
        // Ctrl+C
        if (stdin.isTTY) stdin.setRawMode(oldRaw);
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        rl.close();
        process.exit(1);
      } else {
        password += char;
        process.stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });
}

function validatePasswordPolicy(password) {
  if (!password || password.length < 12) {
    return 'Password must be at least 12 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter (A-Z).';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter (a-z).';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one digit (0-9).';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'Password must contain at least one special character.';
  }
  return null;
}

async function main() {
  console.log('\n======================================================');
  console.log('  DFEMS — SECURE INITIAL ADMINISTRATOR SETUP CLI');
  console.log('======================================================\n');
  console.log('This utility provisions the primary administrative account');
  console.log('into an empty DFEMS Oracle 26ai schema without hardcoding credentials.\n');

  let connection = null;

  try {
    // 1. Establish Oracle Connection & Validate Prerequisites Upfront
    console.log('Checking database connectivity and schema readiness...');
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    oracledb.autoCommit = false;

    connection = await oracledb.getConnection({
      user: process.env.DB_USER || 'dfems_user',
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/FREEPDB1',
    });

    // Check if APP_USER and AUDIT_LOG exist
    const tableCheck = await connection.execute(
      `SELECT table_name FROM user_tables WHERE table_name IN ('APP_USER', 'AUDIT_LOG')`
    );
    const foundTables = (tableCheck.rows || []).map((r) => r.TABLE_NAME);

    if (!foundTables.includes('APP_USER') || !foundTables.includes('AUDIT_LOG')) {
      throw new Error(
        'Required schema tables (APP_USER, AUDIT_LOG) do not exist yet in FREEPDB1. Please run database/oracle_schema.sql and database/oracle_programs.sql first.'
      );
    }

    // Check if an Administrator already exists (prevent duplicate administrator bootstrap)
    const adminCheck = await connection.execute(
      `SELECT COUNT(*) AS ADMIN_COUNT FROM APP_USER WHERE Role = 'Admin'`
    );
    const existingAdmins = adminCheck.rows?.[0]?.ADMIN_COUNT || 0;

    if (existingAdmins > 0) {
      throw new Error(
        `Duplicate bootstrap prevented: An Administrator account already exists in APP_USER (Total found: ${existingAdmins}). For security reasons, bootstrapAdmin.js only runs when no administrator is provisioned.`
      );
    }

    console.log('[OK] Database and schema prerequisites verified. No existing administrator found.\n');

    // 2. Interactive Input
    const username = (await question('Enter Admin Username [admin]: ')).trim() || 'admin';

    // Verify username uniqueness
    const userCheck = await connection.execute(
      `SELECT COUNT(*) AS USER_COUNT FROM APP_USER WHERE LOWER(Username) = LOWER(:username)`,
      { username }
    );
    if ((userCheck.rows?.[0]?.USER_COUNT || 0) > 0) {
      throw new Error(`The username "${username}" is already taken. Please choose another username.`);
    }

    const firstName = (await question('Enter First Name [System]: ')).trim() || 'System';
    const lastName = (await question('Enter Last Name [Administrator]: ')).trim() || 'Administrator';
    const phone = (await question('Enter Phone Number (e.g. 9876543210): ')).trim();

    let password = '';
    let confirmPassword = '';

    while (true) {
      password = await questionHidden('Enter Administrator Password (min 12 chars, upper, lower, num, symbol): ');
      const policyError = validatePasswordPolicy(password);
      if (policyError) {
        console.log(`[!] Policy Violation: ${policyError}`);
        continue;
      }

      confirmPassword = await questionHidden('Confirm Administrator Password: ');
      if (password !== confirmPassword) {
        console.log('[!] Passwords do not match. Please try again.\n');
        continue;
      }
      break;
    }

    console.log('\nGenerating salted bcrypt hash (work factor: 12)...');
    const passwordHash = await bcrypt.hash(password, 12);

    console.log('Inserting administrator account into APP_USER...');
    const userResult = await connection.execute(
      `INSERT INTO APP_USER (
        First_Name, Last_Name, Phone_Number, Username, Password_Hash, Role, Account_Status
      ) VALUES (
        :firstName, :lastName, :phone, :username, :passwordHash, 'Admin', 'Active'
      ) RETURNING User_ID INTO :userId`,
      {
        firstName,
        lastName,
        phone: phone || null,
        username,
        passwordHash,
        userId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      }
    );

    const newUserId = userResult.outBinds.userId[0];

    console.log(`Emitting initial audit entry for User ID #${newUserId} into AUDIT_LOG...`);
    await connection.execute(
      `INSERT INTO AUDIT_LOG (
        User_ID, Action, Entity_Name, Entity_ID, IP_Address, Details
      ) VALUES (
        :userId, 'ADMIN_BOOTSTRAP', 'APP_USER', :userId, '127.0.0.1',
        :details
      )`,
      {
        userId: newUserId,
        details: `Initial administrator "${username}" securely provisioned via bootstrapAdmin CLI tool.`,
      }
    );

    await connection.commit();

    console.log('\n======================================================');
    console.log('SUCCESS: Administrator account provisioned successfully!');
    console.log(`- User ID:  ${newUserId}`);
    console.log(`- Username: ${username}`);
    console.log(`- Role:     Admin`);
    console.log(`- Status:   Active`);
    console.log('======================================================\n');
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }
    console.error('\n[ERROR] Bootstrap execution aborted:', err.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (_) {}
    }
    rl.close();
  }
}

main();
