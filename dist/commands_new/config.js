import { Command } from 'commander';
import { loadConfig, saveConfig, defaultConfigPath } from '../config/config.js';
import { printJson, printPlain, resolveOutputMode } from '../utils/output.js';
export function registerConfigCommands(parent) {
    const cmd = parent.command('config').description('Manage mobbin-cli configuration');
    cmd
        .command('path')
        .description('Print the config file path')
        .option('--json', 'JSON output', false)
        .option('--plain', 'Plain output', false)
        .action((opts) => {
        const mode = resolveOutputMode(opts);
        const p = defaultConfigPath();
        if (mode === 'json')
            return printJson({ path: p });
        return printPlain([p]);
    });
    cmd
        .command('get')
        .description('Get a config key')
        .argument('<key>', 'Key name (e.g. outDir, defaultProfile)')
        .option('--json', 'JSON output', false)
        .option('--plain', 'Plain output', false)
        .action((key, opts) => {
        const mode = resolveOutputMode(opts);
        const cfg = loadConfig();
        const value = cfg[key];
        if (mode === 'json')
            return printJson({ key, value });
        return printPlain([String(value ?? '')]);
    });
    cmd
        .command('set')
        .description('Set a config key')
        .argument('<key>', 'Key name (e.g. outDir, defaultProfile)')
        .argument('<value>', 'Value')
        .option('--json', 'JSON output', false)
        .option('--plain', 'Plain output', false)
        .action((key, value, opts) => {
        const mode = resolveOutputMode(opts);
        const cfg = loadConfig();
        cfg[key] = value;
        saveConfig(cfg);
        if (mode === 'json')
            return printJson({ ok: true, key, value });
        return printPlain([`ok\t${key}\t${value}`]);
    });
}
//# sourceMappingURL=config.js.map