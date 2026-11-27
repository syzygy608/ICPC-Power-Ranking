import { plugin } from "bun";
import { unpluginFactory } from "@stylexjs/unplugin";

const stylex = unpluginFactory(
  { dev: false, runtimeInjection: false },
  { framework: "bun" },
);
const transform = stylex.transform;
if (typeof transform !== "function") {
  throw new Error("StyleX transform is unavailable");
}

// Bun renders the components directly in tests, without Vite's transform.
plugin({
  name: "stylex-test",
  setup(build) {
    build.onLoad({ filter: /\/src\/.*\.tsx?$/ }, async ({ path }) => {
      if (path.includes("/node_modules/")) return;
      const source = await Bun.file(path).text();
      const result = await transform.call(
        {} as ThisParameterType<typeof transform>,
        source,
        path,
      );
      return {
        contents:
          typeof result === "string" ? result : (result?.code ?? source),
        loader: path.endsWith(".tsx") ? "tsx" : "ts",
      };
    });
  },
});
