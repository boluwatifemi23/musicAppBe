const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS',
  'CLIENT_URL',
  'COOKIE_SECRET'
];

const optionalEnvVars = [
  'PORT',
  'NODE_ENV',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
  'OTP_LENGTH',
  'OTP_EXPIRY_MINUTES'
];

function validateEnv() {
  console.log('🔍 Validating environment variables...\n');

  const missing = [];
  const present = [];

 
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      present.push(varName);
    }
  });

  
  if (present.length > 0) {
    console.log('Required variables present:');
    present.forEach(varName => {
      console.log(`   ✓ ${varName}`);
    });
    console.log('');
  }

  if (missing.length > 0) {
    console.error('Missing required environment variables:\n');
    missing.forEach(varName => {
      console.error(`   ✗ ${varName}`);
    });
    console.error('\nPlease create a .env file based on .env.example\n');
    process.exit(1);
  }

 
  const defaults = {
    PORT: '5000',
    NODE_ENV: 'development',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX_REQUESTS: '100',
    OTP_LENGTH: '6',
    OTP_EXPIRY_MINUTES: '10'
  };

  optionalEnvVars.forEach(varName => {
    if (!process.env[varName] && defaults[varName]) {
      process.env[varName] = defaults[varName];
      console.log(` ${varName} not set, using default: ${defaults[varName]}`);
    }
  });

  console.log('\n All required environment variables are set!\n');
}

module.exports = validateEnv;