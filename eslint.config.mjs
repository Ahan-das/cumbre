import { dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { FlatCompat } from "@eslint/eslintrc";

const require = createRequire(import.meta.url);

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
  // eslint-config-next keeps its plugins (react, react-hooks, import, jsx-a11y)
  // in its own node_modules, so resolve them from there rather than from the
  // project root, where they do not exist.
  resolvePluginsRelativeTo: dirname(require.resolve("eslint-config-next/package.json")),
});

export default [...compat.extends("next/core-web-vitals", "next/typescript")];
