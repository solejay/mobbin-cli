import { hasStorageState } from '../auth/storageState.js';
import { cookieHeaderFromStorageState } from '../auth/cookies.js';
import { MobbinClient } from '../api/mobbinClient.js';
export async function cmdSearch(query, opts) {
    if (!hasStorageState()) {
        console.error('Not logged in. Run: mobbin login');
        process.exitCode = 1;
        return;
    }
    const cookieHeader = cookieHeaderFromStorageState();
    const client = new MobbinClient({ cookieHeader });
    const results = await client.search(query, {
        platform: opts.platform ?? undefined,
        limit: opts.limit,
    });
    if (opts.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
    }
    if (!results.length) {
        console.log('No results (search not implemented yet—needs endpoint discovery).');
        return;
    }
    for (const r of results) {
        console.log(`${r.id}\t${r.appName}\t${r.title}\t${r.url}`);
    }
}
//# sourceMappingURL=search.js.map