import path from "path";
import { terser } from "rollup-plugin-terser";
import size from "rollup-plugin-bundle-size";

let modules = [
  require("./terminal/package.json"),
  require("./color/package.json"),
];

export default modules.map(pkg => {
  return {
    input: path.join(__dirname, pkg.name, pkg.source),
    output: {
      file: path.join(__dirname, pkg.name, pkg.main),
      format: "es",
      sourcemap: true,
      plugins: [
        terser(),
        size()
      ]
    }
  }
});
