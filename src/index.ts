import fs from "fs";
import path from "path";
import glob from "fast-glob";
import type { IOptions, ICompiler, ICompilation } from "./type";

export default class DeadfilePlugin {
  private options: IOptions;

  constructor(options: IOptions) {
    this.options = {
      ...options,
      include: options.include ?? ["src/**/*"],
      exclude: options.exclude ?? ["node_modules/**/*"],
      globOptions: options.globOptions,
    };
  }

  apply(compiler: ICompiler) {
    // webpack 4
    if (compiler.hooks) {
      compiler.hooks.afterEmit.tapAsync(
        "DeadfilePlugin",
        this.onAfterEmit.bind(this, this.options)
      );
    } else {
      // webpack 3
      compiler.plugin("after-emit", this.onAfterEmit.bind(this, this.options));
    }
  }

  onAfterEmit(options: IOptions, compilation: ICompilation, doneFn: Function) {
    applyAfterEmit(options, compilation);
    doneFn();
  }
}

/**
 * 获取文件依赖关系
 * @param compilation
 */
function getFileDepsMap(compilation: ICompilation) {
  const resMap = Array.from<string>(compilation.fileDependencies).reduce(
    (total: Map<string, boolean>, usedFilePath) => {
      total.set(usedFilePath, true);
      return total;
    },
    new Map()
  );

  const { assets } = compilation;
  Object.keys(assets).forEach((assetRelpath) => {
    const existsAt = assets[assetRelpath].existsAt;
    resMap.set(existsAt, true);
  });

  return resMap;
}

/**
 * 获取指定目录下的文件列表
 * @param options
 */
function getIncludeFiles(options: IOptions) {
  const { include = [], exclude = [] } = options;
  const fileList = include.concat(exclude.map((item) => `!${item}`));
  return glob
    .sync(fileList, options.globOptions)
    .map((filePath) => path.resolve(process.cwd(), filePath));
}

/**
 * 主函数
 * @param options
 * @param compilation
 * @returns
 */
function applyAfterEmit(options: IOptions, compilation: ICompilation) {
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

function removeFiles(deadFiles: string[]) {
  deadFiles.forEach((file) => {
    fs.unlink(file, (err) => {
      if (err) {
        console.log(`${file}: delete failed.`);
        throw err;
      }
    });
  });
}
