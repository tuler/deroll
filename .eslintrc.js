module.exports = {
    root: true,
    // This tells ESLint to load the config from the package `eslint-config-deroll`
    extends: ["deroll"],
    settings: {
        next: {
            rootDir: ["apps/*/"],
        },
    },
};
