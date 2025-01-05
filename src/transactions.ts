import * as api from '@actual-app/api';
import * as helper from './helper';
import { APICategoryGroupEntity, APIPayeeEntity } from '@actual-app/api/@types/loot-core/server/api-models';
import { BudgetConfig, SyncConfig } from './types';
import { TransactionEntity } from '@actual-app/api/@types/loot-core/types/models';
import { group } from 'console';

export async function syncTransactions(fromBudget: BudgetConfig, toBudget: BudgetConfig, syncConfig: SyncConfig) {
    console.info(`Started syncing transactions`);
    await helper.loadBudget(fromBudget)
    const fromTransactions = await api.getTransactions(fromBudget.accountId, undefined, undefined);
    const fromCategoryGroups = await api.getCategoryGroups();
    const fromPayees = await api.getPayees();
    const payeeMap = await getPayeeMap(fromPayees);

    await helper.loadBudget(toBudget)
    const toCategoryGroups = await api.getCategoryGroups();

    const categoryMap = await getCategoryMap(fromCategoryGroups, toCategoryGroups);
    const mapToTransaction = (transaction: TransactionEntity, accountId: string): TransactionEntity => {
        return {
            id: transaction.id,
            amount: transaction.amount,
            notes: transaction.notes,
            account: accountId,
            date: transaction.date,
            payee_name: payeeMap.get(transaction.payee ?? '')?.name ?? null,
            category: categoryMap.get(transaction.category ?? '')?.id ?? null,
            imported_id: transaction.id,
            cleared: transaction.cleared,
            subtransactions: transaction.subtransactions?.filter(transaction => isRelevantTransaction(transaction, syncConfig, categoryMap))?.map(subtransaction => mapToSubtransaction(subtransaction, accountId))
        } as TransactionEntity
    };

    const mapToSubtransaction = (transaction: TransactionEntity, accountId: string): TransactionEntity => {
        return {
            id: transaction.id,
            account: accountId,
            date: transaction.date,
            amount: transaction.amount,
            notes: transaction.notes,
            category: categoryMap.get(transaction.category ?? '')?.id ?? null,
            imported_id: transaction.id,
            cleared: transaction.cleared
        } as TransactionEntity
    }

    const filteredTransactions = fromTransactions.filter(transaction => isRelevantTransaction(transaction, syncConfig, categoryMap));
    let importTransactions: any[] = [];
    for (const currentTransaction of filteredTransactions) {
        importTransactions.push(mapToTransaction(currentTransaction, toBudget.accountId));
    }
    await helper.loadBudget(toBudget);
    console.info(importTransactions);
    //await api.importTransactions(toBudget.accountId, importTransactions);
    await api.sync();
    console.info(`Finishd syncing transactions`);
}

async function getPayeeMap(fromPayees: APIPayeeEntity[]): Promise<Map<string, APIPayeeEntity>> {
    const payeeMap = new Map<string, APIPayeeEntity>()
    for (const fromPayee of fromPayees) {
        payeeMap.set(fromPayee.id, fromPayee);
    }
    return payeeMap;
}

async function getCategoryMap(fromCategoryGroups: APICategoryGroupEntity[], toCategoryGroups: APICategoryGroupEntity[]): Promise<Map<string, CategoryMapEntry | undefined>> {
    const categoriesMap = new Map<string, CategoryMapEntry | undefined>()
    for (const fromCategoryGroup of fromCategoryGroups) {
        const toCategoryGroup = toCategoryGroups.find(group => group.name === fromCategoryGroup.name);

        for (const fromCategory of fromCategoryGroup.categories) {
            const toCategory = toCategoryGroup?.categories.find(category => category.name === fromCategory.name);

            let entry = undefined;
            if (toCategory) {
                entry = {
                    id: toCategory.id,
                    name: toCategory.name,
                    group_id: toCategoryGroup?.id,
                    group_name: toCategoryGroup?.name
                } as CategoryMapEntry;
            }
            categoriesMap.set(fromCategory.id, entry);
        }
    }
    return categoriesMap;
}

function isRelevantTransaction(transaction: TransactionEntity, syncConfig: SyncConfig, categoryMap: Map<string, CategoryMapEntry | undefined>): boolean {
    const toCategory = categoryMap.get(transaction.category ?? '');
    if (transaction.amount == 0) {
        return false;
    }
    if (syncConfig.transactions.excludeImported && transaction.imported_id) {
        return false;
    }
    if (toCategory != undefined && syncConfig.categories.excludeGroups && syncConfig.categories.excludeGroups.includes(toCategory.group_name ?? '')) {
        return false;
    }
    if (toCategory == undefined && transaction.subtransactions && transaction.subtransactions.length > 0) {
        return transaction.subtransactions.some(subtransaction => isRelevantTransaction(subtransaction, syncConfig, categoryMap));
    }
    return true;
}

type CategoryMapEntry = {
    id: string | undefined,
    name: string | undefined,
    group_id: string | undefined,
    group_name: string | undefined
}