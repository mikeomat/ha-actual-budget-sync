import * as api from '@actual-app/api';
import * as helper from './helper';
import { APICategoryGroupEntity, APIPayeeEntity } from '@actual-app/api/@types/loot-core/server/api-models';
import { BudgetConfig, SyncConfig } from './types';
import { TransactionEntity } from '@actual-app/api/@types/loot-core/types/models';

export async function syncTransactions(fromBudget: BudgetConfig, toBudget: BudgetConfig, syncConfig: SyncConfig) {
    console.info(`Started syncing transactions`);
    const fromTransactions = await getTransactions(fromBudget, syncConfig);
    const fromCategoryGroups = await api.getCategoryGroups();
    const fromPayees = await api.getPayees();
    const payeeMap = await getPayeeMap(fromPayees);

    await helper.loadBudget(toBudget)
    const toCategoryGroups = await api.getCategoryGroups();

    const categoryMap = await getCategoryMap(syncConfig, fromCategoryGroups, toCategoryGroups);
    const mapToTransaction = (transaction: TransactionEntity, accountId: string): TransactionEntity => {
        let category = categoryMap.get(transaction.category ?? '');
        if (syncConfig.transactions.includeTransfers == true && transaction.transfer_id && !category) {
            category = categoryMap.get(helper.TRANSFER_CATEGORY.id);
        }
        return {
            id: transaction.id,
            amount: transaction.amount,
            notes: transaction.notes,
            account: accountId,
            date: transaction.date,
            payee_name: payeeMap.get(transaction.payee ?? '')?.name ?? null,
            category: category?.id ?? null,
            imported_id: transaction.id,
            cleared: transaction.cleared,
            subtransactions: transaction.subtransactions
                ?.map(subtransaction => mapToTransaction(subtransaction, accountId))
                ?.filter(transaction => isRelevantTransaction(transaction, syncConfig))
        } as TransactionEntity
    };

    const filteredTransactions = fromTransactions
        .map(transaction => mapToTransaction(transaction, toBudget.accountId))
        .filter(transaction => isRelevantTransaction(transaction, syncConfig));
    let importTransactions: any[] = [];
    for (const currentTransaction of filteredTransactions) {
        importTransactions.push(currentTransaction);
    }
    await helper.loadBudget(toBudget);
    await api.importTransactions(toBudget.accountId, importTransactions);
    console.info(`Finishd syncing transactions`);
}

async function getTransactions(budget: BudgetConfig, syncConfig: SyncConfig): Promise<TransactionEntity[]> {
    await helper.loadBudget(budget)
    const transactions = await api.getTransactions(budget.accountId, undefined, undefined);
    if (syncConfig.transactions.excludeImported == true) {
        return transactions.filter(transaction => transaction.imported_id == null);
    }
    return transactions;
}

async function getPayeeMap(fromPayees: APIPayeeEntity[]): Promise<Map<string, APIPayeeEntity>> {
    const payeeMap = new Map<string, APIPayeeEntity>()
    for (const fromPayee of fromPayees) {
        payeeMap.set(fromPayee.id, fromPayee);
    }
    return payeeMap;
}

async function getCategoryMap(syncConfig: SyncConfig, fromCategoryGroups: APICategoryGroupEntity[], toCategoryGroups: APICategoryGroupEntity[]): Promise<Map<string, CategoryMapEntry | undefined>> {
    const categoriesMap = new Map<string, CategoryMapEntry | undefined>()
    if (syncConfig.transactions.includeTransfers == true) {
        fromCategoryGroups.push(helper.TRANSFER_CATEGORY_GROUP)
    }
    for (const fromCategoryGroup of fromCategoryGroups) {
        const toCategoryGroup = toCategoryGroups.find(group => group.name === fromCategoryGroup.name);

        if (syncConfig.categories.excludeGroups && syncConfig.categories.excludeGroups.includes(fromCategoryGroup.name)) {
            continue;
        }

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

function isRelevantTransaction(transaction: TransactionEntity, syncConfig: SyncConfig): boolean {
    if (transaction.amount == 0) {
        return false;
    }

    if (transaction.category == null) {
        if (transaction.subtransactions && transaction.subtransactions.length > 0) {
            return transaction.subtransactions.some(subtransaction => isRelevantTransaction(subtransaction, syncConfig));
        } else {
            return false
        }
    }
    return true;
}

type CategoryMapEntry = {
    id: string | undefined,
    name: string | undefined,
    group_id: string | undefined,
    group_name: string | undefined
}
