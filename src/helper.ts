import * as api from '@actual-app/api';
import { BudgetConfig } from './types';
import { APICategoryEntity, APICategoryGroupEntity } from '@actual-app/api/@types/loot-core/server/api-models';

export async function loadBudget(budget: BudgetConfig) {

    let localBudgets = await api.getBudgets();
    let localBudget = localBudgets.find(b => b.id === budget.budgetId);

    if (localBudget) {
        console.debug(`Loading budget ${budget.syncId.substring(0, 8)}`);
        await api.loadBudget(localBudget.id);
        await api.sync();
    } else {
        console.debug(`Downloading budget ${budget.syncId.substring(0, 8)}`);
        await downloadBudget(budget);
    }

    await api.shutdown();
}

export async function downloadBudget(budget: BudgetConfig) {
    if (budget.password) {
        await api.downloadBudget(budget.syncId, { password: budget.password });
    } else {
        await api.downloadBudget(budget.syncId);
    }
}

export const TRANSFER_CATEGORY_ID = 'b3fbb476-8cfa-4523-8995-27d3a96da622';
export const TRANSFER_CATEGORY_GROUP_ID = 'eacbf56f-200a-40bc-86bc-415cd21a0584';

export const TRANSFER_CATEGORY: APICategoryEntity = {
    id: TRANSFER_CATEGORY_ID,
    name: '[Import] Transfer',
    group_id: TRANSFER_CATEGORY_GROUP_ID
};

export const TRANSFER_CATEGORY_GROUP: APICategoryGroupEntity = {
    id: TRANSFER_CATEGORY_GROUP_ID,
    name: '[Import] Transfer',
    categories: [TRANSFER_CATEGORY]
}
