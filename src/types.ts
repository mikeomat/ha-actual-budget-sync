export type AppConfig = {
    server: ServerConfig
    scheduleSyncMs: number
    budgets: {
        [key: string]: BudgetConfig
    }
    sync: SyncConfig[]
}

export type ServerConfig = {
    url: string
    password: string
}

export type SyncConfig = {
    name: string
    fromBudget: string
    toBudget: string
    categories: {
        enable: boolean,
        excludeGroups: string[]
    }
    transactions: {
        enable: boolean
        includeTransfers: boolean
        excludeImported: boolean
    }
}

export type BudgetConfig = {
    syncId: string;
    password: string | undefined;
    accountId: string;
}