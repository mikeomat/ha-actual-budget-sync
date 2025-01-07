import * as api from '@actual-app/api';
import * as helper from './helper';
import { APICategoryEntity, APICategoryGroupEntity } from '@actual-app/api/@types/loot-core/server/api-models';
import { BudgetConfig, SyncConfig } from './types';

export async function syncCategories(fromBudget : BudgetConfig, toBudget: BudgetConfig, syncConfig: SyncConfig) {
    console.info(`Started syncing categories`);
    await helper.loadBudget(fromBudget);
    const syncCategoryGroups = await api.getCategoryGroups();
    await helper.loadBudget(toBudget);
    const existingGroups = await api.getCategoryGroups()
    const existingCategories = await api.getCategories()

    let filteredCategoryGroups = syncCategoryGroups
    if (syncConfig.categories.excludeGroups) {
        filteredCategoryGroups = filteredCategoryGroups.filter(group => !syncConfig.categories.excludeGroups.includes(group.name))
    }
    if(syncConfig.transactions.includeTransfers) {  
        filteredCategoryGroups.push(helper.TRANSFER_CATEGORY_GROUP)
    }

    for (const syncCategoryGroup of filteredCategoryGroups) {
        await createOrUpdateCategoryGroup(syncCategoryGroup, existingGroups, existingCategories)
    }
    console.info(`Finished syncing categories`);
}

async function createOrUpdateCategoryGroup(syncCategoryGroup: APICategoryGroupEntity, existingGroups: APICategoryGroupEntity[], existingCategories: APICategoryEntity[]) {
    const existing = existingGroups.find(group => group.name == syncCategoryGroup.name)

    var groupId: string = ''
    var group = {
        name: syncCategoryGroup.name,
        hidden: syncCategoryGroup.hidden
    }
    if (existing !== undefined) {
        await api.updateCategoryGroup(existing.id, group);
        groupId = existing.id
    } else {
        groupId = await api.createCategoryGroup(syncCategoryGroup)
    }

    for (const category of syncCategoryGroup.categories) {
        await createOrUpdateCategory(groupId, category, existingCategories)
    }
}

async function createOrUpdateCategory(groupId: string, syncCategory: APICategoryEntity, existingCategories: APICategoryEntity[]) {
    const existing = existingCategories.find(category => category.name == syncCategory.name)

    const category = {
        id: existing?.id ?? syncCategory.id,
        name: syncCategory.name,
        group_id: groupId,
        hidden: syncCategory.hidden
    } as APICategoryEntity
    if (existing !== undefined) {
        await api.updateCategory(existing.id, category);
    } else {
        await api.createCategory(category)
    }
}