export default {
  plugins: {
    "postcss-preset-mantine": {},
    // The tokens file is not in this repository. `npm install` fetches it — see web/.gitignore.
    "@recursica/recursica-postcss-vars": {
      cssPath: "./recursica_variables_scoped.css",
      strict: process.env.NODE_ENV === "production",
    },
  },
};
