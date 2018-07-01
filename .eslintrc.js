module.exports = {
  root: true,
  extends: ["eslint:recommended", "airbnb-base", "prettier"],
  parser: "typescript-eslint-parser",
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
    "no-unused-vars": "off",
    "no-useless-constructor": "off",
    strict: "off",
  },
};
