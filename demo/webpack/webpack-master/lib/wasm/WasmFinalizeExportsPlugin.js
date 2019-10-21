/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const formatLocation = require("../formatLocation");
const UnsupportedWebAssemblyFeatureError = require("./UnsupportedWebAssemblyFeatureError");

/** @typedef {import("../Compiler")} Compiler */

class WasmFinalizeExportsPlugin {
	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("WasmFinalizeExportsPlugin", compilation => {
			compilation.hooks.finishModules.tap(
				"WasmFinalizeExportsPlugin",
				modules => {
					for (const module of modules) {
						// 1. if a WebAssembly module
						if (module.type.startsWith("webassembly") === true) {
							const jsIncompatibleExports =
								module.buildMeta.jsIncompatibleExports;

							if (jsIncompatibleExports === undefined) {
								continue;
							}

							for (const connection of compilation.moduleGraph.getIncomingConnections(
								module
							)) {
								// 2. is referenced by a non-WebAssembly module
								if (
									connection.originModule.type.startsWith("webassembly") ===
									false
								) {
									const ref = compilation.getDependencyReference(
										connection.dependency
									);

									if (!ref) continue;

									const importedNames = ref.importedNames;

									if (Array.isArray(importedNames)) {
										importedNames.forEach(names => {
											if (names.length === 0) return;
											const name = names[0];
											// 3. and uses a func with an incompatible JS signature
											if (
												Object.prototype.hasOwnProperty.call(
													jsIncompatibleExports,
													name
												)
											) {
												// 4. error
												/** @type {TODO} */
												const error = new UnsupportedWebAssemblyFeatureError(
													`Export "${name}" with ${jsIncompatibleExports[name]} can only be used for direct wasm to wasm dependencies\n` +
														`It's used from ${connection.originModule.readableIdentifier(
															compilation.requestShortener
														)} at ${formatLocation(connection.dependency.loc)}.`
												);
												error.module = module;
												compilation.errors.push(error);
											}
										});
									}
								}
							}
						}
					}
				}
			);
		});
	}
}

module.exports = WasmFinalizeExportsPlugin;
