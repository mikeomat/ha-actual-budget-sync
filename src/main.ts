import * as api from '@actual-app/api';
import * as dotenv from 'dotenv';
import * as categories from './categories';
import * as  transactions from './transactions';
import { AppConfig } from './types';

dotenv.config();

if (process.env.DISABLE_CONSOLE_LOG === 'true') {
  console.log = function () { }
}

console.info('Loading config');
const config = require(process.env.APP_CONFIG_PATH!) as AppConfig;

start();

async function start() {
  console.info(`Starting sync ${Date()}`);
  try {
    await synchronize();
    console.info('Finished sync');
  } catch (e) {
    console.error(`Error during sync: ${e}`);
  }
  console.info(`Next sync in ${config.scheduleSyncMs / 1000 / 60} minutes`);
  setTimeout(start, config.scheduleSyncMs);
}

async function initialize() {
  await api.init({
    dataDir: './cache',
    serverURL: config.server.url,
    password: config.server.password
  });
}

async function shutdown() {
  await api.sync();
  await api.shutdown();
}

async function synchronize() {
  await initialize();

  for (const syncConfig of config.sync) {
    console.info(`Started syncing ${syncConfig.name}`);
    try {
      const fromBudget = config.budgets[syncConfig.fromBudget];
      const toBudget = config.budgets[syncConfig.toBudget];

      if (syncConfig.categories.enable) {
        await categories.syncCategories(fromBudget, toBudget, syncConfig);
      } else {
        console.info('Skipping categories sync');
      }

      if (syncConfig.transactions.enable) {
        await transactions.syncTransactions(fromBudget, toBudget, syncConfig)
      } else {
        console.info('Skipping transactions sync');
      }

    } catch (e) {
      console.error(e);
    }
    console.info(`Finished syncing ${syncConfig.name}`);
  }

  await shutdown();
}