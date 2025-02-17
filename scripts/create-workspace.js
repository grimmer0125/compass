const path = require('path');
const { promises: fs } = require('fs');
const prompts = require('prompts');
const pacote = require('pacote');
const {
  collectWorkspacesDependencies,
  collectWorkspacesMeta
} = require('./workspace-dependencies');
const { getHighestRange } = require('./semver-helpers');
const { runInDir } = require('./run-in-dir');
const { updatePackageJson } = require('./monorepo/update-package-json');
const { withProgress } = require('./monorepo/with-progress');

function packageNameToDir(pkgName) {
  return pkgName ? pkgName.replace(/^@mongodb-js\//, '') : pkgName;
}

function dirToScopedPackageName(dir) {
  return dir.startsWith('@mongodb-js/') ? dir : `@mongodb-js/${dir}`;
}

async function main(argv) {
  let workspaceNameFromArgs = argv[0];
  const workspacesMeta = await collectWorkspacesMeta();
  const dirs = Array.from(workspacesMeta.values()).map(({ location }) =>
    path.basename(location)
  );
  const names = Array.from(workspacesMeta.values()).map(({ name }) => name);

  const nameExists = (pkgName) => {
    return dirs.includes(packageNameToDir(pkgName)) || names.includes(pkgName);
  };

  console.log();

  if (nameExists(workspaceNameFromArgs)) {
    console.warn(
      `⚠️  Workspace with the name "%s" already exists, please choose another name`,
      workspaceNameFromArgs
    );
    console.warn();
    workspaceNameFromArgs = null;
  }

  if (workspaceNameFromArgs) {
    console.log('Setting up new workspace "%s"', workspaceNameFromArgs);
    console.log();
  }

  let canceled = false;

  const {
    name = workspaceNameFromArgs,
    description,
    isPublic,
    react,
    dependants,
    depType
  } = await prompts(
    [
      {
        type: workspaceNameFromArgs ? null : 'text',
        name: 'name',
        message: 'Provide a name for the new workspace',
        hint: '(this name will be part of the package name)',
        validate(value) {
          if (!value) {
            return 'Workspace name is required';
          }

          if (nameExists(value)) {
            return `Workspace name "${value}" is already taken. Please provide another name`;
          }

          return true;
        }
      },
      {
        type: 'text',
        name: 'description',
        message: 'Provide a one-line description of the workspace'
      },
      {
        type: 'confirm',
        name: 'isPublic',
        message: 'Is it a public package?',
        initial: true
      },
      {
        type: 'confirm',
        name: 'react',
        message: 'Will the package use React?',
        initial: true
      },
      {
        type: 'autocompleteMultiselect',
        name: 'dependants',
        message: 'Will any of the packages in the monorepo depend on this one?',
        choices: Array.from(workspacesMeta.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(({ name, location }) => ({ title: name, value: location })),
        hint: '(select as many as you like, or none)',
        instructions: `

 · Use up and down arrows to navigate the list
 · Use space to toggle the selection
 · Type text to filter choices
 · Enter to complete the answer
`,
        initial: []
      },
      {
        type(prev) {
          return prev.length > 0 ? 'select' : null;
        },
        name: 'depType',
        message: 'What type of dependency is it?',
        choices: [
          { title: 'Production', value: 'dependencies' },
          { title: 'Development', value: 'devDependencies' }
        ]
      }
    ],
    {
      onCancel() {
        canceled = true;
      }
    }
  );

  if (canceled) {
    return;
  }

  console.log();

  const pkgJson = {
    name: dirToScopedPackageName(name),
    ...(description && { description }),
    author: {
      name: 'MongoDB Inc',
      email: 'compass@mongodb.com'
    },
    ...(isPublic ? { publishConfig: { access: 'public' } } : { private: true }),
    bugs: {
      url: 'https://jira.mongodb.org/projects/COMPASS/issues',
      email: 'compass@mongodb.com'
    },
    homepage: 'https://github.com/mongodb-js/compass',
    version: '0.1.0',
    repository: {
      type: 'git',
      url: 'https://github.com/mongodb-js/compass.git'
    },
    files: ['dist'],
    license: 'SSPL',
    main: 'dist/index.js',
    exports: {
      require: './dist/index.js',
      import: './dist/.esm-wrapper.mjs'
    },
    types: './dist/index.d.ts',
    scripts: {
      bootstrap: 'npm run compile',
      prepublishOnly: 'npm run compile',
      compile:
        'tsc -p tsconfig.json && gen-esm-wrapper . ./dist/.esm-wrapper.mjs',
      eslint: 'eslint',
      prettier: 'prettier',
      lint: 'npm run eslint . && npm run prettier -- --check .',
      depcheck: 'depcheck',
      check: 'npm run lint && npm run depcheck',
      'check-ci': 'npm run check',
      test: 'mocha',
      'test-cov':
        'nyc -x "**/*.spec.*" npm run test',
      'test-watch': 'npm run test -- --watch',
      'test-ci': 'npm run test-cov',
      reformat: 'npm run prettier -- --write .'
    },
    ...(react && { peerDependencies: { react: '*', 'react-dom': '*' } }),
    ...(react && { dependencies: { react: '*', 'react-dom': '*' } }),
    devDependencies: {
      '@mongodb-js/eslint-config-compass': '*',
      '@mongodb-js/mocha-config-compass': '*',
      '@mongodb-js/prettier-config-compass': '*',
      '@mongodb-js/tsconfig-compass': '*',
      '@types/chai': '*',
      '@types/mocha': '*',
      '@types/sinon-chai': '*',
      chai: '*',
      depcheck: '*',
      eslint: '*',
      mocha: '*',
      nyc: '*',
      prettier: '*',
      sinon: '*',
      typescript: '*',
      ...(react && {
        '@testing-library/react': '*',
        '@types/chai-dom': '*',
        '@types/react': '*',
        '@types/react-dom': '*'
      })
    }
  };

  await applyBestVersionMatch(pkgJson, workspacesMeta);
  // Otherwise npm will do this on next install and generate an unwanted diff
  sortDepsByName(pkgJson);

  const packagePath = path.resolve(
    __dirname,
    '..',
    'packages',
    packageNameToDir(name)
  );

  const packageJsonPath = path.join(packagePath, 'package.json');
  const packageJsonContent = JSON.stringify(pkgJson, null, 2);

  const depcheckrcPath = path.join(packagePath, '.depcheckrc');
  const ignores = [
    '@mongodb-js/prettier-config-compass',
    '@mongodb-js/tsconfig-compass',
    '@types/chai',
    '@types/sinon-chai',
    'sinon'
  ]
    .concat(
      react ? ['@types/chai-dom', '@types/react', '@types/react-dom'] : []
    )
    .map((dep) => ` - "${dep}"`)
    .join('\n');
  const depcheckrcContent = `ignores:\n${ignores}\n`;

  const prettierrcPath = path.join(packagePath, '.prettierrc.json');
  const prettierrcContent = JSON.stringify(
    '@mongodb-js/prettier-config-compass'
  );

  const prettierIgnorePath = path.join(packagePath, '.prettierignore');
  const prettierIgnoreContent = '.nyc-output\ndist\n';

  const tsconfigPath = path.join(packagePath, 'tsconfig.json');
  const tsconfigContent = JSON.stringify(
    {
      extends: `@mongodb-js/tsconfig-compass/tsconfig.${
        react ? 'react' : 'common'
      }.json`,
      compilerOptions: {
        outDir: 'dist'
      },
      include: ['src/**/*'],
      exclude: ['./src/**/*.spec.*']
    },
    null,
    2
  );

  const tsconfigLintPath = path.join(packagePath, 'tsconfig-lint.json');
  const tsconfigLintContent = JSON.stringify(
    {
      extends: './tsconfig.json',
      include: ['**/*'],
      exclude: ['node_modules', 'dist']
    },
    null,
    2
  );

  const eslintrcPath = path.join(packagePath, '.eslintrc.js');
  const eslintrcContent = `
module.exports = {
  root: true,
  extends: ['@mongodb-js/eslint-config-compass'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig-lint.json'],
  },
};`;

  const eslintIgnorePath = path.join(packagePath, '.eslintignore');
  const eslintIgnoreContent = '.nyc-output\ndist\n';

  const mocharcPath = path.join(packagePath, '.mocharc.js');
  const mocharcContent = `module.exports = require('${
    react
      ? '@mongodb-js/mocha-config-compass/react'
      : '@mongodb-js/mocha-config-compass'
  }');`;

  const indexSrcDir = path.join(packagePath, 'src');
  const indexSrcPath = path.join(indexSrcDir, 'index.ts');
  const indexSpecPath = path.join(indexSrcDir, 'index.spec.ts');

  await withProgress('Generating package source', async () => {
    await fs.mkdir(packagePath, { recursive: true });
    await fs.writeFile(packageJsonPath, packageJsonContent);
    await fs.writeFile(depcheckrcPath, depcheckrcContent);
    await fs.writeFile(prettierrcPath, prettierrcContent);
    await fs.writeFile(prettierIgnorePath, prettierIgnoreContent);
    await fs.writeFile(tsconfigPath, tsconfigContent);
    await fs.writeFile(tsconfigLintPath, tsconfigLintContent);
    await fs.writeFile(eslintrcPath, eslintrcContent);
    await fs.writeFile(eslintIgnorePath, eslintIgnoreContent);
    await fs.writeFile(mocharcPath, mocharcContent);
    await fs.mkdir(indexSrcDir, { recursive: true });
    await fs.writeFile(indexSrcPath, '');
    await fs.writeFile(indexSpecPath, '');
  });

  if (dependants.length > 0) {
    await withProgress('Updating dependants', async () => {
      for (const location of dependants) {
        await updatePackageJson(location, (pkgJson) => {
          if (!pkgJson[depType]) {
            pkgJson[depType] = {};
          }
          pkgJson[depType][dirToScopedPackageName(name)] = '^0.1.0';
          sortDepsByName(pkgJson, [depType]);
          return pkgJson;
        });
      }
    });
  }

  await withProgress(
    'Updating package-lock and prettifying workspace source',
    async () => {
      await runInDir('npm install');
      await runInDir('npm run reformat', packagePath);
    }
  );

  console.log();
  console.log(
    'Workspace is ready at %s',
    path.relative(process.cwd(), packagePath)
  );
  console.log();
}

const BestMatchCache = new Map();

async function resolveLatestVersionFromRegistry(
  depName,
  registry = process.env.npm_config_registry
) {
  try {
    return `^${(await pacote.manifest(depName, { registry })).version}`;
  } catch (e) {
    return '*';
  }
}

async function applyBestVersionMatch(
  pkgJson,
  meta,
  types = ['dependencies', 'devDependencies']
) {
  const dependencies = collectWorkspacesDependencies(meta);

  for (const depType of types) {
    for (const depName in pkgJson[depType]) {
      if (BestMatchCache.has(depName)) {
        pkgJson[depType][depName] = BestMatchCache.get(depName);
      } else {
        const maybeRanges = (dependencies.get(depName) || []).map(
          ({ version }) => version
        );
        pkgJson[depType][depName] =
          getHighestRange(maybeRanges) ||
          (await resolveLatestVersionFromRegistry(depName));

        BestMatchCache.set(depName, pkgJson[depType][depName]);
      }
    }
  }
}

function sortDepsByName(
  pkgJson,
  types = ['dependencies', 'devDependencies', 'peerDependencies']
) {
  for (const depType of types) {
    if (pkgJson[depType]) {
      pkgJson[depType] = Object.fromEntries(
        Object.entries(pkgJson[depType]).sort(([a], [b]) => a.localeCompare(b))
      );
    }
  }
}

process.on('unhandledRejection', (err) => {
  console.error();
  console.error(err.stack || err.message || err);
  process.exitCode = 1;
});

main(process.argv.slice(2));
