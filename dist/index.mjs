// src/index.ts
import fs from "fs";
import path from "path";
import glob from "fast-glob";
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
  return glob.sync(fileList, options.globOptions).map((filePath) => path.resolve(process.cwd(), filePath));
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
    fs.unlink(file, (err) => {
      if (err) {
        console.log(`${file}: delete failed.`);
        throw err;
      }
    });
  });
}
export {
  DeadfilePlugin as default
};
