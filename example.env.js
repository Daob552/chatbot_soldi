const production = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || 'production',
};

const development = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: '9000',
  // Meta Whatsapp
  Meta_WA_VerifyToken: '5520',
  Meta_WA_accessToken: 'EAAGi1qTb6YoBAGtvESZC6pMXj0CrwhHB0WQ52CGHVSDqZAb25IpUYDTaoZCJQBLenj36Iud7fBkhEpkeR1dGGN9ZA62UWvVZC4V0FeJtPHNkVkkhMZC07Y4NhZAw2HhJ1tSBOZAWnsj5PgrYHmFJkV3wLYw0pNLZAlSsJLkLUpip5lFZCerAChmeZAKnjATNDmwpvn4MeyDrUnxjwZDZD',
  Meta_WA_SenderPhoneNumberId: '110839508423323',
  Meta_WA_wabaId: '103958435788812',
};

const fallback = {
  ...process.env,
  NODE_ENV: undefined,
};

module.exports = (environment) => {
  console.log(`Execution environment selected is: "${environment}"`);
  if (environment === 'production') {
      return production;
  } else if (environment === 'development') {
      return development;
  } else {
      return fallback;
  }
};
