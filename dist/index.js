var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  default: () => DeadfilePlugin
});
module.exports = __toCommonJS(src_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_fast_glob = __toESM(require("fast-glob"));
var DeadfilePlugin = class {
  options;
  constructor(options) {
    this.options = {
      ...options,
      include: options.include ?? ["src/**/*"],
      exclude: options.exclude ?? ["node_modules/**/*"],
      globOptions: options.globOptions
    };
  }
  apply(compiler) {
    if (compiler.hooks) {
      compiler.hooks.afterEmit.tapAsync(
        "DeadfilePlugin",
        this.onAfterEmit.bind(this, this.options)
      );
    } else {
      compiler.plugin("after-emit", this.onAfterEmit.bind(this, this.options));
    }
  }
  onAfterEmit(options, compilation, doneFn) {
    applyAfterEmit(options, compilation);
    doneFn();
  }
};
function getFileDepsMap(compilation) {
  const resMap = Array.from(compilation.fileDependencies).reduce(
    (total, usedFilePath) => {
      total.set(usedFilePath, true);
      return total;
    },
    /* @__PURE__ */ new Map()
  );
  const { assets } = compilation;
  Object.keys(assets).forEach((assetRelpath) => {
    const existsAt = assets[assetRelpath].existsAt;
    resMap.set(existsAt, true);
  });
  return resMap;
}
function getIncludeFiles(options) {
  const { include = [], exclude = [] } = options;
  const fileList = include.concat(exclude.map((item) => `!${item}`));
  return import_fast_glob.default.sync(fileList, options.globOptions).map((filePath) => import_path.default.resolve(process.cwd(), filePath));
}
function applyAfterEmit(options, compilation) {
  const usedFileDeps = getFileDepsMap(compilation);
  const includeFiles = getIncludeFiles(options);
  const deadFiles = includeFiles.filter((file) => !usedFileDeps.has(file));
  if (options.delete) {
    removeFiles(deadFiles);
  }
  console.log("\n--------------------- Unused Files ---------------------");
  if (!deadFiles.length) {
    console.log("DeadfilePlugin is nothing to do");
  } else {
    deadFiles.forEach((file) => console.log(file));
    console.log(`There are ${deadFiles.length} unused files`);
  }
}
function removeFiles(deadFiles) {
  deadFiles.forEach((file) => {
    import_fs.default.unlink(file, (err) => {
      if (err) {
        console.log(`${file}: delete failed.`);
        throw err;
      }
    });
  });
}
