import * as api from '@actual-app/api';
import { BudgetConfig } from './types';
import { APICategoryEntity, APICategoryGroupEntity } from '@actual-app/api/@types/loot-core/src/server/api-models';

export async function loadBudget(budget: BudgetConfig) {
    console.debug(`Loading budget ${budget.syncId.substring(0, 8)}`);
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
