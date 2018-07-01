module.exports = {
  root: true,
  extends: ["eslint:recommended", "airbnb-base", "prettier"],
  parser: "typescript-eslint-parser",
  plugins: ["typescript"],
  settings: {
    "import/extensions": [".ts", ".js"],
    "import/resolver": {
      node: {
        extensions: [".ts", ".js", ".json"],
      },
    },
  },
  env: {
    jest: true,
    node: true,
  },
  rules: {
    "import/extensions": [
      "error",
      "always",
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
    "linebreak-style": "off",
    "lines-between-class-members": "off",
    "no-restricted-globals": "off",
    "no-undef": "off",
    "no-underscore-dangle": "off",
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "typescript/class-name-casing": "error",
    "typescript/no-unused-vars": "error",
    "no-useless-constructor": "off",
  },
};
