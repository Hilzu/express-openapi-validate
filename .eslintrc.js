module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/errors",
    "plugin:import/typescript",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
  },
  plugins: ["import", "@typescript-eslint"],
  env: {
    jest: true,
    node: true,
  },
  rules: {
    "@typescript-eslint/no-useless-constructor": "error",
    "@typescript-eslint/explicit-function-return-type": [
      "error",
      { allowExpressions: true, allowTypedFunctionExpressions: true },
    ],
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "off",
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        ts: "never",
        js: "never",
      },
    ],
    "import/no-unresolved": [
      "error",
      {
        ignore: ["\\.\\.?/dist/"],
      },
    ],
    "import/prefer-default-export": "off",
    "no-useless-constructor": "off",
    "no-underscore-dangle": "off",
  },
};
