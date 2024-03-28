module.exports = {
    extends: ["turbo", "prettier"],
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint", "import"],
    parserOptions: {
        babelOptions: {
            presets: [],
        },
    },
    env: {
        node: true,
    },
    rules: {
        "import/order": "error",
    },
};
