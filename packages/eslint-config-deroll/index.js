module.exports = {
    extends: ["turbo", "prettier"],
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    parserOptions: {
        babelOptions: {
            presets: [],
        },
    },
    env: {
        node: true,
    },
};
