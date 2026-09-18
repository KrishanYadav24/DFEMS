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
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else if (char === '\u0003') {
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
  console.log('  DFEMS — SECURE ADMINISTRATOR PASSWORD RESET CLI');
  console.log('======================================================\n');

  let connection = null;

  try {
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    oracledb.autoCommit = false;

    connection = await oracledb.getConnection({
      user: process.env.DB_USER || 'dfems_user',
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/FREEPDB1',
    });

    const username = (await question('Enter Username to reset [Krishan]: ')).trim() || 'Krishan';

    const userCheck = await connection.execute(
      `SELECT User_ID, Username, Role, Account_Status FROM APP_USER WHERE LOWER(Username) = LOWER(:username)`,
      { username }
    );

    if (!userCheck.rows || userCheck.rows.length === 0) {
      throw new Error(`User "${username}" was not found in APP_USER table.`);
    }

    const user = userCheck.rows[0];
    console.log(`Found account: User #${user.USER_ID} (${user.USERNAME}) [Role: ${user.ROLE}, Status: ${user.ACCOUNT_STATUS}]\n`);

    let newPassword = '';
    while (true) {
      newPassword = await questionHidden('Enter New Password (min 12 chars, upper, lower, num, symbol): ');
      const policyError = validatePasswordPolicy(newPassword);
      if (policyError) {
        console.log(`[!] Policy Violation: ${policyError}`);
        continue;
      }

      const confirm = await questionHidden('Confirm New Password: ');
      if (newPassword !== confirm) {
        console.log('[!] Passwords do not match. Please try again.\n');
        continue;
      }
      break;
    }

    console.log('\nHashing new password with bcrypt (work factor 12)...');
    const newHash = await bcrypt.hash(newPassword, 12);

    await connection.execute(
      `UPDATE APP_USER SET Password_Hash = :newHash WHERE User_ID = :userId`,
      { newHash, userId: user.USER_ID }
    );

    await connection.execute(
      `INSERT INTO AUDIT_LOG (
        User_ID, Action, Entity_Name, Entity_ID, IP_Address, Details
      ) VALUES (
        :userId, 'PASSWORD_RESET', 'APP_USER', :userId, '127.0.0.1',
        :details
      )`,
      {
        userId: user.USER_ID,
        details: `Password for "${user.USERNAME}" was updated via secure CLI tool.`,
      }
    );

    await connection.commit();

    console.log('\n======================================================');
    console.log(`SUCCESS: Password for "${user.USERNAME}" was reset successfully!`);
    console.log('You can now log in through the DFEMS web interface.');
    console.log('======================================================\n');
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }
    console.error('\n[ERROR] Reset failed:', err.message);
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
